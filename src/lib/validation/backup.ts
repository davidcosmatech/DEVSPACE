import { z } from "zod";

import { projectPriorities, projectStatuses } from "./project";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date.");

export const backupProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  status: z.enum(projectStatuses),
  technology: z.string().max(120).default(""),
  repositoryUrl: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Repository URL must use http(s)."),
  priority: z.enum(projectPriorities).default("medium"),
  createdAt: dateString.optional(),
  updatedAt: dateString.optional(),
});

export const backupNoteSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().max(200_000).default(""),
  category: z.string().max(60).default("General"),
  isPinned: z.boolean().default(false),
  createdAt: dateString.optional(),
  updatedAt: dateString.optional(),
});

export const backupLinkSchema = z.object({
  title: z.string().min(1).max(120),
  url: z.string().url().max(1000),
  category: z.string().max(60).default("General"),
});

export const backupWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  category: z.string().max(60).default("General"),
  links: z.array(backupLinkSchema).max(500).default([]),
  createdAt: dateString.optional(),
  updatedAt: dateString.optional(),
});

export const backupTrackerSchema = z.object({
  filename: z.string().min(1).max(255),
  description: z.string().max(1000).default(""),
  fileSize: z.number().int().nonnegative().max(4 * 1024 * 1024).default(0),
  uploadStatus: z.string().max(20).optional(),
  createdAt: dateString.optional(),
  updatedAt: dateString.optional(),
});

export const backupSchema = z.object({
  app: z.literal("DEVSPACE"),
  schemaVersion: z.literal(1),
  exportedAt: dateString,
  profile: z
    .object({
      username: z.string().max(40),
      displayName: z.string().max(80),
      bio: z.string().max(2000).optional(),
      avatarUrl: z.string().max(1000).nullable().optional(),
      githubUsername: z.string().max(39).nullable().optional(),
    })
    .optional(),
  settings: z
    .object({
      theme: z.string().max(12).optional(),
      language: z.string().max(8).optional(),
      preferences: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  projects: z.array(backupProjectSchema).max(2000).default([]),
  notes: z.array(backupNoteSchema).max(2000).default([]),
  workspaces: z.array(backupWorkspaceSchema).max(1000).default([]),
  trackerFiles: z.array(backupTrackerSchema).max(5000).default([]),
});

export type BackupData = z.infer<typeof backupSchema>;
