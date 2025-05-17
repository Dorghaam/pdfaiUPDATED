import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Singleton pattern to maintain a single instance of the Supabase client
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null;
let lastApiCallTimestamp = 0;
const MIN_API_CALL_INTERVAL = 200; // Minimum time between API calls in milliseconds
const MAX_RETRIES = 3;

/**
 * Returns a singleton instance of the Supabase browser client
 * This ensures we don't create multiple instances unnecessarily
 * and adds rate limiting protection
 */
export function getSupabaseBrowserClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient({
      options: {
        global: {
          fetch: async (...args) => {
            // Implement basic rate limiting to prevent hitting API limits
            const now = Date.now();
            const timeSinceLastCall = now - lastApiCallTimestamp;
            
            if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
              // Delay the request if needed
              await new Promise(resolve => {
                setTimeout(resolve, MIN_API_CALL_INTERVAL - timeSinceLastCall);
              });
            }
            
            lastApiCallTimestamp = Date.now();
            
            // Function to handle fetching with retries for rate limit errors
            const fetchWithRetry = async (retryCount = 0): Promise<Response> => {
              const response = await fetch(...args);
              
              // Check for rate limit errors
              if (response.status === 429 && retryCount < MAX_RETRIES) {
                console.warn(`Rate limit hit, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
                // Get retry-after header or use exponential backoff
                const retryAfter = response.headers.get('Retry-After');
                const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, retryCount);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return fetchWithRetry(retryCount + 1);
              }
              
              return response;
            };
            
            return fetchWithRetry();
          }
        }
      }
    });
  }
  return supabaseClient;
} 