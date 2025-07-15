import { create } from 'zustand'
import axios from '@/lib/axios'

interface User {
  id: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  
  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/api/auth/signin', { username, password })
      set({ user: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed', isLoading: false })
      throw error
    }
  },
  
  register: async (username, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/api/auth/signup', { username, email, password })
      set({ user: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Registration failed', isLoading: false })
      throw error
    }
  },
  
  logout: async () => {
    set({ isLoading: true })
    try {
      await axios.post('/api/auth/signout')
      set({ user: null, isLoading: false })
    } catch (error) {
      console.error('Logout error:', error)
      set({ isLoading: false })
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await axios.get('/api/auth/me')
      set({ user: response.data })
    } catch (error) {
      set({ user: null })
    }
  }
}))