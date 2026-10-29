// Playable characters. Every match is one Detective against one Vigilante;
// within a side, the player picks who they play as.
//
// To add a character: add an entry below and put its portraits in
// public/assets/images/. `files.neutral` is required; `winning` and `losing`
// are optional mood variants (the neutral portrait is used when one is missing).
// `passive` is the character's ability, a key of PASSIVES in rules.js.
// Portraits are square, 1024×1024. The current characters use only their
// neutral portrait (the owner dropped the happy and upset ones).
//
// Draft portraits for Mara Vale (detective) and Wren (vigilante) are kept in
// art/drafts/ but not used: the owner is holding off on more AI-made art.

export const CHARACTERS = {
  detective: [
    {
      id: "detective",
      name: "Deniz Kaya",
      portrait: "detective",
      passive: "hunch",
      files: {
        neutral: "DetectivePortraits/detective-neutral.png",
      },
    },
  ],
  vigilante: [
    {
      id: "vigilante",
      name: "Giovanni Santoro",
      portrait: "killer",
      passive: "patience",
      files: {
        neutral: "KillerPortraits/killer-neutral.png",
      },
    },
  ],
};

/** The character with this id on this side, or the side's first character. */
export function getCharacter(side, id) {
  return CHARACTERS[side].find((c) => c.id === id) ?? CHARACTERS[side][0];
}

/** Each side's ability for these character ids, for createMatch's `passives`. */
export function passivesFor(characterIds = {}) {
  return {
    detective: getCharacter("detective", characterIds.detective).passive ?? null,
    vigilante: getCharacter("vigilante", characterIds.vigilante).passive ?? null,
  };
}

export function randomCharacter(side, rng = Math.random) {
  const list = CHARACTERS[side];
  return list[Math.floor(rng() * list.length)];
}

/** Texture key for a character's portrait in a mood, falling back to neutral. */
export function portraitKey(character, mood = "neutral") {
  return `${character.portrait}-${character.files[mood] ? mood : "neutral"}`;
}

/** Every portrait to load: [{ key, path }] with paths under assets/images/. */
export function portraitFiles() {
  return Object.values(CHARACTERS)
    .flat()
    .flatMap((c) => Object.entries(c.files).map(([mood, file]) => ({ key: `${c.portrait}-${mood}`, path: file })));
}
