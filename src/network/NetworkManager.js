import { io } from "socket.io-client";

/**
 * Socket.IO connection for multiplayer Case matches.
 * The server runs the rules; the client sends a hand index (or null to WAIT)
 * and animates the events it gets back.
 */
class NetworkManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;

    // Callbacks set by the lobby and battle scenes.
    this.onMatchFound = null; // ({roomId, side, opponent, view})
    this.onOpponentLocked = null; // ()
    this.onTurnResolved = null; // ({events, played, view, nextView})
    this.onPlayRejected = null; // ({message})
    this.onOpponentDisconnected = null; // ()
    this.onConnectionError = null; // (error)
  }

  connect(serverUrl = null) {
    if (this.socket && this.connected) return;

    // In production the server serves the client; in development it runs on :3001.
    if (!serverUrl) {
      serverUrl =
        window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : window.location.origin;
    }

    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    this.setupEventListeners();
  }

  setupEventListeners() {
    const call = (name, data) => this[name] && this[name](data);

    this.socket.on("connect", () => {
      this.connected = true;
    });
    this.socket.on("disconnect", () => {
      this.connected = false;
      this.roomId = null;
    });
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      call("onConnectionError", error);
    });
    this.socket.on("matchFound", (data) => {
      this.roomId = data.roomId;
      call("onMatchFound", data);
    });
    this.socket.on("opponentLocked", () => call("onOpponentLocked"));
    this.socket.on("turnResolved", (data) => call("onTurnResolved", data));
    this.socket.on("playRejected", (data) => {
      console.error("Play rejected:", data.message);
      call("onPlayRejected", data);
    });
    this.socket.on("opponentDisconnected", () => {
      this.roomId = null;
      call("onOpponentDisconnected");
    });
  }

  findMatch(character) {
    if (!this.connected) {
      console.error("Not connected to server");
      return;
    }
    this.socket.emit("findMatch", { character });
  }

  /** handIndex null means WAIT. */
  playCard(handIndex) {
    if (!this.connected || !this.roomId) {
      console.error("Not in a game room");
      return;
    }
    this.socket.emit("playCard", { roomId: this.roomId, handIndex });
  }

  clearCallbacks() {
    this.onMatchFound = null;
    this.onOpponentLocked = null;
    this.onTurnResolved = null;
    this.onPlayRejected = null;
    this.onOpponentDisconnected = null;
    this.onConnectionError = null;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.roomId = null;
    }
  }
}

// Export singleton instance
export default new NetworkManager();
