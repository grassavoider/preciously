import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from '@/lib/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Star, MessageSquare, Download, BookOpen, User, Volume2 } from 'lucide-react'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useToast } from '@/components/ui/use-toast'
import { useVoice } from '@/hooks/useVoice'
import { VoicePlayer } from '@/components/VoicePlayer'

interface Character {
  id: string
  name: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  messageExample?: string
  systemPrompt?: string
  creatorNotes?: string
  tags: string
  avatarUrl?: string
  isPublic: boolean
  downloadCount: number
  creator: {
    id: string
    username: string
  }
  _count: {
    conversations: number
    ratings: number
  }
  averageRating?: number
  createdAt: string
  updatedAt: string
}

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { generateCharacterVoice, isGenerating } = useVoice()
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchCharacter()
  }, [id])

  const fetchCharacter = async () => {
    try {
      const response = await axios.get(`/api/characters/${id}`)
      setCharacter(response.data)
    } catch (error) {
      console.error('Failed to fetch character:', error)
      toast({
        title: 'Error',
        description: 'Failed to load character',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await axios.post(`/api/characters/${id}/download`)
      // Handle download response
      toast({
        title: 'Success',
        description: 'Character downloaded successfully!',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download character',
        variant: 'destructive'
      })
    }
  }

  const handleStartConversation = () => {
    // TODO: Implement conversation start
    toast({
      title: 'Coming Soon',
      description: 'Conversation feature will be available soon!',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">Character not found</h2>
        <p className="text-muted-foreground mb-4">The character you're looking for doesn't exist.</p>
        <Link to="/characters">
          <Button>Browse Characters</Button>
        </Link>
      </div>
    )
  }

  const tags = JSON.parse(character.tags || '[]')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Character Info Card */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={character.avatarUrl} alt={character.name} />
                <AvatarFallback>{character.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{character.name}</CardTitle>
                <CardDescription className="mt-1">
                  Created by <Link to={`/profile/${character.creator.id}`} className="text-primary hover:underline">
                    {character.creator.username}
                  </Link>
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center text-muted-foreground mb-1">
                  <Star className="h-4 w-4 mr-1" />
                  {character.averageRating?.toFixed(1) || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-muted-foreground mb-1">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {character._count.conversations}
                </div>
                <div className="text-xs text-muted-foreground">Conversations</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-muted-foreground mb-1">
                  <Download className="h-4 w-4 mr-1" />
                  {character.downloadCount}
                </div>
                <div className="text-xs text-muted-foreground">Downloads</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-muted-foreground mb-1">
                  {character.isPublic ? '🌍 Public' : '🔒 Private'}
                </div>
                <div className="text-xs text-muted-foreground">Visibility</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleStartConversation} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Conversation
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Character Details Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="description">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="personality">Personality</TabsTrigger>
              <TabsTrigger value="scenario">Scenario</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-4">
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{character.description}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="personality" className="mt-4">
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{character.personality}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="scenario" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Scenario</h3>
                  <p className="whitespace-pre-wrap text-muted-foreground">{character.scenario}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">First Message</h3>
                  <Card className="p-4 bg-muted/50">
                    <p className="whitespace-pre-wrap">{character.firstMessage}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const url = await generateCharacterVoice({
                            characterName: character.name,
                            text: character.firstMessage,
                            personality: character.personality
                          })
                          setVoiceUrl(url)
                        }}
                        disabled={isGenerating}
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        {isGenerating ? 'Generating...' : 'Play Voice'}
                      </Button>
                      {voiceUrl && <VoicePlayer src={voiceUrl} minimal />}
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="mt-4">
              <div className="space-y-4">
                {character.systemPrompt && (
                  <div>
                    <h3 className="font-semibold mb-2">System Prompt</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">{character.systemPrompt}</p>
                  </div>
                )}
                {character.messageExample && (
                  <div>
                    <h3 className="font-semibold mb-2">Message Examples</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">{character.messageExample}</p>
                  </div>
                )}
                {character.creatorNotes && (
                  <div>
                    <h3 className="font-semibold mb-2">Creator Notes</h3>
                    <p className="whitespace-pre-wrap text-muted-foreground">{character.creatorNotes}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions for owner */}
      {user && user.id === character.creator.id && (
        <Card>
          <CardHeader>
            <CardTitle>Character Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" disabled>
                Edit Character
              </Button>
              <Button variant="destructive" disabled>
                Delete Character
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}