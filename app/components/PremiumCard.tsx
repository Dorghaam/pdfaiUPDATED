'use client';

import React from 'react';
import Link from 'next/link';
import { useUserTier } from '@/app/hooks/useUserTier';

interface PremiumCardProps {
  price?: string;
  className?: string;
  highlighted?: boolean;
}

const PremiumCard: React.FC<PremiumCardProps> = ({
  price = '$10 / month',
  className = '',
  highlighted = true,
}) => {
  const { isPremium, isFree, isAuthenticated, isLoading } = useUserTier();
  
  // Features list for the Premium tier
  const features = [
    'Up to 10 PDF uploads per day',
    'Advanced PDF Chat (with screenshot feature - coming soon!)',
    'Extended Chat History',
    'Priority Support',
    'Access to all premium features'
  ];

  // Handler for upgrading to premium
  const handleUpgradeToPremium = () => {
    // This would integrate with your Stripe checkout or other payment flow
    alert('Redirecting to premium checkout...');
    // Implementation depends on your payment integration
  };

  // Handler for managing subscription
  const handleManageSubscription = () => {
    // This would take the user to subscription management
    alert('Redirecting to subscription management...');
    // Implementation depends on your payment integration
  };

  // Determine the call-to-action based on user's authentication and subscription status
  const renderCTA = () => {
    if (isLoading) {
      return (
        <div className="h-10 bg-purple-500 rounded animate-pulse"></div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <Link 
          href="/login?redirect=/pricing#premium" 
          className="block w-full text-center py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Get Started with Premium
        </Link>
      );
    }
    
    if (isFree) {
      return (
        <button
          onClick={handleUpgradeToPremium}
          className="block w-full text-center py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Upgrade to Premium
        </button>
      );
    }
    
    if (isPremium) {
      return (
        <button
          onClick={handleManageSubscription}
          className="block w-full text-center py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Manage Subscription
        </button>
      );
    }
    
    return null;
  };

  return (
    <div 
      className={`
        p-8 rounded-xl shadow-md flex flex-col h-full relative overflow-hidden
        ${highlighted ? 'bg-purple-50 dark:bg-gray-800 border border-purple-200 dark:border-purple-900/30' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}
        ${className}
      `}
    >
      {highlighted && (
        <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 text-sm font-medium">
          Recommended
        </div>
      )}
      
      <h3 className="text-2xl font-bold mb-2">Premium</h3>
      <div className="text-3xl font-bold mb-6">{price} <span className="text-gray-500 text-base font-normal">/ month</span></div>
      
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

export default PremiumCard; 