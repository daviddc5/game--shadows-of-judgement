// How a card looks: the "case file" design. A rounded card with a double
// border, a type stamp and cost along the top, an evidence photo (the art) with
// photo corners, a typed name label, one line of rule text, and the push as a
// number. A status effect is a red rubber stamp over the photo. Everything is
// drawn from the player's board theme.
import { FONTS, hex } from "../theme.js";
import { EFFECTS, costFor, pushFor } from "../case/rules.js";
import { iconKey } from "./cardIcons.js";
import { buildPlaceholderArt } from "./cardArtPlaceholder.js";
import { fit } from "./widgets.js";

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

/**
 * A case-file frame centred on (0, 0): outline, rounded fill and a double
 * border (heavier and red when selected). Cards use it, and so do the panels
 * on other screens that should look like they belong to the same case.
 */
export function paintFrame(g, w, h, style, redColor, selected = false, radius = RADIUS) {
  g.clear();
  if (style.outline != null) {
    g.fillStyle(style.outline, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 3);
  }
  g.fillStyle(style.bg, 1).fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  g.lineStyle(selected ? 5 : 3, selected ? redColor : style.edge, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  g.lineStyle(1, style.edge, 0.5).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, radius - 4);
}

const paintBody = (g, style, redColor, selected) => paintFrame(g, CARD_W, CARD_H, style, redColor, selected);

/** A card type's stamp: a slightly turned double ring with the type's symbol. Returns [ring, icon]. */
export function buildTypeStamp(scene, x, y, type, style, scale = 1) {
  const ring = scene.add.graphics().setPosition(x, y);
  // In ink, not the border colour: on the Dark page a Detective card's border matches its paper.
  ring.lineStyle(2, style.ink, 1).strokeCircle(0, 0, 13 * scale);
  ring.lineStyle(1, style.ink, 1).strokeCircle(0, 0, 10 * scale);
  ring.setAngle(-8);
  const icon = scene.add
    .image(x, y, iconKey(type))
    .setDisplaySize(16 * scale, 16 * scale)
    .setTint(style.ink)
    .setAngle(-8);
  return [ring, icon];
}

/** A red rubber stamp with `text` on it, turned a little, centred on (x, y). */
export function buildRubberStamp(scene, x, y, text, size = 18) {
  const label = scene.add
    .text(0, 0, text.toUpperCase(), {
      fontFamily: BODY,
      fontSize: `${size}px`,
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
  const stamp = scene.add.container(x, y, [box, label]).setAngle(-7);
  stamp.setSize(sw, sh);
  return stamp;
}

/** The cream mat and black photo corners an evidence photo sits on, w × h centred on (x, y). */
export function paintPhotoMat(g, x, y, w, h, corner = 13) {
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const y0 = y - h / 2;
  const y1 = y + h / 2;
  g.fillStyle(MAT_COLOR, 1).fillRect(x0, y0, w, h);
  g.fillStyle(PHOTO_CORNER, 1);
  g.fillTriangle(x0, y0, x0 + corner, y0, x0, y0 + corner);
  g.fillTriangle(x1, y0, x1 - corner, y0, x1, y0 + corner);
  g.fillTriangle(x0, y1, x0 + corner, y1, x0, y1 - corner);
  g.fillTriangle(x1, y1, x1 - corner, y1, x1, y1 - corner);
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
  // Faded text is softer to look at; high contrast keeps it at full strength.
  const faded = (a) => (theme.highContrast ? 1 : a);
  const red = theme.red;
  const left = -CARD_W / 2;
  const top = -CARD_H / 2;
  const c = scene.add.container(0, 0);

  const body = scene.add.graphics();
  const setSelected = (on) => paintBody(body, style, red, on);
  setSelected(false);

  // Top row: type stamp and name of the type on the left, cost on the right.
  const [stamp, icon] = buildTypeStamp(scene, left + 24.5, top + 23, card.type, style);
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
  // With large text, the type name gives way to the cost.
  fit(typeLabel, cost.x - cost.width - 6 - typeLabel.x, 30, 13);

  // The evidence photo: cream mat, the art, and black photo corners.
  const mat = scene.add.graphics();
  paintPhotoMat(mat, 0, ART_Y, MAT.w, MAT.h);
  const x0 = -MAT.w / 2;
  const y1 = ART_Y + MAT.h / 2;
  const art = buildArt(scene, card, side, style);

  // A status effect is a red rubber stamp across the lower-left of the photo.
  const extras = [];
  if (card.effect) {
    const stampC = buildRubberStamp(scene, 0, 0, EFFECTS[card.effect].name);
    stampC.setPosition(x0 + 12 + stampC.width / 2, y1 - 18);
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
    .setAlpha(faded(0.85));
  fit(rule, 150, 36, 14);

  // Bottom row: "Pushes" and how far the card moves the Case meter. Traps show
  // their sprung value.
  const push = pushFor(state, card, card.bigPush ?? card.push);
  const numberColor = side === "vigilante" ? hex(red) : ink;
  const rowY = top + 223;
  const divider = scene.add.graphics();
  divider.lineStyle(1, style.edge, 1).lineBetween(-77, top + 204, 77, top + 204);
  const pushLabel = scene.add
    .text(left + 13, rowY, "Pushes", { fontFamily: BODY, fontSize: "20px", color: ink })
    .setOrigin(0, 0.5)
    .setAlpha(faded(0.8));
  const number = scene.add
    .text(-left - 13, rowY - 1, `${push}`, {
      fontFamily: BODY,
      fontSize: push >= 100 ? "36px" : "42px",
      fontStyle: "600",
      color: numberColor,
    })
    .setOrigin(1, 0.5);

  const hit = scene.add.rectangle(0, 0, CARD_W, CARD_H, 0xffffff, 0);
  c.add([body, stamp, icon, typeLabel, cost, hexMark, mat, ...art, ...extras, rules, name, rule, divider, pushLabel, number, hit]);
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
