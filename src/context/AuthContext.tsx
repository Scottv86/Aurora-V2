import { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
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
  const userRef = useRef<User | null>(null);
  const isInitialCheck = useRef(true);
  const lastSyncedRef = useRef<{ sessionId: string; timestamp: number } | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const syncUser = useCallback(async (token: string, sessionId: string) => {
    const now = Date.now();
    // Use a unique combination of userId and timestamp window to prevent loops
    const syncKey = `${sessionId}`;
    
    if (lastSyncedRef.current?.sessionId === syncKey && (now - lastSyncedRef.current.timestamp) < 5000) {
      console.log(`[AuthTrace] Skipping redundant sync for session key: ${syncKey}`);
      return;
    }

    // Set ref IMMEDIATELY to prevent overlapping syncs while this one is in flight
    lastSyncedRef.current = { sessionId: syncKey, timestamp: now };

    try {
      console.log(`[AuthTrace] Attempting sync with backend...`);
      const response = await fetch('http://127.0.0.1:3001/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log(`[AuthTrace] Sync success:`, sessionData);
        setIsSuperAdmin(sessionData.isSuperAdmin);
        setTenantIds(sessionData.tenantIds || []);
        setCurrentRoleId(sessionData.roleId || null);
        
        
        // Update timestamp on success to maintain the debounce window
        if (lastSyncedRef.current) {
          lastSyncedRef.current.timestamp = Date.now();
        }
        return sessionData;
      } else {
        const status = response.status;
        const err = await response.json().catch(() => ({}));
        console.error(`[AuthTrace] Backend sync error (Status: ${status}):`, err);
        toast.error(`Registry Sync Failed (${status}): ${err.error || response.statusText}`);
      }
    } catch (e: any) {
      console.error("[AuthTrace] Backend sync critical failure:", e);
      toast.error(`Platform Connection Error: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    // onAuthStateChange handles INITIAL_SESSION, SIGNED_IN, and SIGNED_OUT events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthTrace] !! EVENT: ${event}`, { 
        email: session?.user?.email,
        hasSession: !!session,
        timestamp: new Date().toISOString(),
        isInitial: isInitialCheck.current
      });
      
      const isSignOut = event === 'SIGNED_OUT';
      const isSignIn = event === 'SIGNED_IN';
      const isInitial = isInitialCheck.current;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.access_token && (isSignIn || event === 'USER_UPDATED' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        const sessionId = session.user.id + (session.expires_at || '');
        await syncUser(session.access_token, sessionId);
      } else if (isSignOut) {
        console.log(`[AuthTrace] Clearing local state on SIGNED_OUT`);
        setIsSuperAdmin(false);
        setTenantIds([]);
        setCurrentRoleId(null);
        lastSyncedRef.current = null;
      }
      
      // Always ensure loading is false after the first event or sign-in/out
      if (isInitial || isSignIn || isSignOut) {
        setLoading(false);
        isInitialCheck.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [syncUser]);

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
       redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("[Auth] Password reset error:", error);
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
