import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Give the note a title.").max(160, "Title is too long."),
  content: z.string().max(200_000, "This note is too large."),
  category: z.string().trim().max(60, "Category is too long.").default("General"),
  isPinned: z.boolean().default(false),
});

export type NoteInput = z.infer<typeof noteSchema>;
