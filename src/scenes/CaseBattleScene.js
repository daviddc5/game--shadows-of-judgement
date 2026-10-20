import Phaser from "phaser";
import { CARD_TYPES, SIDES } from "../case/cards.js";
import {
  canAfford,
  createMatch,
  otherSide,
  pushFor,
  resolveTurn,
  startTurn,
} from "../case/rules.js";
import { chooseAiPlay } from "../case/ai.js";
import NetworkManager from "../network/NetworkManager.js";
import { FONTS } from "../theme.js";

const W = 750;
const H = 1334;

const COLORS = {
  bgTop: 0x0d1018,
  bgBottom: 0x05060a,
  panel: 0x141925,
  panelEdge: 0x2a3142,
  ink: "#ece6d6",
  muted: "#8a90a0",
  detective: 0x4cc9f0,
  vigilante: 0xe0315f,
  gold: 0xf2b33d,
};

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

const FONT_DISPLAY = FONTS.display;
const FONT_TITLE = FONTS.title;
const FONT_BODY = FONTS.body;

const METER = { x: 60, y: 362, w: 630, h: 34 };
const SLOT = { opponent: { x: 230, y: 615 }, player: { x: 520, y: 615 } };
const CARD_W = 168;
const CARD_H = 228;
const HAND_Y = 1075;

const wait = (scene, ms) =>
  new Promise((resolve) => scene.time.delayedCall(ms, resolve));

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
    this.selectedIndex = null;
    this.busy = false;
    this.handCards = [];
    this.arenaObjects = [];

    this.createTextures();
    this.createBackground();
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
    if (this.textures.exists("cb-spark")) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
    g.generateTexture("cb-spark", 12, 12);
    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 22);
    g.generateTexture("cb-rain", 2, 22);
    g.clear();
    g.fillStyle(0xffffff, 1).fillTriangle(0, 0, 14, 4, 4, 16);
    g.generateTexture("cb-shard", 14, 16);
    g.destroy();
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    bg.fillRect(0, 0, W, H);

    // A low city skyline behind the arena.
    const city = this.add.graphics().setAlpha(0.5);
    city.fillStyle(0x0a0d14, 1);
    let x = 0;
    const rng = new Phaser.Math.RandomDataGenerator(["skyline"]);
    while (x < W) {
      const bw = rng.between(40, 90);
      const bh = rng.between(80, 220);
      city.fillRect(x, 830 - bh, bw, bh);
      city.fillStyle(0x2b2f3d, 1);
      for (let wy = 830 - bh + 12; wy < 820; wy += 22) {
        for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
          if (rng.frac() < 0.18) city.fillRect(wx, wy, 6, 9);
        }
      }
      city.fillStyle(0x0a0d14, 1);
      x += bw + rng.between(2, 10);
    }

    this.add.particles(0, -30, "cb-rain", {
      x: { min: -100, max: W + 50 },
      speedY: { min: 900, max: 1300 },
      speedX: { min: 120, max: 180 },
      rotate: -8,
      lifespan: 1400,
      quantity: 2,
      frequency: 25,
      alpha: { min: 0.08, max: 0.22 },
      scaleY: { min: 0.6, max: 1.3 },
    });

    if (this.renderer.type === Phaser.WEBGL) {
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.95, 0.35);
    }
  }

  createTopBar() {
    this.turnText = this.add
      .text(W / 2, 38, "", { fontFamily: FONT_TITLE, fontSize: "30px", color: COLORS.ink })
      .setOrigin(0.5);
    this.stakesText = this.add
      .text(W / 2, 72, "", { fontFamily: FONT_BODY, fontSize: "18px", color: hex(COLORS.gold) })
      .setOrigin(0.5);

    const exit = this.add
      .text(W - 34, 38, "✕", { fontFamily: FONT_BODY, fontSize: "34px", color: COLORS.muted })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    exit.on("pointerdown", () => this.leaveToMenu());

    const help = this.add
      .text(34, 38, "?", { fontFamily: FONT_TITLE, fontSize: "34px", color: COLORS.muted })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    help.on("pointerdown", () => this.toggleRules());
  }

  createPortrait(x, y, side, size) {
    const color = COLORS[side];
    const frame = this.add.rectangle(x, y, size + 8, size + 8, 0x000000).setStrokeStyle(3, color);
    const img = this.add.image(x, y, `${SIDES[side].portrait}-neutral`).setDisplaySize(size, size);
    return { frame, img, side };
  }

  createEnergyPips(x, y) {
    const pips = [];
    for (let i = 0; i < this.state.rules.maxEnergy; i++) {
      pips.push(
        this.add
          .rectangle(x + i * 26, y, 20, 20, 0x1f2533)
          .setStrokeStyle(2, 0x3a4256)
          .setAngle(45)
          .setScale(0.75),
      );
    }
    const label = this.add
      .text(x + this.state.rules.maxEnergy * 26 + 6, y, "", {
        fontFamily: FONT_BODY,
        fontSize: "20px",
        color: hex(COLORS.gold),
      })
      .setOrigin(0, 0.5);
    return { pips, label };
  }

  createOpponentPanel() {
    const side = this.opponentSide;
    this.add.rectangle(W / 2, 185, W - 32, 170, COLORS.panel, 0.85).setStrokeStyle(2, COLORS.panelEdge);
    this.opponentPortrait = this.createPortrait(100, 185, side, 128);
    this.add.text(180, 118, SIDES[side].name.toUpperCase(), {
      fontFamily: FONT_TITLE,
      fontSize: "30px",
      color: hex(COLORS[side]),
    });
    this.add.text(180, 154, "OPPONENT", { fontFamily: FONT_BODY, fontSize: "16px", color: COLORS.muted });
    this.opponentEnergy = this.createEnergyPips(192, 198);

    this.add.text(180, 228, "RECENT", { fontFamily: FONT_BODY, fontSize: "15px", color: COLORS.muted });
    this.historyDots = [];
    for (let i = 0; i < 5; i++) {
      this.historyDots.push(
        this.add.text(258 + i * 82, 237, "", { fontFamily: FONT_BODY, fontSize: "14px" }).setOrigin(0, 0.5),
      );
    }

    this.opponentHand = [];
    for (let i = 0; i < this.state.rules.handSize; i++) {
      this.opponentHand.push(
        this.add
          .rectangle(560 + i * 34, 138, 44, 60, 0x1a1f2c)
          .setStrokeStyle(2, COLORS[side])
          .setAngle(-12 + i * 8),
      );
    }
  }

  createMeter() {
    const { x, y, w, h } = METER;
    this.add
      .text(W / 2, y - 78, "THE CASE", { fontFamily: FONT_DISPLAY, fontSize: "30px", color: COLORS.ink })
      .setOrigin(0.5);

    this.add
      .text(x, y - 34, "◀ ESCAPE", { fontFamily: FONT_BODY, fontSize: "18px", color: hex(COLORS.vigilante) })
      .setOrigin(0, 0.5);
    this.add
      .text(x + w, y - 34, "CAPTURE ▶", { fontFamily: FONT_BODY, fontSize: "18px", color: hex(COLORS.detective) })
      .setOrigin(1, 0.5);

    this.add.rectangle(x + w / 2, y, w + 8, h + 8, 0x000000).setStrokeStyle(2, COLORS.panelEdge);
    this.meterGfx = this.add.graphics();
    for (let i = 1; i < 10; i++) {
      this.add.rectangle(x + (w * i) / 10, y, 2, i === 5 ? h + 14 : h, 0x000000, i === 5 ? 0.9 : 0.35);
    }

    this.needle = this.add.container(0, y);
    this.needle.add([
      this.add.rectangle(0, 0, 6, h + 26, 0xffffff),
      this.add.triangle(0, -h / 2 - 20, -10, -8, 10, -8, 0, 6, 0xffffff),
    ]);
    this.needleValue = this.add
      .text(0, y + h / 2 + 20, "", { fontFamily: FONT_BODY, fontSize: "22px", color: COLORS.ink })
      .setOrigin(0.5);

    const dirText =
      this.playerSide === "detective"
        ? "You push the needle ▶ toward CAPTURE"
        : "You push the needle ◀ toward ESCAPE";
    this.add
      .text(W / 2, y + h / 2 + 52, dirText, { fontFamily: FONT_BODY, fontSize: "17px", color: COLORS.muted })
      .setOrigin(0.5);

    this.meterValue = this.state.caseValue;
    this.drawMeter(this.meterValue);
  }

  drawMeter(value) {
    const { x, y, w, h } = METER;
    const split = x + (w * value) / 100;
    const mid = x + w / 2;
    const top = y - h / 2;
    this.meterGfx.clear();
    this.meterGfx.fillStyle(0x1c2130, 1).fillRect(x, top, w, h);
    // Each end is a goal zone for one side.
    this.meterGfx.fillStyle(COLORS.vigilante, 0.25).fillRect(x, top, w * 0.1, h);
    this.meterGfx.fillStyle(COLORS.detective, 0.25).fillRect(x + w * 0.9, top, w * 0.1, h);
    // Fill from the centre toward whoever is ahead.
    const leader = value >= 50 ? COLORS.detective : COLORS.vigilante;
    this.meterGfx.fillStyle(leader, 0.9).fillRect(Math.min(mid, split), top, Math.abs(split - mid), h);
    this.needle.x = split;
    this.needleValue.x = split;
    this.needleValue.setText(Math.round(value));
  }

  createArena() {
    ["opponent", "player"].forEach((who) => {
      const { x, y } = SLOT[who];
      const outline = this.add.graphics();
      outline.lineStyle(2, 0x3a4256, 0.8);
      outline.strokeRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 12);
      this.add
        .text(x, y - CARD_H / 2 - 22, who === "player" ? "YOU" : "THEM", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: COLORS.muted,
        })
        .setOrigin(0.5);
    });
    this.add
      .text(W / 2, SLOT.player.y, "VS", { fontFamily: FONT_TITLE, fontSize: "40px", color: "#3a4256" })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(W / 2, 770, "", { fontFamily: FONT_BODY, fontSize: "19px", color: COLORS.ink, align: "center" })
      .setOrigin(0.5);
  }

  createPlayerPanel() {
    const side = this.playerSide;
    this.add.rectangle(W / 2, 880, W - 32, 110, COLORS.panel, 0.85).setStrokeStyle(2, COLORS.panelEdge);
    this.playerPortrait = this.createPortrait(80, 880, side, 88);
    this.add.text(140, 836, `${SIDES[side].name.toUpperCase()}  (YOU)`, {
      fontFamily: FONT_TITLE,
      fontSize: "26px",
      color: hex(COLORS[side]),
    });
    this.playerEnergy = this.createEnergyPips(152, 900);
  }

  createButton(x, y, w, label, color, onClick) {
    const bg = this.add.rectangle(x, y, w, 76, color).setStrokeStyle(3, 0x000000);
    const text = this.add
      .text(x, y, label, { fontFamily: FONT_TITLE, fontSize: "30px", color: "#0b0d12", fontStyle: "bold" })
      .setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => {
      if (!bg.input.enabled) return;
      this.tweens.add({ targets: [bg, text], scale: 0.95, duration: 60, yoyo: true });
      onClick();
    });
    return {
      bg,
      text,
      setEnabled(enabled) {
        bg.input.enabled = enabled;
        bg.setAlpha(enabled ? 1 : 0.3);
        text.setAlpha(enabled ? 1 : 0.5);
      },
      setLabel(t) {
        text.setText(t);
      },
    };
  }

  createButtons() {
    this.waitButton = this.createButton(195, 1272, 300, "", 0x8a90a0, () => this.confirmPlay(null));
    this.playButton = this.createButton(555, 1272, 330, "PLAY CARD", COLORS.gold, () =>
      this.confirmPlay(this.selectedIndex),
    );
  }

  // ---------------------------------------------------------------- cards

  buildCardFace(card, side) {
    const c = this.add.container(0, 0);
    const type = CARD_TYPES[card.type];
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x161b27).setStrokeStyle(3, type.color);
    const band = this.add.rectangle(0, -CARD_H / 2 + 18, CARD_W - 6, 30, type.color, 0.9);
    const typeLabel = this.add
      .text(-CARD_W / 2 + 10, -CARD_H / 2 + 18, type.label, {
        fontFamily: FONT_BODY,
        fontSize: "15px",
        color: "#0b0d12",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const cost = this.add
      .text(CARD_W / 2 - 10, -CARD_H / 2 + 18, `${card.cost}⬢`, {
        fontFamily: FONT_BODY,
        fontSize: "19px",
        color: "#0b0d12",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
    const name = this.add
      .text(0, -CARD_H / 2 + 60, card.name, {
        fontFamily: FONT_TITLE,
        fontSize: "21px",
        color: COLORS.ink,
        align: "center",
        wordWrap: { width: CARD_W - 16 },
      })
      .setOrigin(0.5);

    const arrow = SIDES[side].direction > 0 ? "▶" : "◀";
    // Traps show their sprung value; the rule line gives the fallback.
    const push = pushFor(this.state, card, card.bigPush ?? card.push);
    const big = this.add
      .text(0, 22, `${arrow} ${push}`, {
        fontFamily: FONT_TITLE,
        fontSize: "40px",
        color: hex(COLORS[side]),
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const small = pushFor(this.state, card);
    const ruleText =
      {
        COUNTER: "only vs POWER",
        POWER: "can be countered",
        BAIT: `vs COUNTER, else ${small}`,
        AMBUSH: `vs WAIT, else ${small}`,
      }[card.type] ?? "";
    const rule = this.add
      .text(0, 62, ruleText, {
        fontFamily: FONT_BODY,
        fontSize: "14px",
        color: hex(type.color),
      })
      .setOrigin(0.5);
    const flavor = this.add
      .text(0, CARD_H / 2 - 28, card.flavor, {
        fontFamily: FONT_BODY,
        fontSize: "12px",
        color: COLORS.muted,
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: CARD_W - 18 },
      })
      .setOrigin(0.5);
    c.add([bg, band, typeLabel, cost, name, big, rule, flavor]);
    c.setSize(CARD_W, CARD_H);
    c.bg = bg;
    return c;
  }

  buildCardBack(side) {
    const c = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x10141e).setStrokeStyle(3, COLORS[side]);
    const inner = this.add.rectangle(0, 0, CARD_W - 28, CARD_H - 28, 0x000000, 0).setStrokeStyle(1, COLORS[side], 0.5);
    const mark = this.add
      .text(0, 0, "?", { fontFamily: FONT_TITLE, fontSize: "72px", color: hex(COLORS[side]) })
      .setOrigin(0.5)
      .setAlpha(0.6);
    c.add([bg, inner, mark]);
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
      c.setAlpha(affordable ? 1 : 0.35);
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
      c.bg.setStrokeStyle(selected ? 5 : 3, selected ? 0xffffff : CARD_TYPES[this.state.sides[this.playerSide].hand[c.index].type].color);
    });
    this.playButton.setEnabled(index !== null);
  }

  // ---------------------------------------------------------------- turn flow

  beginTurn(first = false) {
    const { turn, rules } = this.state;
    this.selectedIndex = null;
    this.busy = false;
    this.clearArena();
    this.turnText.setText(`TURN ${turn} / ${rules.maxTurns}`);
    const bonus = rules.escalationFlat * (turn - 1);
    this.stakesText.setText(turn === 1 ? "The city is watching" : `STAKES RISING — every card +${bonus}`);
    this.waitButton.setLabel(`WAIT  +${rules.energyPerTurn + rules.waitBonus}⬢`);
    this.waitButton.setEnabled(true);
    this.playButton.setEnabled(false);
    this.updateHud();
    this.renderHand();
    this.hintText.setText(
      first
        ? "Pick a card. They're picking too.\nBoth cards land together."
        : turn === rules.maxTurns
          ? "FINAL TURN — the verdict follows the needle."
          : "",
    );
    if (!first) this.showBanner(`TURN ${turn}`);

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
    this.handCards.forEach((c) => this.tweens.add({ targets: c, alpha: 0.25, duration: 200 }));

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

    // Reveal both at once.
    const faces = {};
    faces.player = await this.flipToFace("player", this.playerBack, playerCard, this.playerSide);
    faces.opponent = await this.flipToFace("opponent", this.opponentBack, opponentCard, this.opponentSide);
    this.playerBack = this.opponentBack = null;
    this.updateHud(); // costs are paid once both cards are revealed
    await wait(this, 450);

    for (const event of events) {
      await this.playEvent(event, faces);
    }
    this.updateHud();

    if (this.state.winner) {
      await wait(this, 500);
      this.showResult();
      return;
    }
    await wait(this, 700);
    if (this.online) applyView(this.state, nextView);
    else startTurn(this.state);
    this.beginTurn();
  }

  async flipToFace(who, back, card, side) {
    const { x, y } = SLOT[who];
    if (!card) {
      const t = this.add
        .text(x, y, "WAITED\n+⬢", {
          fontFamily: FONT_TITLE,
          fontSize: "30px",
          color: COLORS.muted,
          align: "center",
        })
        .setOrigin(0.5)
        .setAlpha(0);
      this.arenaObjects.push(t);
      if (back) back.destroy();
      this.tweens.add({ targets: t, alpha: 1, duration: 200 });
      return t;
    }
    const face = this.buildCardFace(card, side);
    face.setPosition(x, y).setScale(0, 1);
    this.arenaObjects.push(face);
    await new Promise((resolve) => {
      this.tweens.add({
        targets: back,
        scaleX: 0,
        duration: 130,
        ease: "Sine.easeIn",
        onComplete: () => {
          back.destroy();
          this.tweens.add({ targets: face, scaleX: 1, duration: 150, ease: "Sine.easeOut", onComplete: resolve });
        },
      });
    });
    return face;
  }

  async playEvent(event, faces) {
    const who = event.side === this.playerSide ? "player" : "opponent";
    const face = faces[who];
    const { x, y } = SLOT[who];

    if (event.type === "wait") {
      this.floatText(x, y + 70, `+${this.state.rules.waitBonus}⬢ saved`, hex(COLORS.gold), 26);
      return;
    }

    if (event.type === "fizzle") {
      face.iterate((o) => o.setTint && o.setTint(0x555555));
      this.tweens.add({ targets: face, alpha: 0.45, angle: who === "player" ? 6 : -6, duration: 300 });
      this.floatText(x, y, "FIZZLED", "#8a90a0", 30);
      const target = this.turnPlayed[otherSide(event.side)];
      this.hintText.setText(
        target?.type === "BAIT"
          ? "Baited! That looked like a POWER play."
          : "A COUNTER only stops POWER cards.",
      );
      await wait(this, 700);
      return;
    }

    if (event.type === "cancelled") {
      this.cameras.main.flash(180, 224, 49, 95);
      this.burst(x, y, "cb-shard", CARD_TYPES.COUNTER.color, 26, 500);
      this.tweens.add({ targets: face, scale: 0.2, angle: 200, alpha: 0, duration: 380, ease: "Back.easeIn" });
      this.floatText(x, y, "COUNTERED!", hex(CARD_TYPES.COUNTER.color), 38);
      await wait(this, 800);
      return;
    }

    if (event.type === "push" || event.type === "counter" || event.type === "sprung") {
      // Lift, then slam.
      const big = event.card.type === "POWER" || event.type !== "push";
      if (event.type === "sprung") {
        const label = event.card.type === "BAIT" ? "BAITED!" : "AMBUSHED!";
        this.cameras.main.flash(160, 255, 180, 90);
        this.floatText(x, y + 40, label, hex(CARD_TYPES[event.card.type].color), 40);
      } else if (event.card.type === "BAIT" || event.card.type === "AMBUSH") {
        this.floatText(x, y + 40, "no bite", COLORS.muted, 24);
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
      this.cameras.main.shake(big ? 260 : 140, Math.min(0.02, 0.002 + delta * 0.0004));
      this.burst(x, y, "cb-spark", CARD_TYPES[event.card.type].color, big ? 30 : 14, big ? 600 : 400);
      this.floatText(x, y - CARD_H / 2 - 10, `${SIDES[event.side].direction > 0 ? "▶" : "◀"} ${delta}`, hex(COLORS[event.side]), big ? 46 : 36);
      this.sparkTrail(x, y, event.side);
      await this.tweenMeter(event.to);
      this.updatePortraits();
      await wait(this, 250);
      return;
    }

    if (event.type === "end") {
      const winnerWho = event.winner === this.playerSide ? "player" : "opponent";
      if (event.winner !== "draw") {
        this.cameras.main.shake(400, 0.015);
        this.burst(METER.x + (METER.w * this.state.caseValue) / 100, METER.y, "cb-spark", COLORS[event.winner], 50, 900);
      }
      if (winnerWho === "player") this.cameras.main.flash(300, 255, 240, 200);
    }
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
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan,
      tint,
      blendMode: "ADD",
      emitting: false,
    });
    emitter.explode(count);
    this.time.delayedCall(lifespan + 100, () => emitter.destroy());
  }

  sparkTrail(x, y, side) {
    const target = METER.x + (METER.w * this.meterValue) / 100;
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(x, y, "cb-spark").setTint(COLORS[side]).setBlendMode("ADD").setScale(1.2);
      this.tweens.add({
        targets: s,
        x: target + Phaser.Math.Between(-20, 20),
        y: METER.y,
        scale: 0.3,
        duration: 320 + i * 40,
        ease: "Cubic.easeIn",
        onComplete: () => s.destroy(),
      });
    }
  }

  floatText(x, y, text, color, size) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: FONT_TITLE,
        fontSize: `${size}px`,
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
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
    const band = this.add.rectangle(W / 2, 615, W, 90, 0x000000, 0.75).setDepth(40);
    const t = this.add
      .text(W / 2, 615, text, { fontFamily: FONT_DISPLAY, fontSize: "60px", color: COLORS.ink })
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
    this.arenaObjects.forEach((o) => o.destroy());
    this.arenaObjects = [];
    this.playerBack = this.opponentBack = null;
  }

  // ---------------------------------------------------------------- HUD

  updateHud() {
    this.setPips(this.playerEnergy, this.state.sides[this.playerSide].energy);
    this.setPips(this.opponentEnergy, this.state.sides[this.opponentSide].energy);

    const history = this.state.sides[this.opponentSide].history.slice(-5);
    this.historyDots.forEach((t, i) => {
      const entry = history[i];
      if (i >= history.length) return t.setText("");
      t.setText(entry ? `■ ${CARD_TYPES[entry].label}` : "■ WAIT");
      t.setColor(entry ? hex(CARD_TYPES[entry].color) : COLORS.muted);
    });

    const opponentCards = this.state.sides[this.opponentSide].hand.length;
    this.opponentHand.forEach((c, i) => c.setVisible(i < opponentCards));
    this.updatePortraits();
  }

  setPips({ pips, label }, energy) {
    pips.forEach((p, i) => {
      const lit = i < energy;
      p.setFillStyle(lit ? COLORS.gold : 0x1f2533);
      p.setStrokeStyle(2, lit ? 0xffe2a0 : 0x3a4256);
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
    this.playerPortrait.img.setTexture(`${SIDES[this.playerSide].portrait}-${mood(true)}`);
    this.opponentPortrait.img.setTexture(`${SIDES[this.opponentSide].portrait}-${mood(false)}`);
    this.playerPortrait.img.setDisplaySize(88, 88);
    this.opponentPortrait.img.setDisplaySize(128, 128);
  }

  toggleRules() {
    if (this.rulesPanel) {
      this.rulesPanel.destroy();
      this.rulesPanel = null;
      return;
    }
    const r = this.state.rules;
    const panel = this.add.container(0, 0).setDepth(100);
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setInteractive();
    shade.on("pointerdown", () => this.toggleRules());
    const text = this.add
      .text(
        60,
        140,
        [
          "HOW IT WORKS",
          "",
          "• One shared meter. Detective wins at 100,",
          "  Vigilante wins at 0.",
          "",
          "• Both players pick a card at the same time.",
          "  Both cards land together and their",
          "  pushes add up.",
          "",
          "• Every special card beats one thing:",
          "  POWER   big push, unless COUNTERED",
          "  COUNTER stops POWER, else fizzles",
          "  BAIT    big push if they COUNTER",
          "  AMBUSH  big push if they WAIT",
          "",
          `• You gain +${r.energyPerTurn}⬢ a turn (max ${r.maxEnergy}). WAIT`,
          `  gives an extra +${r.waitBonus}⬢. Watch their energy:`,
          "  6+ means a POWER card is possible.",
          "",
          "• Stakes rise every turn. After turn",
          `  ${r.maxTurns}, the needle decides the verdict.`,
          "",
          "Tap anywhere to close.",
        ].join("\n"),
        { fontFamily: FONT_BODY, fontSize: "22px", color: COLORS.ink, lineSpacing: 6 },
      );
    panel.add([shade, text]);
    this.rulesPanel = panel;
  }

  showDisconnected() {
    this.busy = true;
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(200).setInteractive();
    this.add
      .text(W / 2, 500, "YOUR OPPONENT\nLEFT THE CASE", {
        fontFamily: FONT_DISPLAY,
        fontSize: "60px",
        color: COLORS.ink,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(201);
    const again = this.createButton(W / 2, 700, 360, "NEW MATCH", COLORS.gold, () =>
      this.scene.start("MultiplayerLobbyScene"),
    );
    const menu = this.createButton(W / 2, 800, 360, "MENU", 0x8a90a0, () => this.leaveToMenu());
    [again, menu].forEach((b) => {
      b.bg.setDepth(201);
      b.text.setDepth(202);
    });
    return shade;
  }

  /** Dev-only test mode: nudge energy and the meter to reach situations fast. */
  createDebugControls() {
    const actions = [
      ["+5⬢", () => (this.state.sides[this.playerSide].energy = Math.min(10, this.state.sides[this.playerSide].energy + 5))],
      ["◀ 20", () => (this.state.caseValue = Math.max(1, this.state.caseValue - 20))],
      ["20 ▶", () => (this.state.caseValue = Math.min(99, this.state.caseValue + 20))],
    ];
    actions.forEach(([label, act], i) => {
      const t = this.add
        .text(150 + i * 150, 806, label, {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: "#ffcc66",
          backgroundColor: "#3a2a00",
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
      capture: "CASE CLOSED",
      escape: "VANISHED",
      verdict: winner === "draw" ? "HUNG JURY" : "THE VERDICT",
    };
    const reasons = {
      capture: "The detective has the vigilante in cuffs.",
      escape: "The vigilante slips into the city, untouchable.",
      verdict:
        winner === "draw"
          ? "No one could make the case."
          : `After ${turn} turns, the city sides with the ${SIDES[winner].name.toLowerCase()}.`,
    };

    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(200).setInteractive();
    this.tweens.add({ targets: shade, fillAlpha: 0.82, duration: 400 });
    const items = [
      this.add.text(W / 2, 430, titles[endReason], { fontFamily: FONT_DISPLAY, fontSize: "76px", color: COLORS.ink }),
      this.add.text(W / 2, 520, winner === "draw" ? "DRAW" : won ? "YOU WIN" : "YOU LOSE", {
        fontFamily: FONT_DISPLAY,
        fontSize: "56px",
        color: winner === "draw" ? COLORS.muted : won ? hex(COLORS.gold) : hex(COLORS.vigilante),
      }),
      this.add.text(W / 2, 600, reasons[endReason], {
        fontFamily: FONT_BODY,
        fontSize: "22px",
        color: COLORS.muted,
        align: "center",
        wordWrap: { width: 600 },
      }),
    ];
    items.forEach((t, i) => {
      t.setOrigin(0.5).setDepth(201).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 20, delay: 200 + i * 150, duration: 300 });
    });

    const rematch = this.online
      ? this.createButton(W / 2, 760, 360, "NEW MATCH", COLORS.gold, () => this.scene.start("MultiplayerLobbyScene"))
      : this.createButton(W / 2, 760, 360, "REMATCH", COLORS.gold, () => this.scene.restart());
    const menu = this.createButton(W / 2, 860, 360, "MENU", 0x8a90a0, () => this.leaveToMenu());
    [rematch, menu].forEach((b) => {
      b.bg.setDepth(201);
      b.text.setDepth(202);
    });
  }
}
