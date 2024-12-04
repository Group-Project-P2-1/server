const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
<<<<<<< HEAD

=======
>>>>>>> 9d38aae89ad4578ea0f83a1b48f7fc0eed7a743e
const { createServer } = require("http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

<<<<<<< HEAD
io.on("connection", (socket) => {
  console.log("a new client connected");
});

app.get("/", (req, res) => {
  res.send("App Running");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
=======
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

        if (!rooms[roomId].timeout) {
          rooms[roomId].timeout = setTimeout(() => {
            if (rooms[roomId]?.players.length < 2) {
              console.log(`Opponent timeout in room ${roomId}`);
              io.to(roomId).emit("opponent-timeout");
              rooms[roomId].players.forEach((player) => {
                io.to(player.id).emit("timeout");
              });
              delete rooms[roomId];
            }
          }, 30000);
        }
      }
    } else {
      console.log(`Room ${roomId} is full`);
      socket.emit("room-full");
    }
  });

  socket.on("make-move", ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) player.move = move;

    const [player1, player2] = room.players;

    if (player1.move && player2.move) {
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
      const room = rooms[roomId];
      if (room?.players) {
        room.players = room.players.filter((p) => p.id !== socket.id);
        if (room.players.length === 0) {
          clearTimeout(room.timeout);
          delete rooms[roomId];
        }
      }
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
  console.log(`Server is running on http://localhost:${port}`);
>>>>>>> 9d38aae89ad4578ea0f83a1b48f7fc0eed7a743e
});
