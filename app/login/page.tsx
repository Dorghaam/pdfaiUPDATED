'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '@/app/components/AuthProvider';
import { getSupabaseBrowserClient } from '@/app/lib/supabaseBrowserClient';
import Header from '@/app/components/Header';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use our optimized singleton client instead of creating a new one
  const supabase = getSupabaseBrowserClient();

  // Retry mechanism for session checking
  useEffect(() => {
    // Only retry if there was a rate limit error
    if (error?.includes('rate limit') && retryCount < 3) {
      const timer = setTimeout(() => {
        setError(null);
        setRetryCount(prev => prev + 1);
      }, 2000 * (retryCount + 1)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  // Add listener for auth errors
  useEffect(() => {
    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/upload');
      }
      
      // Listen for error events from supabase auth
      if (event === 'USER_UPDATED' && !session) {
        console.warn('Auth error detected');
        setError('An error occurred during authentication. Please try again.');
      }
    });
    
    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Redirect to upload page if already authenticated
  useEffect(() => {
    if (session && !isLoading) {
      router.push('/upload');
    }
  }, [session, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen justify-center items-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, show the auth UI
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <Header />
        
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Or create a new account to get started
              </p>
            </div>
            
            {error && (
              <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400" role="alert">
                <span className="font-medium">Error:</span> {error}
                {error.includes('rate limit') && (
                  <p className="mt-2">Please wait a moment before trying again.</p>
                )}
              </div>
            )}
            
            <div className="mt-8">
              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#4F46E5',
                        brandAccent: '#4338CA',
                      },
                    },
                  },
                }}
                view="sign_in"
                showLinks={true}
                redirectTo="http://localhost:3000/auth/callback"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should not be visible as the useEffect should redirect
  return null;
} 