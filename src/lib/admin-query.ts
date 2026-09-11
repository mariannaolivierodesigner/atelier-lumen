import { queryOptions } from "@tanstack/react-query";
import { getWorkspace, type BookingStatus } from "./admin.functions";
import { getReminders } from "./reminders.functions";

export const workspaceQuery = queryOptions({
  queryKey: ["workspace"],
  queryFn: () => getWorkspace(),
  staleTime: 30 * 1000,
});

export const remindersQuery = queryOptions({
  queryKey: ["reminders"],
  queryFn: () => getReminders(),
  staleTime: 10 * 1000,
});

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Da confermare",
  confirmed: "Confermata",
  rejected: "Rifiutata",
  completed: "Completata",
  cancelled: "Annullata",
  no_show: "Assente",
};

export const STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "bg-accent/60 text-accent-foreground",
  confirmed: "bg-primary/10 text-foreground",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-destructive/10 text-destructive",
};

export const dayFmt = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const timeFmt = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

export function isoDay(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
