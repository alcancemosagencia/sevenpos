import React from 'react';
import { MarketingHero } from '../components/MarketingHero';
import { MarketingExperience } from '../components/MarketingExperience';
import { MarketingFooter } from '../components/MarketingFooter';

interface MarketingHomePageProps {
  onNavigateToApp?: () => void;
}

export const MarketingHomePage: React.FC<MarketingHomePageProps> = ({ onNavigateToApp }) => {
  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans antialiased selection:bg-[#2F6BFF]/20">
      <main>
        {/* Section 1: Header + Hero */}
        <MarketingHero onRegisterClick={onNavigateToApp} />

        <MarketingExperience onRegisterClick={onNavigateToApp} />
      </main>
      <MarketingFooter />
    </div>
  );
};
