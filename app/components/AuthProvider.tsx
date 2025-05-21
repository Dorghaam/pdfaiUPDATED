'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabaseBrowserClient';
import type { Session } from '@supabase/supabase-js';

// Create context for auth state
export const AuthContext = createContext<{
  session: Session | null;
  isLoading: boolean;
  userTier: string | null;
  subscriptionStatus: string | null;
}>({
  session: null,
  isLoading: true,
  userTier: null,
  subscriptionStatus: null,
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
  const [userTier, setUserTier] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(!!initialSession?.user);

  useEffect(() => {
    // Get singleton instance
    const supabase = getSupabaseBrowserClient();
    console.log('AuthProvider: Initialized with initial session:', !!initialSession);

    // Function to fetch subscription data
    const fetchSubscriptionData = async (userId: string) => {
      setIsLoadingSubscription(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('tier, status')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching subscription data:', error);
          // Set default values if error occurs
          setUserTier('free');
          setSubscriptionStatus('active');
          return;
        }
        
        if (data) {
          setUserTier(data.tier as string);
          setSubscriptionStatus(data.status as string);
        } else {
          console.log('No subscription record found for user, defaulting to free.');
          setUserTier('free');
          setSubscriptionStatus('active');
        }
      } catch (error) {
        console.error('Error in fetchSubscriptionData:', error);
        // Set default values if exception occurs
        setUserTier('free');
        setSubscriptionStatus('active');
      } finally {
        setIsLoadingSubscription(false);
      }
    };

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
        
        // Fetch subscription data if user is authenticated
        if (session?.user?.id) {
          setIsLoadingSubscription(true);
          await fetchSubscriptionData(session.user.id);
        }
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
      // Keep isLoading true if we're fetching subscription data
      if (!isLoadingSubscription) {
        setIsLoading(false);
      }
      
      // Fetch subscription data for initial session
      if (initialSession.user?.id) {
        fetchSubscriptionData(initialSession.user.id);
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('AuthProvider: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession) {
          console.log('AuthProvider: User signed in');
          setSession(newSession);
          
          // Fetch subscription data when user signs in
          if (newSession.user?.id) {
            setIsLoadingSubscription(true);
            await fetchSubscriptionData(newSession.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setSession(null);
          setUserTier(null);
          setSubscriptionStatus(null);
          
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
          
          // Fetch subscription data when token is refreshed
          if (newSession.user?.id) {
            setIsLoadingSubscription(true);
            await fetchSubscriptionData(newSession.user.id);
          }
        } else if (event === 'USER_UPDATED' && newSession) {
          console.log('AuthProvider: User updated');
          setSession(newSession);
          
          // Refresh subscription data on user update
          if (newSession.user?.id) {
            setIsLoadingSubscription(true);
            await fetchSubscriptionData(newSession.user.id);
          }
        }
      }
    );

    // Clean up
    return () => {
      subscription.unsubscribe();
    };
  }, [initialSession, isLoadingSubscription]);

  // Update isLoading to consider both session and subscription loading states
  useEffect(() => {
    if (session && isLoadingSubscription) {
      setIsLoading(true);
    } else if (!session && !isLoading) {
      setIsLoading(false);
    } else if (session && !isLoadingSubscription) {
      setIsLoading(false);
    }
  }, [session, isLoadingSubscription, isLoading]);

  return (
    <AuthContext.Provider value={{ session, isLoading, userTier, subscriptionStatus }}>
      {children}
    </AuthContext.Provider>
  );
}