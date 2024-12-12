import "express-async-errors";
import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { connectDB, connectServer } from "./config.js";
import userRouter from "./routes/user.js";
import isAuthenticated, {
  isSocketAuthenticated,
} from "./middlewares/isAuthenticated.js";
import messageRouter from "./routes/message.js";
import { Server } from "socket.io";
import Message from "./models/Message.js";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.use("/api/user", userRouter);
app.use("/api/message", isAuthenticated, messageRouter);

connectDB();
connectServer(server);

export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.use(isSocketAuthenticated);

io.on("connection", async (socket) => {
  console.log(`user connected: ${socket.userId}`);

  socket.join(socket.userId);

  socket.on("disconnect", () => {
    console.log(`user disconnected: ${socket.userId}`);
  });

  socket.on("typing", (receiverId) => {
    console.log("reciveID>>>>>>>>>",receiverId, "USerID>>>>>>>>>>>>>",socket.userId)
    socket.to(receiverId).emit("typing", socket.userId);
  });

  socket.on("stop_typing", (receiverId) => {
    socket.to(receiverId).emit("stop_typing", socket.userId);
  });

  socket.on("seen", async (receiverId) => {
    const senderId = socket.userId;

    console.log(`Marking messages from ${senderId} as seen by ${receiverId}`);

    await Message.updateMany(
      { senderId, receiverId, seen: false }, 
      { seen: true }, 
      { multi: true } 
    ).exec();
    io.emit("seen", senderId);
  });

  socket.on("send_message", async ({ receiverId, content }) => {
    const senderId = socket.userId;

    console.log("SENDERId>>>>>>>>", senderId, "ReeviereID++++>>", receiverId)
    console.log("message>>>", content)
    const message = await Message.create({ senderId, receiverId, content });

    console.log("New message>>>", message)

    io.to([receiverId, senderId]).emit("receive_message", message);
  });
});
