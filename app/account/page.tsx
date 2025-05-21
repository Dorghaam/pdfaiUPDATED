'use client';

import Header from '@/app/components/Header';
import { useUserTier } from '@/app/hooks/useUserTier';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountPage() {
  const { isAuthenticated, tier, status, isLoading, isPremium } = useUserTier();
  const router = useRouter();
  const isFree = !isPremium;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleManageSubscription = async () => {
    alert('Manage Subscription clicked! Stripe Customer Portal integration pending.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p>Please <a href="/login" className="text-purple-600 hover:underline">login</a> to view your account.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
            Your Account
          </h1>
          
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Current Subscription
            </h2>
            {tier ? (
              <>
                <p className="text-gray-600 dark:text-gray-300">
                  Plan: <span className="font-medium text-purple-600 dark:text-purple-400">
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </span>
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Status: <span className="font-medium">
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">Loading subscription details...</p>
            )}
          </div>

          {isPremium && status === 'active' && (
            <button
              onClick={handleManageSubscription}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors mb-4"
            >
              Manage Billing & Subscription (Stripe Portal Placeholder)
            </button>
          )}

          {isFree && status === 'active' && (
             <button
                onClick={() => router.push('/#pricing')}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Upgrade to Premium
              </button>
          )}
          
        </div>
      </main>
    </div>
  );
} 