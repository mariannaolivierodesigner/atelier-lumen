import { z } from "zod";

import { hasOverlappingRules } from "@/lib/availability";

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
    .max(14)
    .refine((rules) => rules.every((r) => r.endTime > r.startTime), {
      message: "L'orario di fine deve seguire quello di inizio",
    })
    .refine(
      (rules) =>
        !hasOverlappingRules(
          rules.map((r) => ({
            weekday: r.weekday,
            start_time: r.startTime,
            end_time: r.endTime,
          })),
        ),
      { message: "Due fasce orarie dello stesso giorno si sovrappongono" },
    ),
  staffIds: z.array(z.string().uuid()).max(50),
});

/** Applicazione massiva delle stesse regole a più trattamenti. */
export const bulkAvailabilitySchema = availabilityInputSchema.omit({ serviceId: true }).extend({
  serviceIds: z.array(z.string().uuid()).min(1).max(200),
  applyRules: z.boolean().default(true),
  applyStaff: z.boolean().default(true),
});

export const catalogImportSchema = z.object({
  createMissing: z.boolean().default(true),
  rows: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        categoryName: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
        durationMinutes: z.number().int().min(5).max(600).optional(),
        priceCents: z.number().int().min(0).max(10_000_00).optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        isActive: z.boolean().optional(),
        isBookable: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(500),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

export const closureInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    locationId: z.string().uuid().nullable().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    reason: z.string().min(2).max(120),
    notes: z.string().max(500).optional(),
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: "La data di fine deve seguire quella di inizio",
    path: ["endDate"],
  });

export const ABSENCE_TYPES = ["ferie", "malattia", "permesso"] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const absenceInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    staffId: z.string().uuid(),
    type: z.enum(ABSENCE_TYPES),
    startDate: dateSchema,
    endDate: dateSchema,
    startTime: timeSchema.optional().nullable(),
    endTime: timeSchema.optional().nullable(),
    reason: z.string().max(120).optional(),
  })
  .refine((a) => a.endDate >= a.startDate, {
    message: "La data di fine deve seguire quella di inizio",
    path: ["endDate"],
  })
  .refine((a) => a.type !== "permesso" || a.startDate === a.endDate, {
    message: "Un permesso ha un orario: scegli un solo giorno",
    path: ["endDate"],
  })
  .refine((a) => a.type !== "permesso" || (!!a.startTime && !!a.endTime), {
    message: "Indica l'orario di inizio e fine del permesso",
    path: ["startTime"],
  })
  .refine((a) => a.type !== "permesso" || !a.startTime || !a.endTime || a.endTime > a.startTime, {
    message: "L'orario di fine deve seguire quello di inizio",
    path: ["endTime"],
  });
