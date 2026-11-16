import { z } from "zod";

export function isValidGitHubUsername(value: string) {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value);
}

export const githubUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ""))
    .refine((value) => value === "" || isValidGitHubUsername(value), "Enter a valid GitHub username.")
    .transform((value) => (value === "" ? null : value)),
});

export type GitHubUsernameInput = z.infer<typeof githubUsernameSchema>;

export const deleteGitHubRepositorySchema = z.object({
  owner: z
    .string()
    .trim()
    .min(1, "Repository owner is required.")
    .max(39, "Repository owner is too long.")
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, "Invalid repository owner."),
  repo: z
    .string()
    .trim()
    .min(1, "Repository name is required.")
    .max(100, "Repository name is too long.")
    .regex(/^[A-Za-z0-9._-]+$/, "Invalid repository name."),
  confirmation: z.string().trim().min(1, "Type the repository name to confirm."),
});
