import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { backupSchema } from "@/lib/validation/backup";
import { projectSchema } from "@/lib/validation/project";
import { changePasswordSchema, profileSchema } from "@/lib/validation/settings";
import { workspaceLinkSchema, workspaceSchema } from "@/lib/validation/workspace";

describe("authentication validation", () => {
  it("accepts a valid login and normalizes email", () => {
    const parsed = loginSchema.parse({ email: "Demo@DevSpace.App", password: "Devspace123!" });
    expect(parsed.email).toBe("demo@devspace.app");
  });

  it("rejects weak passwords and mismatched confirmation", () => {
    const weak = registerSchema.safeParse({
      displayName: "Ada Lovelace",
      username: "ada",
      email: "ada@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(weak.success).toBe(false);

    const mismatch = registerSchema.safeParse({
      displayName: "Ada Lovelace",
      username: "ada",
      email: "ada@example.com",
      password: "StrongPass1",
      confirmPassword: "StrongPass2",
    });
    expect(mismatch.success).toBe(false);
  });

  it("validates reset links with a token", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "short",
        password: "StrongPass1",
        confirmPassword: "StrongPass1",
      }).success,
    ).toBe(false);
  });
});

describe("project validation", () => {
  it("accepts a complete project", () => {
    const result = projectSchema.safeParse({
      name: "DEVSPACE",
      description: "Workspace",
      status: "Active",
      technology: "Next.js",
      repositoryUrl: "https://github.com/example/devspace",
      priority: "high",
      visibility: "public",
      workspaceId: "2f056e14-2f9e-4f2e-8e57-d1f4f3a64e9d",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a private project with no workspace", () => {
    const result = projectSchema.safeParse({
      name: "Private project",
      description: "",
      status: "Planning",
      technology: "",
      priority: "medium",
      visibility: "private",
      workspaceId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workspaceId).toBe("");
    }
  });

  it("rejects invalid status and repository protocols", () => {
    expect(
      projectSchema.safeParse({
        name: "Test",
        description: "",
        status: "Shipping",
        technology: "",
        repositoryUrl: "javascript:alert(1)",
        priority: "high",
        visibility: "private",
        workspaceId: "",
      }).success,
    ).toBe(false);
  });
});

describe("workspace validation", () => {
  it("validates workspace and link fields", () => {
    expect(
      workspaceSchema.safeParse({ name: "Frontend", description: "", category: "Development" })
        .success,
    ).toBe(true);

    expect(
      workspaceLinkSchema.safeParse({
        workspaceId: "2f056e14-2f9e-4f2e-8e57-d1f4f3a64e9d",
        title: "Next.js",
        url: "nextjs.org/docs",
        category: "Documentation",
      }).success,
    ).toBe(true);

    expect(
      workspaceLinkSchema.safeParse({
        workspaceId: "not-a-uuid",
        title: "Bad",
        url: "javascript:alert(1)",
        category: "General",
      }).success,
    ).toBe(false);
  });
});

describe("profile validation", () => {
  it("rejects unsafe avatar URLs", () => {
    const result = profileSchema.safeParse({
      displayName: "David Cosma",
      username: "davidcosmatech",
      bio: "",
      avatarUrl: "javascript:alert(1)",
      githubUsername: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("backup validation", () => {
  it("accepts a versioned DEVSPACE backup", () => {
    const result = backupSchema.safeParse({
      app: "DEVSPACE",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      projects: [
        {
          name: "DEVSPACE",
          description: "Workspace",
          status: "Active",
          technology: "Next.js",
          priority: "high",
        },
      ],
      notes: [{ title: "A note", content: "# Hello", category: "General", isPinned: false }],
      workspaces: [
        {
          name: "Docs",
          description: "",
          category: "Learning",
          links: [{ title: "Next.js", url: "https://nextjs.org", category: "Docs" }],
        },
      ],
      trackerFiles: [
        { filename: "README.md", description: "", fileSize: 100, uploadStatus: "uploaded" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projects[0].priority).toBe("high");
    }
  });

  it("rejects an unsupported schema version", () => {
    expect(
      backupSchema.safeParse({ app: "DEVSPACE", schemaVersion: 2, exportedAt: new Date().toISOString() })
        .success,
    ).toBe(false);
  });
});


describe("change password validation", () => {
  const base = {
    currentPassword: "OldPass123",
    newPassword: "NewPass456",
    confirmPassword: "NewPass456",
  };

  it("accepts a valid change", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it("requires all fields", () => {
    expect(changePasswordSchema.safeParse({ ...base, currentPassword: "" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "" }).success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const parsed = changePasswordSchema.safeParse({ ...base, confirmPassword: "Different456" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Passwords do not match.");
    }
  });

  it("rejects weak new passwords", () => {
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "weak", confirmPassword: "weak" }).success).toBe(false);
  });

  it("rejects reusing the current password", () => {
    const parsed = changePasswordSchema.safeParse({
      currentPassword: "OldPass123",
      newPassword: "OldPass123",
      confirmPassword: "OldPass123",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("different from your current");
    }
  });
});
