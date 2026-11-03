import { z } from "zod";

export const projectStatuses = ["Planning", "Active", "Development", "On Hold", "Completed"] as const;
export const projectPriorities = ["low", "medium", "high"] as const;

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters.").max(120),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
  status: z.enum(projectStatuses),
  technology: z.string().trim().max(120),
  repositoryUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "Enter a valid http(s) repository URL."),
  priority: z.enum(projectPriorities),
});

export type ProjectInput = z.infer<typeof projectSchema>;
