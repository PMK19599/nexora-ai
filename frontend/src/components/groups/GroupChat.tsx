import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { io, Socket } from 'socket.io-client';

interface Message {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string | Date;
}

export default function GroupChat({ groupId }: { groupId: string }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Get token from cookie or local storage if needed. Since we use cookies, Socket.IO usually sends them automatically if withCredentials is true.
    // However, our backend checks auth via `socket.handshake.auth.token`. Let's extract token if we can or just rely on cookie.
    const tokenMatch = document.cookie.match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : '';

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'] // websocket first
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('chat:join', `group_${groupId}`);
    });

    newSocket.on('chat:message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    newSocket.on('chat:typing', (data: { userName: string, isTyping: boolean }) => {
      if (data.isTyping) {
        setIsTyping(`${data.userName} is typing...`);
      } else {
        setIsTyping(null);
      }
    });

    return () => {
      newSocket.emit('chat:leave', `group_${groupId}`);
      newSocket.disconnect();
    };
  }, [groupId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    socket.emit('chat:message', {
      roomId: `group_${groupId}`,
      message: input.trim()
    });
    
    setInput('');
    socket.emit('chat:typing', { roomId: `group_${groupId}`, isTyping: false });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!socket) return;

    socket.emit('chat:typing', { roomId: `group_${groupId}`, isTyping: true });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId: `group_${groupId}`, isTyping: false });
    }, 2000);
  };

  return (
    <Card className="flex flex-col h-[500px] border-0 shadow-xl glass animate-fade-in-up">
      <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-t-xl py-3 px-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
          Live Study Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/40">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-10">
              No messages yet. Say hi! 👋
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user?._id;
            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-xs text-muted-foreground ml-1 mb-1">{msg.senderName}</span>}
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border shadow-sm rounded-bl-none text-foreground'}`}>
                  {msg.message}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        
        {isTyping && (
          <div className="px-4 py-1 text-xs text-muted-foreground italic bg-white/40">
            {isTyping}
          </div>
        )}
        
        <form onSubmit={handleSend} className="p-3 bg-white/80 border-t flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            placeholder="Type a message..."
            value={input}
            onChange={handleTyping}
          />
          <Button type="submit" className="rounded-full px-6 bg-teal-600 hover:bg-teal-700 shadow-md">
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
