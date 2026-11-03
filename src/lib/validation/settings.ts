import { z } from "zod";

export const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
] as const;

export const languageValues = ["en", "es", "fr"] as const;

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters.")
    .max(40, "Use 40 characters or fewer.")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens or underscores."),
  bio: z.string().trim().max(500, "Keep your bio under 500 characters."),
  avatarUrl: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "Enter a valid http(s) image URL."),
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

export const appearanceSchema = z.object({
  theme: z.enum(["dark", "light"]),
  language: z.enum(languageValues),
});

export const deleteAccountSchema = z.object({
  confirmation: z.string().min(1, "Type DELETE to confirm."),
  password: z.string().min(1, "Enter your password."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type AppearanceInput = z.infer<typeof appearanceSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
