const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  res.send('Salfa Server is Running! 🟢');
});

// نخزن فقط معرف المستخدم المنتظر (Socket ID)
let waitingSocketId = null;

io.on('connection', (socket) => {
  console.log('🟢 مستخدم جديد اتصل:', socket.id);

  socket.on('start_chat', () => {
    // إذا كان هناك شخص ينتظر وهو ليس نفس الشخص الحالي
    if (waitingSocketId && waitingSocketId !== socket.id) {
      const partnerSocket = io.sockets.sockets.get(waitingSocketId);

      // التأكد من أن المستخدم المنتظر ما زال متصلاً بالشبكة
      if (partnerSocket) {
        const roomId = `room_${waitingSocketId}_${socket.id}`;

        // إدخال الطرفين للغرفة
        socket.join(roomId);
        partnerSocket.join(roomId);

        // إعلام الطرفين ببدء المحادثة
        io.to(roomId).emit('chat_started', { roomId });

        console.log(`🤝 تم الربط بين ${socket.id} و ${waitingSocketId} في الغرفة: ${roomId}`);
        waitingSocketId = null; // تفريغ الانتظار
      } else {
        // إذا كان المستخدم الأول فصل، اجعل الحالي هو المنتظر
        waitingSocketId = socket.id;
      }
    } else {
      // لا يوجد أحد ينتظر، ضع الحالي في الانتظار
      waitingSocketId = socket.id;
      console.log('⏳ مستخدم ينتظر شريكاً:', socket.id);
    }
  });

  socket.on('send_message', (data) => {
    // إرسال الرسالة لبقية أعضاء الغرفة
    socket.to(data.roomId).emit('receive_message', {
      text: data.message,
      senderId: socket.id
    });
  });

  socket.on('disconnect', () => {
    // إذا غادر الشخص وهو في قائمة الانتظار، نظف القائمة
    if (waitingSocketId === socket.id) {
      waitingSocketId = null;
    }
    console.log('🔴 مستخدم غادر:', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
