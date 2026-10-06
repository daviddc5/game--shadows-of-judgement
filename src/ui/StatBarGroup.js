/**
 * StatBarGroup - Manages a group of stat bars for a character
 */
export default class StatBarGroup {
  constructor(scene, x, y, stats, isPlayer) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.stats = stats;
    this.isPlayer = isPlayer;
    this.bars = {};
    this.texts = {};
    this.objects = [];
  }

  create() {
    const spacing = 55;
    let currentY = this.y;

    this.stats.forEach((stat, index) => {
      this.createStatBar(currentY, stat);
      currentY += spacing;
    });
  }

  createStatBar(y, statConfig) {
    const { key, label, color, isPositive } = statConfig;
    const value = this.scene.stats[key];

    const barWidth = 200;
    const prefix = isPositive ? "+ " : "- ";
    const labelText = this.scene.add
      .text(this.x, y, prefix + label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: isPositive ? "#00ff00" : "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.objects.push(labelText);

    const bar = this.scene.add
      .rectangle(this.x + 2, y, (value / 100) * barWidth, 1, color)
      .setOrigin(0, 0.5);
    bar.setVisible(false);

    bar.setData("currentValue", value);

    this.bars[key] = {
      bar,
      color,
      x: this.x + 2,
      y,
      maxWidth: barWidth,
      isPositive,
    };

    const valueText = this.scene.add
      .text(this.x + barWidth - 10, y, value, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
    this.objects.push(valueText);

    this.texts[key] = valueText;
  }

  updateStat(key, newValue, oldValue) {
    const barData = this.bars[key];
    if (!barData) return;

    // Show floating stat change number
    if (oldValue !== undefined && oldValue !== newValue) {
      const change = newValue - oldValue;
      this.showStatChange(key, change);
    }

    // Animate bar width change
    this.scene.tweens.add({
      targets: barData.bar,
      width: (newValue / 100) * barData.maxWidth,
      duration: 300,
      ease: "Power2",
    });

    // Update text
    this.texts[key].setText(newValue);
  }

  showStatChange(key, change) {
    if (change === 0) return;

    const barData = this.bars[key];
    if (!barData) return;

    // Calculate position for floating text
    const startX = this.x + barData.maxWidth / 2;
    const startY = barData.bar.y;

    // Format text
    const changeText = change > 0 ? `+${change}` : `${change}`;

    // Determine color based on whether stat is positive and whether change is increase/decrease
    // For positive stats (green): increase = green, decrease = red
    // For negative stats (red): increase = red, decrease = green
    let textColor;
    if (barData.isPositive) {
      // Positive stat (like Investigation): more is good
      textColor = change > 0 ? "#00ff00" : "#ff4444";
    } else {
      // Negative stat (like Pressure): more is bad
      textColor = change > 0 ? "#ff4444" : "#00ff00";
    }

    // Create floating text
    const floatingText = this.scene.add
      .text(startX, startY, changeText, {
        fontSize: "20px",
        color: textColor,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(200);

    // Animate floating up and fade out
    this.scene.tweens.add({
      targets: floatingText,
      y: startY - 40,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => {
        floatingText.destroy();
      },
    });
  }

  getAllBars() {
    return this.bars;
  }

  getAllTexts() {
    return this.texts;
  }

  setVisible(visible) {
    this.objects.forEach((obj) => obj.setVisible(visible));
  }
}
