'use client';

import React from 'react';
import FreeCard from './FreeCard';
import PremiumCard from './PremiumCard';

interface PricingSectionProps {
  premiumPrice?: string;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  premiumPrice = '$10 / month'
}) => {
  return (
    <section id="pricing" className="py-16 md:py-24 px-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Choose the plan that works best for you</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <FreeCard />
          <PremiumCard price={premiumPrice} />
        </div>
      </div>
    </section>
  );
};

export default PricingSection; 