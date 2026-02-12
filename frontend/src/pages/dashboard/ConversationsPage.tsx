import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile, 
  Bot, 
  User,
  Check,
  CheckCheck,
  Clock,
  Phone,
  Video,
  Info
} from 'lucide-react';
import { Avatar, Badge, Button } from '../../components/ui';
import { cn, formatRelativeTime, formatTime } from '../../lib/utils';
import type { Conversation, Message } from '../../types';

// Mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    status: 'OPEN',
    isAiEnabled: true,
    aiTakenOver: false,
    contact: { id: '1', phone: '+525512345678', name: 'María García', score: 85, tags: [], firstContactAt: '', lastContactAt: '', totalMessages: 45 },
    lastMessageAt: new Date().toISOString(),
    unreadCount: 2,
  },
  {
    id: '2',
    status: 'OPEN',
    isAiEnabled: true,
    aiTakenOver: false,
    contact: { id: '2', phone: '+525587654321', name: 'Carlos López', score: 72, tags: [], firstContactAt: '', lastContactAt: '', totalMessages: 23 },
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
  },
  {
    id: '3',
    status: 'OPEN',
    isAiEnabled: false,
    aiTakenOver: true,
    contact: { id: '3', phone: '+525598765432', name: 'Ana Martínez', score: 90, tags: [], firstContactAt: '', lastContactAt: '', totalMessages: 67 },
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 1,
  },
];

const mockMessages: Message[] = [
  { id: '1', direction: 'INBOUND', type: 'TEXT', content: 'Hola, ¿cuánto cuesta el servicio de consulta?', waStatus: 'READ', isAiGenerated: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: '2', direction: 'OUTBOUND', type: 'TEXT', content: '¡Hola María! 👋 El servicio de consulta tiene un costo de $500 MXN. Incluye evaluación completa y plan de tratamiento personalizado. ¿Te gustaría agendar una cita?', waStatus: 'READ', isAiGenerated: true, aiIntent: 'pricing', createdAt: new Date(Date.now() - 240000).toISOString() },
  { id: '3', direction: 'INBOUND', type: 'TEXT', content: 'Sí, me interesa. ¿Qué horarios tienen disponibles?', waStatus: 'READ', isAiGenerated: false, createdAt: new Date(Date.now() - 180000).toISOString() },
  { id: '4', direction: 'OUTBOUND', type: 'TEXT', content: 'Tenemos disponibilidad mañana a las 10:00 AM, 2:00 PM y 5:00 PM. También el jueves a las 9:00 AM y 3:00 PM. ¿Cuál te funciona mejor?', waStatus: 'DELIVERED', isAiGenerated: true, aiIntent: 'appointment', createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: '5', direction: 'INBOUND', type: 'TEXT', content: 'Mañana a las 2:00 PM está perfecto', waStatus: 'READ', isAiGenerated: false, createdAt: new Date(Date.now() - 60000).toISOString() },
];

function MessageStatus({ status }: { status: Message['waStatus'] }) {
  switch (status) {
    case 'PENDING':
      return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    case 'SENT':
      return <Check className="w-3.5 h-3.5 text-gray-400" />;
    case 'DELIVERED':
      return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
    case 'READ':
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    default:
      return null;
  }
}

export function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0] ?? null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: newMessage,
      waStatus: 'PENDING',
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
  };

  const filteredConversations = mockConversations.filter(c =>
    c.contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.phone.includes(searchQuery)
  );

  return (
    <div className="h-screen flex">
      {/* Conversations List */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversaciones</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={cn(
                'p-4 border-b border-gray-50 cursor-pointer transition-colors',
                selectedConversation?.id === conv.id ? 'bg-primary-50' : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar name={conv.contact.name} size="md" />
                  {conv.isAiEnabled && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{conv.contact.name}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(conv.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate">Último mensaje...</p>
                    {conv.unreadCount && conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-primary-500 rounded-full text-white text-xs flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Avatar name={selectedConversation.contact.name} size="md" />
              <div>
                <div className="font-medium text-gray-900">{selectedConversation.contact.name}</div>
                <div className="text-sm text-gray-500">{selectedConversation.contact.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={selectedConversation.isAiEnabled ? 'primary' : 'default'}>
                {selectedConversation.isAiEnabled ? 'IA Activa' : 'Manual'}
              </Badge>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Video className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Info className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2 shadow-sm',
                    msg.direction === 'OUTBOUND'
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md'
                  )}
                >
                  {msg.isAiGenerated && msg.direction === 'OUTBOUND' && (
                    <div className="flex items-center gap-1 text-primary-200 text-xs mb-1">
                      <Bot className="w-3 h-3" />
                      <span>IA</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className={cn(
                    'flex items-center justify-end gap-1 mt-1',
                    msg.direction === 'OUTBOUND' ? 'text-primary-200' : 'text-gray-400'
                  )}>
                    <span className="text-xs">{formatTime(msg.createdAt)}</span>
                    {msg.direction === 'OUTBOUND' && <MessageStatus status={msg.waStatus} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Smile className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button onClick={handleSend} className="rounded-full px-4">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Selecciona una conversación para comenzar</p>
          </div>
        </div>
      )}
    </div>
  );
}
