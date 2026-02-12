import { create } from 'zustand';
import type { Conversation, Message } from '../types';
import api from '../lib/api';
import { getSocket, joinConversation, leaveConversation } from '../lib/socket';

interface ChatStore {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  typingUsers: Record<string, boolean>;

  fetchConversations: () => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  toggleAI: (enabled: boolean) => Promise<void>;
  closeConversation: () => Promise<void>;
  
  // Socket handlers
  handleNewMessage: (message: Message) => void;
  handleMessageStatus: (data: { messageId: string; status: string }) => void;
  handleTyping: (data: { userId: string; conversationId: string }, isTyping: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  typingUsers: {},

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const response = await api.get<{ success: boolean; data: Conversation[] }>('/conversations');
      if (response.data.success && response.data.data) {
        set({ conversations: response.data.data });
      }
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  selectConversation: async (conversation: Conversation) => {
    const { activeConversation } = get();
    
    // Leave previous conversation room
    if (activeConversation) {
      leaveConversation(activeConversation.id);
    }
    
    set({ activeConversation: conversation, isLoadingMessages: true, messages: [] });
    
    // Join new conversation room
    joinConversation(conversation.id);
    
    try {
      const response = await api.get<{ success: boolean; data: Message[] }>(
        `/conversations/${conversation.id}/messages`
      );
      if (response.data.success && response.data.data) {
        set({ messages: response.data.data });
      }
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content: string) => {
    const { activeConversation } = get();
    if (!activeConversation || !content.trim()) return;

    set({ isSending: true });
    try {
      const response = await api.post<{ success: boolean; data: Message }>(
        `/conversations/${activeConversation.id}/messages`,
        { content }
      );
      
      if (response.data.success && response.data.data) {
        set((state) => ({
          messages: [...state.messages, response.data.data!],
        }));
      }
    } finally {
      set({ isSending: false });
    }
  },

  toggleAI: async (enabled: boolean) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    await api.patch(`/conversations/${activeConversation.id}`, { isAiEnabled: enabled });
    
    set((state) => ({
      activeConversation: state.activeConversation
        ? { ...state.activeConversation, isAiEnabled: enabled }
        : null,
      conversations: state.conversations.map((c) =>
        c.id === activeConversation.id ? { ...c, isAiEnabled: enabled } : c
      ),
    }));
  },

  closeConversation: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    await api.patch(`/conversations/${activeConversation.id}`, { status: 'CLOSED' });
    
    set((state) => ({
      activeConversation: state.activeConversation
        ? { ...state.activeConversation, status: 'CLOSED' }
        : null,
      conversations: state.conversations.map((c) =>
        c.id === activeConversation.id ? { ...c, status: 'CLOSED' } : c
      ),
    }));
  },

  handleNewMessage: (message: Message) => {
    const { activeConversation } = get();
    
    set((state) => {
      // Add to messages if in active conversation
      const newMessages = activeConversation?.id === message.id
        ? [...state.messages, message]
        : state.messages;

      // Update conversation list
      const newConversations = state.conversations.map((c) => {
        if (c.id === activeConversation?.id) {
          return {
            ...c,
            lastMessage: message,
            lastMessageAt: message.createdAt,
          };
        }
        return c;
      });

      return { messages: newMessages, conversations: newConversations };
    });
  },

  handleMessageStatus: (data: { messageId: string; status: string }) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === data.messageId ? { ...m, waStatus: data.status as Message['waStatus'] } : m
      ),
    }));
  },

  handleTyping: (data: { userId: string; conversationId: string }, isTyping: boolean) => {
    const { activeConversation } = get();
    if (activeConversation?.id !== data.conversationId) return;

    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [data.userId]: isTyping,
      },
    }));
  },
}));

// Setup socket listeners
export function setupChatSocketListeners() {
  const socket = getSocket();
  if (!socket) return;

  const store = useChatStore.getState();

  socket.on('message:new', store.handleNewMessage);
  socket.on('message:status', store.handleMessageStatus);
  socket.on('typing:start', (data) => store.handleTyping(data, true));
  socket.on('typing:stop', (data) => store.handleTyping(data, false));
}
