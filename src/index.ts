import http from "http";
import dotenv from "dotenv";
dotenv.config();
import { Server, Socket } from "socket.io";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

const PORT = process.env.PORT;

io.on("connection", (socket: Socket) => {
  socket.on("disconnecting", () => {
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);
    for (const room of rooms) {
      const clients = io.sockets.adapter.rooms.get(room);
      if (clients && clients.size > 1) {
        io.to(room).emit("playerLeft", { playerId: socket.id });
      }
    }
    console.log("disconnected", socket.id);
  });
  console.log("a user just connected", socket.id);
  socket.on(
    "join",
    ({
      room,
      nickname,
      playerId,
    }: {
      room: string;
      nickname: string;
      playerId: string;
    }) => {
      const clients = io.sockets.adapter.rooms.get(room);
      if (!clients || clients.size < 2) {
        socket.join(room);
        const updatedClients = io.sockets.adapter.rooms.get(room);
        if (updatedClients && updatedClients.size === 1) {
          io.to(room).emit("playerJoined", {
            timeline: "first",
            playerId,
            nickname,
          });
        }

        if (updatedClients && updatedClients.size === 2) {
          io.to(room).emit("playerJoined", {
            timeline: "second",
            playerId,
            nickname,
          });
        }
      } else {
        socket.emit("full");
      }
    }
  );

  socket.on(
    "requestPlayAgain",
    ({ room, playerId }: { room: string; playerId: string }) => {
      io.to(room).emit("requestPlayAgain", playerId);
    }
  );

  socket.on(
    "acceptPlayAgain",
    ({ room, playerId }: { room: string; playerId: string }) => {
      io.to(room).emit("acceptPlayAgain", playerId);
    }
  );

  socket.on(
    "gameOver",
    ({
      room,
      playerId,
      nickname,
    }: {
      room: string;
      playerId: string;
      nickname: string;
    }) => {
      io.to(room).emit("gameOver", { playerId, nickname });
    }
  );

  socket.on(
    "ready",
    ({
      room,
      placement,
      playerId,
    }: {
      room: string;
      playerId: string;
      placement: any;
    }) => {
      io.to(room).emit("ready", { placement, playerId });
    }
  );
  socket.on("dropTorpedo", (data) => {
    io.to(data.room).emit("dropTorpedo", data);
  });
});

server.listen(PORT, async () => {
  console.log(`Listening to port ${PORT}`);
});
