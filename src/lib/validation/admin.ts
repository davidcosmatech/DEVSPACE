import { z } from "zod";

import { ticketPriorities, ticketStatuses, userStatuses } from "@/lib/admin";
import { isValidPermission, isValidRoleKey, normalizePermissions } from "@/lib/rbac";

const roleKey = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters for the role key.")
  .max(40, "Keep the role key under 40 characters.")
  .refine(isValidRoleKey, "Use lowercase letters, numbers, hyphens or underscores.");

export const ticketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(4, "Use at least 4 characters for the subject.")
    .max(140, "Keep the subject under 140 characters."),
  message: z
    .string()
    .trim()
    .min(10, "Describe the request in at least 10 characters.")
    .max(4000, "Keep the message under 4000 characters."),
  priority: z.enum(ticketPriorities),
});

export const ticketReplySchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(ticketStatuses),
  reply: z.string().trim().max(4000, "Keep the reply under 4000 characters.").optional(),
});

export const userRoleSchema = z.object({
  userId: z.string().uuid(),
  roleKey,
});

export const userStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(userStatuses),
});

export const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  confirmation: z.string().min(1, "Type DELETE to confirm."),
});

export const adminProfileSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(2, "Enter a display name.").max(80, "Name is too long."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters.")
    .max(40, "Use 40 characters or fewer.")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens or underscores."),
  bio: z.string().trim().max(500, "Keep the bio under 500 characters."),
  githubUsername: z
    .string()
    .trim()
    .max(39)
    .optional()
    .refine(
      (value) => !value || /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value.replace(/^@/, "")),
      "Enter a valid GitHub username.",
    ),
});

export const roleSchema = z.object({
  name: z.string().trim().min(2, "Enter a role name.").max(60, "Role name is too long."),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
  permissions: z
    .array(z.string())
    .refine(
      (values) => values.length > 0 && values.every(isValidPermission),
      "Select at least one valid permission.",
    )
    .transform((values) => normalizePermissions(values)),
});

export const createRoleSchema = roleSchema.extend({
  key: z.string().trim().max(40).optional(),
});

export const updateRoleSchema = roleSchema.extend({
  key: roleKey,
});

export const deleteRoleSchema = z.object({
  key: roleKey,
});

export type TicketInput = z.infer<typeof ticketSchema>;
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
export type AdminProfileInput = z.infer<typeof adminProfileSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

