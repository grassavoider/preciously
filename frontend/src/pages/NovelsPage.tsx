import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Play, Star, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/hooks/useAuthStore'

interface Novel {
  id: string
  title: string
  description: string
  coverUrl?: string
  tags: string
  creator: {
    username: string
  }
  character?: {
    name: string
    avatarUrl?: string
  }
  _count: {
    conversations: number
    ratings: number
  }
  playCount: number
}

export default function NovelsPage() {
  const [novels, setNovels] = useState<Novel[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchNovels()
  }, [search])

  const fetchNovels = async () => {
    try {
      const response = await axios.get('/api/novels', {
        params: { search }
      })
      setNovels(response.data.novels)
    } catch (error) {
      console.error('Failed to fetch novels:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Visual Novels</h1>
        {user && (
          <Link to="/novels/create">
            <Button>
              <BookOpen className="mr-2 h-4 w-4" />
              Create Novel
            </Button>
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search novels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {novels.map((novel) => (
            <Card key={novel.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {novel.coverUrl ? (
                  <img
                    src={novel.coverUrl}
                    alt={novel.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle>{novel.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {novel.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  by {novel.creator.username}
                </p>
                {novel.character && (
                  <p className="text-sm text-muted-foreground mt-1">
                    featuring {novel.character.name}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    {novel.playCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {novel._count.ratings}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Link to={`/novels/${novel.id}/play`} className="w-full">
                  <Button className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Play Novel
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}