import { queryOptions } from "@tanstack/react-query";
import { getCatalog, getCatalogAuditLog } from "./catalog.functions";

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 30 * 1000,
});

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}′`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}′` : `${h}h`;
}

export const catalogAuditQuery = queryOptions({
  queryKey: ["catalog", "audit"],
  queryFn: () => getCatalogAuditLog(),
  staleTime: 15 * 1000,
});
