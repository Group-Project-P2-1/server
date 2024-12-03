const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const { createServer } = require("http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        timeout: null,
      };
    }
    console.log(`User ${username} is attempting to join room ${roomId}`);
    console.log(rooms[roomId].players);
    
    if (rooms[roomId].players.length < 2) {
      rooms[roomId].players.push({ id: socket.id, username, move: null });
      socket.join(roomId);
      console.log(`User ${username} joined room ${roomId}`);

      if (rooms[roomId].players.length === 2) {
        console.log(`Room ${roomId} is full, starting game`);
        clearTimeout(rooms[roomId].timeout);
        io.to(roomId).emit("start-game");

      } else {
        console.log(`Waiting for opponent in room ${roomId}`);
        socket.emit("waiting-opponent");
        rooms[roomId].timeout = setTimeout(() => {
            if (rooms[roomId] && rooms[roomId].players.length < 2) {
                console.log(`Room ${roomId} timeout, no opponent joined`);
                io.to(roomId).emit("opponent-timeout");
                rooms[roomId].players.forEach((player) => {
                  io.to(player.id).emit("timeout");
                });
                rooms[roomId] = {};
              }
        }, 5000);
      }
    } else {
      console.log(`Room ${roomId} is full`);
      socket.emit("room-full");
    }
  });

  socket.on("make-move", ({ roomId, move }) => {
    const player = rooms[roomId]?.players.find((p) => p.id === socket.id);
    if (player) player.move = move;

    if (
      rooms[roomId] &&
      rooms[roomId].players[0].move &&
      rooms[roomId].players[1].move
    ) {
      const [player1, player2] = rooms[roomId].players;
      const result = determineWinner(player1.move, player2.move);
      io.to(roomId).emit("round-result", {
        result,
        move1: player1.move,
        move2: player2.move,
      });

      player1.move = null;
      player2.move = null;
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(
        (p) => p.id !== socket.id
      );
      if (rooms[roomId].players.length === 0) delete rooms[roomId];
    }
    console.log("User disconnected:", socket.id);
  });
});

function determineWinner(move1, move2) {
  if (move1 === move2) return "Draw";
  if (
    (move1 === "rock" && move2 === "scissors") ||
    (move1 === "scissors" && move2 === "paper") ||
    (move1 === "paper" && move2 === "rock")
  ) {
    return "Player 1 Wins";
  }
  return "Player 2 Wins";
}

server.listen(port, () => {
  console.log(`Server is running on http://localhost: ${port}`);
});
