import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus in development
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
    },
  },
})

// Cache keys for consistency
export const queryKeys = {
  // Characters
  characters: ['characters'] as const,
  character: (id: string) => ['characters', id] as const,
  userCharacters: (userId: string) => ['characters', 'user', userId] as const,
  
  // Novels
  novels: ['novels'] as const,
  novel: (id: string) => ['novels', id] as const,
  userNovels: (userId: string) => ['novels', 'user', userId] as const,
  novelConversation: (novelId: string) => ['novels', novelId, 'conversation'] as const,
  
  // User
  currentUser: ['auth', 'me'] as const,
  userProfile: (id: string) => ['users', id] as const,
  
  // Models
  aiModels: ['models'] as const,
}