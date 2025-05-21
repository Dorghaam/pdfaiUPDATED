'use client';

import React from 'react';
import Link from 'next/link';

interface ManageSubscriptionButtonProps {
  className?: string;
}

const ManageSubscriptionButton: React.FC<ManageSubscriptionButtonProps> = ({ 
  className = '' 
}) => {
  return (
    <Link 
      href="/upgrade" 
      className={`py-3 px-4 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg text-center font-medium transition-colors inline-block hover:bg-purple-200 dark:hover:bg-purple-900/50 ${className}`}
    >
      Manage Subscription
    </Link>
  );
};

export default ManageSubscriptionButton; 