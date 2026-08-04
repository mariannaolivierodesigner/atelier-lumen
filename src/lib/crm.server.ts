import { z } from "zod";

const DEFAULT_TENANT = "atelier-lumen";

type MinimalClient = {
  from: (table: "tenants") => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => { maybeSingle: () => Promise<{ data: { id: string } | null }> };
    };
  };
};

/** Risolve il centro dell'utente autenticato (demo: tenant unico). */
export async function resolveTenantId(supabase: unknown): Promise<string | null> {
  const client = supabase as MinimalClient;
  const { data } = await client
    .from("tenants")
    .select("id")
    .eq("slug", DEFAULT_TENANT)
    .maybeSingle();
  return data?.id ?? null;
}

export const customerInputSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160).or(z.literal("")).optional(),
  phone: z.string().max(40).optional(),
  birthDate: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(30)).max(12).default([]),
  marketingConsent: z.boolean().default(false),
  privacyConsent: z.boolean().default(false),
});

export const customerIdSchema = z.object({ id: z.string().uuid() });

export const noteInputSchema = z.object({
  customerId: z.string().uuid(),
  body: z.string().min(2).max(2000),
});
