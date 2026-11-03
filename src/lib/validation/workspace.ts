import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters.").max(100),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
  category: z.string().trim().min(1, "Choose a category.").max(60),
});

export const workspaceLinkSchema = z.object({
  workspaceId: z.string().uuid("Choose a workspace."),
  title: z.string().trim().min(1, "Give the link a title.").max(120),
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL.")
    .max(1000)
    .refine((value) => {
      try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
      } catch {
        return false;
      }
    }, "Enter a valid http(s) URL."),
  category: z.string().trim().min(1, "Choose a category.").max(60),
});

export type WorkspaceInput = z.infer<typeof workspaceSchema>;
export type WorkspaceLinkInput = z.infer<typeof workspaceLinkSchema>;
