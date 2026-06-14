// src/server.js
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { initChatSocket } from './socket/chat.socket.js';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

initChatSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});