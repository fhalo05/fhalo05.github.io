const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (adjust for production)
    methods: ['GET', 'POST']
  }
});

// Serve frontend files from 'public' folder
app.use(express.static('public'));

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Pair users
  if (waitingUser) {
    const partner = waitingUser;
    waitingUser = null;

    // Notify both clients that they’ve been paired
    partner.emit('partner-found', socket.id);
    socket.emit('partner-found', partner.id);
  } else {
    waitingUser = socket;
  }

  // WebRTC signal relay
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Handle chat messages
  socket.on('chat-message', ({ to, message }) => {
    io.to(to).emit('chat-message', { from: socket.id, message });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    socket.broadcast.emit('partner-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
