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
