'use client';

import React from 'react';
import Link from 'next/link';
import { useUserTier } from '@/app/hooks/useUserTier';

interface FreeCardProps {
  className?: string;
}

const FreeCard: React.FC<FreeCardProps> = ({ className = '' }) => {
  const { isFree, isPremium, isAuthenticated, isLoading } = useUserTier();
  
  // Features list for the Free tier
  const features = [
    'Up to 1 PDF upload per day',
    'Basic PDF Chat',
    'Limited Chat History',
    'Community Support'
  ];

  // Determine the call-to-action based on user's authentication and subscription status
  const renderCTA = () => {
    if (isLoading) {
      return (
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <Link 
          href="/login" 
          className="block w-full text-center py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Sign Up for Free
        </Link>
      );
    }
    
    if (isFree) {
      return (
        <p className="py-3 px-4 text-center text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
          Your Current Plan
        </p>
      );
    }
    
    if (isPremium) {
      return (
        <button
          onClick={() => alert('You are premium, but this button could be a "Switch to Free" if desired, requiring Stripe logic.')}
          className="block w-full text-center py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
        >
          Switch to Free (Placeholder)
        </button>
      );
    }
    
    return null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col h-full ${className}`}>
      <h3 className="text-2xl font-bold mb-2">Free</h3>
      <div className="text-3xl font-bold mb-6">$0 <span className="text-gray-500 text-base font-normal">/ month</span></div>
      
      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      {renderCTA()}
    </div>
  );
};

export default FreeCard; 