import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryClient'

interface Novel {
  id: string
  title: string
  description: string
  backgroundUrl?: string
  author: {
    id: string
    username: string
  }
  character?: {
    id: string
    name: string
    avatarUrl?: string
  }
  _count: {
    conversations: number
    ratings: number
  }
  playCount: number
  scenes: any[]
  tags: string[]
}

interface NovelsResponse {
  novels: Novel[]
  total: number
  limit: number
  offset: number
}

export function useNovels(search?: string, characterId?: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: [...queryKeys.novels, { search, characterId, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (characterId) params.append('characterId', characterId)
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())
      
      const { data } = await axios.get<NovelsResponse>(`/api/novels?${params}`)
      return data
    },
  })
}

export function useNovel(id: string) {
  return useQuery({
    queryKey: queryKeys.novel(id),
    queryFn: async () => {
      const { data } = await axios.get(`/api/novels/${id}`)
      return data
    },
    enabled: !!id,
    // Cache for 10 minutes since novels don't change often
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateNovel() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (novelData: any) => {
      const { data } = await axios.post('/api/novels', novelData)
      return data
    },
    onSuccess: (data) => {
      // Invalidate novels list
      queryClient.invalidateQueries({ queryKey: queryKeys.novels })
      // Pre-populate the cache with the new novel
      queryClient.setQueryData(queryKeys.novel(data.id), data)
    },
  })
}

export function useNovelConversation(novelId: string) {
  return useQuery({
    queryKey: queryKeys.novelConversation(novelId),
    queryFn: async () => {
      const { data } = await axios.get(`/api/novels/${novelId}/conversation`)
      return data
    },
    enabled: !!novelId,
    // Don't cache conversations as they change frequently
    staleTime: 0,
  })
}

export function useUpdateConversation(novelId: string, conversationId?: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (conversationData: any) => {
      const url = conversationId 
        ? `/api/novels/${novelId}/conversation?conversationId=${conversationId}`
        : `/api/novels/${novelId}/conversation`
      
      const { data } = await axios[conversationId ? 'put' : 'post'](url, conversationData)
      return data
    },
    onSuccess: (data) => {
      // Update the conversation cache
      queryClient.setQueryData(queryKeys.novelConversation(novelId), data)
    },
  })
}