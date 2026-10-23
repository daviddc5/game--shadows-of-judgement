import Phaser from "phaser";
import { FONTS, getTheme, hex, paintBackground } from "../theme.js";
import { backLink, bodyText, button, displayText, fit } from "../ui/widgets.js";
import { buildRubberStamp, paintFrame } from "../ui/cardFace.js";
import { CASES, getCase } from "../case/campaign.js";

const PANEL = { w: 660, h: 170, gap: 190, top: 430 };

/**
 * The campaign: a list of cases as case files (src/case/campaign.js), and a
 * briefing page for the chosen case with a button that starts it.
 * Scene data: { caseId } shows that case's briefing; nothing shows the list.
 */
export default class CampaignScene extends Phaser.Scene {
  constructor() {
    super({ key: "CampaignScene" });
  }

  create(data) {
    this.theme = getTheme();
    paintBackground(this, this.theme);
    const chosen = data?.caseId && getCase(data.caseId);
    if (chosen) this.showBriefing(chosen);
    else this.showList();
  }

  showList() {
    const theme = this.theme;
    backLink(this, theme, () => this.scene.start("MenuScene"));
    displayText(this, theme, 375, 170, "Campaign", 80);
    bodyText(this, theme, 375, 250, "Cases to crack, one at a time", 26, { soft: true });

    CASES.forEach((c, i) => {
      const y = PANEL.top + i * PANEL.gap;
      const style = theme.cards.detective;
      const ink = hex(style.ink);
      const frame = this.add.graphics().setPosition(375, y).setAlpha(c.unlocked ? 1 : 0.6);
      paintFrame(frame, PANEL.w, PANEL.h, style, theme.red, false, 18);
      const left = 375 - PANEL.w / 2 + 36;
      const label = this.add
        .text(left, y - 52, c.label.toUpperCase(), { fontFamily: FONTS.body, fontSize: "20px", fontStyle: "600", color: ink, letterSpacing: 2 })
        .setOrigin(0, 0.5)
        .setAlpha(0.75);
      const title = this.add
        .text(left, y - 16, c.title, { fontFamily: FONTS.body, fontSize: "34px", fontStyle: "600", color: ink })
        .setOrigin(0, 0.5);
      fit(title, PANEL.w - 250, 46, 24);
      const blurb = this.add
        .text(left, y + 14, c.blurb, { fontFamily: FONTS.body, fontSize: "22px", color: ink, wordWrap: { width: PANEL.w - 250 } })
        .setOrigin(0, 0);
      fit(blurb, PANEL.w - 250, 60, 16);
      if (!c.unlocked) {
        [label, title, blurb].forEach((t) => t.setAlpha(0.6));
        const stamp = buildRubberStamp(this, 0, y, "Coming soon", 20);
        stamp.setX(375 + PANEL.w / 2 - 36 - stamp.width / 2);
        return;
      }
      this.add
        .text(375 + PANEL.w / 2 - 36, y, "Open ▶", { fontFamily: FONTS.body, fontSize: "28px", fontStyle: "600", color: ink })
        .setOrigin(1, 0.5);
      const hit = this.add.rectangle(375, y, PANEL.w, PANEL.h, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.scene.restart({ caseId: c.id }));
    });
  }

  /** One case's briefing: what it is, what you'll learn, and Start. */
  showBriefing(c) {
    const theme = this.theme;
    backLink(this, theme, () => this.scene.restart({}));
    bodyText(this, theme, 375, 160, c.label.toUpperCase(), 22, { soft: true }).setFontStyle("600");
    displayText(this, theme, 375, 230, c.title, 72);
    bodyText(this, theme, 375, 320, c.blurb, 26, { wrap: 620 });

    const style = theme.cards.detective;
    const ink = hex(style.ink);
    const file = this.add.graphics().setPosition(375, 700);
    paintFrame(file, 660, 560, style, theme.red, false, 18);
    this.add
      .text(80, 460, "In this case you'll learn", { fontFamily: FONTS.body, fontSize: "30px", fontStyle: "600", color: ink })
      .setOrigin(0, 0.5);
    let y = 510;
    c.lessons.forEach((lesson, i) => {
      const t = this.add.text(80, y, `${i + 1}.  ${lesson}`, {
        fontFamily: FONTS.body,
        fontSize: "25px",
        color: ink,
        wordWrap: { width: 590 },
        lineSpacing: 4,
      });
      y += t.height + 22;
    });
    const side = buildRubberStamp(this, 0, 700 + 280 - 56, `You play: ${c.side === "detective" ? "Detective" : "Vigilante"}`, 20);
    side.setX(375 + 330 - 40 - side.width / 2);

    button(this, theme, 375, 1110, 520, "Start the case", () => {
      this.registry.set("playerCharacter", c.side === "vigilante" ? "Vigilante" : "Independent Detective");
      this.registry.set("playerCharacterId", null);
      this.scene.start("CaseBattleScene", { campaign: c.id });
    }, { primary: true });
  }
}
