import Phaser from "phaser";
import { getDeckForCharacter, drawCards } from "../data/cards.js";
import { getCharacter, getOpponent } from "../data/characters.js";
import StatBarGroup from "../ui/StatBarGroup.js";
import CardHand from "../ui/CardHand.js";
import StatsModal from "../ui/StatsModal.js";
import GameLogic from "../logic/GameLogic.js";
import AIController from "../logic/AIController.js";
import CardResolver from "../logic/CardResolver.js";
import NetworkManager from "../network/NetworkManager.js";

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    // Check if this is multiplayer mode
    this.isMultiplayer = this.registry.get("isMultiplayer") || false;
    this.multiplayerData = this.registry.get("multiplayerData") || null;
    this.debugMode = import.meta.env.DEV && this.registry.get("debugMode");
    // Initialize game state
    this.initializeGameState();

    // Create UI elements in order (top to bottom)
    this.createPortraits();
    this.createStatBars();
    this.createEnergyDisplays();
    this.createCardHand();
    this.createStagingArea();
    this.selectedCard = null; // track which card is selected
    this.isSelectingCard = false; // track if player is in card selection mode
    this.lockedCardIndex = null; // track which card is locked in elevated state

    // Initialize StatsModal
    this.statsModal = new StatsModal(this);

    // Create exit button (top-right corner)
    this.createExitButton();

    if (import.meta.env.DEV && this.debugMode && !this.isMultiplayer) {
      import("./DebugControls.js").then(({ createDebugControls }) => {
        if (this.sys.isActive()) {
          createDebugControls(this);
        }
      });
    }

    // Check if PASS button should be shown initially
    this.updatePassButtonVisibility();

    // Register shutdown event to clean up properly when scene stops
    this.events.once("shutdown", this.shutdown, this);
  }

  initializeGameState() {
    const playerCharacterName = this.registry.get("playerCharacter");

    //initially set to true as player starts first. Maybe can toss a coin in the future
    this.turnInProgress = false; // Fixed typo: was "turnInprogress"
    // Prevent multiple plays at once
    this.isPlayerTurn = true;
    this.turnNumber = 1;

    // MULTIPLAYER MODE
    if (this.isMultiplayer && this.multiplayerData) {
      if (import.meta.env.DEV) console.log("🎮 Initializing multiplayer game state");

      // Set up network callbacks
      this.setupMultiplayerCallbacks();

      // Get game state from server
      const gameState = this.multiplayerData.gameState;

      // Determine which player we are
      this.isPlayer1 = this.multiplayerData.isPlayer1;

      // Set characters based on server data
      this.playerCharacter = getCharacter(NetworkManager.getMyCharacter());
      this.opponentCharacter = getCharacter(
        NetworkManager.getOpponentCharacter(),
      );

      // Get stats from server
      this.playerStats = NetworkManager.getMyStats();
      this.opponentStats = NetworkManager.getOpponentStats();

      // Get energy from server
      this.playerEnergy = NetworkManager.getMyEnergy();
      this.opponentEnergy = NetworkManager.getOpponentEnergy();
      this.maxEnergy = 20;

      // Get hand from server (hand is card IDs)
      this.hand = NetworkManager.getMyHand();
      if (import.meta.env.DEV) console.log("🃏 Hand from server:", this.hand);

      // Deck sizes (we don't need actual deck, server manages it)
      this.playerDeckSize = NetworkManager.getMyDeckSize();
      this.opponentDeckSize = NetworkManager.getOpponentDeckSize();

      // Legacy stats for compatibility
      this.stats = this.playerStats;

      // Flag to show waiting UI
      this.waitingForOpponent = false;
      this.isRevealingCards = false;
      this.pendingGameOver = null;

      // Initialize card hand UI for multiplayer
      this.cardHand = new CardHand(this);
      this.cardHand.onCardPlayed = (card, index) =>
        this.selectCard(card, index);

      return;
    }

    // SINGLE PLAYER MODE (original code)
    // Get character data from config
    this.playerCharacter = getCharacter(playerCharacterName);
    this.opponentCharacter = getOpponent(playerCharacterName);

    // Initialize separate stat values for each player
    this.playerStats = {
      investigation: 0,
      morale: 0,
      publicOpinion: 0,
      pressure: 0,
    };

    this.opponentStats = {
      investigation: 0,
      morale: 0,
      publicOpinion: 0,
      pressure: 0,
    };

    // Keep legacy stats for backward compatibility (will update UI progressively)
    this.stats = this.playerStats;

    // Initialize energy system
    this.playerEnergy = 5;
    this.opponentEnergy = 5;
    this.maxEnergy = 20;

    // Get both decks
    this.playerDeck = getDeckForCharacter(this.playerCharacter.name);
    this.opponentDeck = getDeckForCharacter(this.opponentCharacter.name);

    // Draw initial hands
    this.hand = drawCards(this.playerDeck, 4);

    // Initialize AI controller
    this.aiController = new AIController(this.opponentCharacter, this.stats);

    // Initialize card hand UI
    this.cardHand = new CardHand(this);
    this.cardHand.onCardPlayed = (card, index) => this.selectCard(card, index);
  }

  setupMultiplayerCallbacks() {
    // Set up network event handlers for this game
    NetworkManager.onCardAccepted = (data) => {
      if (import.meta.env.DEV) console.log("✅ Server accepted card, waiting for opponent...");
      this.showWaitingForOpponent();
    };

    NetworkManager.onOpponentCardPlayed = (data) => {
      if (import.meta.env.DEV) console.log("👤 Opponent played card, showing face-down...");
      this.showOpponentCardFaceDown();
    };

    NetworkManager.onTurnComplete = (data) => {
      if (import.meta.env.DEV) console.log("🔄 Turn complete from server", data);
      this.handleTurnCompleteFromServer(data);
    };

    NetworkManager.onGameOver = (data) => {
      if (import.meta.env.DEV) console.log("🏁 Game over from server", data);
      this.handleGameOverFromServer(data);
    };

    NetworkManager.onOpponentDisconnected = () => {
      if (import.meta.env.DEV) console.log("❌ Opponent disconnected");
      this.handleOpponentDisconnected();
    };
  }

  createPortraits() {
    // Determine which portraits to show based on player character
    const playerPortrait =
      this.playerCharacter.name === "Independent Detective"
        ? "detective-neutral"
        : "killer-neutral";
    const opponentPortrait =
      this.opponentCharacter.name === "Independent Detective"
        ? "detective-neutral"
        : "killer-neutral";

    // ENEMY at top (compact)
    this.opponentPortrait = this.add.image(80, 75, opponentPortrait);
    this.opponentPortrait.setScale(0.15); // Smaller
    this.opponentPortrait.setFlipX(false);
    this.opponentPortrait.setInteractive({ useHandCursor: true });
    this.opponentPortrait.on("pointerdown", () => {
      this.showStatsModal("opponent");
    });

    this.add
      .text(160, 75, this.opponentCharacter.displayName, {
        fontSize: "16px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // PLAYER at bottom right (compact)
    this.playerPortrait = this.add.image(600, 780, playerPortrait);
    this.playerPortrait.setScale(0.15); // Smaller
    this.playerPortrait.setFlipX(true);
    this.playerPortrait.setInteractive({ useHandCursor: true });
    this.playerPortrait.on("pointerdown", () => {
      this.showStatsModal("player");
    });

    this.add
      .text(520, 780, this.playerCharacter.displayName, {
        fontSize: "16px",
        color: "#00aaff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
  }

  createStatBars() {
    // Get stat configurations from character data
    const playerStatConfigs = [
      {
        key: "investigation",
        label: this.playerCharacter.statLabels.investigation,
        color: this.playerCharacter.statColors.investigation.color,
        isPositive: this.playerCharacter.statColors.investigation.isGreen,
      },
      {
        key: "morale",
        label: this.playerCharacter.statLabels.morale,
        color: this.playerCharacter.statColors.morale.color,
        isPositive: this.playerCharacter.statColors.morale.isGreen,
      },
      {
        key: "publicOpinion",
        label: this.playerCharacter.statLabels.publicOpinion,
        color: this.playerCharacter.statColors.publicOpinion.color,
        isPositive: this.playerCharacter.statColors.publicOpinion.isGreen,
      },
      {
        key: "pressure",
        label: this.playerCharacter.statLabels.pressure,
        color: this.playerCharacter.statColors.pressure.color,
        isPositive: this.playerCharacter.statColors.pressure.isGreen,
      },
    ];

    const opponentStatConfigs = [
      {
        key: "investigation",
        label: this.opponentCharacter.statLabels.investigation,
        color: this.opponentCharacter.statColors.investigation.color,
        isPositive: this.opponentCharacter.statColors.investigation.isGreen,
      },
      {
        key: "morale",
        label: this.opponentCharacter.statLabels.morale,
        color: this.opponentCharacter.statColors.morale.color,
        isPositive: this.opponentCharacter.statColors.morale.isGreen,
      },
      {
        key: "publicOpinion",
        label: this.opponentCharacter.statLabels.publicOpinion,
        color: this.opponentCharacter.statColors.publicOpinion.color,
        isPositive: this.opponentCharacter.statColors.publicOpinion.isGreen,
      },
      {
        key: "pressure",
        label: this.opponentCharacter.statLabels.pressure,
        color: this.opponentCharacter.statColors.pressure.color,
        isPositive: this.opponentCharacter.statColors.pressure.isGreen,
      },
    ];

    // Sort stats: green (positive) first, then red (negative)
    const sortedPlayerStats = playerStatConfigs.sort((a, b) => {
      if (a.isPositive && !b.isPositive) return -1;
      if (!a.isPositive && b.isPositive) return 1;
      return 0;
    });

    const sortedOpponentStats = opponentStatConfigs.sort((a, b) => {
      if (a.isPositive && !b.isPositive) return -1;
      if (!a.isPositive && b.isPositive) return 1;
      return 0;
    });

    // Opponent stats (below portrait at top, pushed down)
    this.opponentStatGroup = new StatBarGroup(
      this,
      20,
      220,
      sortedOpponentStats,
      false,
    );
    this.opponentStatGroup.create();

    // Player stats (above portrait at bottom right, moved up)
    this.playerStatGroup = new StatBarGroup(
      this,
      520,
      380,
      sortedPlayerStats,
      true,
    );
    this.playerStatGroup.create();

    // Store references for updates (maintain backward compatibility)
    this.statBars = {
      ...this.playerStatGroup.getAllBars(),
      ...this.opponentStatGroup.getAllBars(),
    };
    this.statTexts = {
      ...this.playerStatGroup.getAllTexts(),
      ...this.opponentStatGroup.getAllTexts(),
    };
  }

  getProgressValue(stats, character) {
    const winStats = character.winCondition.stats || [
      character.winCondition.stat,
    ];
    return Math.min(...winStats.map((stat) => stats[stat] ?? 0));
  }

  getDangerValue(stats, character) {
    const loseStats = character.loseCondition.stats || [
      character.loseCondition.stat,
    ];
    return Math.max(...loseStats.map((stat) => stats[stat] ?? 0));
  }

  getSideSnapshot(stats, character) {
    const progress = this.getProgressValue(stats, character);
    const danger = this.getDangerValue(stats, character);
    return {
      progress,
      danger,
      score: progress - danger,
    };
  }

  getLargestShiftMessage(beforePlayerStats, beforeOpponentStats) {
    const shifts = [];

    Object.keys(this.playerStats).forEach((stat) => {
      const delta = this.playerStats[stat] - beforePlayerStats[stat];
      if (delta !== 0) {
        shifts.push({
          target: "You",
          label: this.playerCharacter.statLabels[stat],
          delta,
        });
      }
    });

    Object.keys(this.opponentStats).forEach((stat) => {
      const delta = this.opponentStats[stat] - beforeOpponentStats[stat];
      if (delta !== 0) {
        shifts.push({
          target: "Foe",
          label: this.opponentCharacter.statLabels[stat],
          delta,
        });
      }
    });

    if (shifts.length === 0) return "No major swing this turn.";

    shifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const strongest = shifts[0];
    const deltaText =
      strongest.delta > 0 ? `+${strongest.delta}` : `${strongest.delta}`;
    return `${strongest.target} ${strongest.label} ${deltaText}.`;
  }

  getSituationMessage(playerSnapshot, opponentSnapshot) {
    const momentum = playerSnapshot.score - opponentSnapshot.score;
    if (momentum > 10) {
      return `You are AHEAD (${momentum}) — keep pressure on.`;
    }
    if (momentum < -10) {
      return `You are BEHIND (${momentum}) — stabilize danger first.`;
    }
    return "Match is EVEN — next turn is pivotal.";
  }

  showTurnSummaryOverlay(beforePlayerStats, beforeOpponentStats) {
    if (this.turnSummaryObjects) {
      this.turnSummaryObjects.forEach((obj) => obj.destroy());
    }

    const yourState = this.getSideSnapshot(
      this.playerStats,
      this.playerCharacter,
    );
    const foeState = this.getSideSnapshot(
      this.opponentStats,
      this.opponentCharacter,
    );

    const changeLine = this.getLargestShiftMessage(
      beforePlayerStats,
      beforeOpponentStats,
    );
    const situationLine = this.getSituationMessage(yourState, foeState);
    const stateLine = `You P:${yourState.progress}/100 D:${yourState.danger}/100   |   Foe P:${foeState.progress}/100 D:${foeState.danger}/100`;

    const objects = [];
    const overlay = this.add
      .rectangle(375, 667, 700, 360, 0x000000, 0.9)
      .setDepth(2800)
      .setStrokeStyle(2, 0x555555)
      .setOrigin(0.5);
    objects.push(overlay);

    const title = this.add
      .text(375, 545, "TURN RESOLVE", {
        fontFamily: "DeathNote",
        fontSize: "44px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(2801);
    objects.push(title);

    const changes = this.add
      .text(375, 615, changeLine, {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffd166",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5)
      .setDepth(2801);
    objects.push(changes);

    const situation = this.add
      .text(375, 675, situationLine, {
        fontFamily: "Arial, sans-serif",
        fontSize: "21px",
        color: "#d8e8ff",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5)
      .setDepth(2801);
    objects.push(situation);

    const state = this.add
      .text(375, 725, stateLine, {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#cccccc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(2801);
    objects.push(state);

    const nextButton = this.add
      .text(375, 800, "NEXT TURN", {
        fontFamily: "DeathNote",
        fontSize: "34px",
        color: "#ffffff",
        backgroundColor: "#2f7a2f",
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(2802)
      .setInteractive({ useHandCursor: true });
    objects.push(nextButton);

    nextButton.on("pointerover", () => {
      nextButton.setBackgroundColor("#3ca13c");
    });
    nextButton.on("pointerout", () => {
      nextButton.setBackgroundColor("#2f7a2f");
    });
    nextButton.on("pointerdown", () => {
      objects.forEach((obj) => obj.destroy());
      this.turnSummaryObjects = null;
      this.finalizeTurn();
    });

    this.turnSummaryObjects = objects;
  }

  createEnergyDisplays() {
    // Opponent energy (next to portrait, in line with stats)
    const opponentEnergyY = 160; // In line with top of stats
    this.opponentEnergyText = this.add
      .text(20, opponentEnergyY, this.getEnergyString(this.opponentEnergy), {
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // Player energy (higher up, closer to stats)
    const playerEnergyY = 650; // Moved up significantly
    this.playerEnergyText = this.add
      .text(520, playerEnergyY, this.getEnergyString(this.playerEnergy), {
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // Opponent deck counter (below energy)
    const opponentDeckSize = this.isMultiplayer
      ? this.opponentDeckSize
      : this.opponentDeck
        ? this.opponentDeck.length
        : 0;
    this.opponentDeckCounterText = this.add
      .text(20, opponentEnergyY + 35, `Deck: ${opponentDeckSize}`, {
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // Player deck counter (above energy, moved up)
    const playerDeckSize = this.isMultiplayer
      ? this.playerDeckSize
      : this.playerDeck
        ? this.playerDeck.length
        : 0;
    this.playerDeckCounterText = this.add
      .text(520, playerEnergyY - 35, `Deck: ${playerDeckSize}`, {
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  getEnergyString(energy) {
    return `Energy: ⬢ ${energy}/${this.maxEnergy}`;
  }

  updateEnergyDisplay() {
    if (this.playerEnergyText) {
      this.playerEnergyText.setText(this.getEnergyString(this.playerEnergy));
    }
    if (this.opponentEnergyText) {
      this.opponentEnergyText.setText(
        this.getEnergyString(this.opponentEnergy),
      );
    }
  }

  updateDeckCounter() {
    if (this.playerDeckCounterText) {
      const playerDeckSize = this.isMultiplayer
        ? this.playerDeckSize
        : this.playerDeck
          ? this.playerDeck.length
          : 0;
      this.playerDeckCounterText.setText(`Deck: ${playerDeckSize}`);
    }
    if (this.opponentDeckCounterText) {
      const opponentDeckSize = this.isMultiplayer
        ? this.opponentDeckSize
        : this.opponentDeck
          ? this.opponentDeck.length
          : 0;
      this.opponentDeckCounterText.setText(`Deck: ${opponentDeckSize}`);
    }
  }

  createCardHand() {
    this.cardHand.setCards(this.hand);
    this.cardHand.render();
  }

  // legacy version of playcard
  // playCard(card, cardIndex) {

  //   //block if not player's turn
  //   if (!this.isPlayerTurn) {
  //     this.battleLog.addMessage("⚠️ Wait for your turn!", "#ff4444");
  //     return;
  //   }
  //   //block if turn already in progress (prevents rapidClicking)
  //   if (this.turnInProgress) {
  //     return;
  //   }
  //   // Set selected card

  //   //Lock the turn so no other plays can happen until AI turn is over
  //   this.turnInProgress = true;

  //   // Log player action
  //   this.battleLog.addMessage(`You played: ${card.name}`, "#00ff00");

  //   // Apply card effects to stats and log them
  //   this.applyCardEffects(card.effects, true);

  //   // Remove card from hand
  //   this.hand.splice(cardIndex, 1);

  //   // Draw a new card if deck has cards left
  //   const newCards = drawCards(this.playerDeck, 1);
  //   if (newCards.length > 0) {
  //     this.hand.push(newCards[0]);
  //   }

  //   // Redraw hand
  //   this.createCardHand();

  //   // Check win/loss
  //   if (this.checkGameOver()) {
  //     return; // Game ended
  //   }

  //   //END PLAYER TURN
  //   this.endPlayerTurn();
  // }

  // sets selected cards and shows confirm button
  selectCard(card, cardIndex) {
    if (import.meta.env.DEV) console.log("Selecting card:", card.name);

    // Block if not player's turn
    if (!this.isPlayerTurn) {
      return;
    }

    // Block if turn already in progress
    if (this.turnInProgress) {
      return;
    }

    //select card without playing it
    this.selectedCard = { card, cardIndex };
    this.isSelectingCard = true;

    //Show the confirm button
    // Check if button exists AND is not destroyed (handles scene restart)
    if (!this.confirmButton || !this.viewButtonBg || !this.viewButtonBg.scene) {
      if (import.meta.env.DEV) console.log("Creating/recreating confirm buttons");
      this.createConfirmButton();
    }

    // Position the buttons above the selected card (which is now locked elevated)
    this.positionActionButtonsAtCard(cardIndex);

    // Show buttons
    this.confirmButton.setVisible(true);
    if (import.meta.env.DEV) {
      console.log(
        "✅ Confirm button shown at position:",
        this.confirmButton.x,
        this.confirmButton.y,
      );
    }

    if (import.meta.env.DEV) {
      console.log("🔍 BUTTON DEBUG INFO:");
      console.log(
        "  - viewButtonGlow:",
        this.viewButtonGlow?.visible,
        "depth:",
        this.viewButtonGlow?.depth,
      );
      console.log(
        "  - viewButtonBg:",
        this.viewButtonBg?.visible,
        "depth:",
        this.viewButtonBg?.depth,
      );
      console.log(
        "  - viewButtonText:",
        this.viewButtonText?.visible,
        "depth:",
        this.viewButtonText?.depth,
      );
      console.log(
        "  - confirmButtonGlow:",
        this.confirmButtonGlow?.visible,
        "depth:",
        this.confirmButtonGlow?.depth,
      );
      console.log(
        "  - confirmButtonBg:",
        this.confirmButtonBg?.visible,
        "depth:",
        this.confirmButtonBg?.depth,
      );
      console.log(
        "  - confirmButtonText:",
        this.confirmButtonText?.visible,
        "depth:",
        this.confirmButtonText?.depth,
      );
      console.log("  - Camera bounds:", this.cameras.main.worldView);
      console.log(
        "  - Element count in array:",
        this.actionButtonElements.length,
      );
    }
  }

  createConfirmButton() {
    if (import.meta.env.DEV) console.log("Creating action buttons");

    // Store button elements for group management
    this.actionButtonElements = [];

    const baseX = 375;
    const baseY = 750; // Moved up for better mobile accessibility (was 850)

    // VIEW button (left) - Circular with glow
    const viewButtonGlow = this.add.circle(
      baseX - 60,
      baseY,
      45,
      0x4444ff,
      0.6,
    );
    viewButtonGlow.setDepth(1500).setVisible(false);
    this.actionButtonElements.push(viewButtonGlow);

    const viewButtonBg = this.add.circle(baseX - 60, baseY, 38, 0x4444ff);
    viewButtonBg.setDepth(1501).setVisible(false);
    this.actionButtonElements.push(viewButtonBg);

    const viewButtonText = this.add
      .text(baseX - 60, baseY, "👁", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(1502)
      .setVisible(false);
    this.actionButtonElements.push(viewButtonText);

    const viewLabel = this.add
      .text(baseX - 60, baseY + 28, "VIEW", {
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(1502)
      .setVisible(false);
    this.actionButtonElements.push(viewLabel);

    viewButtonBg.setInteractive({ useHandCursor: true });
    viewButtonBg.on("pointerdown", () => {
      this.showEnlargedCardView();
    });
    viewButtonBg.on("pointerover", () => {
      viewButtonBg.setFillStyle(0x6666ff);
      viewButtonGlow.setFillStyle(0x6666ff, 0.8);
    });
    viewButtonBg.on("pointerout", () => {
      viewButtonBg.setFillStyle(0x4444ff);
      viewButtonGlow.setFillStyle(0x4444ff, 0.6);
    });

    // CONFIRM button (right) - Circular with glow
    const confirmButtonGlow = this.add.circle(
      baseX + 60,
      baseY,
      45,
      0x00aa00,
      0.6,
    );
    confirmButtonGlow.setDepth(1500).setVisible(false);
    this.actionButtonElements.push(confirmButtonGlow);

    const confirmButtonBg = this.add.circle(baseX + 60, baseY, 38, 0x00aa00);
    confirmButtonBg.setDepth(1501).setVisible(false);
    this.actionButtonElements.push(confirmButtonBg);

    const confirmButtonText = this.add
      .text(baseX + 60, baseY, "▶", {
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(1502)
      .setVisible(false);
    this.actionButtonElements.push(confirmButtonText);

    const confirmLabel = this.add
      .text(baseX + 60, baseY + 28, "PLAY", {
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(1502)
      .setVisible(false);
    this.actionButtonElements.push(confirmLabel);

    confirmButtonBg.setInteractive({ useHandCursor: true });
    confirmButtonBg.on("pointerdown", () => {
      this.confirmCardPlay();
    });
    confirmButtonBg.on("pointerover", () => {
      confirmButtonBg.setFillStyle(0x00ff00);
      confirmButtonGlow.setFillStyle(0x00ff00, 0.8);
    });
    confirmButtonBg.on("pointerout", () => {
      confirmButtonBg.setFillStyle(0x00aa00);
      confirmButtonGlow.setFillStyle(0x00aa00, 0.6);
    });

    // Store references
    this.viewButtonBg = viewButtonBg;
    this.viewButtonGlow = viewButtonGlow;
    this.viewButtonText = viewButtonText;
    this.viewLabel = viewLabel;
    this.confirmButtonBg = confirmButtonBg;
    this.confirmButtonGlow = confirmButtonGlow;
    this.confirmButtonText = confirmButtonText;
    this.confirmLabel = confirmLabel;

    // For compatibility, create a pseudo-container object
    this.cardActionButtons = {
      setVisible: (visible) => {
        if (import.meta.env.DEV) {
          console.log(
            `🔧 Setting ${this.actionButtonElements.length} button elements to visible=${visible}`,
          );
        }
        this.actionButtonElements.forEach((el, index) => {
          el.setVisible(visible);
          if (import.meta.env.DEV) {
            console.log(
              `  - Element ${index}: visible=${el.visible}, depth=${el.depth}, x=${el.x}, y=${el.y}, alpha=${el.alpha}`,
            );
          }
        });
      },
      setPosition: (x, y) => {
        const offsetX = x - baseX;
        const offsetY = y - baseY;
        this.viewButtonGlow.setPosition(baseX - 60 + offsetX, baseY + offsetY);
        this.viewButtonBg.setPosition(baseX - 60 + offsetX, baseY + offsetY);
        this.viewButtonText.setPosition(baseX - 60 + offsetX, baseY + offsetY);
        this.viewLabel.setPosition(baseX - 60 + offsetX, baseY + 28 + offsetY);
        this.confirmButtonGlow.setPosition(
          baseX + 60 + offsetX,
          baseY + offsetY,
        );
        this.confirmButtonBg.setPosition(baseX + 60 + offsetX, baseY + offsetY);
        this.confirmButtonText.setPosition(
          baseX + 60 + offsetX,
          baseY + offsetY,
        );
        this.confirmLabel.setPosition(
          baseX + 60 + offsetX,
          baseY + 28 + offsetY,
        );
        if (import.meta.env.DEV) {
          console.log(
            `📍 Buttons repositioned to ${x}, ${y} (offset: ${offsetX}, ${offsetY})`,
          );
        }
      },
      setDepth: (depth) => {
        this.actionButtonElements.forEach((el) => el.setDepth(depth));
      },
      setAlpha: (alpha) => {
        this.actionButtonElements.forEach((el) => el.setAlpha(alpha));
      },
      x: baseX,
      y: baseY,
    };

    this.confirmButton = this.cardActionButtons;

    if (import.meta.env.DEV) {
      console.log(
        "✅ Action buttons created successfully, element count:",
        this.actionButtonElements.length,
      );
    }
  }

  // Position the action buttons above the elevated card
  positionActionButtonsAtCard(cardIndex) {
    if (!this.cardActionButtons) {
      console.warn("⚠️ cardActionButtons not created yet");
      return;
    }

    if (!this.cardHand) {
      console.warn("⚠️ cardHand not available, using fallback position");
      // Fallback: center of screen, above hand area
      this.cardActionButtons.setPosition(375, 750);
      this.cardActionButtons.x = 375;
      this.cardActionButtons.y = 750;
      if (import.meta.env.DEV) console.log("Using fallback position: 375, 750");
      return;
    }

    const center = this.cardHand.getCardCenter
      ? this.cardHand.getCardCenter(cardIndex)
      : null;

    if (!center) {
      console.warn(
        `⚠️ Could not get center for card ${cardIndex}, using fallback position`,
      );
      // Fallback: center of screen, above hand area
      this.cardActionButtons.setPosition(375, 750);
      this.cardActionButtons.x = 375;
      this.cardActionButtons.y = 750;
      if (import.meta.env.DEV) console.log("Using fallback position: 375, 750");
      return;
    }

    // Position above the elevated card (HOVER_LIFT = 80px)
    const elevatedY = center.y - 80; // Card moves up 80px when elevated
    const buttonY =
      elevatedY -
      (this.cardHand.CARD_HEIGHT * this.cardHand.HOVER_SCALE) / 2 -
      10; // Above the scaled card, very close

    this.cardActionButtons.setPosition(center.x, buttonY);
    this.cardActionButtons.x = center.x;
    this.cardActionButtons.y = buttonY;
    if (import.meta.env.DEV) {
      console.log(`Positioned buttons at: ${center.x}, ${buttonY}`);
    }
  }

  createStagingArea() {
    // Enemy card placeholder at top center
    this.add
      .rectangle(375, 310, 120, 160, 0x1a1a1a)
      .setStrokeStyle(2, 0xff4444, 0.5)
      .setOrigin(0.5)
      .setDepth(50);

    // Player card placeholder at bottom center
    this.add
      .rectangle(375, 600, 120, 160, 0x1a1a1a)
      .setStrokeStyle(2, 0x00aaff, 0.5)
      .setOrigin(0.5)
      .setDepth(50);

    // Placeholders for face-down cards (will show later)
    this.playerStagedCard = null;
    this.opponentStagedCard = null;

    // Store references to revealed card display objects for cleanup
    this.revealedPlayerCardObjects = [];
    this.revealedOpponentCardObjects = [];

    // Create PASS button (initially hidden)
    this.createPassButton();
  }

  createPassButton() {
    // Create PASS button (left side near player stats, gray, initially hidden)
    this.passButtonBg = this.add
      .rectangle(100, 780, 140, 50, 0x555555)
      .setDepth(150)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.passButtonText = this.add
      .text(100, 780, "PASS ⏭", {
        fontSize: "20px",
        color: "#cccccc",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(151)
      .setVisible(false);

    this.passButtonBg.on("pointerdown", () => {
      this.handlePass();
    });
    this.passButtonBg.on("pointerover", () => {
      this.passButtonBg.setFillStyle(0x777777);
    });
    this.passButtonBg.on("pointerout", () => {
      this.passButtonBg.setFillStyle(0x555555);
    });
  }

  createExitButton() {
    // Create EXIT button (top-right corner, transparent with red on hover)
    this.exitButtonText = this.add
      .text(680, 40, "EXIT", {
        fontFamily: "DeathNote",
        fontSize: "28px",
        color: "#ffffff",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(151)
      .setInteractive({ useHandCursor: true });

    this.exitButtonText.on("pointerdown", () => {
      this.showExitConfirmation();
    });
    this.exitButtonText.on("pointerover", () => {
      this.exitButtonText.setBackgroundColor("#ff0000");
    });
    this.exitButtonText.on("pointerout", () => {
      this.exitButtonText.setBackgroundColor("transparent");
    });
  }

  showExitConfirmation() {
    // Prevent opening multiple dialogs
    if (this.exitConfirmationOpen) return;
    this.exitConfirmationOpen = true;

    // Create dark overlay
    const overlay = this.add
      .rectangle(375, 667, 750, 1334, 0x000000, 0.9)
      .setOrigin(0.5)
      .setDepth(3000)
      .setInteractive(); // Block clicks behind it

    // Create dialog box (dark gray, matching game aesthetic)
    const dialogBg = this.add
      .rectangle(375, 667, 550, 350, 0x1a1a1a)
      .setOrigin(0.5)
      .setDepth(3001)
      .setStrokeStyle(3, 0x666666);

    // Title text (DeathNote font)
    const titleText = this.add
      .text(375, 570, "EXIT GAME?", {
        fontFamily: "DeathNote",
        fontSize: "56px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(3002);

    // Message text
    const messageText = this.add
      .text(375, 670, "Are you sure you want to\nleave this game?", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#cccccc",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(3002);

    // YES button (red background, DeathNote font)
    const yesButton = this.add
      .text(290, 780, "YES", {
        fontFamily: "DeathNote",
        fontSize: "40px",
        color: "#ffffff",
        backgroundColor: "#ff0000",
        padding: { x: 50, y: 15 },
      })
      .setOrigin(0.5)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true });

    // NO button (transparent, DeathNote font)
    const noButton = this.add
      .text(460, 780, "NO", {
        fontFamily: "DeathNote",
        fontSize: "40px",
        color: "#ffffff",
        padding: { x: 50, y: 15 },
      })
      .setOrigin(0.5)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true });

    // Store all dialog elements for cleanup
    const dialogElements = [
      overlay,
      dialogBg,
      titleText,
      messageText,
      yesButton,
      noButton,
    ];

    // YES button handlers
    yesButton.on("pointerover", () => {
      yesButton.setBackgroundColor("#cc0000");
    });
    yesButton.on("pointerout", () => {
      yesButton.setBackgroundColor("#ff0000");
    });
    yesButton.on("pointerdown", () => {
      dialogElements.forEach((el) => el.destroy());
      this.exitConfirmationOpen = false;
      this.handleExit();
    });

    // NO button handlers
    noButton.on("pointerover", () => {
      noButton.setBackgroundColor("#00aaff");
    });
    noButton.on("pointerout", () => {
      noButton.setBackgroundColor("transparent");
    });
    noButton.on("pointerdown", () => {
      dialogElements.forEach((el) => el.destroy());
      this.exitConfirmationOpen = false;
    });
  }

  handleExit() {
    // Clean up multiplayer if active
    if (this.isMultiplayer) {
      this.shutdown();
    }

    // Return to menu
    this.scene.start("MenuScene");
  }

  handlePass() {
    if (this.turnInProgress || !this.isPlayerTurn) return;

    // Clear any previously selected card (player chose PASS instead of confirming)
    this.selectedCard = null;
    this.isSelectingCard = false;
    if (this.confirmButton) {
      this.confirmButton.setVisible(false);
    }

    // MULTIPLAYER: Send PASS to server
    if (this.isMultiplayer) {
      if (import.meta.env.DEV) console.log("🌐 Sending PASS to server");

      // Lock the turn IMMEDIATELY
      this.turnInProgress = true;
      this.isPlayerTurn = false;

      NetworkManager.selectCard("PASS");

      // Show player "passed" in staging area
      this.playerStagedCard = this.add
        .rectangle(375, 600, 120, 160, 0x333333)
        .setStrokeStyle(3, 0x888888)
        .setDepth(100);

      this.playerStagedCardBack = this.add
        .text(375, 600, "PASS", {
          fontSize: "20px",
          color: "#888888",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(101);

      // Hide pass button
      this.passButtonBg.setVisible(false);
      this.passButtonText.setVisible(false);

      // Disable card interactions
      if (this.cardHand) {
        this.cardHand.disableInteractions();
      }

      return;
    }

    // SINGLE PLAYER: Original flow
    // Clear previous revealed cards (including glow effects)
    if (this.revealedPlayerCardObjects) {
      this.revealedPlayerCardObjects.forEach((obj) => obj.destroy());
      this.revealedPlayerCardObjects = [];
    }
    if (this.revealedOpponentCardObjects) {
      this.revealedOpponentCardObjects.forEach((obj) => obj.destroy());
      this.revealedOpponentCardObjects = [];
    }

    // Hide pass button
    this.passButtonBg.setVisible(false);
    this.passButtonText.setVisible(false);

    // Lock the turn
    this.turnInProgress = true;

    // Show player "passed" in staging area
    this.playerStagedCard = this.add
      .rectangle(375, 600, 120, 160, 0x333333)
      .setStrokeStyle(3, 0x888888)
      .setDepth(100);

    this.playerStagedCardBack = this.add
      .text(375, 600, "PASS", {
        fontSize: "20px",
        color: "#888888",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Trigger AI turn
    this.time.delayedCall(800, () => {
      this.aiSelectCard();
    });
  }

  updatePassButtonVisibility() {
    // Always show PASS button when it's player's turn and no turn in progress
    if (!this.isPlayerTurn || this.turnInProgress) {
      this.passButtonBg.setVisible(false);
      this.passButtonText.setVisible(false);
      return;
    }

    // Show button during player turn
    this.passButtonBg.setVisible(true);
    this.passButtonText.setVisible(true);
  }

  showStatsModal(target) {
    // Prevent opening during enlarged card view or turn in progress
    if (this.enlargedViewElements || this.turnInProgress) return;

    const character =
      target === "player" ? this.playerCharacter : this.opponentCharacter;
    const stats = target === "player" ? this.playerStats : this.opponentStats;
    this.statsModal.show(target, character, stats);
  }

  closeStatsModal() {
    this.statsModal.close();
  }

  showEnlargedCardView(cardDataArg) {
    // Use passed cardData, or fall back to hovered/selected card (for singleplayer)
    const card =
      cardDataArg ||
      this.hoveredCard ||
      (this.selectedCard ? this.selectedCard.card : null);
    if (!card) {
      console.warn("No card data available for enlarged view");
      return;
    }

    // Track whether this was called from card selection (has Play button) or from revealed card view (click to close)
    const isFromCardSelection =
      !cardDataArg && (this.hoveredCard || this.selectedCard);

    // Hide action buttons while viewing enlarged card
    if (this.cardActionButtons) {
      this.cardActionButtons.setVisible(false);
    }

    // Create dark overlay background (fullscreen)
    this.enlargedViewOverlay = this.add
      .rectangle(375, 667, 750, 1334, 0x000000, 0.95)
      .setOrigin(0.5)
      .setDepth(2000)
      .setInteractive(); // Block clicks behind it

    // Create enlarged card container (fullscreen, centered)
    const cardWidth = 700;
    const cardHeight = 1000;
    const cardX = 375;
    const cardY = 600; // Centered vertically in 1334px height screen

    // Card background
    const cardBg = this.add
      .rectangle(cardX, cardY, cardWidth, cardHeight, 0x2a2a2a)
      .setOrigin(0.5)
      .setDepth(2001);

    // Card border
    const cardBorder = this.add
      .rectangle(cardX, cardY, cardWidth, cardHeight)
      .setOrigin(0.5)
      .setStrokeStyle(4, 0xd4af37)
      .setDepth(2001);

    // Card name
    const nameText = this.add
      .text(cardX, cardY - 220, card.name, {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: cardWidth - 40 },
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2002);

    // Card description
    const descText = this.add
      .text(cardX, cardY - 100, card.description, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#cccccc",
        align: "center",
        wordWrap: { width: cardWidth - 60 },
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(2002);

    // Energy cost and speed display
    const energyCostText = this.add
      .text(cardX - 100, cardY - 20, `Energy: ⬢ ${card.energyCost || 0}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const speedText = this.add
      .text(cardX + 100, cardY - 20, `Speed: S ${card.speed || 0}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffd700",
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2002);

    // Format and display effects - show both self and opponent effects
    const effectLines = [];
    effectLines.push("━━━ You ━━━");
    if (card.selfEffects.investigation !== 0) {
      effectLines.push(
        `${this.playerCharacter.statLabels.investigation}: ${card.selfEffects.investigation > 0 ? "+" : ""}${
          card.selfEffects.investigation
        }`,
      );
    }
    if (card.selfEffects.morale !== 0) {
      effectLines.push(
        `${this.playerCharacter.statLabels.morale}: ${card.selfEffects.morale > 0 ? "+" : ""}${
          card.selfEffects.morale
        }`,
      );
    }
    if (card.selfEffects.publicOpinion !== 0) {
      effectLines.push(
        `${this.playerCharacter.statLabels.publicOpinion}: ${card.selfEffects.publicOpinion > 0 ? "+" : ""}${
          card.selfEffects.publicOpinion
        }`,
      );
    }
    if (card.selfEffects.pressure !== 0) {
      effectLines.push(
        `${this.playerCharacter.statLabels.pressure}: ${card.selfEffects.pressure > 0 ? "+" : ""}${
          card.selfEffects.pressure
        }`,
      );
    }

    effectLines.push("━━━ Foe ━━━");
    if (card.opponentEffects.investigation !== 0) {
      effectLines.push(
        `${this.opponentCharacter.statLabels.investigation}: ${card.opponentEffects.investigation > 0 ? "+" : ""}${
          card.opponentEffects.investigation
        }`,
      );
    }
    if (card.opponentEffects.morale !== 0) {
      effectLines.push(
        `${this.opponentCharacter.statLabels.morale}: ${card.opponentEffects.morale > 0 ? "+" : ""}${
          card.opponentEffects.morale
        }`,
      );
    }
    if (card.opponentEffects.publicOpinion !== 0) {
      effectLines.push(
        `${this.opponentCharacter.statLabels.publicOpinion}: ${card.opponentEffects.publicOpinion > 0 ? "+" : ""}${
          card.opponentEffects.publicOpinion
        }`,
      );
    }
    if (card.opponentEffects.pressure !== 0) {
      effectLines.push(
        `${this.opponentCharacter.statLabels.pressure}: ${card.opponentEffects.pressure > 0 ? "+" : ""}${
          card.opponentEffects.pressure
        }`,
      );
    }

    const effectsText = this.add
      .text(cardX, cardY + 100, effectLines.join("\n"), {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffd700",
        align: "center",
        fontStyle: "bold",
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(2002);

    // Store base elements for cleanup
    const allElements = [
      this.enlargedViewOverlay,
      cardBg,
      cardBorder,
      nameText,
      descText,
      energyCostText,
      speedText,
      effectsText,
    ];

    if (isFromCardSelection) {
      // Card selection mode: show Go Back and Play buttons
      const backButtonBg = this.add
        .rectangle(250, 1200, 180, 60, 0x666666)
        .setDepth(2003)
        .setInteractive({ useHandCursor: true });

      const backButtonText = this.add
        .text(250, 1200, "← Go Back", {
          fontSize: "24px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(2004);

      backButtonBg.on("pointerdown", () => {
        this.closeEnlargedCardView();
      });
      backButtonBg.on("pointerover", () => {
        backButtonBg.setFillStyle(0x888888);
      });
      backButtonBg.on("pointerout", () => {
        backButtonBg.setFillStyle(0x666666);
      });

      const confirmButtonBg = this.add
        .rectangle(500, 1200, 180, 60, 0x00aa00)
        .setDepth(2003)
        .setInteractive({ useHandCursor: true });

      const confirmButtonText = this.add
        .text(500, 1200, "Play ▶", {
          fontSize: "24px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(2004);

      confirmButtonBg.on("pointerdown", () => {
        this.confirmCardPlay();
      });
      confirmButtonBg.on("pointerover", () => {
        confirmButtonBg.setFillStyle(0x00ff00);
      });
      confirmButtonBg.on("pointerout", () => {
        confirmButtonBg.setFillStyle(0x00aa00);
      });

      allElements.push(
        backButtonBg,
        backButtonText,
        confirmButtonBg,
        confirmButtonText,
      );
    } else {
      // View-only mode (from revealed cards): click anywhere to close
      const closeText = this.add
        .text(cardX, cardY + 380, "Click anywhere to close", {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#888888",
        })
        .setOrigin(0.5)
        .setDepth(2002);

      allElements.push(closeText);

      this.enlargedViewOverlay.on("pointerdown", () => {
        allElements.forEach((element) => element.destroy());
        this.enlargedViewOverlay = null;
        this.enlargedViewElements = null;
      });
    }

    // Store all enlarged view elements for cleanup
    this.enlargedViewElements = allElements;
  }

  closeEnlargedCardView() {
    // Destroy all enlarged view elements
    if (this.enlargedViewElements) {
      this.enlargedViewElements.forEach((element) => element.destroy());
      this.enlargedViewElements = null;
    }
    if (this.enlargedViewOverlay) {
      this.enlargedViewOverlay = null;
    }

    // Restore action buttons if still selecting a card
    if (this.isSelectingCard && this.cardActionButtons && this.selectedCard) {
      this.positionActionButtonsAtCard(this.selectedCard.cardIndex);
      this.cardActionButtons.setVisible(true);
    }
  }

  confirmCardPlay() {
    // Use hovered card info if available, otherwise use selected card
    if (!this.hoveredCard && !this.selectedCard) return;

    if (this.hoveredCard && this.hoveredCardIndex !== undefined) {
      // Set as selected card from hover
      this.selectedCard = {
        card: this.hoveredCard,
        cardIndex: this.hoveredCardIndex,
      };
    }

    if (!this.selectedCard) return;

    // Check if player has enough energy
    const energyCost = this.selectedCard.card.energyCost || 0;
    if (this.playerEnergy < energyCost) {
      if (import.meta.env.DEV) console.log("Not enough energy!");
      return;
    }

    // MULTIPLAYER: Send card selection to server
    if (this.isMultiplayer) {
      if (import.meta.env.DEV) {
        console.log("🌐 Sending card to server:", this.selectedCard.card.id);
        console.log("🌐 Full card object:", this.selectedCard.card);
        console.log("🌐 Current hand:", this.hand);
      }

      // Lock the turn IMMEDIATELY to prevent multiple clicks
      this.turnInProgress = true;
      this.isPlayerTurn = false; // Disable player input

      // Send card ID to server
      NetworkManager.selectCard(this.selectedCard.card.id);

      // Clear selected card immediately to prevent re-submission
      this.selectedCard = null;

      // Show face-down card in staging area
      this.showPlayerCardFaceDown();

      // Hide buttons immediately
      if (this.confirmButton) {
        this.confirmButton.setVisible(false);
      }
      if (this.cardActionButtons) {
        this.cardActionButtons.setVisible(false);
      }

      // Close enlarged view if open
      this.closeEnlargedCardView();

      // DON'T remove card from hand yet - wait for server to confirm
      // The server will send updated hand in turnComplete

      // Disable all card interactions
      this.cardHand.disableInteractions();

      return;
    }

    // SINGLE PLAYER: Continue with original flow
    // Clear previous revealed cards (including glow effects)
    if (this.revealedPlayerCardObjects) {
      this.revealedPlayerCardObjects.forEach((obj) => obj.destroy());
      this.revealedPlayerCardObjects = [];
    }
    if (this.revealedOpponentCardObjects) {
      this.revealedOpponentCardObjects.forEach((obj) => obj.destroy());
      this.revealedOpponentCardObjects = [];
    }

    // Close enlarged view if open
    this.closeEnlargedCardView();

    // Hide buttons after confirming
    if (this.confirmButton) {
      this.confirmButton.setVisible(false);
    }

    // Lock the turn
    this.turnInProgress = true;

    // Deduct energy cost
    this.playerEnergy -= energyCost;
    this.updateEnergyDisplay();
    this.updatePassButtonVisibility();

    // Show player's card face-down in staging area (centered)
    this.playerStagedCard = this.add
      .rectangle(375, 600, 120, 160, 0x333333)
      .setStrokeStyle(3, 0x00aaff)
      .setDepth(100);

    this.playerStagedCardBack = this.add
      .text(375, 600, "🂠", {
        fontSize: "100px",
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Remove card from hand visually
    this.hand.splice(this.selectedCard.cardIndex, 1);
    this.cardHand.setCards(this.hand);
    this.cardHand.render();

    // Now trigger AI turn
    this.time.delayedCall(500, () => this.aiSelectCard());
  }

  aiSelectCard() {
    // AI picks a card it can afford
    const aiCard = this.aiController.selectCard(
      this.opponentDeck,
      this.stats,
      this.isPlayerTurn,
      this.opponentEnergy,
    );

    if (!aiCard) {
      if (import.meta.env.DEV) console.log("AI has no affordable cards!");
      // Skip AI turn
      this.time.delayedCall(1000, () => this.revealBothCards(null));
      return;
    }

    // Remove the selected card from the opponent's deck
    const aiCardIndex = this.opponentDeck.findIndex((c) => c.id === aiCard.id);
    if (aiCardIndex !== -1) {
      this.opponentDeck.splice(aiCardIndex, 1);
    }

    // Update deck counter after AI draws
    this.updateDeckCounter();

    // Deduct AI energy cost
    const energyCost = aiCard.energyCost || 0;
    this.opponentEnergy -= energyCost;
    this.updateEnergyDisplay();

    // Show AI's card face-down (centered)
    this.opponentStagedCard = this.add
      .rectangle(375, 310, 120, 160, 0x333333)
      .setStrokeStyle(3, 0xff4444)
      .setDepth(100);

    this.opponentStagedCardBack = this.add
      .text(375, 310, "🂠", {
        fontSize: "100px",
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Now reveal both cards
    this.time.delayedCall(1000, () => this.revealBothCards(aiCard));
  }

  revealBothCards(aiCard) {
    // Flip animation for player's card
    if (this.playerStagedCard && this.playerStagedCardBack) {
      this.tweens.add({
        targets: [this.playerStagedCard, this.playerStagedCardBack],
        scaleX: 0,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          // Destroy face-down placeholders after flip
          if (this.playerStagedCard) this.playerStagedCard.destroy();
          if (this.playerStagedCardBack) this.playerStagedCardBack.destroy();

          // Create revealed player card
          this.createRevealedPlayerCard();

          // Flip in animation for revealed card
          this.revealedPlayerCardObjects.forEach((obj) => {
            obj.setScale(0, 1);
            this.tweens.add({
              targets: obj,
              scaleX: 1,
              duration: 200,
              ease: "Power2",
            });
          });
        },
      });
    }

    // Flip animation for opponent's card
    if (this.opponentStagedCard && this.opponentStagedCardBack) {
      this.tweens.add({
        targets: [this.opponentStagedCard, this.opponentStagedCardBack],
        scaleX: 0,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          // Destroy face-down placeholders after flip
          if (this.opponentStagedCard) this.opponentStagedCard.destroy();
          if (this.opponentStagedCardBack)
            this.opponentStagedCardBack.destroy();

          // Create revealed opponent card
          this.createRevealedOpponentCard(aiCard);

          // Flip in animation for revealed card
          this.revealedOpponentCardObjects.forEach((obj) => {
            obj.setScale(0, 1);
            this.tweens.add({
              targets: obj,
              scaleX: 1,
              duration: 200,
              ease: "Power2",
            });
          });
        },
      });
    }

    // Apply card effects after flip animations complete
    this.time.delayedCall(500, () => {
      const playerCard = this.selectedCard ? this.selectedCard.card : null;
      // Highlight which card resolves first
      this.highlightFasterCard(playerCard, aiCard);
      // Then apply effects after highlight is shown
      this.time.delayedCall(800, () => {
        this.applyBothCardEffects(playerCard, aiCard);
      });
    });
  }

  highlightFasterCard(playerCard, aiCard) {
    // Use GameLogic to determine which card resolves first
    const resolutionOrder = GameLogic.determineResolutionOrder(
      playerCard,
      aiCard,
    );

    if (resolutionOrder === "player") {
      this.addPriorityHighlight(true);
    } else if (resolutionOrder === "ai") {
      this.addPriorityHighlight(false);
    }
    // If 'none', don't highlight anything
  }

  addPriorityHighlight(isPlayer) {
    const targetY = isPlayer ? 600 : 310;
    const targetObjects = isPlayer
      ? this.revealedPlayerCardObjects
      : this.revealedOpponentCardObjects;

    // Add multiple glow layers for a stronger effect
    // Outer glow
    const outerGlow = this.add
      .rectangle(375, targetY, 170, 230, 0xffd700, 0.4)
      .setOrigin(0.5)
      .setDepth(99);
    targetObjects.push(outerGlow);

    // Middle glow
    const middleGlow = this.add
      .rectangle(375, targetY, 160, 220, 0xffd700, 0.5)
      .setOrigin(0.5)
      .setDepth(99);
    targetObjects.push(middleGlow);

    // Inner glow
    const innerGlow = this.add
      .rectangle(375, targetY, 150, 210, 0xffff00, 0.3)
      .setOrigin(0.5)
      .setDepth(99);
    targetObjects.push(innerGlow);

    // Add pulsing animation to all glow layers
    this.tweens.add({
      targets: [outerGlow, middleGlow, innerGlow],
      alpha: 0.8,
      duration: 400,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
    });

  }

  createRevealedPlayerCard() {
    // Clear any previously revealed cards
    this.revealedPlayerCardObjects.forEach((obj) => obj.destroy());
    this.revealedPlayerCardObjects = [];

    // Check if player passed (no selectedCard means player passed)
    const playerPassed = !this.selectedCard;

    // Show player's card or PASS indicator
    if (playerPassed) {
      const playerPassBg = this.add
        .rectangle(375, 600, 140, 200, 0x333333)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0x888888)
        .setDepth(100);
      this.revealedPlayerCardObjects.push(playerPassBg);

      const playerPassText = this.add
        .text(375, 600, "PASS", {
          fontSize: "24px",
          color: "#888888",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.revealedPlayerCardObjects.push(playerPassText);
    } else {
      // Show actual player card (full card design)
      const playerCardBg = this.add
        .rectangle(375, 600, 140, 200, 0x2a2a2a)
        .setOrigin(0.5)
        .setDepth(100);
      this.revealedPlayerCardObjects.push(playerCardBg);

      const playerCardBorder = this.add
        .rectangle(375, 600, 140, 200)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0x00aaff)
        .setDepth(100);
      this.revealedPlayerCardObjects.push(playerCardBorder);

      const playerCardName = this.add
        .text(375, 530, this.selectedCard.card.name, {
          fontSize: "14px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 130 },
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.revealedPlayerCardObjects.push(playerCardName);

      const playerCardDesc = this.add
        .text(375, 590, this.selectedCard.card.description, {
          fontSize: "10px",
          color: "#cccccc",
          align: "center",
          wordWrap: { width: 130 },
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.revealedPlayerCardObjects.push(playerCardDesc);
    }
  }

  createRevealedOpponentCard(aiCard) {
    // Clear any previously revealed cards
    this.revealedOpponentCardObjects.forEach((obj) => obj.destroy());
    this.revealedOpponentCardObjects = [];

    // Show AI's card or PASS indicator
    if (!aiCard) {
      const aiPassBg = this.add
        .rectangle(375, 310, 140, 200, 0x333333)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0x888888)
        .setDepth(100);
      this.revealedOpponentCardObjects.push(aiPassBg);

      const aiPassText = this.add
        .text(375, 310, "PASS", {
          fontSize: "24px",
          color: "#888888",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.revealedOpponentCardObjects.push(aiPassText);
    } else {
      // Show actual AI card (full card design)
      const aiCardBg = this.add
        .rectangle(375, 310, 140, 200, 0x2a2a2a)
        .setOrigin(0.5)
        .setDepth(100);
      this.revealedOpponentCardObjects.push(aiCardBg);

      const aiCardBorder = this.add
        .rectangle(375, 310, 140, 200)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0xff4444)
        .setDepth(100);
      this.revealedOpponentCardObjects.push(aiCardBorder);

      const aiCardName = this.add
        .text(375, 240, aiCard.name, {
          fontSize: "14px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 130 },
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.revealedOpponentCardObjects.push(aiCardName);

      const aiCardDesc = this.add
        .text(375, 300, aiCard.description, {
          fontSize: "10px",
          color: "#cccccc",
          align: "center",
          wordWrap: { width: 130 },
        })
        .setOrigin(0.5)
        .setDepth(101);
      this.revealedOpponentCardObjects.push(aiCardDesc);
    }
  }

  async applyBothCardEffects(playerCard, aiCard) {
    const beforePlayerStats = { ...this.playerStats };
    const beforeOpponentStats = { ...this.opponentStats };

    // Use CardResolver with delay for sequential resolution
    await CardResolver.resolveCardsWithDelay(
      playerCard,
      aiCard,
      this.playerStats,
      this.opponentStats,
      this,
    );

    // Check win/loss
    if (this.checkGameOver()) {
      return;
    }

    // Show a clear summary and wait for player confirmation before next turn.
    this.showTurnSummaryOverlay(beforePlayerStats, beforeOpponentStats);
  }

  showCancellationEffect(isPlayerCancelled) {
    const targetY = isPlayerCancelled ? 600 : 310;
    const targetObjects = isPlayerCancelled
      ? this.revealedPlayerCardObjects
      : this.revealedOpponentCardObjects;

    // Add red X overlay
    const cancelX = this.add
      .text(375, targetY, "✖", {
        fontSize: "120px",
        color: "#ff0000",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(103)
      .setAlpha(0);
    targetObjects.push(cancelX);

    // Fade in and pulse the X
    this.tweens.add({
      targets: cancelX,
      alpha: 1,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 1,
      ease: "Power2",
    });

    // Add "CANCELLED!" text
    const textY = isPlayerCancelled ? targetY + 130 : targetY - 130;
    const cancelText = this.add
      .text(375, textY, "CANCELLED!", {
        fontSize: "20px",
        color: "#ff0000",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(103)
      .setAlpha(0);
    targetObjects.push(cancelText);

    this.tweens.add({
      targets: cancelText,
      alpha: 1,
      duration: 300,
      ease: "Power2",
    });
  }

  finalizeTurn() {
    // Check win/loss
    if (this.checkGameOver()) {
      return;
    }

    // Reset for next turn
    this.selectedCard = null;
    this.isSelectingCard = false;
    this.turnInProgress = false;
    this.turnNumber++;

    // Increment energy (+5 per turn, max 20)
    this.playerEnergy = Math.min(this.playerEnergy + 5, this.maxEnergy);
    this.opponentEnergy = Math.min(this.opponentEnergy + 5, this.maxEnergy);
    this.updateEnergyDisplay();

    // Draw new card (max 4 cards)
    // const newCard = drawCards(this.playerDeck, 1)[0];
    // if (newCard && this.hand.length < 4) {
    //   this.hand.push(newCard);
    //   this.cardHand.setCards(this.hand);
    //   this.cardHand.render();
    // }

    const newCards = drawCards(this.playerDeck, 1);
    newCards.forEach((card) => {
      if (card && this.hand.length < 4) {
        this.hand.push(card);
      }
    });

    this.cardHand.setCards(this.hand);
    this.cardHand.render();

    // Update deck counter
    this.updateDeckCounter();

    // Update PASS button visibility
    this.updatePassButtonVisibility();
  }

  endPlayerTurn() {
    //switch turn to AI
    this.isPlayerTurn = false;

    // Start AI turn after delay
    this.time.delayedCall(1000, () => {
      this.aiTurn();
    });
  }

  applyCardEffects(effects, logEffects = false) {
    // Store old values for logging
    const oldStats = { ...this.stats };

    // Use GameLogic to apply effects with clamping
    this.stats = GameLogic.applyEffects(this.stats, effects);

    // Log stat changes if requested (removed battle log display)

    // Update visual bars
    this.updateStatBars();
  }

  getStatLabel(statKey) {
    const labels = {
      investigation: "Investigation",
      morale: "Morale",
      publicOpinion: "Public Opinion",
      pressure: "Pressure",
    };
    return labels[statKey] || statKey;
  }

  updateStatBars() {
    // Use the StatBarGroup's animated update method
    Object.keys(this.playerStats).forEach((statKey) => {
      const newValue = this.playerStats[statKey];
      const oldValue =
        this.playerStatGroup.bars[statKey]?.bar?.getData("currentValue");

      if (this.playerStatGroup.bars[statKey]) {
        this.playerStatGroup.bars[statKey].bar.setData(
          "currentValue",
          newValue,
        );
        this.playerStatGroup.updateStat(statKey, newValue, oldValue);
      }
    });

    Object.keys(this.opponentStats).forEach((statKey) => {
      const newValue = this.opponentStats[statKey];
      const oldValue =
        this.opponentStatGroup.bars[statKey]?.bar?.getData("currentValue");

      if (this.opponentStatGroup.bars[statKey]) {
        this.opponentStatGroup.bars[statKey].bar.setData(
          "currentValue",
          newValue,
        );
        this.opponentStatGroup.updateStat(statKey, newValue, oldValue);
      }
    });

    // Update legacy stats reference
    this.stats = this.playerStats;

  }

  endAITurn() {
    if (import.meta.env.DEV) console.log("--- AI turn ended ---");
    this.turnNumber++;
    this.isPlayerTurn = true;
    this.turnInProgress = false;

    if (import.meta.env.DEV) {
      console.log(`=== Turn ${this.turnNumber} - Player's turn ===`);
    }

    // Update PASS button visibility for new player turn
    this.updatePassButtonVisibility();
  }

  aiTurn() {
    if (import.meta.env.DEV) console.log("AI turn...");

    // AI draws 3 random cards to choose from
    const aiCards = drawCards(this.opponentDeck, 3);
    if (aiCards.length === 0) return;

    // Update deck counter after AI draws
    this.updateDeckCounter();

    // Choose the best card based on AI logic
    const bestCard = this.chooseBestAICard(aiCards);
    if (import.meta.env.DEV) console.log("AI plays:", bestCard.name);

    // Apply AI card effects
    this.applyCardEffects(bestCard.effects, true);

    // Check win/loss before ending turn
    if (this.checkGameOver()) {
      return; // Game ended, don't continue turn
    }

    // End AI turn
    this.endAITurn();
  }

  chooseBestAICard(cards) {
    // Delegate to AIController
    return this.aiController.chooseBestCard(cards);
  }

  checkGameOver() {
    // Check player's win/lose conditions using character-specific logic
    const playerWinStats = this.playerCharacter.winCondition.stats || [
      this.playerCharacter.winCondition.stat,
    ];
    const playerLoseStats = this.playerCharacter.loseCondition.stats || [
      this.playerCharacter.loseCondition.stat,
    ];
    const opponentWinStats = this.opponentCharacter.winCondition.stats || [
      this.opponentCharacter.winCondition.stat,
    ];
    const opponentLoseStats = this.opponentCharacter.loseCondition.stats || [
      this.opponentCharacter.loseCondition.stat,
    ];

    // Player wins if all required green stats reach threshold
    if (
      GameLogic.isConditionMet(
        this.playerStats,
        this.playerCharacter.winCondition,
      )
    ) {
      if (import.meta.env.DEV) {
        console.log(
          `Game Over! Player wins - ${playerWinStats.join(", ")} reached target`,
        );
      }
      this.gameOver("player", `${this.playerCharacter.winCondition.message}`);
      return true;
    }

    // Player loses if any red danger stat reaches threshold
    if (
      GameLogic.isConditionMet(
        this.playerStats,
        this.playerCharacter.loseCondition,
      )
    ) {
      if (import.meta.env.DEV) {
        console.log(
          `Game Over! Player loses - ${playerLoseStats.join(", ")} danger threshold hit`,
        );
      }
      this.gameOver(
        "opponent",
        `${this.playerCharacter.loseCondition.message}`,
      );
      return true;
    }

    // Opponent wins if all required green stats reach threshold
    if (
      GameLogic.isConditionMet(
        this.opponentStats,
        this.opponentCharacter.winCondition,
      )
    ) {
      if (import.meta.env.DEV) {
        console.log(
          `Game Over! Opponent wins - ${opponentWinStats.join(", ")} reached target`,
        );
      }
      this.gameOver(
        "opponent",
        `${this.opponentCharacter.winCondition.message}`,
      );
      return true;
    }

    // Opponent loses if any red danger stat reaches threshold
    if (
      GameLogic.isConditionMet(
        this.opponentStats,
        this.opponentCharacter.loseCondition,
      )
    ) {
      if (import.meta.env.DEV) {
        console.log(
          `Game Over! Opponent loses - ${opponentLoseStats.join(", ")} danger threshold hit`,
        );
      }
      this.gameOver(
        "player",
        `${this.opponentCharacter.loseCondition.message}`,
      );
      return true;
    }

    // Check if both players are out of cards
    const playerOutOfCards =
      this.hand.length === 0 &&
      (!this.playerDeck || this.playerDeck.length === 0);
    const opponentOutOfCards =
      !this.opponentDeck || this.opponentDeck.length === 0;
    if (playerOutOfCards && opponentOutOfCards) {
      // Calculate score: green stats minus red stats for each player
      const playerGreenStats = this.playerCharacter.statColors;
      const opponentGreenStats = this.opponentCharacter.statColors;
      let playerScore = 0;
      let opponentScore = 0;

      for (const stat of [
        "investigation",
        "morale",
        "publicOpinion",
        "pressure",
      ]) {
        if (playerGreenStats[stat].isGreen) {
          playerScore += this.playerStats[stat];
        } else {
          playerScore -= this.playerStats[stat];
        }
        if (opponentGreenStats[stat].isGreen) {
          opponentScore += this.opponentStats[stat];
        } else {
          opponentScore -= this.opponentStats[stat];
        }
      }

      if (import.meta.env.DEV) {
        console.log(
          `Out of cards! Player score: ${playerScore}, Opponent score: ${opponentScore}`,
        );
      }

      const playerName = this.playerCharacter.displayName;
      const opponentName = this.opponentCharacter.displayName;

      if (playerScore > opponentScore) {
        this.gameOver(
          "player",
          `All cards played!\n${playerName} score: ${playerScore}\n${opponentName} score: ${opponentScore}`,
        );
      } else if (opponentScore > playerScore) {
        this.gameOver(
          "opponent",
          `All cards played!\n${opponentName} score: ${opponentScore}\n${playerName} score: ${playerScore}`,
        );
      } else {
        // True tie - player with higher combined green progress wins
        const playerWinProgress = playerWinStats.reduce(
          (total, stat) => total + this.playerStats[stat],
          0,
        );
        const opponentWinProgress = opponentWinStats.reduce(
          (total, stat) => total + this.opponentStats[stat],
          0,
        );
        if (playerWinProgress >= opponentWinProgress) {
          this.gameOver(
            "player",
            `All cards played! Tied at ${playerScore} — tiebreaker: your combined green progress was higher`,
          );
        } else {
          this.gameOver(
            "opponent",
            `All cards played! Tied at ${playerScore} — tiebreaker: opponent's combined green progress was higher`,
          );
        }
      }
      return true;
    }

    return false;
  }

  gameOver(winner, reason) {
    // Normalize winner to "player" or "opponent" for GameOverScene
    let normalizedWinner;
    if (winner === "player" || winner === "opponent") {
      normalizedWinner = winner;
    } else if (
      winner === this.playerCharacter.displayName ||
      winner === this.playerCharacter.name
    ) {
      normalizedWinner = "player";
    } else {
      normalizedWinner = "opponent";
    }

    // Switch to GameOverScene and pass winner data
    this.scene.start("GameOverScene", {
      winner: normalizedWinner,
      playerCharacter: this.playerCharacter.name,
      opponentCharacter: this.opponentCharacter.name,
      reason: reason || "Game Over",
      finalStats: {
        yourStats: { ...this.playerStats },
        opponentStats: { ...this.opponentStats },
      },
    });
  }

  // === MULTIPLAYER METHODS ===

  showPlayerCardFaceDown() {
    // Clear previous cards if any
    if (this.playerStagedCard) this.playerStagedCard.destroy();
    if (this.playerStagedCardBack) this.playerStagedCardBack.destroy();

    // Show player's card face-down in staging area
    this.playerStagedCard = this.add
      .rectangle(375, 600, 120, 160, 0x333333)
      .setStrokeStyle(3, 0x00aaff)
      .setDepth(100);

    this.playerStagedCardBack = this.add
      .text(375, 600, "🂠", {
        fontSize: "100px",
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  showOpponentCardFaceDown() {
    // Clear previous cards if any
    if (this.opponentStagedCard) this.opponentStagedCard.destroy();
    if (this.opponentStagedCardBack) this.opponentStagedCardBack.destroy();

    // Show opponent's card face-down in staging area
    this.opponentStagedCard = this.add
      .rectangle(375, 310, 120, 160, 0x333333)
      .setStrokeStyle(3, 0xff4444)
      .setDepth(100);

    this.opponentStagedCardBack = this.add
      .text(375, 310, "🂠", {
        fontSize: "100px",
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  showWaitingForOpponent() {
    // Show "Waiting for opponent..." text
    if (!this.waitingText) {
      this.waitingText = this.add
        .text(375, 450, "Waiting for opponent...", {
          fontFamily: "DeathNote",
          fontSize: "36px",
          color: "#ffaa00",
        })
        .setOrigin(0.5)
        .setDepth(1000);

      // Add pulsing animation
      this.tweens.add({
        targets: this.waitingText,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.waitingText.setVisible(true);
    }
  }

  hideWaitingForOpponent() {
    if (this.waitingText) {
      this.waitingText.setVisible(false);
      this.tweens.killTweensOf(this.waitingText);
      this.waitingText.setAlpha(1);
    }
  }

  handleTurnCompleteFromServer(data) {
    // Hide waiting text
    this.hideWaitingForOpponent();

    // Store the updated game state but DON'T apply it yet
    this.pendingGameState = data.gameState;
    this.pendingMyCard = data.yourCard;
    this.pendingOpponentCard = data.opponentCard;

    // Show both cards (reveal animation) - stats will update AFTER animations
    this.revealBothCardsMultiplayer(data.yourCard, data.opponentCard);
  }

  async revealBothCardsMultiplayer(myCard, opponentCard) {
    if (import.meta.env.DEV) {
      console.log("Revealing cards:", myCard, opponentCard);
    }

    this.isRevealingCards = true;

    // CardResolver is already imported at the top of the file

    // Wait 500ms before flipping cards
    await new Promise((resolve) => this.time.delayedCall(500, resolve));

    // If game ended during the wait, don't continue
    if (this.pendingGameOver) {
      this.isRevealingCards = false;
      this.handleGameOverFromServer(this.pendingGameOver);
      return;
    }

    // Destroy face-down cards (both rectangles and text)
    if (this.playerStagedCard) this.playerStagedCard.destroy();
    if (this.playerStagedCardBack) this.playerStagedCardBack.destroy();
    if (this.opponentStagedCard) this.opponentStagedCard.destroy();
    if (this.opponentStagedCardBack) this.opponentStagedCardBack.destroy();

    // Show revealed cards
    this.showRevealedCard(myCard, 375, 600, true);
    this.showRevealedCard(opponentCard, 375, 310, false);

    // Use CardResolver for visual animations only (don't update stats)
    await CardResolver.resolveCardsWithDelay(
      myCard,
      opponentCard,
      this.playerStats,
      this.opponentStats,
      this,
      true, // Skip stat updates - server will send real values
    );

    this.isRevealingCards = false;

    // If game over arrived during animations, handle it now
    if (this.pendingGameOver) {
      this.handleGameOverFromServer(this.pendingGameOver);
      return;
    }

    // After animations complete, show Next Turn button
    this.showNextTurnButton();
  }

  showRevealedCard(cardData, x, y, isPlayer) {
    const cardObjects = [];

    // Card background
    const cardBg = this.add.rectangle(x, y, 140, 180, 0x2a2a2a).setDepth(102);
    cardObjects.push(cardBg);

    // Card name
    const nameText = this.add
      .text(x, y - 60, cardData.name, {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
        wordWrap: { width: 120 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(103);
    cardObjects.push(nameText);

    // Card type indicator
    const typeColor = this.getCardTypeColor(cardData.cardType);
    const typeRect = this.add
      .rectangle(x, y, 120, 140, typeColor, 0.3)
      .setDepth(103);
    cardObjects.push(typeRect);

    // Make the card clickable to view enlarged
    cardBg.setInteractive({ useHandCursor: true });
    cardBg.on("pointerdown", () => {
      this.showEnlargedCardView(cardData);
    });

    nameText.setInteractive({ useHandCursor: true });
    nameText.on("pointerdown", () => {
      this.showEnlargedCardView(cardData);
    });

    typeRect.setInteractive({ useHandCursor: true });
    typeRect.on("pointerdown", () => {
      this.showEnlargedCardView(cardData);
    });

    // Store for cleanup
    if (isPlayer) {
      this.revealedPlayerCardObjects = cardObjects;
    } else {
      this.revealedOpponentCardObjects = cardObjects;
    }
  }

  getCardTypeColor(cardType) {
    const colors = {
      COUNTER: 0xff0000,
      QUICK: 0x0088ff,
      NORMAL: 0x00ff00,
      POWER: 0xffaa00,
    };
    return colors[cardType] || 0x888888;
  }

  handleGameOverFromServer(data) {
    if (import.meta.env.DEV) console.log("Game over:", data);

    // If we're in the middle of revealing cards, defer the game over
    if (this.isRevealingCards) {
      if (import.meta.env.DEV) {
        console.log("Deferring game over until card reveal finishes");
      }
      this.pendingGameOver = data;
      return;
    }

    // Server already sends "you" or "opponent" - use it directly
    const winner = data.winner === "you" ? "player" : "opponent";

    // Clean up network callbacks
    NetworkManager.onTurnComplete = null;
    NetworkManager.onGameOver = null;
    NetworkManager.onCardAccepted = null;
    NetworkManager.onOpponentCardPlayed = null;
    NetworkManager.onOpponentDisconnected = null;

    // Clean up pending state
    this.pendingGameOver = null;

    this.scene.start("GameOverScene", {
      winner: winner,
      playerCharacter: this.playerCharacter.name,
      opponentCharacter: this.opponentCharacter.name,
      reason: data.reason,
      scoring: data.scoring || null,
      finalStats: data.finalStats || null,
    });
  }

  shutdown() {
    // Clean up multiplayer callbacks when scene is destroyed/restarted
    if (this.isMultiplayer) {
      NetworkManager.onTurnComplete = null;
      NetworkManager.onGameOver = null;
      NetworkManager.onCardAccepted = null;
      NetworkManager.onOpponentCardPlayed = null;
      NetworkManager.onOpponentDisconnected = null;
    }

    // Clear button references so they get recreated on next scene start
    this.confirmButton = null;
    this.cardActionButtons = null;
    this.actionButtonElements = null;
    this.debugPanelObjects = null;
    this.debugButton = null;
    this.debugPanelVisible = false;
    this.turnSummaryObjects = null;
  }

  handleOpponentDisconnected() {
    // Disable all input to prevent actions during transition
    this.turnInProgress = true;
    this.isPlayerTurn = false;

    // Show message
    const disconnectText = this.add
      .text(375, 450, "Opponent Disconnected!\nYou Win!", {
        fontFamily: "DeathNote",
        fontSize: "48px",
        color: "#00ff00",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(2000);

    // Wait then go to game over
    this.time.delayedCall(2000, () => {
      NetworkManager.onTurnComplete = null;
      NetworkManager.onGameOver = null;
      NetworkManager.onCardAccepted = null;
      NetworkManager.onOpponentCardPlayed = null;
      NetworkManager.onOpponentDisconnected = null;

      this.scene.start("GameOverScene", {
        winner: "player",
        playerCharacter: this.playerCharacter.name,
        opponentCharacter: this.opponentCharacter.name,
        reason: "Opponent disconnected",
      });
    });
  }

  showNextTurnButton() {
    // Create Next Turn button
    const buttonY = this.cameras.main.height / 2 + 180;

    this.nextTurnButton = this.add
      .text(this.cameras.main.width / 2, buttonY, "NEXT TURN", {
        fontFamily: "DeathNote",
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#ff0000",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });

    // Pulsing animation
    this.tweens.add({
      targets: this.nextTurnButton,
      scale: { from: 1, to: 1.1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.nextTurnButton.on("pointerdown", () => {
      this.applyPendingGameState();
    });

    this.nextTurnButton.on("pointerover", () => {
      this.nextTurnButton.setStyle({ backgroundColor: "#cc0000" });
    });

    this.nextTurnButton.on("pointerout", () => {
      this.nextTurnButton.setStyle({ backgroundColor: "#ff0000" });
    });
  }

  applyPendingGameState() {
    if (!this.pendingGameState) return;

    // Destroy Next Turn button
    if (this.nextTurnButton) {
      this.tweens.killTweensOf(this.nextTurnButton);
      this.nextTurnButton.destroy();
      this.nextTurnButton = null;
    }

    // NOW apply the stats from the server
    this.playerStats = NetworkManager.getMyStats();
    this.opponentStats = NetworkManager.getOpponentStats();
    this.updateStatBars();

    // Update energy
    this.playerEnergy = NetworkManager.getMyEnergy();
    this.opponentEnergy = NetworkManager.getOpponentEnergy();
    this.updateEnergyDisplay();

    // Update hand (server sent new cards)
    this.hand = NetworkManager.getMyHand();
    this.cardHand.setCards(this.hand);
    this.cardHand.render();

    // Update deck sizes
    this.playerDeckSize = NetworkManager.getMyDeckSize();
    this.opponentDeckSize = NetworkManager.getOpponentDeckSize();
    this.updateDeckCounter();

    // Clean up revealed cards
    if (this.revealedPlayerCardObjects) {
      this.revealedPlayerCardObjects.forEach((obj) => obj.destroy());
      this.revealedPlayerCardObjects = [];
    }
    if (this.revealedOpponentCardObjects) {
      this.revealedOpponentCardObjects.forEach((obj) => obj.destroy());
      this.revealedOpponentCardObjects = [];
    }

    // Clear pending state
    this.pendingGameState = null;
    this.pendingMyCard = null;
    this.pendingOpponentCard = null;

    // Re-enable turn
    this.turnInProgress = false;
    this.isPlayerTurn = true;
    this.updatePassButtonVisibility();

    // AUTO-PASS: If player has no cards left, automatically pass
    if (this.isMultiplayer && this.hand.length === 0) {
      if (import.meta.env.DEV) {
        console.log("🚫 No cards left - auto-passing");
        console.log("   Hand length:", this.hand.length);
        console.log("   Deck size:", this.playerDeckSize);
      }
      this.handlePass();
    }
  }
}
