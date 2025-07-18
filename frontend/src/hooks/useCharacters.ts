import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryClient'

interface Character {
  id: string
  name: string
  description: string
  avatarUrl?: string
  isPublic: boolean
  creator: {
    id: string
    username: string
  }
  _count: {
    conversations: number
    ratings: number
  }
}

interface CharactersResponse {
  characters: Character[]
  total: number
  limit: number
  offset: number
}

export function useCharacters(search?: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: [...queryKeys.characters, { search, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())
      
      const { data } = await axios.get<CharactersResponse>(`/api/characters?${params}`)
      return data
    },
  })
}

export function useCharacter(id: string) {
  return useQuery({
    queryKey: queryKeys.character(id),
    queryFn: async () => {
      const { data } = await axios.get(`/api/characters/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateCharacter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (characterData: FormData) => {
      const { data } = await axios.post('/api/characters', characterData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data
    },
    onSuccess: () => {
      // Invalidate characters list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.characters })
    },
  })
}

export function useImportCharacter() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await axios.post('/api/characters/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data
    },
  })
}