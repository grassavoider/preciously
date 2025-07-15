import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/hooks/useAuthStore'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import CharactersPage from '@/pages/CharactersPage'
import CharacterDetailPage from '@/pages/CharacterDetailPage'
import NovelsPage from '@/pages/NovelsPage'
import NovelBuilderPageEnhanced from '@/pages/NovelBuilderPageEnhanced'
import NovelPlayerEnhanced from '@/pages/NovelPlayerEnhanced'
import ProfilePage from '@/pages/ProfilePage'

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="characters/:id" element={<CharacterDetailPage />} />
          <Route path="novels" element={<NovelsPage />} />
          <Route path="novels/create" element={<NovelBuilderPageEnhanced />} />
          <Route path="novels/:id/play" element={<NovelPlayerEnhanced />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App