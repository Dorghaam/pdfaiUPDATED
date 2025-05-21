'use client';

import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PremiumCard from '../components/PremiumCard';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { useUserTier } from '../hooks/useUserTier';
import Link from 'next/link';

export default function UpgradePage() {
  const { session } = useAuth();
  const { isPremium, isLoading } = useUserTier();
  const router = useRouter();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login?returnUrl=/upgrade');
    }
  }, [session, isLoading, router]);

  // If loading, show loading state
  if (isLoading || !session) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <Header />
      
      <main className="flex-grow py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">Upgrade to Premium</h1>
          
          {isPremium ? (
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-4 rounded-lg mb-8">
                You're already on the Premium plan! Enjoy all the benefits.
              </div>
              <Link 
                href="/upload" 
                className="inline-block py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <PremiumCard price="$9.99 / month" />
              
              <div className="mt-8 p-4 bg-purple-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">Why upgrade to Premium?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Process more documents with increased upload limits</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Advanced chat features with screenshot capability (coming soon)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Keep track of all your document history without limits</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Get fast support when you need it most</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 