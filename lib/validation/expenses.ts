import { z } from "zod";

export const CATEGORIES = ["stays", "food", "transport", "activities", "other"] as const;

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(120),
  amountCents: z.number().int().positive(),
  category: z.enum(CATEGORIES).optional(),
  paidById: z.string().min(1),
  splits: z
    .array(
      z.object({
        userId: z.string().min(1),
        shareCents: z.number().int().nonnegative(),
      })
    )
    .min(1, "At least one split is required"),
});
