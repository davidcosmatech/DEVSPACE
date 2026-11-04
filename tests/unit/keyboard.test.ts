import { describe, expect, it } from "vitest";

import { isTypingTarget } from "@/lib/keyboard";

function element(tagName: string, options: { editable?: boolean; closest?: string | null } = {}) {
  return {
    tagName,
    isContentEditable: options.editable ?? false,
    closest(selector: string) {
      return options.closest && selector.includes(options.closest) ? {} : null;
    },
  };
}

describe("isTypingTarget", () => {
  it("recognises the standard editable fields", () => {
    expect(isTypingTarget(element("INPUT"))).toBe(true);
    expect(isTypingTarget(element("TEXTAREA"))).toBe(true);
    expect(isTypingTarget(element("SELECT"))).toBe(true);
  });

  it("recognises contentEditable editors and their descendants", () => {
    expect(isTypingTarget(element("DIV", { editable: true }))).toBe(true);
    expect(isTypingTarget(element("SPAN", { closest: '[contenteditable="true"]' }))).toBe(true);
  });

  it("ignores buttons, links and non-editable elements", () => {
    expect(isTypingTarget(element("BUTTON"))).toBe(false);
    expect(isTypingTarget(element("A"))).toBe(false);
    expect(isTypingTarget(element("DIV"))).toBe(false);
  });

  it("is safe for missing or unusual targets", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
    expect(isTypingTarget({})).toBe(false);
    expect(isTypingTarget("input")).toBe(false);
    expect(
      isTypingTarget({
        tagName: "DIV",
        closest() {
          throw new Error("no DOM");
        },
      }),
    ).toBe(false);
  });
});
