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

  it("finds a character by id and falls back to the side's first for an unknown or wrong-side id", () => {
    const [firstDetective] = CHARACTERS.detective;
    const [firstVigilante] = CHARACTERS.vigilante;
    expect(getCharacter("detective", firstDetective.id)).toBe(firstDetective);
    expect(getCharacter("detective", firstVigilante.id)).toBe(firstDetective);
    expect(getCharacter("vigilante", undefined)).toBe(firstVigilante);
  });

  it("uses the neutral portrait when a mood variant is missing", () => {
    const neutralOnly = { portrait: "draft", files: { neutral: "draft.png" } };
    expect(portraitKey(neutralOnly, "winning")).toBe("draft-neutral");
    expect(portraitKey(CHARACTERS.detective[0], "winning")).toBe("detective-neutral");
  });

  it("lists every portrait file to load", () => {
    const keys = portraitFiles().map((f) => f.key);
    expect(keys).toContain("detective-neutral");
    expect(keys).toContain("killer-neutral");
  });

  it("random characters come from the requested side", () => {
    expect(CHARACTERS.vigilante).toContain(randomCharacter("vigilante", () => 0.99));
  });
});
