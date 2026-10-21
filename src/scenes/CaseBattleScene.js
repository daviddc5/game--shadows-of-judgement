import Phaser from "phaser";
import { SIDES } from "../case/cards.js";
import {
  canAfford,
  createMatch,
  otherSide,
  pushFor,
  resolveTurn,
  startTurn,
} from "../case/rules.js";
import { chooseAiPlay } from "../case/ai.js";
import { getCharacter, portraitKey, randomCharacter } from "../case/characters.js";
import { pickLine } from "../case/dialogue.js";
import NetworkManager from "../network/NetworkManager.js";
import { FONTS, getTheme, hex, paintBackground, zone } from "../theme.js";
import { button } from "../ui/widgets.js";
import { ensureTypeIcons, iconKey } from "../ui/cardIcons.js";
import { buildPlaceholderArt } from "../ui/cardArtPlaceholder.js";

const W = 750;
const H = 1334;

const FONT_DISPLAY = FONTS.display;
const FONT_BODY = FONTS.body;

const METER = { x: 60, y: 372, w: 630, h: 18 };
const SLOT = { opponent: { x: 230, y: 625 }, player: { x: 520, y: 625 } };
const CARD_W = 168;
const CARD_H = 260;
// Art box on every card. Artists: draw at 16:9, at least 640×360 (shown at 148×84).
const ART_W = 148;
const ART_H = 84;
const ART_Y = 4;
const HAND_Y = 1075;

const TYPE_NAMES = {
  COUNTER: "Counter",
  QUICK: "Quick",
  NORMAL: "Normal",
  POWER: "Power",
  BAIT: "Bait",
  AMBUSH: "Ambush",
};

const wait = (scene, ms) =>
  new Promise((resolve) => scene.time.delayedCall(ms, resolve));

const tween = (scene, config) =>
  new Promise((resolve) => scene.tweens.add({ ...config, onComplete: resolve }));

// Words on the cut-in band for each big play.
const CUT_IN_KICKER = {
  POWER: "Power Play",
  COUNTER: "Counter",
  BAIT: "Baited!",
  AMBUSH: "Ambushed!",
};

function roman(n) {
  const table = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [value, letters] of table) {
    while (n >= value) {
      out += letters;
      n -= value;
    }
  }
  return out;
}

const rgb = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

/** Builds a client-side match state from a server view (the opponent's hand stays hidden). */
function stateFromView(view) {
  const state = { sides: { detective: {}, vigilante: {} } };
  applyView(state, view);
  return state;
}

function applyView(state, view) {
  const opponent = otherSide(view.side);
  Object.assign(state, {
    rules: view.rules,
    turn: view.turn,
    caseValue: view.caseValue,
    winner: view.winner,
    endReason: view.endReason,
  });
  state.sides[view.side] = { ...view.you };
  state.sides[opponent] = {
    energy: view.opponent.energy,
    hand: new Array(view.opponent.handCount).fill(null),
    history: view.opponent.history,
  };
}

/**
 * Battle using the Case meter ruleset (src/case).
 * Single player runs the rules locally against the AI. Online play
 * (scene data `{ online: matchFoundData }`) sends choices to the server,
 * which runs the same rules, and animates the events it sends back.
 * Colours come from the player's chosen theme (src/theme.js).
 */
export default class CaseBattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "CaseBattleScene" });
  }

  create(data) {
    this.online = data?.online ?? null;
    if (this.online) {
      this.playerSide = this.online.side;
      this.state = stateFromView(this.online.view);
      this.setupNetwork();
    } else {
      const playerCharacter = this.registry.get("playerCharacter");
      this.playerSide = playerCharacter === "Vigilante" ? "vigilante" : "detective";
      this.state = createMatch();
    }
    this.opponentSide = otherSide(this.playerSide);
    // Who each side is played as. getCharacter falls back to the side's default,
    // e.g. when the server switched our side or an id is unknown.
    this.playerCharacter = getCharacter(this.playerSide, this.registry.get("playerCharacterId"));
    this.opponentCharacter = this.online
      ? getCharacter(this.opponentSide, this.online.opponent?.characterId)
      : randomCharacter(this.opponentSide);
    this.theme = getTheme();
    this.selectedIndex = null;
    this.busy = false;
    this.handCards = [];
    this.arenaObjects = [];
    this.bubbles = {};
    this.usedLines = new Set();
    this.thoughtCount = 0;

    this.createTextures();
    paintBackground(this, this.theme);
    this.createTopBar();
    this.createOpponentPanel();
    this.createMeter();
    this.createArena();
    this.createPlayerPanel();
    this.createButtons();

    if (import.meta.env.DEV) {
      window.__caseScene = this;
      if (this.registry.get("debugMode") && !this.online) this.createDebugControls();
    }
    this.events.once("shutdown", () => NetworkManager.clearCallbacks());

    this.beginTurn(true);
  }

  /** Theme colours for something drawn at height y (split themes differ at the top). */
  z(y) {
    return zone(this.theme, y);
  }

  setupNetwork() {
    NetworkManager.clearCallbacks();
    NetworkManager.onOpponentLocked = () => {
      // During the previous turn's animation, hold it until the next turn begins.
      if (this.animating) this.pendingLock = true;
      else this.showOpponentLocked();
    };
    NetworkManager.onTurnResolved = (result) => {
      this.animating = true;
      this.resolveWaiter?.(result);
    };
    NetworkManager.onPlayRejected = ({ message }) => {
      this.busy = false;
      this.renderHand();
      this.waitButton.setEnabled(true);
      this.flashHint(message);
    };
    NetworkManager.onOpponentDisconnected = () => {
      if (!this.state.winner) this.showDisconnected();
    };
  }

  leaveToMenu() {
    if (this.online) NetworkManager.disconnect();
    this.scene.start("MenuScene");
  }

  // ---------------------------------------------------------------- setup

  createTextures() {
    ensureTypeIcons(this);
    if (this.textures.exists("cb-spark")) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
    g.generateTexture("cb-spark", 12, 12);
    g.clear();
    g.fillStyle(0xffffff, 1).fillTriangle(0, 0, 14, 4, 4, 16);
    g.generateTexture("cb-shard", 14, 16);
    g.destroy();
  }

  createTopBar() {
    const z = this.z(38);
    this.turnText = this.add
      .text(W / 2, 36, "", { fontFamily: FONT_BODY, fontSize: "26px", fontStyle: "600", color: hex(z.soft) })
      .setOrigin(0.5);
    this.stakesText = this.add
      .text(W / 2, 70, "", { fontFamily: FONT_BODY, fontSize: "24px", color: hex(z.soft) })
      .setOrigin(0.5);

    const exit = this.add
      .text(W - 36, 38, "✕", { fontFamily: FONT_BODY, fontSize: "34px", color: hex(z.soft) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    exit.on("pointerdown", () => this.leaveToMenu());

    const help = this.add
      .text(36, 38, "?", { fontFamily: FONT_BODY, fontSize: "40px", fontStyle: "600", color: hex(z.soft) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    help.on("pointerdown", () => this.toggleRules());
  }

  createPortrait(x, y, character, size) {
    const frame = this.add.rectangle(x, y, size + 6, size + 6).setStrokeStyle(2, this.z(y).line);
    const img = this.add.image(x, y, portraitKey(character)).setDisplaySize(size, size);
    return { frame, img, character, size };
  }

  createEnergyPips(x, y) {
    const z = this.z(y);
    const pips = [];
    for (let i = 0; i < this.state.rules.maxEnergy; i++) {
      pips.push(this.add.rectangle(x + i * 26, y, 14, 14).setStrokeStyle(2, z.ink).setAngle(45));
    }
    const label = this.add
      .text(x + this.state.rules.maxEnergy * 26 + 4, y, "", {
        fontFamily: FONT_BODY,
        fontSize: "28px",
        fontStyle: "600",
        color: hex(z.ink),
      })
      .setOrigin(0, 0.5);
    return { pips, label, z };
  }

  createOpponentPanel() {
    const side = this.opponentSide;
    const z = this.z(185);
    this.opponentPortrait = this.createPortrait(100, 190, this.opponentCharacter, 124);
    this.add
      .text(184, 140, this.opponentCharacter.name, { fontFamily: FONT_BODY, fontSize: "44px", fontStyle: "600", color: hex(z.ink) })
      .setOrigin(0, 0.5);
    this.opponentEnergy = this.createEnergyPips(194, 198);

    this.add
      .text(184, 240, "Recent", { fontFamily: FONT_BODY, fontSize: "24px", color: hex(z.soft) })
      .setOrigin(0, 0.5);
    this.historyDots = [];
    for (let i = 0; i < 5; i++) {
      this.historyDots.push(
        this.add
          .text(274 + i * 90, 240, "", { fontFamily: FONT_BODY, fontSize: "24px", color: hex(z.ink) })
          .setOrigin(0, 0.5),
      );
    }

    const card = this.theme.cards[side];
    this.opponentHand = [];
    for (let i = 0; i < this.state.rules.handSize; i++) {
      this.opponentHand.push(
        this.add
          .rectangle(580 + i * 30, 140, 40, 56, card.bg)
          .setStrokeStyle(2, card.edge)
          .setAngle(-12 + i * 8),
      );
    }
  }

  createMeter() {
    const { x, y, w, h } = METER;
    const z = this.z(y);
    this.add
      .text(W / 2, y - 70, "The Case", { fontFamily: FONT_DISPLAY, fontSize: "46px", color: hex(z.ink) })
      .setOrigin(0.5);

    const label = (lx, text, origin) =>
      this.add
        .text(lx, y - 30, text, { fontFamily: FONT_BODY, fontSize: "26px", color: hex(z.soft) })
        .setOrigin(origin, 0.5);
    label(x, "Escape", 0);
    label(x + w, "Capture", 1);

    this.add.rectangle(x + w / 2, y, w, h).setStrokeStyle(2, z.line);
    this.meterGfx = this.add.graphics();
    for (let i = 1; i < 10; i++) {
      this.add.rectangle(x + (w * i) / 10, y + h / 2 + 6, 2, i === 5 ? 14 : 6, z.line, i === 5 ? 1 : 0.4);
    }

    this.needle = this.add.container(0, y);
    this.needle.add([
      this.add.rectangle(0, 0, 5, h + 28, this.theme.red),
      this.add.triangle(0, -h / 2 - 20, -9, -7, 9, -7, 0, 5, this.theme.red),
    ]);
    this.needleValue = this.add
      .text(0, y + h / 2 + 24, "", { fontFamily: FONT_BODY, fontSize: "26px", fontStyle: "600", color: hex(z.ink) })
      .setOrigin(0.5);

    const dirText =
      this.playerSide === "detective"
        ? "You push the needle toward Capture ▶"
        : "◀ You push the needle toward Escape";
    this.add
      .text(W / 2, y + h / 2 + 56, dirText, { fontFamily: FONT_BODY, fontSize: "24px", color: hex(z.soft) })
      .setOrigin(0.5);

    this.meterValue = this.state.caseValue;
    this.drawMeter(this.meterValue);
  }

  drawMeter(value) {
    const { x, y, w, h } = METER;
    const split = x + (w * value) / 100;
    const mid = x + w / 2;
    this.meterGfx.clear();
    // Fill from the centre toward whoever is ahead.
    this.meterGfx.fillStyle(this.z(y).ink, 1).fillRect(Math.min(mid, split), y - h / 2, Math.abs(split - mid), h);
    this.needle.x = split;
    this.needleValue.x = split;
    this.needleValue.setText(Math.round(value));
  }

  createArena() {
    ["opponent", "player"].forEach((who) => {
      const { x, y } = SLOT[who];
      const z = this.z(y);
      this.add.rectangle(x, y, CARD_W, CARD_H).setStrokeStyle(1, z.line, 0.3);
      this.add
        .text(x, y - CARD_H / 2 - 20, who === "player" ? "You" : "Them", {
          fontFamily: FONT_BODY,
          fontSize: "24px",
          color: hex(z.soft),
        })
        .setOrigin(0.5);
    });
    this.add
      .text(W / 2, SLOT.player.y, "vs", {
        fontFamily: FONT_BODY,
        fontSize: "32px",
        color: hex(this.z(SLOT.player.y).soft),
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(W / 2, 790, "", {
        fontFamily: FONT_BODY,
        fontSize: "26px",
        color: hex(this.z(790).ink),
        align: "center",
        wordWrap: { width: 680 },
        lineSpacing: -2,
      })
      .setOrigin(0.5);
  }

  createPlayerPanel() {
    const z = this.z(880);
    this.playerPortrait = this.createPortrait(80, 880, this.playerCharacter, 88);
    const name = this.add
      .text(144, 856, this.playerCharacter.name, { fontFamily: FONT_BODY, fontSize: "36px", fontStyle: "600", color: hex(z.ink) })
      .setOrigin(0, 0.5);
    this.add
      .text(name.x + name.width + 14, 860, "you", {
        fontFamily: FONT_BODY,
        fontSize: "24px",
        color: hex(z.soft),
      })
      .setOrigin(0, 0.5);
    this.playerEnergy = this.createEnergyPips(156, 906);
  }

  createButtons() {
    this.waitButton = button(this, this.theme, 195, 1272, 300, "Wait", () => this.confirmPlay(null), { h: 76, size: 34 });
    this.playButton = button(this, this.theme, 555, 1272, 330, "Play card", () => this.confirmPlay(this.selectedIndex), {
      h: 76,
      size: 34,
      primary: true,
    });
  }

  // ---------------------------------------------------------------- cards

  buildCardFace(card, side) {
    const style = this.theme.cards[side];
    const ink = hex(style.ink);
    const top = -CARD_H / 2;
    const left = -CARD_W / 2;
    const c = this.add.container(0, 0);
    const outline = this.cardOutline(style);
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, style.bg).setStrokeStyle(3, style.edge);

    const icon = this.add.image(left + 20, top + 20, iconKey(card.type)).setDisplaySize(28, 28).setTint(style.ink);
    const typeLabel = this.add
      .text(left + 37, top + 20, TYPE_NAMES[card.type], { fontFamily: FONT_BODY, fontSize: "22px", color: ink })
      .setOrigin(0, 0.5);
    const cost = this.add
      .text(-left - 8, top + 20, `${card.cost} ⬢`, {
        fontFamily: FONT_BODY,
        fontSize: "24px",
        fontStyle: "600",
        color: ink,
      })
      .setOrigin(1, 0.5);
    const name = this.add
      .text(0, top + 64, card.name, {
        fontFamily: FONT_BODY,
        fontSize: "26px",
        fontStyle: "600",
        color: ink,
        align: "center",
        lineSpacing: -8,
        wordWrap: { width: CARD_W - 12 },
      })
      .setOrigin(0.5);

    const art = this.buildCardArt(card, side, style);

    // Traps show their sprung value; selecting the card explains the rest
    // (cardHelp), since a rule line on the card was too small to read on a phone.
    const push = pushFor(this.state, card, card.bigPush ?? card.push);
    const big = this.add
      .text(0, ART_Y + ART_H / 2 + 40, `${push}`, {
        fontFamily: FONT_BODY,
        fontSize: "52px",
        fontStyle: "600",
        color: side === "vigilante" ? hex(this.theme.red) : ink,
      })
      .setOrigin(0.5);
    c.add([outline, bg, ...art, icon, typeLabel, cost, name, big]);
    c.setSize(CARD_W, CARD_H);
    c.bg = bg;
    c.edge = style.edge;
    return c;
  }

  /**
   * The art box. A card with an `art` texture key (loaded in BootScene from
   * public/assets/images/cards/) shows its picture; otherwise a drawn scene
   * for the card type (src/ui/cardArtPlaceholder.js).
   */
  buildCardArt(card, side, style) {
    if (card.art && this.textures.exists(card.art)) {
      const picture = this.add.image(0, ART_Y, card.art).setDisplaySize(ART_W, ART_H);
      const frame = this.add.rectangle(0, ART_Y, ART_W, ART_H).setStrokeStyle(1, style.ink, 0.45);
      return [picture, frame];
    }
    return buildPlaceholderArt(this, card, side, ART_Y, ART_W, ART_H, style.ink);
  }

  /** A thin line just outside the card's border (invisible when the style has none). */
  cardOutline(style) {
    return this.add
      .rectangle(0, 0, CARD_W + 6, CARD_H + 6, style.outline ?? style.edge)
      .setVisible(style.outline != null);
  }

  buildCardBack(side) {
    const style = this.theme.cards[side];
    const c = this.add.container(0, 0);
    const outline = this.cardOutline(style);
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, style.bg).setStrokeStyle(3, style.edge);
    const inner = this.add.rectangle(0, 0, CARD_W - 24, CARD_H - 24).setStrokeStyle(1, style.ink, 0.4);
    const mark = this.add
      .text(0, 0, "?", { fontFamily: FONT_DISPLAY, fontSize: "80px", color: hex(style.ink) })
      .setOrigin(0.5)
      .setAlpha(0.7);
    c.add([outline, bg, inner, mark]);
    return c;
  }

  renderHand() {
    this.handCards.forEach((c) => c.destroy());
    this.handCards = [];
    const me = this.state.sides[this.playerSide];
    const n = me.hand.length;
    me.hand.forEach((card, i) => {
      const c = this.buildCardFace(card, this.playerSide);
      const x = W / 2 + (i - (n - 1) / 2) * (CARD_W + 10);
      c.setPosition(x, HAND_Y);
      c.homeY = HAND_Y;
      c.index = i;
      const affordable = canAfford(this.state, this.playerSide, card);
      c.setAlpha(affordable ? 1 : 0.5);
      c.bg.setInteractive({ useHandCursor: affordable });
      c.bg.on("pointerover", () => {
        if (!this.busy && affordable && this.selectedIndex !== i) {
          this.tweens.add({ targets: c, y: HAND_Y - 12, duration: 120 });
        }
      });
      c.bg.on("pointerout", () => {
        if (this.selectedIndex !== i) this.tweens.add({ targets: c, y: HAND_Y, duration: 120 });
      });
      c.bg.on("pointerdown", () => {
        if (this.busy) return;
        if (!affordable) {
          this.flashHint(`Not enough energy for ${card.name}`);
          this.tweens.add({ targets: c, x: c.x + 8, duration: 50, yoyo: true, repeat: 2 });
          return;
        }
        this.selectCard(this.selectedIndex === i ? null : i);
      });
      // Deal in from below.
      c.y = HAND_Y + 300;
      this.tweens.add({ targets: c, y: HAND_Y, duration: 320, delay: i * 70, ease: "Back.easeOut" });
      this.handCards.push(c);
    });
  }

  selectCard(index) {
    this.selectedIndex = index;
    this.handCards.forEach((c) => {
      const selected = c.index === index;
      this.tweens.add({ targets: c, y: selected ? HAND_Y - 40 : HAND_Y, scale: selected ? 1.06 : 1, duration: 140 });
      c.bg.setStrokeStyle(selected ? 5 : 3, selected ? this.theme.red : c.edge);
    });
    this.playButton.setEnabled(index !== null);
    const card = index === null ? null : this.state.sides[this.playerSide].hand[index];
    this.hintText.setText(card ? this.cardHelp(card) : "");
  }

  /** A plain-English line explaining a card, shown when it is selected. */
  cardHelp(card) {
    const push = pushFor(this.state, card);
    const big = card.bigPush && pushFor(this.state, card, card.bigPush);
    return {
      COUNTER: `Counter: if they play a Power card, it's cancelled and you push ${push}. Otherwise nothing happens.`,
      POWER: `Power: pushes ${push}, but a Counter cancels it.`,
      BAIT: `Bait: pushes ${big} if they play a Counter, otherwise ${push}.`,
      AMBUSH: `Ambush: pushes ${big} if they Wait, otherwise ${push}.`,
    }[card.type] ?? `${TYPE_NAMES[card.type]}: pushes the needle ${push} your way.`;
  }

  // ---------------------------------------------------------------- turn flow

  beginTurn(first = false) {
    const { turn, rules } = this.state;
    this.selectedIndex = null;
    this.busy = false;
    this.clearArena();
    this.turnText.setText(`TURN ${roman(turn)} OF ${roman(rules.maxTurns)}`);
    const bonus = rules.escalationFlat * (turn - 1);
    this.stakesText.setText(turn === 1 ? "The city is watching" : `Stakes rising: every card +${bonus}`);
    this.waitButton.setLabel(`Wait  +${rules.energyPerTurn + rules.waitBonus} ⬢`);
    this.waitButton.setEnabled(true);
    this.playButton.setEnabled(false);
    this.updateHud();
    this.renderHand();
    this.hintText.setText(
      first
        ? "Pick a card. They're picking too.\nBoth cards land together."
        : turn === rules.maxTurns
          ? "Final turn: the verdict follows the needle."
          : "",
    );
    if (!first) this.showBanner(`Turn ${roman(turn)}`);
    this.spokeThisTurn = false;
    if (first) {
      // Opening thoughts: the opponent's first, then yours.
      this.time.delayedCall(600, () => this.think("opponent", "start", true));
      this.time.delayedCall(2800, () => this.think("player", "start", true));
    }

    this.opponentLocked = false;
    if (this.online) {
      this.animating = false;
      if (this.pendingLock) this.showOpponentLocked();
      this.pendingLock = false;
      return;
    }
    // The AI decides now, using only public information.
    this.opponentChoice = chooseAiPlay(this.state, this.opponentSide);
    this.time.delayedCall(Phaser.Math.Between(500, 1600), () => this.showOpponentLocked());
  }

  showOpponentLocked() {
    if (this.opponentLocked || this.state.winner) return;
    this.opponentLocked = true;
    const back = this.buildCardBack(this.opponentSide);
    back.setPosition(SLOT.opponent.x, -150).setAngle(-20);
    this.tweens.add({ targets: back, y: SLOT.opponent.y, angle: 0, duration: 380, ease: "Cubic.easeOut" });
    this.opponentBack = back;
    this.arenaObjects.push(back);
  }

  async confirmPlay(index) {
    if (this.busy || this.state.winner) return;
    this.busy = true;
    this.waitButton.setEnabled(false);
    this.playButton.setEnabled(false);
    this.hintText.setText("");
    if (!this.online) this.showOpponentLocked();

    const playerCard = index == null ? null : this.state.sides[this.playerSide].hand[index];
    const caseBefore = this.state.caseValue;

    // Move the chosen hand card into the arena as a face-down card.
    if (playerCard) {
      const handCard = this.handCards[index];
      const back = this.buildCardBack(this.playerSide);
      back.setPosition(handCard.x, handCard.y);
      handCard.destroy();
      this.handCards.splice(index, 1);
      this.tweens.add({ targets: back, x: SLOT.player.x, y: SLOT.player.y, duration: 320, ease: "Cubic.easeOut" });
      this.playerBack = back;
      this.arenaObjects.push(back);
    }
    this.handCards.forEach((c) => this.tweens.add({ targets: c, alpha: 0.4, duration: 200 }));

    let events, played, nextView;
    if (this.online) {
      const result = new Promise((resolve) => (this.resolveWaiter = resolve));
      NetworkManager.playCard(index);
      if (!this.opponentLocked) this.hintText.setText("Waiting for your opponent...");
      const [data] = await Promise.all([result, wait(this, 520)]);
      this.resolveWaiter = null;
      this.hintText.setText("");
      this.showOpponentLocked();
      ({ events, played, nextView } = data);
      applyView(this.state, data.view);
    } else {
      await wait(this, 520);
      const plays = { [this.playerSide]: index, [this.opponentSide]: this.opponentChoice };
      ({ events, played } = resolveTurn(this.state, plays));
    }
    this.turnPlayed = played;
    const opponentCard = played[this.opponentSide];

    // A beat of tension, then both cards turn over together and clash.
    await this.tension([this.playerBack, this.opponentBack]);
    const [playerFace, opponentFace] = await Promise.all([
      this.flipToFace("player", this.playerBack, playerCard, this.playerSide),
      this.flipToFace("opponent", this.opponentBack, opponentCard, this.opponentSide),
    ]);
    const faces = { player: playerFace, opponent: opponentFace };
    this.playerBack = this.opponentBack = null;
    this.updateHud(); // costs are paid once both cards are revealed
    await wait(this, 300);
    await this.clash(faces, { player: playerCard, opponent: opponentCard }, events);
    await wait(this, 200);

    for (const event of events) {
      await this.playEvent(event, faces);
    }
    this.updateHud();

    if (this.state.winner) {
      await wait(this, 500);
      if (this.state.winner !== "draw") {
        const winnerWho = this.state.winner === this.playerSide ? "player" : "opponent";
        await this.think(winnerWho, "win", true);
        await this.think(winnerWho === "player" ? "opponent" : "player", "lose", true);
      }
      this.showResult();
      return;
    }
    this.sayAfterTurn(events, caseBefore);
    await wait(this, 700);
    if (this.online) applyView(this.state, nextView);
    else startTurn(this.state);
    this.beginTurn();
  }

  /** Both face-down cards tremble before the reveal. */
  async tension(backs) {
    const targets = backs.filter(Boolean);
    if (!targets.length) return;
    this.tweens.add({ targets, scale: 1.04, duration: 380, ease: "Sine.easeInOut" });
    await tween(this, { targets, x: "+=3", duration: 32, yoyo: true, repeat: 5, ease: "Sine.easeInOut" });
  }

  /**
   * Turns a face-down card over: it lifts and narrows to an edge, then the face
   * swings round with a little overshoot. A Power card flips up glowing red.
   */
  async flipToFace(who, back, card, side) {
    const { x, y } = SLOT[who];
    if (!card) {
      const t = this.add
        .text(x, y, "Waited", { fontFamily: FONT_BODY, fontSize: "36px", color: hex(this.z(y).soft) })
        .setOrigin(0.5)
        .setAlpha(0);
      this.arenaObjects.push(t);
      if (back) back.destroy();
      this.tweens.add({ targets: t, alpha: 1, duration: 200 });
      return t;
    }
    const face = this.buildCardFace(card, side);
    face.setPosition(x, y - 26).setScale(0, 1.1).setVisible(false);
    this.arenaObjects.push(face);
    if (card.type === "POWER") {
      const glow = this.add.rectangle(0, 0, CARD_W + 18, CARD_H + 18).setStrokeStyle(10, this.theme.red, 0.85);
      face.addAt(glow, 0);
      this.tweens.add({ targets: glow, alpha: 0.25, duration: 320, yoyo: true, repeat: 5, delay: 300 });
    }
    if (back) {
      await tween(this, { targets: back, scaleX: 0, scaleY: 1.1, y: y - 26, duration: 170, ease: "Cubic.easeIn" });
      back.destroy();
    }
    face.setVisible(true);
    await tween(this, { targets: face, scaleX: 1, scaleY: 1, y, duration: 280, ease: "Back.easeOut" });
    return face;
  }

  /**
   * The two revealed cards fly at each other: they wind up, dash in leaving
   * afterimages, and on impact the game freezes for a beat (hit stop) with
   * speed lines and a zoom punch. Then they lock and grind, sparks along the
   * seam, while the card pushing harder this turn slowly gains ground (a close
   * turn grinds longer). Finally it breaks through: the other card cracks and
   * is knocked back.
   */
  async clash(faces, cards, events) {
    const fighters = ["player", "opponent"].filter((who) => cards[who]);
    if (!fighters.length) return;
    const cx = W / 2;
    const cy = SLOT.player.y;
    const z = this.z(cy);
    const red = this.theme.red;
    const camera = this.cameras.main;

    if (fighters.length === 1) {
      // Nobody to hit: the lone card lunges at the empty side.
      const who = fighters[0];
      const lunge = who === "player" ? -46 : 46;
      await tween(this, { targets: faces[who], x: SLOT[who].x + lunge, duration: 170, ease: "Back.easeIn" });
      camera.shake(90, 0.004);
      await tween(this, { targets: faces[who], x: SLOT[who].x, duration: 220, ease: "Quad.easeOut" });
      return;
    }

    // Each side's push this turn, as printed on the cards (a cancelled or fizzled card pushes 0).
    const strength = { player: 0, opponent: 0 };
    for (const e of events) {
      if (!["push", "counter", "sprung"].includes(e.type)) continue;
      const amount = pushFor(this.state, e.card, e.type === "sprung" ? e.card.bigPush : e.card.push);
      strength[e.side === this.playerSide ? "player" : "opponent"] += amount;
    }
    const winner =
      strength.player > strength.opponent ? "player" : strength.opponent > strength.player ? "opponent" : null;
    const loser = winner && (winner === "player" ? "opponent" : "player");
    const out = { player: 1, opponent: -1 }; // the direction away from the centre
    const sideOf = { player: this.playerSide, opponent: this.opponentSide };
    const meetX = (who, seam = cx) => seam + out[who] * (CARD_W / 2 + 2);
    fighters.forEach((who) => faces[who].setDepth(30));

    // Wind up.
    await Promise.all(
      fighters.map((who) =>
        tween(this, {
          targets: faces[who],
          x: SLOT[who].x + out[who] * 22,
          angle: out[who] * 6,
          scale: 0.96,
          duration: 200,
          ease: "Sine.easeOut",
        }),
      ),
    );

    // Dash, leaving afterimages.
    let frame = 0;
    const ghosts = () => {
      if (frame++ % 2) return;
      fighters.forEach((who) => {
        const f = faces[who];
        const ghost = this.add
          .rectangle(f.x, f.y, CARD_W, CARD_H, this.theme.cards[sideOf[who]].bg, 0.35)
          .setStrokeStyle(2, this.theme.cards[sideOf[who]].edge, 0.35)
          .setAngle(f.angle)
          .setDepth(29);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() });
      });
    };
    await Promise.all(
      fighters.map((who, i) =>
        tween(this, {
          targets: faces[who],
          x: meetX(who),
          angle: -out[who] * 3,
          scale: 1,
          duration: 170,
          ease: "Expo.easeIn",
          onUpdate: i === 0 ? ghosts : undefined,
        }),
      ),
    );

    // Impact: speed lines, zoom punch, hit stop.
    const lines = this.add.graphics({ x: cx, y: cy }).setDepth(44);
    lines.fillStyle(z.ink, 1);
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const w = 0.015 + Math.random() * 0.025;
      const inner = 70 + Math.random() * 40;
      const outer = 330 + Math.random() * 200;
      lines.fillTriangle(
        Math.cos(a - w) * inner, Math.sin(a - w) * inner,
        Math.cos(a) * outer, Math.sin(a) * outer,
        Math.cos(a + w) * inner, Math.sin(a + w) * inner,
      );
    }
    lines.setScale(0.8);
    this.tweens.add({ targets: lines, scale: 1.15, duration: 140, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: lines, alpha: 0, delay: 140, duration: 260, onComplete: () => lines.destroy() });
    camera.flash(80, 255, 255, 255);
    camera.zoomTo(1.08, 60);
    camera.shake(160, 0.012);
    this.burst(cx, cy, "cb-shard", z.ink, 18, 450);
    await wait(this, 140);
    camera.zoomTo(1, 260, "Cubic.easeOut");

    // Grind: locked together, the stronger card gains ground. Closer turns grind longer.
    const total = strength.player + strength.opponent;
    const closeness = total ? 1 - Math.abs(strength.player - strength.opponent) / total : 1;
    const grindMs = 380 + closeness * 520;
    const gain = winner ? -out[winner] * 28 : 0; // the seam moves towards the loser
    const sparks = this.add
      .particles(cx, cy, "cb-spark", {
        y: { min: -CARD_H * 0.42, max: CARD_H * 0.42 },
        speedX: { min: -170, max: 170 },
        speedY: { min: -280, max: -60 },
        gravityY: 900,
        scale: { start: 0.55, end: 0 },
        lifespan: 380,
        frequency: 16,
        tint: [z.ink, red],
      })
      .setDepth(45);
    const score = this.add
      .text(cx, cy + CARD_H / 2 + 28, `${strength.opponent}  vs  ${strength.player}`, {
        fontFamily: FONT_BODY,
        fontSize: "26px",
        fontStyle: "600",
        color: hex(z.ink),
      })
      .setOrigin(0.5)
      .setDepth(45);
    camera.shake(grindMs, 0.0025);
    await new Promise((resolve) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: grindMs,
        ease: "Sine.easeInOut",
        onUpdate: (tw) => {
          const seam = cx + gain * tw.getValue();
          const jitter = Math.sin(this.time.now * 0.09) * 2;
          fighters.forEach((who) => (faces[who].x = meetX(who, seam) + jitter * out[who]));
          sparks.setX(seam);
          score.setX(seam);
        },
        onComplete: resolve,
      }),
    );
    sparks.stop();
    this.time.delayedCall(450, () => sparks.destroy());
    score.destroy();

    // Break through.
    const seam = cx + gain;
    this.burst(seam, cy, "cb-shard", z.ink, 26, 520);
    this.burst(seam, cy, "cb-spark", red, 12, 420);
    camera.shake(220, 0.016);
    if (loser) {
      const style = this.theme.cards[sideOf[loser]];
      const crack = this.add.graphics().lineStyle(3, style.ink, 0.9);
      const edge = -out[loser] * (CARD_W / 2);
      for (let k = 0; k < 3; k++) {
        let x = edge;
        let y = (Math.random() - 0.5) * 60;
        const points = [{ x, y }];
        for (let i = 0; i < 5; i++) {
          x += out[loser] * (14 + Math.random() * 14);
          y += (Math.random() - 0.5) * 52;
          points.push({ x, y });
        }
        crack.strokePoints(points);
      }
      faces[loser].add(crack);
    }
    await Promise.all(
      fighters.map((who) => {
        const knocked = who === loser;
        return tween(this, {
          targets: faces[who],
          x: SLOT[who].x + (knocked ? out[who] * 44 : 0),
          angle: knocked ? out[who] * 16 : 0,
          duration: knocked ? 360 : 280,
          ease: knocked ? "Back.easeOut" : "Cubic.easeOut",
        });
      }),
    );
    if (loser) {
      await tween(this, { targets: faces[loser], x: SLOT[loser].x, angle: 0, duration: 240, ease: "Sine.easeInOut" });
    }
    fighters.forEach((who) => faces[who].setDepth(0));
  }

  /**
   * A diagonal band sweeps across the screen with the character's portrait and
   * the card's name: used for big plays (Power, a Counter that lands, a trap
   * that springs).
   */
  async cutIn(who, card) {
    const character = who === "player" ? this.playerCharacter : this.opponentCharacter;
    const fromLeft = who === "player";
    const cy = SLOT.player.y;
    const bandW = W * 1.5;
    const bandH = 230;
    const ink = 0x0d0d0d;
    const white = 0xf4f2ec;
    const red = this.theme.red;

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(60);
    const band = this.add.container(fromLeft ? -bandW / 2 : W + bandW / 2, cy).setDepth(61).setAngle(-6);
    band.add(this.add.rectangle(0, 0, bandW, bandH, ink));
    band.add(this.add.rectangle(0, -bandH / 2 + 5, bandW, 8, red));
    band.add(this.add.rectangle(0, bandH / 2 - 5, bandW, 8, red));
    band.add(this.add.rectangle(0, -bandH / 2 - 3, bandW, 2, white));
    band.add(this.add.rectangle(0, bandH / 2 + 3, bandW, 2, white));

    const lines = [];
    for (let i = 0; i < 12; i++) {
      const line = this.add.rectangle(
        Phaser.Math.Between(-W / 2, W / 2),
        Phaser.Math.Between(-bandH / 2 + 20, bandH / 2 - 20),
        Phaser.Math.Between(60, 180),
        2,
        white,
        0.18,
      );
      band.add(line);
      lines.push(line);
    }

    const side = fromLeft ? -1 : 1;
    const px = side * (W / 2 - 130);
    const portrait = this.add.image(px, 0, portraitKey(character, "winning")).setDisplaySize(176, 176);
    const frame = this.add.rectangle(px, 0, 176, 176).setStrokeStyle(4, white);
    const tx = px - side * 116;
    const align = fromLeft ? 0 : 1;
    const kicker = this.add
      .text(tx, -50, CUT_IN_KICKER[card.type] ?? "", { fontFamily: FONT_DISPLAY, fontSize: "62px", color: hex(red) })
      .setOrigin(align, 0.5);
    const name = this.add
      .text(tx, 22, card.name, {
        fontFamily: FONT_BODY,
        fontSize: "46px",
        fontStyle: "600",
        color: hex(white),
        align: fromLeft ? "left" : "right",
        wordWrap: { width: W - 330 },
        lineSpacing: -8,
      })
      .setOrigin(align, 0.5);
    const characterName = this.add
      .text(tx, 84, character.name, { fontFamily: FONT_BODY, fontSize: "24px", color: "#bdb8ae" })
      .setOrigin(align, 0.5);
    band.add([portrait, frame, kicker, name, characterName]);

    this.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 200 });
    this.tweens.add({ targets: lines, x: `${fromLeft ? "+" : "-"}=240`, duration: 1100 });
    this.tweens.add({ targets: [portrait, frame], scale: "*=1.06", duration: 1000 });
    await tween(this, { targets: band, x: W / 2, duration: 230, ease: "Cubic.easeOut" });
    this.cameras.main.shake(120, 0.006);
    await wait(this, 750);
    this.tweens.add({ targets: dim, fillAlpha: 0, duration: 200 });
    await tween(this, { targets: band, x: fromLeft ? W + bandW / 2 : -bandW / 2, duration: 210, ease: "Cubic.easeIn" });
    this.tweens.killTweensOf([...lines, portrait, frame]);
    band.destroy();
    dim.destroy();
  }

  async playEvent(event, faces) {
    const who = event.side === this.playerSide ? "player" : "opponent";
    const face = faces[who];
    const { x, y } = SLOT[who];
    const z = this.z(y);
    const red = this.theme.red;

    if (event.type === "wait") {
      this.floatText(x, y + 70, `+${this.state.rules.waitBonus} ⬢ saved`, hex(z.soft), 28, FONT_BODY);
      return;
    }

    if (event.type === "fizzle") {
      this.tweens.add({ targets: face, alpha: 0.35, angle: who === "player" ? 6 : -6, duration: 300 });
      this.floatText(x, y, "Fizzled", hex(z.soft), 46);
      const target = this.turnPlayed[otherSide(event.side)];
      // Against a Bait, the trap's thought says it better.
      if (target?.type !== "BAIT") this.think(who === "player" ? "opponent" : "player", "fizzle");
      this.hintText.setText(
        target?.type === "BAIT"
          ? "Baited! That looked like a Power play."
          : "A Counter only stops Power cards.",
      );
      await wait(this, 700);
      return;
    }

    if (event.type === "cancelled") {
      this.cameras.main.flash(180, ...rgb(red));
      this.burst(x, y, "cb-shard", red, 26, 500);
      this.tweens.add({ targets: face, scale: 0.2, angle: 200, alpha: 0, duration: 380, ease: "Back.easeIn" });
      this.floatText(x, y, "Countered!", hex(red), 56);
      await wait(this, 800);
      return;
    }

    if (event.type === "push" || event.type === "counter" || event.type === "sprung") {
      // Lift, then slam.
      const big = event.card.type === "POWER" || event.type !== "push";
      if (big) await this.cutIn(who, event.card);
      if (event.type === "sprung") {
        this.cameras.main.flash(160, ...rgb(red));
        this.think(who, event.card.type);
      } else if (event.type === "counter" || event.card.type === "POWER") {
        this.think(who, event.card.type);
      } else if (event.card.type === "BAIT" || event.card.type === "AMBUSH") {
        this.floatText(x, y + 40, "no bite", hex(z.soft), 28, FONT_BODY);
      }
      await new Promise((resolve) =>
        this.tweens.add({
          targets: face,
          scale: big ? 1.25 : 1.12,
          y: y - 20,
          duration: 180,
          ease: "Quad.easeOut",
          onComplete: resolve,
        }),
      );
      await new Promise((resolve) =>
        this.tweens.add({ targets: face, scale: 1, y, duration: 110, ease: "Quad.easeIn", onComplete: resolve }),
      );
      const delta = Math.abs(event.to - event.from);
      const numberColor = event.side === "vigilante" ? red : z.ink;
      this.cameras.main.shake(big ? 260 : 140, Math.min(0.02, 0.002 + delta * 0.0004));
      this.burst(x, y, "cb-spark", z.ink, big ? 24 : 12, big ? 600 : 400);
      this.floatText(x, y - CARD_H / 2 - 10, `${delta}`, hex(numberColor), big ? 64 : 50, FONT_BODY);
      this.sparkTrail(x, y);
      await this.tweenMeter(event.to);
      this.updatePortraits();
      await wait(this, 250);
      return;
    }

    if (event.type === "end") {
      const winnerWho = event.winner === this.playerSide ? "player" : "opponent";
      if (event.winner !== "draw") {
        this.cameras.main.shake(400, 0.015);
        this.burst(METER.x + (METER.w * this.state.caseValue) / 100, METER.y, "cb-spark", red, 40, 900);
      }
      if (winnerWho === "player") this.cameras.main.flash(300, ...rgb(this.theme.paper));
    }
  }

  // ---------------------------------------------------------------- talk

  /**
   * Shows a character's inner thought in a manga balloon beside their portrait
   * (they never talk to each other: the Detective doesn't know who the
   * Vigilante is). Lines come from src/case/dialogue.js; resolves once the
   * balloon has gone.
   * Only one line per turn unless `always` (the opening and the result), and
   * no line repeats in a match while the character has others.
   */
  think(who, moment, always = false) {
    if (this.spokeThisTurn && !always) return Promise.resolve();
    const character = who === "player" ? this.playerCharacter : this.opponentCharacter;
    const line = pickLine(character.id, moment, Math.random, this.usedLines);
    if (!line) return Promise.resolve();
    this.usedLines.add(line);
    if (!always) this.spokeThisTurn = true;
    this.bubbles[who]?.finish();

    const ink = 0x111111;
    const paper = 0xf4f2ec;
    const { left, y } = who === "player" ? { left: 146, y: 880 } : { left: 180, y: 168 };
    const label = this.add
      .text(0, 0, `${character.name.split(" ")[0]}, thinking…`, {
        fontFamily: FONT_BODY,
        fontSize: "22px",
        fontStyle: "600",
        color: "#5e594f",
      })
      .setOrigin(0.5);
    const text = this.add.text(0, 0, line, {
      fontFamily: FONT_BODY,
      fontSize: "28px",
      fontStyle: "600",
      color: hex(ink),
      align: "center",
      wordWrap: { width: 380 },
      lineSpacing: -4,
    });
    text.setOrigin(0.5);

    // A manga thought balloon: an oval with a "Name, thinking…" label, and small
    // bubbles trailing to the portrait instead of a pointed tail. Baked into
    // a texture so it fades as one piece (the outline and fill would
    // otherwise show through each other at partial alpha).
    const blockW = Math.max(label.width, text.width);
    const blockH = label.height + text.height;
    const rx = blockW * 0.62 + 22;
    const ry = blockH * 0.72 + 12;
    const cx = 26 + rx; // balloon centre, relative to the anchor beside the portrait
    label.setPosition(cx, -blockH / 2 + label.height / 2 + 2);
    text.setPosition(cx, blockH / 2 - text.height / 2 + 2);
    const trail = [[13, ry * 0.12, 9], [-5, ry * 0.32, 5.5]];
    const ox = 12;
    const oy = ry + 6;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(paper, 1).lineStyle(3, ink, 1);
    g.fillEllipse(cx + ox, oy, rx * 2, ry * 2, 96).strokeEllipse(cx + ox, oy, rx * 2, ry * 2, 96);
    for (const [tx, ty, tr] of trail) g.fillCircle(tx + ox, ty + oy, tr).strokeCircle(tx + ox, ty + oy, tr);
    const key = `thought-${++this.thoughtCount}`;
    g.generateTexture(key, Math.ceil(cx + rx + 4 + ox), Math.ceil(ry * 2 + 12));
    g.destroy();
    const cloud = this.add.image(-ox, -oy, key).setOrigin(0, 0);
    const bubble = this.add.container(left, y, [cloud, label, text]).setDepth(55).setScale(0.6).setAlpha(0);
    this.bubbles[who] = bubble;

    const hold = Math.min(3200, 1300 + line.length * 32);
    return new Promise((resolve) => {
      // Ends the thought: when it fades out, or early if a new one replaces it.
      bubble.finish = () => {
        if (!bubble.active) return;
        this.tweens.killTweensOf(bubble);
        if (this.bubbles[who] === bubble) this.bubbles[who] = null;
        bubble.destroy();
        this.textures.remove(key);
        resolve();
      };
      this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 170, ease: "Back.easeOut" });
      this.tweens.add({ targets: bubble, alpha: 0, delay: hold, duration: 220, onComplete: bubble.finish });
    });
  }

  /**
   * If nobody spoke during the turn: someone the chase just moved towards (or
   * away from) near an end may comment, or else sometimes the bigger ordinary
   * push, or a lone Wait, gets a line.
   */
  sayAfterTurn(events, caseBefore) {
    if (this.spokeThisTurn) return;
    const whoOf = (side) => (side === this.playerSide ? "player" : "opponent");
    const moved = this.state.caseValue - caseBefore;
    for (const side of [this.playerSide, this.opponentSide]) {
      const dir = SIDES[side].direction;
      const lead = (this.state.caseValue - 50) * dir;
      if (lead >= 25 && moved * dir > 0 && Math.random() < 0.6) return this.think(whoOf(side), "winning");
      if (lead <= -25 && moved * dir < 0 && Math.random() < 0.6) return this.think(whoOf(side), "losing");
    }
    const pushes = events.filter((e) => e.type === "push" && (e.card.type === "QUICK" || e.card.type === "NORMAL"));
    if (pushes.length && Math.random() < 0.35) {
      const size = (e) => Math.abs(e.to - e.from);
      const e = pushes.reduce((a, b) => (size(b) > size(a) ? b : a));
      return this.think(whoOf(e.side), e.card.type);
    }
    const waits = events.filter((e) => e.type === "wait");
    if (waits.length === 1 && Math.random() < 0.2) this.think(whoOf(waits[0].side), "WAIT");
  }

  tweenMeter(to) {
    return new Promise((resolve) => {
      this.tweens.addCounter({
        from: this.meterValue,
        to,
        duration: 450,
        ease: "Cubic.easeOut",
        onUpdate: (tw) => this.drawMeter(tw.getValue()),
        onComplete: () => {
          this.meterValue = to;
          this.drawMeter(to);
          this.tweens.add({ targets: this.needle, scaleX: 1.8, duration: 80, yoyo: true });
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------------- effects

  burst(x, y, texture, tint, count, lifespan) {
    const emitter = this.add.particles(x, y, texture, {
      speed: { min: 120, max: 420 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan,
      tint,
      emitting: false,
    });
    emitter.setDepth(45);
    emitter.explode(count);
    this.time.delayedCall(lifespan + 100, () => emitter.destroy());
  }

  sparkTrail(x, y) {
    const target = METER.x + (METER.w * this.meterValue) / 100;
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, "cb-spark").setTint(this.z(y).ink).setScale(0.9).setDepth(45);
      this.tweens.add({
        targets: s,
        x: target + Phaser.Math.Between(-20, 20),
        y: METER.y,
        scale: 0.2,
        duration: 320 + i * 40,
        ease: "Cubic.easeIn",
        onComplete: () => s.destroy(),
      });
    }
  }

  /** Big moments ("Countered!") use blackletter; numbers pass the clear serif. */
  floatText(x, y, text, color, size, fontFamily = FONT_DISPLAY) {
    const t = this.add
      .text(x, y, text, {
        fontFamily,
        fontSize: `${size}px`,
        fontStyle: fontFamily === FONT_BODY ? "600" : "normal",
        color,
        stroke: hex(this.z(y).paper),
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScale(0.4)
      .setDepth(50);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 650, duration: 450, onComplete: () => t.destroy() });
  }

  flashHint(text) {
    this.hintText.setText(text);
    this.time.delayedCall(1400, () => {
      if (this.hintText.text === text) this.hintText.setText("");
    });
  }

  showBanner(text) {
    const z = this.z(SLOT.player.y);
    const band = this.add.rectangle(W / 2, SLOT.player.y, W, 110, z.paper, 0.94).setStrokeStyle(1, z.line).setDepth(40);
    const t = this.add
      .text(W / 2, SLOT.player.y, text, { fontFamily: FONT_DISPLAY, fontSize: "76px", color: hex(z.ink) })
      .setOrigin(0.5)
      .setDepth(41);
    band.scaleY = 0;
    this.tweens.add({ targets: band, scaleY: 1, duration: 140 });
    this.tweens.add({
      targets: [band, t],
      alpha: 0,
      delay: 650,
      duration: 250,
      onComplete: () => {
        band.destroy();
        t.destroy();
      },
    });
  }

  clearArena() {
    this.arenaObjects.forEach((o) => {
      this.tweens.killTweensOf(o);
      if (o.list) this.tweens.killTweensOf(o.list);
      o.destroy();
    });
    this.arenaObjects = [];
    this.playerBack = this.opponentBack = null;
  }

  // ---------------------------------------------------------------- HUD

  updateHud() {
    this.setPips(this.playerEnergy, this.state.sides[this.playerSide].energy);
    this.setPips(this.opponentEnergy, this.state.sides[this.opponentSide].energy);

    const z = this.z(240);
    const history = this.state.sides[this.opponentSide].history.slice(-5);
    this.historyDots.forEach((t, i) => {
      const entry = history[i];
      if (i >= history.length) return t.setText("");
      t.setText(entry ? TYPE_NAMES[entry] : "Wait");
      t.setColor(hex(entry ? z.ink : z.soft));
    });

    const opponentCards = this.state.sides[this.opponentSide].hand.length;
    this.opponentHand.forEach((c, i) => c.setVisible(i < opponentCards));
    this.updatePortraits();
  }

  setPips({ pips, label, z }, energy) {
    pips.forEach((p, i) => {
      const lit = i < energy;
      p.setFillStyle(z.ink, lit ? 1 : 0);
    });
    label.setText(`${energy}`);
  }

  updatePortraits() {
    const lean = (this.meterValue - 50) * SIDES[this.playerSide].direction;
    const mood = (forPlayer) => {
      const l = forPlayer ? lean : -lean;
      if (l >= 15) return "winning";
      if (l <= -15) return "losing";
      return "neutral";
    };
    for (const [portrait, forPlayer] of [[this.playerPortrait, true], [this.opponentPortrait, false]]) {
      portrait.img.setTexture(portraitKey(portrait.character, mood(forPlayer)));
      portrait.img.setDisplaySize(portrait.size, portrait.size);
    }
  }

  /** A full-screen sheet in the base theme colours, used by overlays. */
  overlay(depth) {
    return this.add
      .rectangle(W / 2, H / 2, W, H, this.theme.paper, 0)
      .setDepth(depth)
      .setInteractive();
  }

  toggleRules() {
    if (this.rulesPanel) {
      this.rulesPanel.destroy();
      this.rulesPanel = null;
      return;
    }
    const r = this.state.rules;
    const ink = hex(this.theme.ink);
    const panel = this.add.container(0, 0).setDepth(100);
    const shade = this.overlay(100).setFillStyle(this.theme.paper, 0.97);
    shade.on("pointerdown", () => this.toggleRules());
    const title = this.add
      .text(W / 2, 150, "How it works", { fontFamily: FONT_DISPLAY, fontSize: "64px", color: ink })
      .setOrigin(0.5);
    const text = this.add.text(
      70,
      240,
      [
        "One shared meter. The Detective wins at 100,",
        "the Vigilante wins at 0.",
        "",
        "Both players pick a card at the same time.",
        "Both cards land together and their pushes add up.",
        "",
        "Every special card beats one thing:",
        "   Power: a big push, unless countered",
        "   Counter: stops Power, otherwise fizzles",
        "   Bait: a big push if they Counter",
        "   Ambush: a big push if they Wait",
        "",
        `You gain +${r.energyPerTurn} ⬢ a turn (max ${r.maxEnergy}). Waiting`,
        `gives an extra +${r.waitBonus} ⬢. Watch their energy:`,
        "6 or more means a Power card is possible.",
        "",
        "Stakes rise every turn. After turn",
        `${r.maxTurns}, the needle decides the verdict.`,
      ].join("\n"),
      { fontFamily: FONT_BODY, fontSize: "26px", color: ink, lineSpacing: 8 },
    );
    const close = this.add
      .text(W / 2, 1200, "Tap anywhere to close", {
        fontFamily: FONT_BODY,
        fontSize: "26px",
        color: hex(this.theme.soft),
      })
      .setOrigin(0.5);
    panel.add([shade, title, text, close]);
    this.rulesPanel = panel;
  }

  showDisconnected() {
    this.busy = true;
    const shade = this.overlay(200).setFillStyle(this.theme.paper, 0.94);
    this.add
      .text(W / 2, 500, "Your opponent\nleft the case", {
        fontFamily: FONT_DISPLAY,
        fontSize: "72px",
        color: hex(this.theme.ink),
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(201);
    button(this, this.theme, W / 2, 720, 400, "New match", () => this.scene.start("MultiplayerLobbyScene"), {
      primary: true,
    }).setDepth(201);
    button(this, this.theme, W / 2, 830, 400, "Menu", () => this.leaveToMenu()).setDepth(201);
    return shade;
  }

  /** Dev-only test mode: nudge energy and the meter to reach situations fast. */
  createDebugControls() {
    const z = this.z(820);
    const actions = [
      ["+5 energy", () => (this.state.sides[this.playerSide].energy = Math.min(10, this.state.sides[this.playerSide].energy + 5))],
      ["◀ 20", () => (this.state.caseValue = Math.max(1, this.state.caseValue - 20))],
      ["20 ▶", () => (this.state.caseValue = Math.min(99, this.state.caseValue + 20))],
    ];
    actions.forEach(([label, act], i) => {
      const t = this.add
        .text(170 + i * 170, 820, label, {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: hex(z.soft),
          padding: { x: 10, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(60)
        .setInteractive({ useHandCursor: true });
      t.on("pointerdown", () => {
        if (this.busy) return;
        act();
        this.meterValue = this.state.caseValue;
        this.drawMeter(this.meterValue);
        this.updateHud();
        this.renderHand();
      });
    });
  }

  showResult() {
    const { winner, endReason, turn } = this.state;
    const won = winner === this.playerSide;
    const titles = {
      capture: "Case Closed",
      escape: "Vanished",
      verdict: winner === "draw" ? "Hung Jury" : "The Verdict",
    };
    const reasons = {
      capture: "The detective has the vigilante in cuffs.",
      escape: "The vigilante slips into the city, untouchable.",
      verdict:
        winner === "draw"
          ? "No one could make the case."
          : `After ${turn} turns, the city sides with the ${SIDES[winner].name.toLowerCase()}.`,
    };

    const ink = hex(this.theme.ink);
    const shade = this.overlay(200);
    this.tweens.add({ targets: shade, fillAlpha: 0.94, duration: 400 });
    const items = [
      this.add.text(W / 2, 420, titles[endReason], { fontFamily: FONT_DISPLAY, fontSize: "100px", color: ink }),
      this.add.text(W / 2, 530, winner === "draw" ? "Draw" : won ? "You win" : "You lose", {
        fontFamily: FONT_DISPLAY,
        fontSize: "64px",
        color: winner === "draw" || won ? ink : hex(this.theme.red),
      }),
      this.add.text(W / 2, 610, reasons[endReason], {
        fontFamily: FONT_BODY,
        fontSize: "26px",
        color: hex(this.theme.soft),
        align: "center",
        wordWrap: { width: 600 },
      }),
    ];
    items.forEach((t, i) => {
      t.setOrigin(0.5).setDepth(201).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 20, delay: 200 + i * 150, duration: 300 });
    });

    const again = this.online
      ? button(this, this.theme, W / 2, 770, 400, "New match", () => this.scene.start("MultiplayerLobbyScene"), { primary: true })
      : button(this, this.theme, W / 2, 770, 400, "Rematch", () => this.scene.restart(), { primary: true });
    again.setDepth(201);
    button(this, this.theme, W / 2, 880, 400, "Menu", () => this.leaveToMenu()).setDepth(201);
  }
}
