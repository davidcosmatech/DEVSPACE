import { z } from "zod";

import {
  ticketPriorities,
  ticketStatuses,
  userRoles,
  userStatuses,
} from "@/lib/admin";

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
  role: z.enum(userRoles),
});

export const userStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(userStatuses),
});

export const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  confirmation: z.string().min(1, "Type DELETE to confirm."),
});

export type TicketInput = z.infer<typeof ticketSchema>;
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
