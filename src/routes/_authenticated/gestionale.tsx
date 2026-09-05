import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarOff,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { workspaceQuery } from "@/lib/admin-query";

export const Route = createFileRoute("/_authenticated/gestionale")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(workspaceQuery);
  },
  component: BackOfficeLayout,
});

const NAV = [
  { to: "/gestionale", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/gestionale/agenda", label: "Agenda", icon: CalendarDays, exact: false },
  { to: "/gestionale/prenotazioni", label: "Prenotazioni", icon: ListChecks, exact: false },
  { to: "/gestionale/clienti", label: "Clienti", icon: Users, exact: false },
  { to: "/gestionale/listino", label: "Listino", icon: Sparkles, exact: false },
  { to: "/gestionale/chiusure", label: "Chiusure", icon: CalendarOff, exact: false },
  { to: "/gestionale/storico", label: "Storico", icon: History, exact: false },
] as const;


function BackOfficeLayout() {
  const { data } = useSuspenseQuery(workspaceQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!data.membership) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-secondary/40 px-6">
        <div className="max-w-md rounded-lg border border-border bg-background p-8 text-center">
          <p className="eyebrow">Accesso non abilitato</p>
          <h1 className="mt-4 text-3xl">Il tuo account non è collegato al centro</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Chiedi a un titolare di abilitare questo indirizzo email nel gestionale di{" "}
            {data.tenant.name}.
          </p>
          <button
            onClick={signOut}
            className="mt-8 rounded-md border border-border px-5 py-2.5 text-sm"
          >
            Esci
          </button>
        </div>
      </div>
    );
  }

  const roleLabel =
    data.membership.role === "owner"
      ? "Titolare"
      : data.membership.role === "manager"
        ? "Responsabile"
        : "Operatore";

  return (
    <div className="min-h-dvh bg-secondary/30">
      <div className="border-b border-border bg-background">
        <div className="shell flex h-20 items-center justify-between gap-6">
          <div>
            <Link to="/" className="font-display text-xl">
              {data.tenant.name}
            </Link>
            <p className="text-xs text-muted-foreground">Gestionale · {roleLabel}</p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Esci
          </button>
        </div>
        <div className="shell flex gap-1 overflow-x-auto pb-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="inline-flex items-center gap-2 rounded-t-md border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "border-primary text-foreground" }}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="shell py-10">
        <Outlet />
      </div>
    </div>
  );
}
