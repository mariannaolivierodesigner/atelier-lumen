import { z } from "zod";

/** Genera uno slug stabile a partire dal nome del trattamento o della categoria. */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const serviceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(600),
  priceCents: z.number().int().min(0).max(10_000_00),
  imageUrl: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  isBookable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const idSchema = z.object({ id: z.string().uuid() });

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido");

export const availabilityInputSchema = z.object({
  serviceId: z.string().uuid(),
  rules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: timeSchema,
        endTime: timeSchema,
      }),
    )
    .max(7)
    .refine((rules) => rules.every((r) => r.endTime > r.startTime), {
      message: "L'orario di fine deve seguire quello di inizio",
    }),
  staffIds: z.array(z.string().uuid()).max(50),
});
