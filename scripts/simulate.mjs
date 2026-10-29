// Plays AI-vs-AI matches with the Case meter rules and prints balance stats.
// Usage: npm run simulate -- [games] [rule=value ...]
import { RULES, createMatch, resolveTurn, startTurn } from "../src/case/rules.js";
import { chooseAiPlay } from "../src/case/ai.js";
import { passivesFor } from "../src/case/characters.js";

const games = Number(process.argv[2] || 5000);
// Optional overrides, e.g. npm run simulate -- 5000 pushScale=1.5 escalation=0.1
// Each side plays its default character's ability; override with e.g.
// detective=none vigilante=hunch.
const rules = { ...RULES };
const passives = passivesFor();
process.argv.slice(3).forEach((arg) => {
  const [key, value] = arg.split("=");
  if (key === "detective" || key === "vigilante") passives[key] = value === "none" ? null : value;
  else rules[key] = Number(value);
});
const wins = { detective: 0, vigilante: 0, draw: 0 };
const reasons = { capture: 0, escape: 0, verdict: 0 };
const lengths = [];
const played = {}; // card type (or WAIT) -> times played
const paidOff = {}; // COUNTER hits, BAIT/AMBUSH springs
const effects = {}; // status effects put on the opponent
let plays = 0;

for (let g = 0; g < games; g++) {
  const state = createMatch({ rules, passives });
  while (!state.winner) {
    const choice = {
      detective: chooseAiPlay(state, "detective"),
      vigilante: chooseAiPlay(state, "vigilante"),
    };
    const { events } = resolveTurn(state, choice);
    events.forEach((e) => {
      if (e.type === "wait") played.WAIT = (played.WAIT || 0) + 1;
      if (e.card && e.type !== "effect") played[e.card.type] = (played[e.card.type] || 0) + 1;
      if (e.type === "effect") effects[e.effect] = (effects[e.effect] || 0) + 1;
      if (e.type === "counter" || e.type === "sprung") {
        paidOff[e.card.type] = (paidOff[e.card.type] || 0) + 1;
      }
    });
    plays += 2;
    if (!state.winner) startTurn(state);
  }
  wins[state.winner]++;
  reasons[state.endReason]++;
  lengths.push(state.turn);
}

lengths.sort((a, b) => a - b);
const pct = (n) => `${((100 * n) / games).toFixed(1)}%`;
const at = (q) => lengths[Math.floor(q * (lengths.length - 1))];
console.log(`games: ${games}, abilities: detective ${passives.detective ?? "none"}, vigilante ${passives.vigilante ?? "none"}`);
console.log(`wins: detective ${pct(wins.detective)}, vigilante ${pct(wins.vigilante)}, draw ${pct(wins.draw)}`);
console.log(`ended by: capture ${pct(reasons.capture)}, escape ${pct(reasons.escape)}, verdict ${pct(reasons.verdict)}`);
console.log(`turns: p10 ${at(0.1)}, median ${at(0.5)}, p90 ${at(0.9)}`);
const share = (n) => `${((100 * (n || 0)) / plays).toFixed(1)}%`;
console.log(
  "plays: " +
    ["QUICK", "NORMAL", "POWER", "COUNTER", "BAIT", "AMBUSH", "WAIT"]
      .map((t) => `${t} ${share(played[t])}`)
      .join(", "),
);
console.log(
  "paid off: " +
    ["COUNTER", "BAIT", "AMBUSH"]
      .map((t) => `${t} ${(((paidOff[t] || 0) / (played[t] || 1)) * 100).toFixed(0)}%`)
      .join(", "),
);
console.log(
  "effects landed: " +
    ["shaken", "cornered", "heat"].map((k) => `${k} ${share(effects[k])}`).join(", "),
);
