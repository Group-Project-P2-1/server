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

io.on("connection", (socket) => {
  console.log("a new client connected");
});

app.get("/", (req, res) => {
  res.send("App Running");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
