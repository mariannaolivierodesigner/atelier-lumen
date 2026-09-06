import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accesso staff — Atelier Lumen" },
      {
        name: "description",
        content: "Area riservata al personale del centro: agenda, prenotazioni e clienti.",
      },
      { property: "og:title", content: "Accesso staff — Atelier Lumen" },
      {
        property: "og:description",
        content: "Area riservata al personale del centro: agenda, prenotazioni e clienti.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/gestionale", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/gestionale` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Ti abbiamo inviato una mail di conferma. Controlla la casella.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/gestionale", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/gestionale` },
    });
    if (error) {
      toast.error("Accesso con Google non riuscito");
    }
    // In caso di successo, Supabase reindirizza automaticamente a Google e poi
    // di nuovo qui: non c'è altro da fare in questa funzione.
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary/40 px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-8 shadow-sm">
        <Link to="/" className="font-display text-2xl">
          Atelier Lumen
        </Link>
        <p className="eyebrow mt-6">Area riservata</p>
        <h1 className="mt-3 text-3xl">
          {mode === "signin" ? "Accedi al gestionale" : "Crea il tuo accesso"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm text-muted-foreground">
              Email di lavoro
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-5 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Attendi…" : mode === "signin" ? "Entra" : "Registrati"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          oppure
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full rounded-md border border-border px-5 py-3 text-sm transition-colors hover:bg-accent"
        >
          Continua con Google
        </button>

        <p className="mt-6 text-sm text-muted-foreground">
          {mode === "signin" ? "Non hai ancora un accesso?" : "Hai già un accesso?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-foreground underline underline-offset-4"
          >
            {mode === "signin" ? "Registrati" : "Accedi"}
          </button>
        </p>
      </div>
    </div>
  );
}
