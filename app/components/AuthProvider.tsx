'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabaseBrowserClient';
import type { Session } from '@supabase/supabase-js';

// Create context for auth state
export const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
}>({
  session: null,
  isLoading: true,
});

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Utility for retrying operations
const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
      lastError = error;
      if (i < maxRetries - 1) {
        // Wait before next retry with increasing delay
        await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
    }
  }
  throw lastError;
};

// AuthProvider component
export default function AuthProvider({ 
  children,
  initialSession
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(!initialSession);

  useEffect(() => {
    // Get singleton instance
    const supabase = getSupabaseBrowserClient();
    console.log('AuthProvider: Initialized with initial session:', !!initialSession);

    // Initial session check
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Checking for client session');
        // Use retry logic for getSession to handle rate limiting
        const { data: { session } } = await retryOperation(
          () => supabase.auth.getSession(),
          3,  // max retries
          1500 // base delay in ms (will increase with each retry)
        );
        console.log('AuthProvider: Client session exists:', !!session);
        setSession(session);
      } catch (error) {
        console.error('AuthProvider: Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if no initial session was provided
    if (!initialSession) {
      getInitialSession();
    } else {
      setIsLoading(false);
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('AuthProvider: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession) {
          console.log('AuthProvider: User signed in');
          setSession(newSession);
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setSession(null);
          
          // When signed out, explicitly check/clear the session with retry logic
          try {
            const { data } = await retryOperation(
              () => supabase.auth.getSession(),
              2,
              1000
            );
            
            if (!data.session) {
              console.log('AuthProvider: No session confirmed after signOut');
            } else {
              console.log('AuthProvider: Warning - session still exists after signOut');
              await retryOperation(
                () => supabase.auth.signOut(),
                2,
                1000
              );
            }
          } catch (error) {
            console.error('Error during sign out verification:', error);
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          console.log('AuthProvider: Token refreshed');
          setSession(newSession);
        } else if (event === 'USER_UPDATED' && newSession) {
          console.log('AuthProvider: User updated');
          setSession(newSession);
        }
      }
    );

    // Clean up
    return () => {
      subscription.unsubscribe();
    };
  }, [initialSession]);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}