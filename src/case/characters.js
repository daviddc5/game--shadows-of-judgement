// Playable characters. Every match is one Detective against one Vigilante;
// within a side, the player picks who they play as.
//
// To add a character: add an entry below and put its portraits in
// public/assets/images/. `files.neutral` is required; `winning` and `losing`
// are optional mood variants (the neutral portrait is used when one is missing).
// Portraits are square, 1024×1024.

export const CHARACTERS = {
  detective: [
    {
      id: "detective",
      name: "The Detective",
      portrait: "detective",
      files: {
        neutral: "DetectivePortraits/detective-neutral.png",
        winning: "DetectivePortraits/detective-winning.png",
        losing: "DetectivePortraits/detective-losing.png",
      },
    },
    {
      id: "mara",
      name: "Mara Vale",
      portrait: "mara",
      files: { neutral: "Characters/mara-neutral.jpg" },
    },
  ],
  vigilante: [
    {
      id: "vigilante",
      name: "The Vigilante",
      portrait: "killer",
      files: {
        neutral: "KillerPortraits/killer-neutral.png",
        winning: "KillerPortraits/killer-winning.png",
        losing: "KillerPortraits/killer-losing.png",
      },
    },
    {
      id: "wren",
      name: "Wren",
      portrait: "wren",
      files: { neutral: "Characters/wren-neutral.jpg" },
    },
  ],
};

/** The character with this id on this side, or the side's first character. */
export function getCharacter(side, id) {
  return CHARACTERS[side].find((c) => c.id === id) ?? CHARACTERS[side][0];
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
