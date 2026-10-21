// How a card looks: the "case file" design. A rounded card with a double
// border, a type stamp and cost along the top, an evidence photo (the art) with
// photo corners, a typed name label, one line of rule text, and the push shown
// as a number plus a mini Case meter. A status effect is a red rubber stamp
// over the photo. Everything is drawn from the player's board theme.
import { FONTS, hex } from "../theme.js";
import { EFFECTS, costFor, pushFor } from "../case/rules.js";
import { iconKey } from "./cardIcons.js";
import { buildPlaceholderArt } from "./cardArtPlaceholder.js";

// Real trading-card proportions (about 5 : 7), the widest four across a phone can be.
export const CARD_W = 176;
export const CARD_H = 246;
const RADIUS = 11;

// The photo ("art box") on every card, centred this far from the card's centre.
// Artists: draw at 16:9, at least 640×360 (shown at 146×82 on a 154×92 mat).
export const ART_W = 146;
export const ART_H = 82;
export const ART_Y = -37;
const MAT = { w: 154, h: 92 };

export const TYPE_NAMES = {
  COUNTER: "Counter",
  QUICK: "Quick",
  NORMAL: "Normal",
  POWER: "Power",
  BAIT: "Bait",
  AMBUSH: "Ambush",
};

const MAT_COLOR = 0xefece3;
const PHOTO_CORNER = 0x1b1b1d;
const STAMP_RED = 0xc1121f;
const BODY = FONTS.body;

/** Shrinks a text object until it fits `maxW` × `maxH` (or reaches `min` px). */
function fit(text, maxW, maxH, min) {
  let size = parseInt(text.style.fontSize, 10);
  while ((text.width > maxW || text.height > maxH) && size > min) text.setFontSize(--size);
  return text;
}

/** The card body: outline, rounded fill, double border (heavier and red when selected). */
function paintBody(g, style, redColor, selected) {
  g.clear();
  const w = CARD_W;
  const h = CARD_H;
  if (style.outline != null) {
    g.fillStyle(style.outline, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, RADIUS + 3);
  }
  g.fillStyle(style.bg, 1).fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
  g.lineStyle(selected ? 5 : 3, selected ? redColor : style.edge, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
  g.lineStyle(1, style.edge, 0.5).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, RADIUS - 4);
}

/** The photo or, if the card has real art, the picture, on its cream mat. */
function buildArt(scene, card, side, style) {
  if (card.art && scene.textures.exists(card.art)) {
    return [scene.add.image(0, ART_Y, card.art).setDisplaySize(ART_W, ART_H)];
  }
  return buildPlaceholderArt(scene, card, side, ART_Y, ART_W, ART_H, style.ink);
}

/**
 * A card, 176 × 246, centred on (0, 0). Returns a container with:
 *   bg           invisible rectangle to attach input to
 *   edge         the border colour
 *   setSelected  (on) heavier red border
 */
export function buildCardFace(scene, card, side) {
  const { theme, state } = scene;
  const style = theme.cards[side];
  const ink = hex(style.ink);
  const red = theme.red;
  const left = -CARD_W / 2;
  const top = -CARD_H / 2;
  const c = scene.add.container(0, 0);

  const body = scene.add.graphics();
  const setSelected = (on) => paintBody(body, style, red, on);
  setSelected(false);

  // Top row: type stamp and name of the type on the left, cost on the right.
  const stamp = scene.add.graphics().setPosition(left + 24.5, top + 23);
  stamp.lineStyle(2, style.edge, 1).strokeCircle(0, 0, 13);
  stamp.lineStyle(1, style.edge, 1).strokeCircle(0, 0, 10);
  stamp.setAngle(-8);
  const icon = scene.add
    .image(left + 24.5, top + 23, iconKey(card.type))
    .setDisplaySize(16, 16)
    .setTint(style.ink)
    .setAngle(-8);
  const typeLabel = scene.add
    .text(left + 45, top + 23, TYPE_NAMES[card.type], { fontFamily: BODY, fontSize: "19px", color: ink })
    .setOrigin(0, 0.5);
  const cardCost = state.sides[side].status ? costFor(state, side, card) : card.cost;
  const hexMark = scene.add
    .text(-left - 11, top + 23, "⬢", { fontFamily: BODY, fontSize: "19px", color: ink })
    .setOrigin(1, 0.5);
  const cost = scene.add
    .text(hexMark.x - hexMark.width - 3, top + 23, `${cardCost}`, {
      fontFamily: BODY,
      fontSize: "25px",
      fontStyle: "600",
      color: cardCost > card.cost ? hex(red) : ink,
    })
    .setOrigin(1, 0.5);

  // The evidence photo: cream mat, the art, and black photo corners.
  const matY = ART_Y;
  const mat = scene.add.graphics();
  mat.fillStyle(MAT_COLOR, 1).fillRect(-MAT.w / 2, matY - MAT.h / 2, MAT.w, MAT.h);
  mat.fillStyle(PHOTO_CORNER, 1);
  const k = 13;
  const x0 = -MAT.w / 2;
  const x1 = MAT.w / 2;
  const y0 = matY - MAT.h / 2;
  const y1 = matY + MAT.h / 2;
  mat.fillTriangle(x0, y0, x0 + k, y0, x0, y0 + k);
  mat.fillTriangle(x1, y0, x1 - k, y0, x1, y0 + k);
  mat.fillTriangle(x0, y1, x0 + k, y1, x0, y1 - k);
  mat.fillTriangle(x1, y1, x1 - k, y1, x1, y1 - k);
  const art = buildArt(scene, card, side, style);

  // A status effect is a red rubber stamp across the lower-left of the photo.
  const extras = [];
  if (card.effect) {
    const label = scene.add
      .text(0, 0, EFFECTS[card.effect].name.toUpperCase(), {
        fontFamily: BODY,
        fontSize: "18px",
        fontStyle: "600",
        color: hex(STAMP_RED),
        letterSpacing: 1.5,
      })
      .setOrigin(0.5);
    const sw = label.width + 16;
    const sh = label.height + 4;
    const box = scene.add.graphics();
    box.fillStyle(0xf4f2ec, 0.9).fillRoundedRect(-sw / 2, -sh / 2, sw, sh, 3);
    box.lineStyle(2.5, STAMP_RED, 1).strokeRoundedRect(-sw / 2, -sh / 2, sw, sh, 3);
    const stampC = scene.add.container(x0 + 8 + sw / 2 + 4, y1 - 14 - 4, [box, label]).setAngle(-7);
    extras.push(stampC);
  }

  // The name on a typed label with a double rule above it.
  const rules = scene.add.graphics();
  rules.lineStyle(1, style.edge, 1);
  rules.lineBetween(-77, top + 138, 77, top + 138).lineBetween(-77, top + 141, 77, top + 141);
  const name = scene.add
    .text(0, top + 154, card.name, { fontFamily: BODY, fontSize: "22px", fontStyle: "600", color: ink })
    .setOrigin(0.5);
  fit(name, 148, 30, 16);

  // One line of rule text: the effect's rule, the card type's rule, or its flavour line.
  const small = pushFor(state, card);
  const sprung = card.bigPush && pushFor(state, card, card.bigPush);
  const effectRule = {
    shaken: `Power costs +${state.rules.shakenExtraCost}`,
    cornered: "They can't Wait",
    heat: `Meter +${state.rules.heatDrift} for 2 turns`,
  };
  const typeRule = {
    COUNTER: "Cancels a Power card",
    POWER: "A Counter cancels it",
    BAIT: `${sprung} if they Counter, else ${small}`,
    AMBUSH: `${sprung} if they Wait, else ${small}`,
  };
  const rule = scene.add
    .text(0, top + 186, (card.effect && effectRule[card.effect]) || typeRule[card.type] || card.flavor || "", {
      fontFamily: BODY,
      fontSize: "18px",
      color: ink,
      align: "center",
      lineSpacing: -4,
      wordWrap: { width: 150 },
    })
    .setOrigin(0.5)
    .setAlpha(0.85);
  fit(rule, 150, 36, 14);

  // Bottom row: the push, as a number and as a mini Case meter. The needle
  // shows how far the card moves the real meter (toward Capture for the
  // Detective, Escape for the Vigilante).
  const push = pushFor(state, card, card.bigPush ?? card.push);
  const numberColor = side === "vigilante" ? hex(red) : ink;
  const rowY = top + 222;
  const divider = scene.add.graphics();
  divider.lineStyle(1, style.edge, 1).lineBetween(-77, top + 204, 77, top + 204);
  const number = scene.add
    .text(left + 13, rowY - 1, `${push}`, {
      fontFamily: BODY,
      fontSize: push >= 100 ? "30px" : "34px",
      fontStyle: "600",
      color: numberColor,
    })
    .setOrigin(0, 0.5);

  const dir = side === "detective" ? 1 : -1;
  const barW = 86;
  const barX = -CARD_W / 2 + CARD_W - 11 - barW;
  const half = barW / 2;
  const seg = (Math.min(50, push) / 100) * barW;
  const segX = dir > 0 ? barX + half : barX + half - seg;
  const needleX = dir > 0 ? barX + half + seg : barX + half - seg;
  const gauge = scene.add.graphics();
  gauge.fillStyle(side === "vigilante" ? red : style.ink, 1).fillRect(segX, rowY - 6, seg, 12);
  gauge.lineStyle(1.5, style.edge, 1).strokeRect(barX, rowY - 7, barW, 14);
  gauge.lineStyle(1, style.edge, 1).lineBetween(barX + half, rowY - 11, barX + half, rowY + 11);
  gauge.fillStyle(STAMP_RED, 1).fillRect(needleX - 1.5, rowY - 12, 3, 24);

  const hit = scene.add.rectangle(0, 0, CARD_W, CARD_H, 0xffffff, 0);
  c.add([body, stamp, icon, typeLabel, cost, hexMark, mat, ...art, ...extras, rules, name, rule, divider, number, gauge, hit]);
  c.setSize(CARD_W, CARD_H);
  c.bg = hit;
  c.edge = style.edge;
  c.setSelected = setSelected;
  return c;
}

/** The back of a card: the same frame, with the mark of the case file. */
export function buildCardBack(scene, side) {
  const style = scene.theme.cards[side];
  const c = scene.add.container(0, 0);
  const body = scene.add.graphics();
  paintBody(body, style, scene.theme.red, false);
  const inner = scene.add.graphics();
  inner.lineStyle(1, style.ink, 0.4).strokeRoundedRect(-CARD_W / 2 + 14, -CARD_H / 2 + 14, CARD_W - 28, CARD_H - 28, 6);
  const mark = scene.add
    .text(0, 0, "?", { fontFamily: FONTS.display, fontSize: "80px", color: hex(style.ink) })
    .setOrigin(0.5)
    .setAlpha(0.7);
  c.add([body, inner, mark]);
  c.setSize(CARD_W, CARD_H);
  return c;
}

/** An empty card-shaped outline, for the arena slots. */
export function buildSlotOutline(scene, x, y, color, alpha = 0.3, width = 1) {
  const g = scene.add.graphics({ x, y });
  g.lineStyle(width, color, alpha).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS);
  return g;
}
