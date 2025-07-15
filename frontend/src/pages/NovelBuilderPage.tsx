import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/hooks/useAuthStore'
import axios from '@/lib/axios'
import { Sparkles } from 'lucide-react'

export default function NovelBuilderPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [userCharacters, setUserCharacters] = useState<any[]>([])
  const [generatingWithAI, setGeneratingWithAI] = useState(false)
  const [creatingNovel, setCreatingNovel] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()

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

  const generateWithAI = async () => {
    if (!aiPrompt || !title) {
      toast({
        title: 'Error',
        description: 'Please provide a title and AI prompt',
        variant: 'destructive'
      })
      return
    }

    setGeneratingWithAI(true)
    try {
      // Generate scenes using AI
      const systemPrompt = `You are a visual novel scene writer. Create a series of scenes for a visual novel based on the given prompt. Each scene should have dialogue, and optionally choices that lead to different paths. Return the response as a JSON array of scenes.

Each scene should follow this structure:
{
  "id": "scene-1",
  "background": "description of setting",
  "dialogue": {
    "speaker": "Character Name",
    "text": "What the character says"
  },
  "nextSceneId": "scene-2" // or null if it has choices
  "choices": [ // optional, only if there are choices
    {
      "text": "Choice 1 text",
      "nextSceneId": "scene-2a"
    },
    {
      "text": "Choice 2 text", 
      "nextSceneId": "scene-2b"
    }
  ]
}`

      const selectedCharacter = selectedCharacterId !== 'none' ? userCharacters.find(c => c.id === selectedCharacterId) : null
      const characterContext = selectedCharacter ? 
        `Main character: ${selectedCharacter.name}
Description: ${selectedCharacter.description}
Personality: ${selectedCharacter.personality}
Scenario: ${selectedCharacter.scenario}

` : ''

      const fullPrompt = `${characterContext}Story prompt: ${aiPrompt}

Create 5-7 scenes for this visual novel. Include at least one branching choice.`

      const response = await axios.post('/api/generate/text', {
        model: 'anthropic/claude-3-opus-20240229',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })

      console.log('AI Response:', response.data)
      const aiResponse = response.data.choices?.[0]?.message?.content || response.data.content || ''
      
      // Parse the AI response to extract scenes
      let scenes
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)?.[0]
        scenes = JSON.parse(jsonMatch || '[]')
        console.log('Parsed scenes:', scenes)
      } catch (e) {
        console.error('Failed to parse AI response:', e)
        // If parsing fails, create a simple scene
        scenes = [{
          id: 'scene-1',
          dialogue: {
            text: 'Welcome to your AI-generated visual novel!'
          }
        }]
      }

      // Create the novel with AI-generated scenes
      const novel = {
        id: `novel-${Date.now()}`,
        title,
        description: description || `An AI-generated visual novel: ${aiPrompt}`,
        author: user?.username || 'Anonymous',
        scenes,
        tags: ['ai-generated']
      }

      const formData = new FormData()
      formData.append('novel', JSON.stringify(novel))
      if (selectedCharacterId && selectedCharacterId !== 'none') {
        formData.append('characterId', selectedCharacterId)
      }
      
      const novelResponse = await axios.post('/api/novels', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: 'Success',
        description: 'Your AI-generated novel has been created!',
      })
      
      navigate(`/novels/${novelResponse.data.id}/play`)
    } catch (error: any) {
      console.error('AI generation error:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to generate novel with AI',
        variant: 'destructive',
      })
    } finally {
      setGeneratingWithAI(false)
    }
  }

  const handleCreateNovel = async () => {
    if (!title || !description) {
      toast({
        title: 'Error',
        description: 'Please provide a title and description',
        variant: 'destructive'
      })
      return
    }

    setCreatingNovel(true)
    try {
      const novel = {
        id: `novel-${Date.now()}`,
        title,
        description,
        author: user?.username || 'Anonymous',
        scenes: [
          {
            id: 'scene-1',
            dialogue: {
              text: 'Welcome to your visual novel! Edit this scene to begin your story.'
            }
          }
        ],
        tags: []
      }

      const formData = new FormData()
      formData.append('novel', JSON.stringify(novel))
      if (selectedCharacterId && selectedCharacterId !== 'none') {
        formData.append('characterId', selectedCharacterId)
      }
      
      const response = await axios.post('/api/novels', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: 'Success',
        description: 'Your novel has been created!',
      })

      navigate(`/novels/${response.data.id}/play`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create novel',
        variant: 'destructive',
      })
    } finally {
      setCreatingNovel(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create Visual Novel</h1>

      <Card>
        <CardHeader>
          <CardTitle>Novel Details</CardTitle>
          <CardDescription>
            Provide basic information about your visual novel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter novel title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter novel description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="character">Character (Optional)</Label>
            <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              Select a character to use as the basis for your story
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Generation</CardTitle>
          <CardDescription>
            Let AI help you create your visual novel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the story you want to create..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={5}
            />
          </div>
          <Button 
            onClick={generateWithAI} 
            className="w-full"
            disabled={generatingWithAI || !title}
          >
            {generatingWithAI ? (
              <>Generating...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Creation</CardTitle>
          <CardDescription>
            Create scenes manually for full control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Start with a basic novel structure and edit scenes after creation.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          className="flex-1"
          onClick={handleCreateNovel}
          disabled={!title || !description || creatingNovel}
        >
          {creatingNovel ? 'Creating...' : 'Create Novel'}
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => navigate('/novels')}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}