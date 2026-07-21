const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // السماح باتصال تطبيق الفلاتر
});

// قائمة الانتظار للمستخدمين الباحثين عن محادثة
let waitingUsers = [];

io.on('connection', (socket) => {
  console.log(`👤 مستخدم جديد متصل: ${socket.id}`);

  // 1. طلب البحث عن محادثة
  socket.on('start_chat', () => {
    // إذا كان المستخدم موجوداً بالفعل في الانتظار، لا تكرره
    if (waitingUsers.includes(socket.id)) return;

    if (waitingUsers.length > 0) {
      // يوجد شخص آخر ينتظر -> ربطهما فوراً
      const partnerId = waitingUsers.pop();
      const roomId = `room_${socket.id}_${partnerId}`;

      // انضمام الطرفين لنفس الغرفة
      socket.join(roomId);
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) partnerSocket.join(roomId);

      // إشعار الطرفين ببدء المحادثة
      io.to(roomId).emit('chat_started', {
        roomId: roomId,
        message: 'تم العثور على صديق مجهول! احچي براحتك.'
      });

      console.log(`🤝 تم ربط ${socket.id} مع ${partnerId} في الغرفة ${roomId}`);
    } else {
      // لا يوجد أحد ينتظر -> إضافة المستخدم لقائمة الانتظار
      waitingUsers.push(socket.id);
      socket.emit('waiting', { message: 'جاري البحث عن شخص آخر...' });
      console.log(`⏳ ${socket.id} في قائمة الانتظار...`);
    }
  });

  // 2. إرسال واستقبال الرسائل داخل الغرفة
  socket.on('send_message', (data) => {
    const { roomId, message } = data;
    // إعادة بث الرسالة للطرف الآخر في نفس الغرفة
    socket.to(roomId).emit('receive_message', {
      senderId: socket.id,
      text: message,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 3. قطع الاتصال أو مغادرة المحادثة
  socket.on('leave_chat', (data) => {
    if (data && data.roomId) {
      socket.to(data.roomId).emit('partner_left', { message: 'غادر الطرف الآخر المحادثة.' });
      socket.leave(data.roomId);
    }
  });

  socket.on('disconnect', () => {
    // إزالة المستخدم من قائمة الانتظار إن كان موجوداً
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
    console.log(`❌ خرج المستخدم: ${socket.id}`);
  });
});

// تشغيل السيرفر على البورت 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سيرفر "سالفة" يعمل بنجاح على البورت ${PORT}`);
});
