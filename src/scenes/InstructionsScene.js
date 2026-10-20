import Phaser from "phaser";
import { FONTS } from "../theme.js";

export default class InstructionsScene extends Phaser.Scene {
  constructor() {
    super({ key: "InstructionsScene" });
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;

    this.pages = this.buildPages();
    this.currentPage = 0;

    // Background
    this.add.rectangle(cx, H / 2, W, H, 0x0a0a0a).setOrigin(0.5);

    // Page content container (destroyed / recreated on page change)
    this.pageContainer = this.add.container(0, 0);

    // Navigation
    this.prevBtn = this.add
      .text(80, H - 80, "◀ PREV", {
        fontFamily: FONTS.display,
        fontSize: "36px",
        color: "#888888",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(-1));

    this.nextBtn = this.add
      .text(W - 80, H - 80, "NEXT ▶", {
        fontFamily: FONTS.display,
        fontSize: "36px",
        color: "#00aaff",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.changePage(1));

    this.pageIndicator = this.add
      .text(cx, H - 80, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#666666",
      })
      .setOrigin(0.5);

    // Back button (top left)
    this.add
      .text(20, 20, "✕ BACK", {
        fontFamily: FONTS.display,
        fontSize: "32px",
        color: "#ff4444",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("MenuScene"));

    this.showPage(0);
  }

  buildPages() {
    return [
      // PAGE 1: Overview
      {
        title: "SHADOWS OF JUDGMENT",
        subtitle: "How to Play",
        sections: [
          {
            heading: "THE CASE",
            body: "One shared meter sits between you, starting at 50.\n\nThe Detective pushes it up to 100 to CAPTURE.\nThe Vigilante drags it down to 0 to ESCAPE.",
          },
          {
            heading: "EACH TURN",
            body: "1. Both players pick a card (or WAIT) in secret\n2. Both cards are revealed at the same time\n3. Their pushes add up and the needle moves",
          },
          {
            heading: "THE VERDICT",
            body: "Stakes rise every turn: every card pushes harder. If nobody wins by turn 12, the needle decides.",
          },
        ],
      },
      // PAGE 2: Energy
      {
        title: "ENERGY",
        subtitle: "Spend it or save it",
        sections: [
          {
            heading: "⬢ GAIN",
            body: "You gain +2 energy each turn (max 10). Every card shows its cost.",
            color: "#f2b33d",
          },
          {
            heading: "WAIT",
            body: "Skip your turn to bank +1 extra energy and save up for something big.",
          },
          {
            heading: "👁 READ THEM",
            body: "You can see your opponent's energy and what they played recently. 6 or more energy means a POWER card could be coming.",
          },
        ],
      },
      // PAGE 3: The mind games
      {
        title: "MIND GAMES",
        subtitle: "Every special card beats one thing",
        sections: [
          {
            heading: "POWER",
            body: "A huge push, but a COUNTER stops it cold.",
            color: "#f2b33d",
          },
          {
            heading: "COUNTER",
            body: "Cancels a POWER card and pushes for you. Against anything else, it fizzles.",
            color: "#e5484d",
          },
          {
            heading: "BAIT",
            body: "Looks like a threat. A big push if they COUNTER, small otherwise.",
            color: "#b36bff",
          },
          {
            heading: "AMBUSH",
            body: "A big push if they WAIT, small otherwise.",
            color: "#ff8a3d",
          },
        ],
      },
      // PAGE 4: Tips
      {
        title: "TIPS",
        subtitle: "Think one move ahead",
        sections: [
          {
            heading: "WATCH THEIR ENERGY",
            body: "Have they been saving? Ask yourself why before you pick.",
          },
          {
            heading: "DON'T BE PREDICTABLE",
            body: "Waiting twice in a row invites an AMBUSH. Countering every time invites BAIT.",
          },
          {
            heading: "QUICK & NORMAL CARDS",
            body: "Plain pushes with no tricks. Reliable when you can't read them.",
          },
          {
            heading: "IN BATTLE",
            body: "Tap ? in the top-left corner to see the rules again.",
          },
        ],
      },
    ];
  }

  showPage(index) {
    this.currentPage = index;
    const page = this.pages[index];
    const cx = this.cameras.main.width / 2;

    // Clear previous page content
    this.pageContainer.removeAll(true);

    let y = 120;

    // Title
    const title = this.add
      .text(cx, y, page.title, {
        fontFamily: FONTS.display,
        fontSize: "52px",
        color: "#ffffff",
        align: "center",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.pageContainer.add(title);
    y += 60;

    // Subtitle
    if (page.subtitle) {
      const sub = this.add
        .text(cx, y, page.subtitle, {
          fontFamily: "Arial, sans-serif",
          fontSize: "22px",
          color: "#aaaaaa",
          fontStyle: "italic",
          align: "center",
        })
        .setOrigin(0.5);
      this.pageContainer.add(sub);
      y += 40;
    }

    // Divider
    const divider = this.add.rectangle(cx, y, 600, 2, 0x333333).setOrigin(0.5);
    this.pageContainer.add(divider);
    y += 20;

    // Sections
    for (const section of page.sections) {
      const headingColor = section.color || "#ffd700";

      const heading = this.add
        .text(cx, y, section.heading, {
          fontFamily: "Arial, sans-serif",
          fontSize: "24px",
          color: headingColor,
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5);
      this.pageContainer.add(heading);
      y += 30;

      const body = this.add
        .text(cx, y, section.body, {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#cccccc",
          align: "left",
          wordWrap: { width: 620 },
          lineSpacing: 4,
        })
        .setOrigin(0.5, 0);
      this.pageContainer.add(body);
      y += body.height + 25;
    }

    // Update navigation
    this.prevBtn.setVisible(index > 0);
    this.nextBtn.setText(index < this.pages.length - 1 ? "NEXT ▶" : "DONE ▶");
    this.nextBtn.setColor(
      index < this.pages.length - 1 ? "#00aaff" : "#00ff00",
    );

    // If on last page, DONE goes back to menu
    this.nextBtn.removeAllListeners("pointerdown");
    if (index < this.pages.length - 1) {
      this.nextBtn.on("pointerdown", () => this.changePage(1));
    } else {
      this.nextBtn.on("pointerdown", () => this.scene.start("MenuScene"));
    }

    // Page indicator dots
    const dots = this.pages.map((_, i) => (i === index ? "●" : "○")).join("  ");
    this.pageIndicator.setText(dots);
  }

  changePage(direction) {
    const next = this.currentPage + direction;
    if (next >= 0 && next < this.pages.length) {
      this.showPage(next);
    }
  }
}
