import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { User, BookOpen, Home, PlusCircle, LogOut } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-2xl font-bold text-primary">
                Preciously.ai
              </Link>
              <div className="flex items-center space-x-4">
                <Link to="/">
                  <Button variant="ghost" size="sm">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>
                <Link to="/characters">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Characters
                  </Button>
                </Link>
                <Link to="/novels">
                  <Button variant="ghost" size="sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Novels
                  </Button>
                </Link>
                {user && (
                  <Link to="/novels/create">
                    <Button variant="ghost" size="sm">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Create Novel
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link to="/profile">
                    <Button variant="outline" size="sm">
                      {user.username}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}