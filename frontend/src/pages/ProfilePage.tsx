import { useState, useEffect } from 'react'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, BookOpen, Users, Upload, Globe, Lock, Star, MessageSquare, Download } from 'lucide-react'
import axios from '@/lib/axios'
import CharacterImportModal from '@/components/CharacterImportModal'
import { Link } from 'react-router-dom'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Character {
  id: string
  name: string
  description: string
  avatarUrl?: string
  tags: string
  isPublic: boolean
  _count: {
    conversations: number
    ratings: number
  }
  downloadCount: number
}

interface Novel {
  id: string
  title: string
  description: string
  coverUrl?: string
  isPublic: boolean
  _count: {
    conversations: number
    ratings: number
  }
  playCount: number
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [myCharacters, setMyCharacters] = useState<Character[]>([])
  const [myNovels, setMyNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [importModalOpen, setImportModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUserContent()
    }
  }, [user])

  const fetchUserContent = async () => {
    try {
      // Fetch user's characters
      const charsResponse = await axios.get('/api/characters', {
        params: { userId: user?.id }
      })
      
      // Filter to only show user's characters (since the API returns public ones)
      const userChars = charsResponse.data.characters.filter(
        (char: Character) => char.creatorId === user?.id
      )
      setMyCharacters(userChars)
      
      // Fetch user's novels
      const novelsResponse = await axios.get('/api/novels', {
        params: { userId: user?.id }
      })
      
      const userNovels = novelsResponse.data.novels.filter(
        (novel: Novel) => novel.creatorId === user?.id
      )
      setMyNovels(userNovels)
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch user content:', error)
      setLoading(false)
    }
  }

  const toggleCharacterPrivacy = async (characterId: string, isPublic: boolean) => {
    try {
      await axios.put(`/api/characters/${characterId}`, {
        character: JSON.stringify({ isPublic })
      })
      fetchUserContent()
    } catch (error) {
      console.error('Failed to update character privacy:', error)
    }
  }

  if (!user) {
    return <div className="text-center py-12">Please sign in to view your profile</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{user.username}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              {user.role === 'ADMIN' && (
                <span className="inline-flex items-center px-2 py-1 mt-2 text-xs font-semibold text-primary bg-primary/10 rounded-full">
                  Admin
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="characters" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="characters">
            <Users className="mr-2 h-4 w-4" />
            My Characters
          </TabsTrigger>
          <TabsTrigger value="novels">
            <BookOpen className="mr-2 h-4 w-4" />
            My Novels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Characters</CardTitle>
              <CardDescription>
                Characters you've created or imported
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <Button onClick={() => setImportModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Character
                </Button>
              </div>
              
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : myCharacters.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't created any characters yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myCharacters.map((character) => (
                    <Card key={character.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {character.avatarUrl ? (
                              <img
                                src={character.avatarUrl}
                                alt={character.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                {character.name[0]}
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{character.name}</CardTitle>
                              <CardDescription className="line-clamp-1">
                                {character.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`public-${character.id}`} className="text-sm">
                              {character.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Label>
                            <Switch
                              id={`public-${character.id}`}
                              checked={character.isPublic}
                              onCheckedChange={(checked) => toggleCharacterPrivacy(character.id, checked)}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {character._count.conversations} chats
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {character._count.ratings} ratings
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {character.downloadCount} downloads
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Character
                        </Button>
                        <Button variant="outline" size="sm">
                          Use in Novel
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="novels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Visual Novels</CardTitle>
              <CardDescription>
                Visual novels you've created
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : myNovels.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't created any novels yet</p>
                  <Button>Create Novel</Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Novel list would go here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CharacterImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportSuccess={fetchUserContent}
      />
    </div>
  )
}