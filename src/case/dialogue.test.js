import { describe, it, expect } from "vitest";
import { CHARACTERS } from "./characters.js";
import { LINES, pickLine } from "./dialogue.js";

describe("dialogue", () => {
  it("every character has lines for every moment", () => {
    const moments = ["start", "reply", "QUICK", "NORMAL", "POWER", "COUNTER", "BAIT", "AMBUSH", "WAIT", "fizzle", "winning", "losing", "win", "lose"];
    for (const c of [...CHARACTERS.detective, ...CHARACTERS.vigilante]) {
      for (const moment of moments) expect(LINES[c.id]?.[moment]?.length, `${c.id} ${moment}`).toBeGreaterThan(0);
    }
  });

  it("picks one of the character's lines, or null when they have none", () => {
    expect(LINES.detective.win).toContain(pickLine("detective", "win", () => 0.99));
    expect(pickLine("detective", "no-such-moment")).toBeNull();
    expect(pickLine("nobody", "win")).toBeNull();
  });

  it("avoids lines already used while others are left", () => {
    const [first, ...rest] = LINES.vigilante.POWER;
    const used = new Set(rest);
    expect(pickLine("vigilante", "POWER", () => 0.99, used)).toBe(first);
    used.add(first);
    expect(LINES.vigilante.POWER).toContain(pickLine("vigilante", "POWER", Math.random, used));
  });
});
