import { queryOptions } from "@tanstack/react-query";
import { getCatalog, getCatalogAuditLog } from "./catalog.functions";
import { getClosures } from "./closures.functions";
import { getStaffAbsences } from "./staff-absences.functions";
import { getStaffShifts } from "./staff-shifts.functions";

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

export const closuresQuery = queryOptions({
  queryKey: ["closures"],
  queryFn: () => getClosures(),
  staleTime: 30 * 1000,
});

export const staffAbsencesQuery = queryOptions({
  queryKey: ["staff-absences"],
  queryFn: () => getStaffAbsences(),
  staleTime: 30 * 1000,
});

export const staffShiftsQuery = queryOptions({
  queryKey: ["staff-shifts"],
  queryFn: () => getStaffShifts(),
  staleTime: 30 * 1000,
});
