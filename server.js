const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.get('/', (req, res) => {
  res.send('Salfa Server is Running! 🟢');
});

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('مستخدم جديد اتصل:', socket.id);

  socket.on('start_chat', () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      // إذا كان هناك شخص ينتظر، اجمعهما في غرفة واحدة
      const roomId = `room_${waitingUser.id}_${socket.id}`;
      
      socket.join(roomId);
      waitingUser.join(roomId);

      io.to(roomId).emit('chat_started', { roomId });

      console.log(`تم الربط بين ${socket.id} و ${waitingUser.id} في الغرفة ${roomId}`);
      waitingUser = null;
    } else {
      // إذا لم يكن هناك أحد ينتظر، اضفه للقائمة
      waitingUser = socket;
      console.log('مستخدم بانتظار شريك:', socket.id);
    }
  });

  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', {
      text: data.message,
      senderId: socket.id
    });
  });

  socket.on('disconnect', () => {
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    console.log('مستخدم غادر:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
