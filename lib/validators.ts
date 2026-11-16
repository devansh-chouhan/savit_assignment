import { z } from "zod";
import { ACTIVITY_TYPES, STAGES } from "./constants";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  website: optionalText,
  industry: optionalText,
  city: optionalText,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((value) => (value ? value.toLowerCase() : null))
    .refine((value) => value === null || z.string().email().safeParse(value).success, "Enter a valid email"),
  phone: optionalText,
  companyId: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  city: optionalText,
  source: optionalText,
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .optional()
    .default([]),
});

export const leadSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  contactId: z.string().min(1, "Contact is required"),
  dealValue: z.coerce.number().int().positive("Deal value must be greater than 0").max(100_000_000),
  stage: z.enum(STAGES).optional(),
  ownerId: z.string().optional(),
  expectedCloseDate: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  source: optionalText,
  lostReason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export const stageSchema = z.object({
  stage: z.enum(STAGES),
  lostReason: z.string().trim().max(300).optional().nullable(),
});

export const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().trim().min(2, "Description is required").max(4000),
});

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  dueDate: z.string().min(1, "Due date is required"),
  leadId: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  assignedUserId: z.string().optional(),
  completed: z.boolean().optional(),
});

export const taskPatchSchema = taskSchema.partial();

export const emailRequestSchema = z.object({
  tone: z.enum(["formal", "friendly", "short"]),
});

export const scoreRequestSchema = z.object({
  force: z.boolean().optional(),
});

export const importRowSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
});

export const importSchema = z.object({
  rows: z.array(importRowSchema).min(1, "No rows to import").max(500, "Import up to 500 rows at a time"),
  skipDuplicates: z.boolean().optional().default(true),
});
