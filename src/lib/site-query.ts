import { queryOptions } from "@tanstack/react-query";
import { getSite } from "./site.functions";

export const siteQuery = queryOptions({
  queryKey: ["site"],
  queryFn: () => getSite(),
  staleTime: 5 * 60 * 1000,
});

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
