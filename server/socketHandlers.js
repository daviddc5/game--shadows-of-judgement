// Socket event handlers for multiplayer games (Case meter rules).
import {
  SIDE_BY_CHARACTER,
  createRoom,
  pickPair,
  playerView,
  resolveRoom,
  sideOf,
  submitPlay,
} from "./caseRoom.js";

export function setupSocketHandlers(io, matchmakingQueue, gameRooms) {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("findMatch", (playerData = {}) => {
      // Ignore repeat requests from a player already waiting.
      if (matchmakingQueue.some((p) => p.socketId === socket.id)) return;
      matchmakingQueue.push({
        socketId: socket.id,
        username: playerData.username || "Anonymous",
        side: SIDE_BY_CHARACTER[playerData.character] || "detective",
        joinedAt: Date.now(),
      });
      console.log(`🔍 Queue length: ${matchmakingQueue.length}`);
      tryMatchmaking(io, matchmakingQueue, gameRooms);
    });

    socket.on("playCard", ({ roomId, handIndex } = {}) => {
      const room = gameRooms.get(roomId);
      if (!room) return socket.emit("playRejected", { message: "Game room not found" });
      const side = sideOf(room, socket.id);
      if (!side) return socket.emit("playRejected", { message: "You are not in this game" });

      const result = submitPlay(room, side, handIndex);
      if (!result.ok) return socket.emit("playRejected", { message: result.error });

      socket.emit("playAccepted");
      const opponentSide = side === "detective" ? "vigilante" : "detective";
      io.to(room.players[opponentSide].socketId).emit("opponentLocked");

      if (result.bothReady) {
        const { events, played, views, nextViews } = resolveRoom(room);
        for (const s of ["detective", "vigilante"]) {
          io.to(room.players[s].socketId).emit("turnResolved", {
            events,
            played,
            view: views[s],
            nextView: nextViews ? nextViews[s] : null,
          });
        }
        if (room.state.winner) {
          console.log(`🏁 Room ${roomId}: ${room.state.winner} wins (${room.state.endReason})`);
          gameRooms.delete(roomId);
        }
      }
    });

    socket.on("ping", () => {
      socket.emit("pong", { message: "Server is alive!" });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      const queueIndex = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
      if (queueIndex !== -1) matchmakingQueue.splice(queueIndex, 1);

      for (const [roomId, room] of gameRooms.entries()) {
        const side = sideOf(room, socket.id);
        if (!side) continue;
        const opponent = room.players[side === "detective" ? "vigilante" : "detective"];
        io.to(opponent.socketId).emit("opponentDisconnected");
        gameRooms.delete(roomId);
        console.log("Game room", roomId, "deleted due to disconnect");
      }
    });
  });
}

function tryMatchmaking(io, matchmakingQueue, gameRooms) {
  let pair;
  while ((pair = pickPair(matchmakingQueue))) {
    const roomId = Math.random().toString(36).slice(2, 11);
    const room = createRoom(roomId, pair);
    gameRooms.set(roomId, room);

    for (const side of ["detective", "vigilante"]) {
      const opponent = pair[side === "detective" ? "vigilante" : "detective"];
      io.to(pair[side].socketId).emit("matchFound", {
        roomId,
        side,
        opponent: { username: opponent.username },
        view: playerView(room, side),
      });
    }
    console.log(`✅ Match made! Room: ${roomId}`);
  }
}
