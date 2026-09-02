import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name must be 60 characters or fewer"),
});

export const joinGroupSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
});
