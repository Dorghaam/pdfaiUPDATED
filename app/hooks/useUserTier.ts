import { useAuth } from '@/app/components/AuthProvider';

export function useUserTier() {
  const { session, userTier, subscriptionStatus, isLoading } = useAuth();
  
  // Loading state is true if auth is loading OR if we have a session but tier info hasn't loaded yet
  const isLoadingTierInfo = isLoading || (session && !userTier);
  
  // Derived tier states
  const isPremium = userTier === 'premium' && subscriptionStatus === 'active';
  const isFree = userTier === 'free';
  
  return {
    tier: userTier,
    status: subscriptionStatus,
    isPremium,
    isFree,
    isLoading: isLoadingTierInfo,
    isAuthenticated: !!session
  };
} 