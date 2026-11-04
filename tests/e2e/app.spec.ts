import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const suffix = Date.now().toString().slice(-6);

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
}

test("shows the real dashboard and has no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await signIn(page);
  await expect(page.getByRole("heading", { name: /Welcome back, David/ })).toBeVisible();
  await expect(page.getByText("Total Projects")).toBeVisible();
  await expect(page.getByText("Your Projects")).toBeVisible();
  await expect(page.getByText("Markdown Upload Tracker")).toBeVisible();
  await expect(page.getByText("Quick Actions")).toBeVisible();
  await page.waitForTimeout(1200);
  expect(errors).toEqual([]);
});

test("rejects invalid credentials and accepts the demo login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("nobody@example.com");
  await page.locator("#password").fill("WrongPass1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText("incorrect");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.waitForURL("**/dashboard");
});

test("creates, edits and deletes a project", async ({ page }) => {
  const name = `E2E Project ${suffix}`;
  await signIn(page);
  await page.goto("/projects");

  await page.getByRole("button", { name: "New Project" }).first().click();
  await page.locator("#project-name").fill(name);
  await page.locator("#project-description").fill("Created by Playwright");
  await page.locator("#project-status").selectOption("Planning");
  await page.locator("#project-technology").fill("Playwright");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  await page.getByRole("button", { name: `Edit ${name}` }).click();
  await page.locator("#project-status").selectOption("Completed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".data-row", { hasText: name }).getByText("Completed")).toBeVisible();

  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("creates, autosaves, previews and deletes a Markdown note", async ({ page }) => {
  const title = `E2E Note ${suffix}`;
  await signIn(page);
  await page.goto("/notes?new=1");
  await expect(page.locator(".note-title-input")).toBeVisible();
  await page.locator(".note-title-input").fill(title);
  await page.locator(".note-textarea").fill(`# ${title}\n\nA **bold** note with a list:\n\n- one\n- two`);
  await page.waitForTimeout(1800);
  await expect(page.getByText(/Saved/).first()).toBeVisible();

  await page.getByRole("button", { name: /Preview/ }).click();
  await expect(page.locator(".note-preview h1")).toHaveText(title);

  await page.getByRole("button", { name: "Delete note" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});

test("creates a workspace with a validated link and deletes it", async ({ page }) => {
  const name = `E2E Workspace ${suffix}`;
  await signIn(page);
  await page.goto("/workspaces");
  await page.getByRole("button", { name: "New Workspace" }).first().click();
  await page.locator("#workspace-name").fill(name);
  await page.locator("#workspace-description").fill("Playwright workspace");
  await page.locator("#workspace-category").fill("Testing");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText(name).first()).toBeVisible();

  const card = page.locator(".workspace-card", { hasText: name });
  await card.getByRole("button", { name: "Add link" }).click();
  await page.locator("#link-title").fill("Playwright");
  await page.locator("#link-url").fill("https://playwright.dev");
  await page.locator("#link-category").fill("Testing");
  await page.getByRole("button", { name: "Add link" }).last().click();
  await expect(card.getByText("Playwright").first()).toBeVisible();

  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("uploads and deletes a Markdown file", async ({ page }, testInfo) => {
  const filename = `playwright-${suffix}.md`;
  const path = testInfo.outputPath(filename);
  writeFileSync(path, `# Playwright upload\n\nA real file for the tracker test.`);

  await signIn(page);
  await page.goto("/tracker");
  await page.locator(".upload-zone input[type=file]").setInputFiles(path);
  await page.getByRole("button", { name: "Upload file" }).click();
  await expect(page.getByText(filename).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Uploaded").first()).toBeVisible();

  await page.getByRole("button", { name: `Delete ${filename}` }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(filename)).toHaveCount(0);
});

test("persists theme changes and exports a valid backup", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings?tab=appearance");
  await page.getByRole("button", { name: /Daylight/ }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("light");
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("light");
  await page.getByRole("button", { name: /Graphite dark/ }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("dark");

  const response = await page.request.get("/api/export");
  expect(response.status()).toBe(200);
  const backup = await response.json();
  expect(backup.app).toBe("DEVSPACE");
  expect(backup.schemaVersion).toBe(1);
  expect(Array.isArray(backup.projects)).toBe(true);
});

test("opens the command palette and finds workspace content", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  await page.waitForTimeout(500);
  await page.keyboard.press("Control+k");
  const search = page.getByPlaceholder(/Search projects/);
  await expect(search).toBeVisible();
  await search.fill("DEVSPACE");
  await expect(page.getByText("DEVSPACE", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
});

test("is responsive without horizontal overflow", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await signIn(page);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.locator(".icon-button.mobile-menu").click();
  await expect(page.locator(".sidebar.open")).toBeVisible();
  await page.getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/projects/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await context.close();
});

test("keeps keyboard focus while typing in a controlled dialog field", async ({ page }) => {
  await page.addInitScript(() => {
    const pickerHost = window as unknown as {
      showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
    };
    pickerHost.showDirectoryPicker = async () => {
      const root = await navigator.storage.getDirectory();
      return root.getDirectoryHandle("E2E Parent", { create: true });
    };
  });

  await signIn(page);
  await page.goto("/files");
  await page.getByRole("button", { name: "New Workspace" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Workspace folder name").fill(`E2E Focus ${suffix}`);
  await dialog.getByRole("button", { name: "Choose location & create" }).click();
  await expect(page.getByRole("button", { name: "New File" })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "New File" }).click();
  const content = page.locator("#local-file-content");
  await content.click();
  await page.keyboard.type("abcdef with spaces", { delay: 60 });

  await expect(content).toHaveValue(/abcdef with spaces/);
  await expect(content).toBeFocused();
});

test("ignores the global shortcut while the user is typing", async ({ page }) => {
  await signIn(page);
  await page.goto("/notes?new=1");
  const textarea = page.locator(".note-textarea");
  await textarea.click();
  await page.keyboard.type("typing before the shortcut", { delay: 40 });
  await page.keyboard.press("Control+k");
  await expect(page.locator(".command-panel")).toHaveCount(0);
  await expect(textarea).toBeFocused();
  await expect(page.getByRole("button", { name: "Close dialog" })).toHaveCount(0);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Control+k");
  await expect(page.locator(".command-panel")).toBeVisible();
  await page.keyboard.press("Escape");
});
