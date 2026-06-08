import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, PeerSession, Notification } from '../models';

const onlineUsers = new Map<string, { userId: string; socketId: string; name: string }>();

export const initializeSocket = (httpServer: HttpServer): Server => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://nexora-ai.org',
    'https://www.nexora-ai.org'
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Auth required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'neurolearn-jwt-secret-dev-2026') as { id: string };
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      (socket as any).userId = user._id.toString();
      (socket as any).userName = user.name;
      next();
    } catch { next(new Error('Auth failed')); }
  });

  io.on('connection', async (socket: Socket) => {
    const uid = (socket as any).userId, uname = (socket as any).userName;
    onlineUsers.set(uid, { userId: uid, socketId: socket.id, name: uname });
    await User.findByIdAndUpdate(uid, { isOnline: true, socketId: socket.id });
    io.emit('users:online', Array.from(onlineUsers.values()));

    const unread = await Notification.find({ userId: uid, read: false }).sort({ createdAt: -1 }).limit(10);
    socket.emit('notifications:unread', unread);

    socket.on('chat:join', (roomId: string) => { socket.join(roomId); socket.to(roomId).emit('chat:user-joined', { userId: uid, userName: uname, roomId }); });
    socket.on('chat:leave', (roomId: string) => { socket.leave(roomId); });
    socket.on('chat:message', async (data: any) => {
      const msg = { ...data, senderId: uid, senderName: uname, timestamp: new Date() };
      io.to(data.roomId).emit('chat:message', msg);
      if (data.roomId.startsWith('session_')) await PeerSession.findByIdAndUpdate(data.roomId.replace('session_',''), { $push: { chatMessages: { senderId: uid, message: data.message, timestamp: new Date() } } });
    });
    socket.on('chat:typing', (data: any) => { socket.to(data.roomId).emit('chat:typing', { userId: uid, userName: uname, isTyping: data.isTyping }); });
    socket.on('group:join', (gid: string) => socket.join(`group_${gid}`));
    socket.on('group:update', (data: any) => io.to(`group_${data.groupId}`).emit('group:update', data.update));
    socket.on('session:start', (sid: string) => { socket.join(`session_${sid}`); io.to(`session_${sid}`).emit('session:started', { sessionId: sid, userId: uid }); });
    socket.on('session:end', (sid: string) => io.to(`session_${sid}`).emit('session:ended', { sessionId: sid }));
    socket.on('notification:read', async (nid: string) => { await Notification.findByIdAndUpdate(nid, { read: true }); });

    socket.on('disconnect', async () => {
      onlineUsers.delete(uid);
      await User.findByIdAndUpdate(uid, { isOnline: false, socketId: undefined });
      io.emit('users:online', Array.from(onlineUsers.values()));
    });
  });

  return io;
};
