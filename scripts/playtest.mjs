// Plays one single-player match in a headless browser and saves screenshots.
// Needs the dev server running (`npm run dev`) and Playwright available:
//   npm i --no-save playwright
//   node scripts/playtest.mjs [Detective|Vigilante] [outDir]
// Set CHROMIUM_PATH to use an already-installed Chromium instead of
// Playwright's own download.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const side = process.argv[2] === "Vigilante" ? "Vigilante" : "Independent Detective";
const outDir = process.argv[3] || "playtest-shots";
const url = process.env.GAME_URL || "http://localhost:5173";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(url);
await page.waitForTimeout(2500);
// window.__game and window.__caseScene are exposed in dev builds only.
await page.evaluate((side) => {
  const game = window.__game;
  game.registry.set("playerCharacter", side);
  game.scene.getScenes(true)[0].scene.start("CaseBattleScene");
}, side);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/00-start.png` });

for (let turn = 1; turn <= 12; turn++) {
  // Play the most expensive affordable card each turn.
  const choice = await page.evaluate(() => {
    const s = window.__caseScene;
    if (s.state.winner) return { done: true };
    const me = s.state.sides[s.playerSide];
    let best = null;
    me.hand.forEach((c, i) => {
      if (c.cost <= me.energy && (best === null || c.cost > me.hand[best].cost)) best = i;
    });
    return { best };
  });
  if (choice.done) break;
  await page.evaluate((i) => {
    window.__caseScene.confirmPlay(i);
  }, choice.best);
  // Headless rendering runs slower than real time, so frames are spaced out.
  for (let f = 0; f < 4; f++) {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/t${String(turn).padStart(2, "0")}-${f}.png` });
  }
  for (let k = 0; k < 60; k++) {
    const busy = await page.evaluate(() => window.__caseScene.busy && !window.__caseScene.state.winner);
    if (!busy) break;
    await page.waitForTimeout(250);
  }
}

await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/99-end.png` });
const result = await page.evaluate(() => {
  const s = window.__caseScene.state;
  return { winner: s.winner, reason: s.endReason, turn: s.turn };
});
console.log(JSON.stringify({ result, errors }, null, 2));
await browser.close();
