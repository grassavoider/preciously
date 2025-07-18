import { create } from 'zustand'
import axios from '@/lib/axios'
import Cookies from 'js-cookie'

interface User {
  id: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
  tier: 'FREE' | 'PAID'
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

// Cookie options
const cookieOptions = {
  expires: 30, // 30 days
  sameSite: 'lax' as const,
  secure: window.location.protocol === 'https:'
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    // Try to get user from cookie first, then localStorage
    const cookieUser = Cookies.get('user')
    if (cookieUser) {
      try {
        return JSON.parse(cookieUser)
      } catch (e) {
        console.error('Failed to parse user cookie:', e)
      }
    }
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })(),
  isLoading: false,
  error: null,
  
  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/api/auth/signin', { username, password })
      const { token, ...user } = response.data
      
      // Store token and user data in both cookies and localStorage
      Cookies.set('auth_token', token, cookieOptions)
      Cookies.set('user', JSON.stringify(user), cookieOptions)
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      set({ user, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed', isLoading: false })
      throw error
    }
  },
  
  register: async (username, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/api/auth/signup', { username, email, password })
      const { token, ...user } = response.data
      
      // Store token and user data in both cookies and localStorage
      Cookies.set('auth_token', token, cookieOptions)
      Cookies.set('user', JSON.stringify(user), cookieOptions)
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      set({ user, isLoading: false })
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Registration failed', isLoading: false })
      throw error
    }
  },
  
  logout: async () => {
    set({ isLoading: true })
    // Clear cookies and local storage
    Cookies.remove('auth_token')
    Cookies.remove('user')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    set({ user: null, isLoading: false })
  },
  
  checkAuth: async () => {
    // Try cookie first, then localStorage
    const token = Cookies.get('auth_token') || localStorage.getItem('auth_token')
    if (!token) {
      set({ user: null })
      return
    }
    
    try {
      const response = await axios.get('/api/auth/me')
      const user = response.data
      // Update stored user data
      Cookies.set('user', JSON.stringify(user), cookieOptions)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch (error) {
      // Clear all auth data
      Cookies.remove('auth_token')
      Cookies.remove('user')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      set({ user: null })
    }
  }
}))