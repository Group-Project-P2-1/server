const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const { createServer } = require("http");
const { Server } = require("socket.io");

app.get("/", (req, res) => {
  res.send("App Runing");
});

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://rpsbattle-2edaa.web.app",
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    const existingRoom = Object.values(rooms).find((room) =>
      room.players.some((player) => player.id === socket.id)
    );

    if (existingRoom) {
      socket.emit("already-in-room", { roomId: existingRoom.id });
      return;
    }

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        timeout: null,
      };
    }

    console.log(`User  ${username} is attempting to join room ${roomId}`);

    if (rooms[roomId].players.length < 2) {
      rooms[roomId].players.push({ id: socket.id, username, move: null });
      socket.join(roomId);
      console.log(`User  ${username} joined room ${roomId}`);
    } else {
      console.log(`Room ${roomId} is full`);
      socket.emit("room-full");
      return;
    }

    console.log(rooms[roomId].players.length);
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
  });

  socket.on("disconnect", () => {
    const existingRoom = Object.values(rooms).find((room) =>
      room.players.some((player) => player.id === socket.id)
    );

    if (existingRoom) {
      const playerIndex = existingRoom.players.findIndex(
        (player) => player.id === socket.id
      );
      const username = existingRoom.players[playerIndex].username;

      console.log(
        `User  ${username} has disconnected from room ${existingRoom.id}`
      );

      existingRoom.players.splice(playerIndex, 1);

      if (existingRoom.players.length > 0) {
        const remainingPlayer = existingRoom.players[0];
        io.to(remainingPlayer.id).emit("opponent-disconnected", {
          roomId: existingRoom.id,
        });
        console.log(
          `Notified ${remainingPlayer.username} that their opponent has disconnected`
        );
      }

      if (existingRoom.players.length === 0) {
        clearTimeout(existingRoom.timeout);
        delete rooms[existingRoom.id];
        console.log(
          `Room ${existingRoom.id} has been deleted due to no players`
        );
      }
    }
  });

  socket.on("make-move", ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) player.move = move;

    const [player1, player2] = room.players;
    console.log(player1, "<<<<<");

    if (player1.move && player2.move) {
      const { result, message } = determineWinner(player1, player2);
      io.to(roomId).emit("round-result", {
        result,
        move1: player1.move,
        move2: player2.move,
        username1: player1.username,
        username2: player2.username,
        message,
      });
      console.log(result);

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

function determineWinner(player1, player2) {
  const { move: move1, username: username1 } = player1;
  const { move: move2, username: username2 } = player2;

  if (move1 === move2) {
    return {
      result: "Draw",
      message: {
        [username1]: "It's a draw!",
        [username2]: "It's a draw!",
      },
    };
  }

  if (
    (move1 === "rock" && move2 === "scissors") ||
    (move1 === "scissors" && move2 === "paper") ||
    (move1 === "paper" && move2 === "rock")
  ) {
    return {
      result: `${username1} wins`,
      message: {
        [username1]: "You win!",
        [username2]: "You lose!",
      },
    };
  }
  return {
    result: `${username2} wins`,
    message: {
      [username1]: "You lose!",
      [username2]: "You win!",
    },
  };
}

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
