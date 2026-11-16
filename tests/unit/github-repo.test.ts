import { describe, expect, it } from "vitest";

import { parseGitHubRepo } from "@/lib/github-repo";

describe("parseGitHubRepo", () => {
  it("parses https URLs with optional .git, www and extra path", () => {
    expect(parseGitHubRepo("https://github.com/octocat/Hello-World")).toEqual({
      owner: "octocat",
      name: "Hello-World",
      fullName: "octocat/Hello-World",
      htmlUrl: "https://github.com/octocat/Hello-World",
    });
    expect(parseGitHubRepo("https://www.github.com/owner/repo.git")?.fullName).toBe("owner/repo");
    expect(parseGitHubRepo("https://github.com/owner/repo/tree/main/src")?.fullName).toBe("owner/repo");
    expect(parseGitHubRepo("github.com/owner/repo")?.fullName).toBe("owner/repo");
  });

  it("parses SSH remotes", () => {
    expect(parseGitHubRepo("git@github.com:owner/repo.git")?.fullName).toBe("owner/repo");
  });

  it("rejects other hosts, missing repositories and invalid names", () => {
    expect(parseGitHubRepo("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseGitHubRepo("https://github.com/owner")).toBeNull();
    expect(parseGitHubRepo("https://github.com/")).toBeNull();
    expect(parseGitHubRepo("not a url")).toBeNull();
    expect(parseGitHubRepo("https://github.com/../repo")).toBeNull();
    expect(parseGitHubRepo("")).toBeNull();
    expect(parseGitHubRepo(null)).toBeNull();
  });
});
