import Phaser from "phaser";
import { FONTS, getTheme, hex, paintBackground } from "../theme.js";
import { backLink, bodyText, button, displayText } from "../ui/widgets.js";
import { RULES, EFFECTS } from "../case/rules.js";
import { ensureTypeIcons } from "../ui/cardIcons.js";
import { buildRubberStamp, buildTypeStamp, paintFrame } from "../ui/cardFace.js";

// The rules sit in a case file, drawn like the cards.
const FILE = { x: 375, y: 760, w: 660, h: 880 };
const TEXT_X = 80;
const STAMPED_X = 128; // a heading with a type stamp or rubber stamp starts here

export default class InstructionsScene extends Phaser.Scene {
  constructor() {
    super({ key: "InstructionsScene" });
  }

  create() {
    this.theme = getTheme();
    paintBackground(this, this.theme);
    ensureTypeIcons(this);
    this.pages = this.buildPages();
    this.currentPage = 0;

    const file = this.add.graphics().setPosition(FILE.x, FILE.y);
    paintFrame(file, FILE.w, FILE.h, this.theme.cards.detective, this.theme.red, false, 18);
    this.pageContainer = this.add.container(0, 0);

    backLink(this, this.theme, () => this.scene.start("MenuScene"), "✕ Close");
    this.prevBtn = button(this, this.theme, 170, 1265, 220, "◀ Prev", () => this.changePage(-1), { h: 70, size: 32 });
    this.nextBtn = button(this, this.theme, 580, 1265, 220, "Next ▶", () => this.changePage(1), { h: 70, size: 32, primary: true });
    this.pageIndicator = bodyText(this, this.theme, 375, 1265, "", 24, { soft: true });

    this.showPage(0);
  }

  /**
   * Each section has a heading and a body. `type` puts that card type's stamp
   * beside the heading; `stamp` shows the heading as a red rubber stamp (for
   * status effects, as on the cards).
   */
  buildPages() {
    const r = RULES;
    return [
      {
        title: "How to Play",
        subtitle: "Shadows of Judgment",
        sections: [
          {
            heading: "The Case",
            body: `One shared meter sits between you, starting at ${r.caseStart}.\n\nThe Detective pushes it up to ${r.caseMax} to capture.\nThe Vigilante drags it down to ${r.caseMin} to escape.`,
          },
          {
            heading: "Each Turn",
            body: "1. Both players pick a card (or Wait) in secret\n2. Both cards are revealed at the same time\n3. Their pushes add up and the needle moves",
          },
          {
            heading: "The Verdict",
            body: `Stakes rise every turn: every card pushes ${r.escalationFlat} harder. If nobody wins by turn ${r.maxTurns}, the needle decides.`,
          },
        ],
      },
      {
        title: "Energy",
        subtitle: "Spend it or save it",
        sections: [
          {
            heading: "Gain",
            body: `You gain +${r.energyPerTurn} ⬢ each turn (max ${r.maxEnergy}). Every card shows its cost in the top corner.`,
          },
          {
            heading: "Wait",
            body: `Skip your turn to bank +${r.waitBonus} ⬢ extra and save up for something big.`,
          },
          {
            heading: "Read them",
            body: "You can see your opponent's energy and what they played recently. 6 or more energy means a Power card could be coming.",
          },
        ],
      },
      {
        title: "Mind Games",
        subtitle: "Every special card beats one thing",
        sections: [
          { type: "POWER", heading: "Power", body: "A huge push, but a Counter stops it cold." },
          { type: "COUNTER", heading: "Counter", body: "Cancels a Power card and pushes for you. Against anything else, it fizzles." },
          { type: "BAIT", heading: "Bait", body: "Looks like a threat. A big push if they Counter, small otherwise." },
          { type: "AMBUSH", heading: "Ambush", body: "A big push if they Wait, small otherwise." },
        ],
      },
      {
        title: "Status Effects",
        subtitle: "Cards with a red stamp",
        sections: [
          {
            heading: "How they work",
            body: "When a stamped card lands, its effect hits your opponent from their next turn. Both of you can see it beside their name.",
          },
          { stamp: EFFECTS.shaken.name, body: `Their Power cards cost +${r.shakenExtraCost} ⬢ next turn.` },
          { stamp: EFFECTS.cornered.name, body: "They can't Wait next turn: they must play a card if they can." },
          { stamp: EFFECTS.heat.name, body: `The meter drifts ${r.heatDrift} your way at the start of their next ${EFFECTS.heat.turns} turns.` },
        ],
      },
      {
        title: "Tips",
        subtitle: "Think one move ahead",
        sections: [
          { heading: "Watch Their Energy", body: "Have they been saving? Ask yourself why before you pick." },
          {
            heading: "Don't Be Predictable",
            body: "Waiting twice in a row invites an Ambush. Countering every time invites Bait.",
          },
          { type: "NORMAL", heading: "Quick & Normal Cards", body: "Plain pushes with no tricks. Reliable when you can't read them." },
          { heading: "In Battle", body: "Tap ? in the top-left corner to see the rules again." },
        ],
      },
    ];
  }

  showPage(index) {
    this.currentPage = index;
    const page = this.pages[index];
    const style = this.theme.cards.detective;
    const ink = hex(style.ink);
    this.pageContainer.removeAll(true);

    this.pageContainer.add(displayText(this, this.theme, 375, 150, page.title, 64));
    if (page.subtitle) {
      this.pageContainer.add(bodyText(this, this.theme, 375, 222, page.subtitle, 26, { soft: true }));
    }

    let y = 380;
    for (const section of page.sections) {
      const stamped = section.type || section.stamp;
      let headingBottom;
      if (section.stamp) {
        const stamp = buildRubberStamp(this, 0, y, section.stamp, 24);
        stamp.setX(TEXT_X + stamp.width / 2);
        this.pageContainer.add(stamp);
        headingBottom = y + stamp.height / 2 + 8; // room for the stamp's tilt
      } else {
        const heading = this.add
          .text(stamped ? STAMPED_X : TEXT_X, y, section.heading, {
            fontFamily: FONTS.body,
            fontSize: "32px",
            fontStyle: "600",
            color: ink,
          })
          .setOrigin(0, 0.5);
        this.pageContainer.add(heading);
        if (section.type) this.pageContainer.add(buildTypeStamp(this, TEXT_X + 18, y, section.type, style, 1.5));
        headingBottom = y + heading.height / 2;
      }
      const body = this.add
        .text(TEXT_X, headingBottom + 6, section.body, {
          fontFamily: FONTS.body,
          fontSize: "25px",
          color: ink,
          wordWrap: { width: 590 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);
      this.pageContainer.add(body);
      y = body.y + body.height + 52;
    }

    const last = index === this.pages.length - 1;
    this.prevBtn.setVisible(index > 0);
    this.nextBtn.setLabel(last ? "Done" : "Next ▶");
    this.pageIndicator.setText(this.pages.map((_, i) => (i === index ? "●" : "○")).join("  "));
  }

  changePage(direction) {
    const next = this.currentPage + direction;
    if (next >= this.pages.length) this.scene.start("MenuScene");
    else if (next >= 0) this.showPage(next);
  }
}
