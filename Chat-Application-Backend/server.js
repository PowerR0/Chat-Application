require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 9000;

app.use(express.json());
app.use(cors());

// ✅ ประกาศ server และ io ก่อน
const http = require("http");
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server, {
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  allowEIO3: true,
});

// ✅ จากนั้น require service
const MessageService = require("./utilities/MessageSocketService");
const GroupChatService = require("./utilities/GroupChatSocketService");
const UserService = require("./utilities/UserSocketService");
io.on("connection", (socket) => {
  new MessageService(io, socket);
  new GroupChatService(io, socket);
  new UserService(io, socket);
  // console.log("✅ Client connected:", socket.id);

  // socket.on("disconnect", () => {
  //   console.log("❌ Client disconnected:", socket.id);
  // });
});

// ✅ แล้วค่อยเชื่อมต่อ MongoDB
const connectDB = require("./config/dbConn");
connectDB();

// ✅ เมื่อ MongoDB เชื่อมแล้ว ค่อยเริ่ม server.listen
mongoose.connection.once("open", () => {
  server.listen(PORT, () => {
    console.log(`✅ Connected to MongoDB`);
    console.log(`🚀 Server listening on port ${PORT}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.log("❌ MongoDB connection error:", err);
});
