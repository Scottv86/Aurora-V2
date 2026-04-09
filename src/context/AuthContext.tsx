import { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  tenantIds: string[];
  currentRoleId: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUser(session.access_token);
      }
      setLoading(false);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session) {
        await syncUser(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setIsSuperAdmin(false);
        setTenantIds([]);
        setCurrentRoleId(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        setIsSuperAdmin(sessionData.isSuperAdmin);
        setTenantIds(sessionData.tenantIds || []);
        setCurrentRoleId(sessionData.roleId || null);
      }
    } catch (e) {
      console.error("Backend sync failed:", e);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Email sign in error:", error);
      if (error.message.includes('Invalid login credentials')) {
        toast.error("Invalid email or password.");
      } else {
        toast.error(error.message);
      }
      throw error;
    }
  };

  const createWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("Account creation error:", error);
      toast.error(error.message);
      throw error;
    } else {
      toast.success("Account created successfully! Check your email for verification.");
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: 'http://localhost:3000/reset-password',
    });
    if (error) {
      console.error("Password reset error:", error);
      toast.error(error.message);
      throw error;
    } else {
      toast.success("Password reset email sent! Check your inbox.");
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out.");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      loading, 
      isSuperAdmin, 
      tenantIds, 
      currentRoleId,
      signInWithEmail, 
      createWithEmail, 
      resetPassword,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
