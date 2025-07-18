import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/hooks/useAuthStore'
import axios from '@/lib/axios'
import { Sparkles, Upload, Loader2, Plus, X, Image as ImageIcon, User as UserIcon } from 'lucide-react'
import { ModelSelector } from '@/components/ModelSelector'

interface Character {
  id?: string
  name: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  avatarUrl?: string
  imagePrompt?: string
}

interface NovelData {
  title: string
  description: string
  author: string
  tags: string[]
  scenes: any[]
  backgroundUrl?: string
  backgroundPrompt?: string
  isPublic: boolean
}

export default function NovelBuilderPageEnhanced() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  // Novel data
  const [novelData, setNovelData] = useState<NovelData>({
    title: '',
    description: '',
    author: user?.username || 'Anonymous',
    tags: [],
    scenes: [],
    isPublic: false
  })
  
  // Character management
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('none')
  const [userCharacters, setUserCharacters] = useState<any[]>([])
  const [newCharacter, setNewCharacter] = useState<Character>({
    name: '',
    description: '',
    personality: '',
    scenario: '',
    firstMessage: ''
  })
  
  // AI generation
  const [aiPrompt, setAiPrompt] = useState('')
  const [generatingNovel, setGeneratingNovel] = useState(false)
  const [generatingCharacter, setGeneratingCharacter] = useState(false)
  const [generatingBackground, setGeneratingBackground] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('')
  
  // File uploads
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null)
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null)
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic')
  const [creatingNovel, setCreatingNovel] = useState(false)

  useEffect(() => {
    fetchUserCharacters()
  }, [])

  const fetchUserCharacters = async () => {
    try {
      const response = await axios.get('/api/characters')
      setUserCharacters(response.data.characters || [])
    } catch (error) {
      console.error('Failed to fetch characters:', error)
    }
  }

  const handleGenerateCharacter = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a description for the character',
        variant: 'destructive'
      })
      return
    }

    setGeneratingCharacter(true)
    try {
      // Generate character details
      const characterPrompt = `Create a character for a visual novel based on this description: ${aiPrompt}

Generate a JSON object with these fields:
{
  "name": "Character's full name",
  "description": "Physical appearance and background (2-3 sentences)",
  "personality": "Personality traits and behavior (2-3 sentences)",
  "scenario": "The setting or situation where they meet the player (1-2 sentences)",
  "firstMessage": "Their opening dialogue when meeting the player",
  "imagePrompt": "A detailed prompt for generating their character art (describe appearance, clothing, pose, art style)"
}

Make the character interesting and fitting for a visual novel. The image prompt should be detailed enough for AI image generation.`

      const response = await axios.post('/api/generate/text', {
        model: selectedModel || 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: 'You are a creative character designer for visual novels. Generate compelling characters with rich personalities.' },
          { role: 'user', content: characterPrompt }
        ],
        temperature: 0.9,
        max_tokens: 1000
      })

      const aiResponse = response.data.choices?.[0]?.message?.content || ''
      console.log('Character AI Response:', aiResponse)
      
      // Parse the response
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const characterData = JSON.parse(jsonMatch[0])
          setNewCharacter({
            ...characterData,
            imagePrompt: characterData.imagePrompt
          })
          
          // Auto-switch to character tab
          setActiveTab('characters')
          
          toast({
            title: 'Success',
            description: 'Character generated! You can now generate an image or edit the details.',
          })
        }
      } catch (e) {
        console.error('Failed to parse character data:', e)
        toast({
          title: 'Error',
          description: 'Failed to parse character data',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Character generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate character',
        variant: 'destructive'
      })
    } finally {
      setGeneratingCharacter(false)
    }
  }

  const handleGenerateCharacterImage = async () => {
    if (!newCharacter.imagePrompt && !newCharacter.description) {
      toast({
        title: 'Error',
        description: 'Please provide character details first',
        variant: 'destructive'
      })
      return
    }

    setGeneratingCharacter(true)
    try {
      const imagePrompt = newCharacter.imagePrompt || 
        `Anime-style character portrait: ${newCharacter.name}, ${newCharacter.description}. Transparent background, visual novel character sprite style.`

      const response = await axios.post('/api/generate/image', {
        model: 'openai/dall-e-3',
        prompt: imagePrompt,
        size: '1024x1024',
        n: 1
      })

      const imageUrl = response.data.data?.[0]?.url
      if (imageUrl) {
        setNewCharacter(prev => ({ ...prev, avatarUrl: imageUrl }))
        toast({
          title: 'Success',
          description: 'Character image generated!',
        })
      }
    } catch (error) {
      console.error('Image generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate character image',
        variant: 'destructive'
      })
    } finally {
      setGeneratingCharacter(false)
    }
  }

  const handleGenerateBackground = async () => {
    const bgPrompt = novelData.backgroundPrompt || novelData.description || aiPrompt
    if (!bgPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a description for the background',
        variant: 'destructive'
      })
      return
    }

    setGeneratingBackground(true)
    try {
      const imagePrompt = `Visual novel background art: ${bgPrompt}. High quality anime-style background, no characters, scenic view.`

      const response = await axios.post('/api/generate/image', {
        model: 'openai/dall-e-3',
        prompt: imagePrompt,
        size: '1024x1024',
        n: 1
      })

      const imageUrl = response.data.data?.[0]?.url
      if (imageUrl) {
        setNovelData(prev => ({ ...prev, backgroundUrl: imageUrl }))
        toast({
          title: 'Success',
          description: 'Background image generated!',
        })
      }
    } catch (error) {
      console.error('Background generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate background',
        variant: 'destructive'
      })
    } finally {
      setGeneratingBackground(false)
    }
  }

  const handleAddCharacter = () => {
    if (!newCharacter.name || !newCharacter.description) {
      toast({
        title: 'Error',
        description: 'Please provide at least a name and description',
        variant: 'destructive'
      })
      return
    }

    const character = {
      ...newCharacter,
      id: `char-${Date.now()}`
    }
    
    setCharacters([...characters, character])
    setNewCharacter({
      name: '',
      description: '',
      personality: '',
      scenario: '',
      firstMessage: ''
    })
    
    toast({
      title: 'Success',
      description: 'Character added to novel!',
    })
  }

  const handleRemoveCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id))
  }

  const handleGenerateNovel = async () => {
    if (!novelData.title || !aiPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a title and story prompt',
        variant: 'destructive'
      })
      return
    }

    setGeneratingNovel(true)
    try {
      // Include character info in the prompt
      const characterContext = characters.length > 0 
        ? `\n\nCharacters in this story:\n${characters.map(c => 
            `- ${c.name}: ${c.description} (${c.personality})`
          ).join('\n')}`
        : ''

      const systemPrompt = `You are a visual novel scene writer. Create a series of scenes for a visual novel.
Return ONLY a JSON array of scenes, with no additional text or explanation.

Each scene must follow this exact structure:
[
  {
    "id": "scene-1",
    "background": "description of the setting/location",
    "characters": [
      {
        "name": "Character Name",
        "position": "center",
        "emotion": "neutral"
      }
    ],
    "dialogue": {
      "speaker": "Character Name",
      "text": "What the character says"
    },
    "narration": "Optional narration text",
    "nextSceneId": "scene-2",
    "choices": [
      {
        "text": "Choice option text",
        "nextSceneId": "scene-2a"
      }
    ]
  }
]`

      const fullPrompt = `Story prompt: ${aiPrompt}${characterContext}

Create 5-7 scenes. Include at least one branching choice. Make the dialogue natural and engaging.`

      const response = await axios.post('/api/generate/text', {
        model: selectedModel || 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })

      console.log('Novel AI Response:', response.data)
      const aiResponse = response.data.choices?.[0]?.message?.content || ''
      
      // Parse the AI response
      let scenes = []
      try {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          scenes = JSON.parse(jsonMatch[0])
          console.log('Parsed scenes:', scenes)
        } else {
          throw new Error('No JSON array found in response')
        }
      } catch (e) {
        console.error('Failed to parse scenes:', e)
        // Create a default scene
        scenes = [{
          id: 'scene-1',
          background: novelData.description,
          dialogue: {
            speaker: characters[0]?.name || 'Narrator',
            text: 'Welcome to the beginning of our story...'
          }
        }]
      }

      setNovelData(prev => ({ ...prev, scenes }))
      setActiveTab('preview')
      
      toast({
        title: 'Success',
        description: 'Novel scenes generated! Review them in the Preview tab.',
      })
    } catch (error) {
      console.error('Novel generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate novel',
        variant: 'destructive'
      })
    } finally {
      setGeneratingNovel(false)
    }
  }

  const handleCreateNovel = async () => {
    if (!novelData.title || !novelData.description) {
      toast({
        title: 'Error',
        description: 'Please provide a title and description',
        variant: 'destructive'
      })
      return
    }

    if (novelData.scenes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please generate or add scenes first',
        variant: 'destructive'
      })
      return
    }

    setCreatingNovel(true)
    try {
      // First, create characters that aren't already saved
      const characterIds = []
      for (const character of characters) {
        if (!character.id?.startsWith('char-')) {
          characterIds.push(character.id)
        } else {
          // Create new character
          const formData = new FormData()
          const charData = {
            name: character.name,
            description: character.description,
            personality: character.personality || '',
            scenario: character.scenario || '',
            firstMessage: character.firstMessage || '',
            isPublic: false,
            tags: []
          }
          formData.append('character', JSON.stringify(charData))
          
          // If we have an image file, upload it
          if (characterImageFile && character === newCharacter) {
            formData.append('avatar', characterImageFile)
          }
          
          const charResponse = await axios.post('/api/characters', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          
          characterIds.push(charResponse.data.id)
        }
      }

      // Create the novel
      const novel = {
        id: `novel-${Date.now()}`,
        title: novelData.title,
        description: novelData.description,
        author: novelData.author,
        scenes: novelData.scenes,
        tags: novelData.tags,
        isPublic: novelData.isPublic,
        backgroundUrl: novelData.backgroundUrl
      }

      const formData = new FormData()
      formData.append('novel', JSON.stringify(novel))
      
      // Attach the first character as the main character
      if (characterIds.length > 0) {
        formData.append('characterId', characterIds[0])
      }
      
      // If we have a background file, upload it
      if (backgroundImageFile) {
        formData.append('cover', backgroundImageFile)
      }

      const response = await axios.post('/api/novels', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: 'Success',
        description: 'Your visual novel has been created!',
      })
      
      navigate(`/novels/${response.data.id}/play`)
    } catch (error: any) {
      console.error('Create novel error:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create novel',
        variant: 'destructive'
      })
    } finally {
      setCreatingNovel(false)
    }
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Visual Novel</h1>
        <p className="text-muted-foreground">
          Build an interactive visual novel with AI-generated content, characters, and backgrounds
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="generate">AI Generation</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Novel Details</CardTitle>
              <CardDescription>
                Basic information about your visual novel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={novelData.title}
                  onChange={(e) => setNovelData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter your novel's title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={novelData.description}
                  onChange={(e) => setNovelData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Write a compelling description"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Background Image</Label>
                <div className="space-y-2">
                  {novelData.backgroundUrl && (
                    <img 
                      src={novelData.backgroundUrl} 
                      alt="Background" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="backgroundFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setBackgroundImageFile(file)
                          const url = URL.createObjectURL(file)
                          setNovelData(prev => ({ ...prev, backgroundUrl: url }))
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleGenerateBackground}
                      disabled={generatingBackground}
                    >
                      {generatingBackground ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate
                    </Button>
                  </div>
                  <Input
                    placeholder="Describe the background for AI generation"
                    value={novelData.backgroundPrompt || ''}
                    onChange={(e) => setNovelData(prev => ({ ...prev, backgroundPrompt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={novelData.isPublic}
                  onCheckedChange={(checked) => setNovelData(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="public">Make this novel public</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="characters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Novel Characters</CardTitle>
              <CardDescription>
                Add characters to your visual novel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Characters */}
              <div className="space-y-2">
                <Label>Add Existing Character</Label>
                <div className="flex gap-2">
                  <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a character" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No character</SelectItem>
                      {userCharacters.map((character) => (
                        <SelectItem key={character.id} value={character.id}>
                          {character.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      const char = userCharacters.find(c => c.id === selectedCharacterId)
                      if (char && !characters.find(c => c.id === char.id)) {
                        setCharacters([...characters, char])
                        setSelectedCharacterId('none')
                      }
                    }}
                    disabled={selectedCharacterId === 'none'}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* New Character Form */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Create New Character</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="charName">Name</Label>
                      <Input
                        id="charName"
                        value={newCharacter.name}
                        onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Character name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="charImage">Character Image</Label>
                      {newCharacter.avatarUrl ? (
                        <img 
                          src={newCharacter.avatarUrl} 
                          alt={newCharacter.name} 
                          className="w-24 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id="charImageFile"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setCharacterImageFile(file)
                                const url = URL.createObjectURL(file)
                                setNewCharacter(prev => ({ ...prev, avatarUrl: url }))
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGenerateCharacterImage}
                            disabled={generatingCharacter}
                          >
                            {generatingCharacter ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charDesc">Description</Label>
                    <Textarea
                      id="charDesc"
                      value={newCharacter.description}
                      onChange={(e) => setNewCharacter(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Physical appearance and background"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charPersonality">Personality</Label>
                    <Textarea
                      id="charPersonality"
                      value={newCharacter.personality}
                      onChange={(e) => setNewCharacter(prev => ({ ...prev, personality: e.target.value }))}
                      placeholder="Personality traits"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charScenario">Scenario</Label>
                    <Input
                      id="charScenario"
                      value={newCharacter.scenario}
                      onChange={(e) => setNewCharacter(prev => ({ ...prev, scenario: e.target.value }))}
                      placeholder="How they meet the player"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="charFirstMsg">First Message</Label>
                    <Textarea
                      id="charFirstMsg"
                      value={newCharacter.firstMessage}
                      onChange={(e) => setNewCharacter(prev => ({ ...prev, firstMessage: e.target.value }))}
                      placeholder="Their opening dialogue"
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleAddCharacter} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Character to Novel
                  </Button>
                </div>
              </div>

              {/* Character List */}
              {characters.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Characters in Novel</h3>
                  <div className="space-y-2">
                    {characters.map((char) => (
                      <div key={char.id} className="flex items-center gap-3 p-3 border rounded">
                        {char.avatarUrl ? (
                          <img 
                            src={char.avatarUrl} 
                            alt={char.name} 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{char.name}</p>
                          <p className="text-sm text-muted-foreground">{char.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCharacter(char.id!)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Generation</CardTitle>
              <CardDescription>
                Use AI to generate your visual novel content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI Model</Label>
                <ModelSelector
                  value={selectedModel}
                  onChange={setSelectedModel}
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiPrompt">Story Prompt</Label>
                <Textarea
                  id="aiPrompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your visual novel story, theme, or specific scenes you want..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={handleGenerateCharacter}
                  disabled={generatingCharacter || !aiPrompt.trim()}
                  className="w-full"
                >
                  {generatingCharacter ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <UserIcon className="h-4 w-4 mr-2" />
                      Generate Character
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleGenerateBackground}
                  disabled={generatingBackground}
                  className="w-full"
                >
                  {generatingBackground ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Generate Background
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleGenerateNovel}
                  disabled={generatingNovel || !novelData.title}
                  className="w-full"
                >
                  {generatingNovel ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Scenes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Review your visual novel before creating it
              </CardDescription>
            </CardHeader>
            <CardContent>
              {novelData.scenes.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded">
                    <h3 className="font-semibold mb-2">Novel: {novelData.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{novelData.description}</p>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Characters: {characters.length}</p>
                      <p className="text-sm font-medium mb-1">Scenes: {novelData.scenes.length}</p>
                      <p className="text-sm font-medium">Background: {novelData.backgroundUrl ? 'Yes' : 'No'}</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Scene Preview:</h4>
                      {novelData.scenes.slice(0, 3).map((scene, index) => (
                        <div key={scene.id} className="p-3 bg-muted rounded">
                          <p className="text-sm font-medium">Scene {index + 1}</p>
                          {scene.background && (
                            <p className="text-xs text-muted-foreground">[{scene.background}]</p>
                          )}
                          <p className="text-sm mt-1">
                            {scene.dialogue?.speaker && <span className="font-medium">{scene.dialogue.speaker}: </span>}
                            {scene.dialogue?.text || scene.narration || 'No dialogue'}
                          </p>
                          {scene.choices && (
                            <div className="mt-2 space-y-1">
                              {scene.choices.map((choice: any, i: number) => (
                                <p key={i} className="text-xs text-muted-foreground">→ {choice.text}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {novelData.scenes.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          ... and {novelData.scenes.length - 3} more scenes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No scenes generated yet. Use the AI Generation tab to create your visual novel.
                </p>
              )}
            </CardContent>
            {novelData.scenes.length > 0 && (
              <CardFooter>
                <Button
                  onClick={handleCreateNovel}
                  disabled={creatingNovel}
                  className="w-full"
                >
                  {creatingNovel ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Novel...
                    </>
                  ) : (
                    'Create Visual Novel'
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}