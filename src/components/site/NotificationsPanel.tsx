import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMyContactPreferences,
  listMyNotifications,
  markNotificationRead,
  updateMyContactPreferences,
} from "@/lib/patient.functions";
import { formatDateTime } from "@/lib/format";

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const fetchPrefs = useServerFn(getMyContactPreferences);
  const savePrefs = useServerFn(updateMyContactPreferences);

  const notifications = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => fetchNotifications(),
  });
  const prefs = useQuery({ queryKey: ["my-contact-prefs"], queryFn: () => fetchPrefs() });

  const readMutation = useMutation({
    mutationFn: (input: { id?: string; all?: boolean }) => markRead({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
    onError: () => toast.error("Aggiornamento non riuscito."),
  });

  const prefsMutation = useMutation({
    mutationFn: (input: { notify_in_app: boolean; notify_whatsapp: boolean; notify_sms: boolean }) =>
      savePrefs({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-contact-prefs"] });
      toast.success("Preferenze aggiornate.");
    },
    onError: () => toast.error("Non è stato possibile salvare le preferenze."),
  });

  const rows = notifications.data ?? [];
  const unread = rows.filter((n) => !n.read_at).length;
  const p = prefs.data;

  const updatePref = (key: "notify_in_app" | "notify_whatsapp" | "notify_sms", value: boolean) => {
    if (!p) return;
    prefsMutation.mutate({
      notify_in_app: p.notify_in_app,
      notify_whatsapp: p.notify_whatsapp,
      notify_sms: p.notify_sms,
      [key]: value,
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BellRing className="size-4" aria-hidden="true" /> Notifiche
            {unread > 0 ? <Badge variant="secondary">{unread} da leggere</Badge> : null}
          </h2>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            disabled={unread === 0 || readMutation.isPending}
            onClick={() => readMutation.mutate({ all: true })}
          >
            <CheckCheck aria-hidden="true" /> Segna tutte come lette
          </Button>
        </div>

        {notifications.isPending ? (
          <Skeleton className="h-28 w-full rounded-3xl" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Non hai ancora ricevuto notifiche.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((n) => (
              <li
                key={n.id}
                className={`surface-card flex flex-wrap items-start gap-4 p-5 ${n.read_at ? "opacity-70" : ""}`}
              >
                <div className="min-w-52 flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{n.body}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
                {n.read_at ? (
                  <Badge variant="outline">Letta</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="soft"
                    disabled={readMutation.isPending}
                    onClick={() => readMutation.mutate({ id: n.id })}
                  >
                    Segna come letta
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-card max-w-xl space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">Preferenze di contatto</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Scegli come vuoi essere avvisato in caso di cambiamenti sui tuoi appuntamenti. Se un
            canale non è disponibile, ti scriviamo comunque qui in area personale.
          </p>
        </div>

        {prefs.isPending || !p ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="pref-inapp">Notifiche in app</Label>
              <Switch
                id="pref-inapp"
                checked={p.notify_in_app}
                onCheckedChange={(v) => updatePref("notify_in_app", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="pref-whatsapp">WhatsApp</Label>
                <p className="text-muted-foreground text-xs">
                  {p.phone ?? "Numero non impostato"}
                </p>
              </div>
              <Switch
                id="pref-whatsapp"
                checked={p.notify_whatsapp}
                onCheckedChange={(v) => updatePref("notify_whatsapp", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="pref-sms">SMS</Label>
                <p className="text-muted-foreground text-xs">
                  {p.phone ?? "Numero non impostato"}
                </p>
              </div>
              <Switch
                id="pref-sms"
                checked={p.notify_sms}
                onCheckedChange={(v) => updatePref("notify_sms", v)}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
