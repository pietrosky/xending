import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getAuthRole, type AuthRole } from './roles';

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  role: AuthRole;
  token?: string;
}

interface AuthState {
  user: LocalUser | null;
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
}

function getFullName(user: User): string {
  const metadataName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email;

  return typeof metadataName === 'string' && metadataName.trim()
    ? metadataName
    : 'Usuario';
}

function mapAuthUser(user: User | null | undefined): LocalUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    full_name: getFullName(user),
    role: getAuthRole(user),
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setSession: (session) => {
    set({
      session,
      user: mapAuthUser(session?.user),
      loading: false,
    });
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, loading: false });
  },
}));

let authInitialized = false;

export async function initializeAuthStore() {
  if (authInitialized) return;
  authInitialized = true;

  try {
    const { data } = await supabase.auth.getSession();
    useAuthStore.getState().setSession(data.session);
  } catch {
    useAuthStore.getState().setSession(null);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}
