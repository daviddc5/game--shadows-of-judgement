import { describe, it, expect } from "vitest";
import { CHARACTERS, getCharacter, portraitFiles, portraitKey, randomCharacter } from "./characters.js";

describe("characters", () => {
  it("every side has at least one character with a neutral portrait", () => {
    for (const side of ["detective", "vigilante"]) {
      expect(CHARACTERS[side].length).toBeGreaterThan(0);
      CHARACTERS[side].forEach((c) => expect(c.files.neutral).toBeTruthy());
    }
  });

  it("character ids are unique", () => {
    const ids = Object.values(CHARACTERS).flat().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to the side's first character for an unknown or wrong-side id", () => {
    expect(getCharacter("detective", "mara").id).toBe("mara");
    expect(getCharacter("detective", "wren").id).toBe(CHARACTERS.detective[0].id);
    expect(getCharacter("vigilante", undefined).id).toBe(CHARACTERS.vigilante[0].id);
  });

  it("uses the neutral portrait when a mood variant is missing", () => {
    const mara = getCharacter("detective", "mara");
    expect(portraitKey(mara, "winning")).toBe("mara-neutral");
    expect(portraitKey(getCharacter("detective", "detective"), "winning")).toBe("detective-winning");
  });

  it("lists every portrait file to load", () => {
    const keys = portraitFiles().map((f) => f.key);
    expect(keys).toContain("wren-neutral");
    expect(keys).toContain("killer-losing");
  });

  it("random characters come from the requested side", () => {
    expect(randomCharacter("vigilante", () => 0.99).id).toBe(CHARACTERS.vigilante.at(-1).id);
  });
});
