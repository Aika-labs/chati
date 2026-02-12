import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, AuthState } from '../types';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; businessName: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setAuth: (data: { token: string; user: User; tenant: Tenant }) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{
            success: boolean;
            data: { user: User; tenant: Tenant; token: string; refreshToken: string };
          }>('/auth/login', { email, password });

          if (response.data.success && response.data.data) {
            const { user, tenant, token, refreshToken } = response.data.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);
            
            connectSocket(token);
            
            set({
              user,
              tenant,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{
            success: boolean;
            data: { user: User; tenant: Tenant; token: string; refreshToken: string };
          }>('/auth/register', data);

          if (response.data.success && response.data.data) {
            const { user, tenant, token, refreshToken } = response.data.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);
            
            connectSocket(token);
            
            set({
              user,
              tenant,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        disconnectSocket();
        
        set({
          user: null,
          tenant: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await api.get<{
            success: boolean;
            data: { user: User; tenant: Tenant };
          }>('/auth/me');

          if (response.data.success && response.data.data) {
            connectSocket(token);
            
            set({
              user: response.data.data.user,
              tenant: response.data.data.tenant,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch {
          get().logout();
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setAuth: (data: { token: string; user: User; tenant: Tenant }) => {
        localStorage.setItem('token', data.token);
        connectSocket(data.token);
        set({
          user: data.user,
          tenant: data.tenant,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
