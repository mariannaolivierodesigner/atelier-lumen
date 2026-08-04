import { queryOptions } from "@tanstack/react-query";
import { getCustomers } from "./crm.functions";

export const customersQuery = queryOptions({
  queryKey: ["crm", "customers"],
  queryFn: () => getCustomers(),
  staleTime: 30 * 1000,
});

export const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}
