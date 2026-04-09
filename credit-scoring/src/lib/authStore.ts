/**
 * Local dev auth store — manages the current logged-in user.
 * Uses zustand for global state. No real auth — just picks from local_users.
 */

import { create } from 'zustand';

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'broker';
  token: string;
}

interface AuthState {
  user: LocalUser | null;
  login: (user: LocalUser) => void;
  logout: () => void;
}

const STORAGE_KEY = 'xending_auth_user';

function loadUser(): LocalUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  login: (user) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({ user: null });
  },
}));
