import { describe, expect, it } from "vitest";

import {
  canViewPrivateRepos,
  normalizeLogin,
  summarizePrivateRepos,
} from "@/lib/github-private";

describe("normalizeLogin", () => {
  it("trims, lowercases and strips a leading at-sign", () => {
    expect(normalizeLogin("  @DavidCosmaTech ")).toBe("davidcosmatech");
    expect(normalizeLogin(null)).toBe("");
    expect(normalizeLogin(undefined)).toBe("");
  });
});

describe("canViewPrivateRepos", () => {
  it("allows the exact owner in any letter case", () => {
    expect(canViewPrivateRepos("davidcosmatech", "DavidCosmaTech")).toBe(true);
    expect(canViewPrivateRepos("@davidcosmatech", "davidcosmatech")).toBe(true);
  });

  it("rejects a different connected account", () => {
    expect(canViewPrivateRepos("octocat", "davidcosmatech")).toBe(false);
  });

  it("rejects missing values so a missing token never leaks private data", () => {
    expect(canViewPrivateRepos("davidcosmatech", null)).toBe(false);
    expect(canViewPrivateRepos(null, "davidcosmatech")).toBe(false);
    expect(canViewPrivateRepos("", "")).toBe(false);
  });
});

describe("summarizePrivateRepos", () => {
  it("counts repositories, unique languages and the latest update", () => {
    const summary = summarizePrivateRepos([
      { language: "TypeScript", updatedAt: "2026-01-02T10:00:00Z" },
      { language: "Python", updatedAt: "2026-03-04T10:00:00Z" },
      { language: "TypeScript", updatedAt: "2025-12-31T10:00:00Z" },
      { language: null, updatedAt: "" },
    ]);

    expect(summary.count).toBe(4);
    expect(summary.languages).toEqual(["Python", "TypeScript"]);
    expect(summary.lastUpdatedAt).toBe("2026-03-04T10:00:00Z");
  });

  it("returns safe defaults for an empty list", () => {
    expect(summarizePrivateRepos([])).toEqual({
      count: 0,
      languages: [],
      lastUpdatedAt: null,
    });
    expect(summarizePrivateRepos()).toEqual({
      count: 0,
      languages: [],
      lastUpdatedAt: null,
    });
  });
});
