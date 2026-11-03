import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes with a salt and verifies the correct password", async () => {
    const first = await hashPassword("Devspace123!");
    const second = await hashPassword("Devspace123!");

    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("Devspace123!", first)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", first)).resolves.toBe(false);
  });
});
