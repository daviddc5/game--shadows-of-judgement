import Phaser from "phaser";
import { FONTS, getTheme, hex, paintBackground } from "../theme.js";
import { backLink, bodyText, button, displayText } from "../ui/widgets.js";

export default class InstructionsScene extends Phaser.Scene {
  constructor() {
    super({ key: "InstructionsScene" });
  }

  create() {
    this.theme = getTheme();
    paintBackground(this, this.theme);
    this.pages = this.buildPages();
    this.currentPage = 0;

    // The rules sit on a page card so they read the same in every theme.
    const card = this.theme.cards.detective;
    this.add.rectangle(375, 760, 660, 880, card.bg).setStrokeStyle(2, card.edge);
    this.pageContainer = this.add.container(0, 0);

    backLink(this, this.theme, () => this.scene.start("MenuScene"), "✕ Close");
    this.prevBtn = button(this, this.theme, 170, 1265, 220, "◀ Prev", () => this.changePage(-1), { h: 70, size: 32 });
    this.nextBtn = button(this, this.theme, 580, 1265, 220, "Next ▶", () => this.changePage(1), { h: 70, size: 32, primary: true });
    this.pageIndicator = bodyText(this, this.theme, 375, 1265, "", 24, { soft: true });

    this.showPage(0);
  }

  buildPages() {
    return [
      // PAGE 1: Overview
      {
        title: "How to Play",
        subtitle: "Shadows of Judgment",
        sections: [
          {
            heading: "The Case",
            body: "One shared meter sits between you, starting at 50.\n\nThe Detective pushes it up to 100 to CAPTURE.\nThe Vigilante drags it down to 0 to ESCAPE.",
          },
          {
            heading: "Each Turn",
            body: "1. Both players pick a card (or WAIT) in secret\n2. Both cards are revealed at the same time\n3. Their pushes add up and the needle moves",
          },
          {
            heading: "The Verdict",
            body: "Stakes rise every turn: every card pushes harder. If nobody wins by turn 12, the needle decides.",
          },
        ],
      },
      // PAGE 2: Energy
      {
        title: "Energy",
        subtitle: "Spend it or save it",
        sections: [
          {
            heading: "Gain",
            body: "You gain +2 energy each turn (max 10). Every card shows its cost.",
            color: "#f2b33d",
          },
          {
            heading: "Wait",
            body: "Skip your turn to bank +1 extra energy and save up for something big.",
          },
          {
            heading: "Read them",
            body: "You can see your opponent's energy and what they played recently. 6 or more energy means a POWER card could be coming.",
          },
        ],
      },
      // PAGE 3: The mind games
      {
        title: "Mind Games",
        subtitle: "Every special card beats one thing",
        sections: [
          {
            heading: "Power",
            body: "A huge push, but a COUNTER stops it cold.",
            color: "#f2b33d",
          },
          {
            heading: "Counter",
            body: "Cancels a POWER card and pushes for you. Against anything else, it fizzles.",
            color: "#e5484d",
          },
          {
            heading: "Bait",
            body: "Looks like a threat. A big push if they COUNTER, small otherwise.",
            color: "#b36bff",
          },
          {
            heading: "Ambush",
            body: "A big push if they WAIT, small otherwise.",
            color: "#ff8a3d",
          },
        ],
      },
      // PAGE 4: Tips
      {
        title: "Tips",
        subtitle: "Think one move ahead",
        sections: [
          {
            heading: "Watch Their Energy",
            body: "Have they been saving? Ask yourself why before you pick.",
          },
          {
            heading: "Don't Be Predictable",
            body: "Waiting twice in a row invites an AMBUSH. Countering every time invites BAIT.",
          },
          {
            heading: "Quick & Normal Cards",
            body: "Plain pushes with no tricks. Reliable when you can't read them.",
          },
          {
            heading: "In Battle",
            body: "Tap ? in the top-left corner to see the rules again.",
          },
        ],
      },
    ];
  }

  showPage(index) {
    this.currentPage = index;
    const page = this.pages[index];
    const card = this.theme.cards.detective;
    this.pageContainer.removeAll(true);

    this.pageContainer.add(displayText(this, this.theme, 375, 150, page.title, 64));
    if (page.subtitle) {
      this.pageContainer.add(bodyText(this, this.theme, 375, 222, page.subtitle, 26, { soft: true }));
    }

    let y = 370;
    for (const section of page.sections) {
      const heading = this.add
        .text(80, y, section.heading, { fontFamily: FONTS.body, fontSize: "32px", fontStyle: "600", color: hex(card.ink) })
        .setOrigin(0, 0.5);
      const body = this.add
        .text(80, y + 30, section.body, {
          fontFamily: FONTS.body,
          fontSize: "25px",
          color: hex(card.ink),
          wordWrap: { width: 590 },
          lineSpacing: 4,
        })
        .setOrigin(0, 0);
      this.pageContainer.add([heading, body]);
      y += body.height + 90;
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
