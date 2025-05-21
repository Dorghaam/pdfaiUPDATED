'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useUserTier } from '@/app/hooks/useUserTier';

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session } = useAuth();
  const { tier, isPremium, isAuthenticated, isLoading } = useUserTier();
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Determine if on home page
  const isHomePage = pathname === '/';

  return (
    <header className={`sticky top-0 z-50 w-full p-4 transition-colors duration-300 ${
      transparent && !isScrolled && isHomePage
        ? 'bg-transparent' 
        : 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {isHomePage ? (
            <>
              <Link href="#features" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                How It Works
              </Link>
              <Link href="#use-cases" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Use Cases
              </Link>
            </>
          ) : (
            <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              Home
            </Link>
          )}
          
          {session && (
            <>
              <Link href="/upload" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Dashboard
              </Link>
              {isAuthenticated && (
                <Link href="/account" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  Account
                </Link>
              )}
            </>
          )}
        </nav>
        
        <div className="flex items-center gap-4">
          {session ? (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300">{session.user?.email}</span>
              {isAuthenticated && !isLoading && tier && (
                <span className={`hidden md:inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                  isPremium ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                </span>
              )}
              <button 
                onClick={handleSignOut}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="hidden md:inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              {isHomePage ? 'Get Started' : 'Login'}
            </Link>
          )}
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden flex items-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-700 dark:text-gray-300"
            >
              {mobileMenuOpen ? (
                <path 
                  d="M18 6L6 18M6 6L18 18" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              ) : (
                <path 
                  d="M4 6H20M4 12H20M4 18H20" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-800 px-4 py-4">
          <nav className="flex flex-col space-y-4">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            
            {session && (
              <>
                <Link 
                  href="/upload" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {isAuthenticated && (
                  <Link 
                    href="/account" 
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account
                  </Link>
                )}
              </>
            )}

            {isHomePage && (
              <>
                <Link 
                  href="#features" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link 
                  href="#how-it-works" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </Link>
                <Link 
                  href="#use-cases" 
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Use Cases
                </Link>
              </>
            )}
            
            {session ? (
              <div className="space-y-2">
                <div className="text-gray-700 dark:text-gray-300 py-2">{session.user?.email}</div>
                {isAuthenticated && !isLoading && tier && (
                  <div className={`py-1 px-3 text-xs font-semibold rounded-full inline-block mb-2 ${
                    isPremium ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                  </div>
                )}
                <button 
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 px-4 text-center transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 px-4 text-center transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {isHomePage ? 'Get Started' : 'Login'}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
} 