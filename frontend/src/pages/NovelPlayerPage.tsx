import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from '@/lib/axios'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, ChevronRight, RotateCcw, Edit2, Send, Loader2, Save, Menu } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/hooks/useAuthStore'
import { cn } from '@/lib/utils'

interface Scene {
  id: string
  background?: string
  music?: string
  dialogue: {
    speaker?: string
    text: string
  }
  choices?: Array<{
    text: string
    nextSceneId: string
  }>
  nextSceneId?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'narrator'
  content: string
  character?: string
  timestamp: string
  swipes?: string[]
  currentSwipeIndex?: number
}

interface Novel {
  id: string
  title: string
  description: string
  scenes: Scene[]
  character?: {
    id: string
    name: string
    avatarUrl?: string
    description: string
    personality: string
    scenario: string
    firstMessage: string
  }
}

interface Conversation {
  id: string
  messages: Message[]
  currentSceneId: string
  variables: Record<string, any>
}

export default function NovelPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const [novel, setNovel] = useState<Novel | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (id) {
      fetchNovelAndConversation()
    }
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Auto-save conversation every time messages change
    if (conversation && messages.length > 0) {
      if (saveTimeout) clearTimeout(saveTimeout)
      
      const timeout = setTimeout(() => {
        saveConversation()
      }, 2000) // Save after 2 seconds of inactivity
      
      setSaveTimeout(timeout)
    }

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout)
    }
  }, [messages])

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const fetchNovelAndConversation = async () => {
    setLoading(true)
    try {
      // Fetch novel data
      const novelRes = await axios.get(`/api/novels/${id}`)
      const novelData = novelRes.data
      novelData.scenes = JSON.parse(novelData.scenes || '[]')
      setNovel(novelData)

      // Fetch or create conversation
      const convRes = await axios.get(`/api/novels/${id}/conversation`)
      if (convRes.data) {
        const conv = convRes.data
        conv.messages = JSON.parse(conv.messages || '[]')
        conv.variables = JSON.parse(conv.variables || '{}')
        setConversation(conv)
        setMessages(conv.messages)
        
        // Find current scene
        const scene = novelData.scenes.find((s: Scene) => s.id === conv.currentSceneId) || novelData.scenes[0]
        setCurrentScene(scene)
      } else {
        // Create new conversation
        const newConv = await createConversation(novelData)
        setConversation(newConv)
      }

      // Track play
      await axios.post(`/api/novels/${id}/play`)
    } catch (error) {
      console.error('Failed to fetch novel:', error)
      toast({
        title: 'Error',
        description: 'Failed to load novel',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createConversation = async (novelData: Novel) => {
    try {
      const firstScene = novelData.scenes[0]
      const initialMessages: Message[] = []

      // Add character's first message if available
      if (novelData.character?.firstMessage) {
        initialMessages.push({
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: novelData.character.firstMessage,
          character: novelData.character.name,
          timestamp: new Date().toISOString()
        })
      } else if (firstScene?.dialogue) {
        initialMessages.push({
          id: `msg-${Date.now()}`,
          role: 'narrator',
          content: firstScene.dialogue.text,
          character: firstScene.dialogue.speaker,
          timestamp: new Date().toISOString()
        })
      }

      const response = await axios.post(`/api/novels/${id}/conversation`, {
        currentSceneId: firstScene.id,
        messages: JSON.stringify(initialMessages),
        variables: JSON.stringify({})
      })

      const conv = response.data
      conv.messages = initialMessages
      conv.variables = {}
      setMessages(initialMessages)
      setCurrentScene(firstScene)
      
      return conv
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw error
    }
  }

  const saveConversation = async () => {
    if (!conversation) return

    try {
      await axios.put(`/api/novels/${id}/conversation/${conversation.id}`, {
        currentSceneId: currentScene?.id || conversation.currentSceneId,
        messages: JSON.stringify(messages),
        variables: JSON.stringify(conversation.variables)
      })
    } catch (error) {
      console.error('Failed to save conversation:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || generating) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages([...messages, userMessage])
    setInput('')
    setGenerating(true)

    try {
      // Generate AI response
      const systemPrompt = `You are ${novel?.character?.name || 'a character'} in a visual novel.
${novel?.character?.description ? `Description: ${novel.character.description}` : ''}
${novel?.character?.personality ? `Personality: ${novel.character.personality}` : ''}
${novel?.character?.scenario ? `Current scenario: ${novel.character.scenario}` : ''}
${currentScene?.dialogue?.text ? `Current scene: ${currentScene.dialogue.text}` : ''}

Respond in character. Keep responses concise and engaging.`

      const response = await axios.post('/api/generate/text', {
        model: 'anthropic/claude-3-opus-20240229',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          { role: 'user', content: input.trim() }
        ],
        temperature: 0.8,
        max_tokens: 500
      })

      const aiContent = response.data.choices?.[0]?.message?.content || response.data.content || 'I need a moment to think...'
      
      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        character: novel?.character?.name,
        timestamp: new Date().toISOString(),
        swipes: [aiContent],
        currentSwipeIndex: 0
      }

      setMessages(prev => [...prev, aiMessage])

      // Check for scene transitions based on choices
      if (currentScene?.choices) {
        // Simple keyword matching for demo - could be enhanced with better NLP
        const choice = currentScene.choices.find(c => 
          input.toLowerCase().includes(c.text.toLowerCase().split(' ')[0])
        )
        if (choice && novel) {
          const nextScene = novel.scenes.find(s => s.id === choice.nextSceneId)
          if (nextScene) {
            setCurrentScene(nextScene)
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate response:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate response',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const message = messages[messageIndex]
    if (message.role !== 'assistant') return

    setGenerating(true)
    try {
      // Get context up to this message
      const contextMessages = messages.slice(0, messageIndex)
      const lastUserMessage = contextMessages.findLast(m => m.role === 'user')
      
      if (!lastUserMessage) return

      const systemPrompt = `You are ${novel?.character?.name || 'a character'} in a visual novel.
${novel?.character?.description ? `Description: ${novel.character.description}` : ''}
${novel?.character?.personality ? `Personality: ${novel.character.personality}` : ''}
${novel?.character?.scenario ? `Current scenario: ${novel.character.scenario}` : ''}

Respond in character. Keep responses concise and engaging. Provide a different response than before.`

      const response = await axios.post('/api/generate/text', {
        model: 'anthropic/claude-3-opus-20240229',
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextMessages.slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }))
        ],
        temperature: 0.9,
        max_tokens: 500
      })

      const newContent = response.data.choices?.[0]?.message?.content || response.data.content || 'I need a moment to think...'
      
      // Add to swipes
      const updatedMessage = { ...message }
      if (!updatedMessage.swipes) updatedMessage.swipes = [message.content]
      updatedMessage.swipes.push(newContent)
      updatedMessage.currentSwipeIndex = updatedMessage.swipes.length - 1
      updatedMessage.content = newContent

      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = updatedMessage
      setMessages(updatedMessages)
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      toast({
        title: 'Error',
        description: 'Failed to regenerate message',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSwipeMessage = (messageId: string, direction: 'left' | 'right') => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const message = messages[messageIndex]
    if (!message.swipes || message.swipes.length <= 1) return

    const currentIndex = message.currentSwipeIndex || 0
    const newIndex = direction === 'left' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(message.swipes.length - 1, currentIndex + 1)

    if (newIndex !== currentIndex) {
      const updatedMessage = {
        ...message,
        currentSwipeIndex: newIndex,
        content: message.swipes[newIndex]
      }

      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = updatedMessage
      setMessages(updatedMessages)
    }
  }

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (message) {
      setEditingMessageId(messageId)
      setEditingContent(message.content)
    }
  }

  const handleSaveEdit = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const updatedMessage = {
      ...messages[messageIndex],
      content: editingContent
    }

    // If it's an assistant message, add to swipes
    if (updatedMessage.role === 'assistant') {
      if (!updatedMessage.swipes) updatedMessage.swipes = [messages[messageIndex].content]
      updatedMessage.swipes.push(editingContent)
      updatedMessage.currentSwipeIndex = updatedMessage.swipes.length - 1
    }

    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = updatedMessage
    setMessages(updatedMessages)

    setEditingMessageId(null)
    setEditingContent('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">Novel not found</h2>
        <Button onClick={() => navigate('/novels')}>Back to Novels</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/novels')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{novel.title}</h1>
            {novel.character && (
              <p className="text-sm text-muted-foreground">with {novel.character.name}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Scene Background (if visual novel mode) */}
      {currentScene?.background && (
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: `url(${currentScene.background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 z-10">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.role !== 'user' && novel?.character && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={novel.character.avatarUrl} />
                  <AvatarFallback>{novel.character.name[0]}</AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "max-w-[70%] space-y-2",
                message.role === 'user' ? "items-end" : "items-start"
              )}>
                {message.character && message.role !== 'user' && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {message.character}
                  </p>
                )}
                
                <Card className={cn(
                  message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <CardContent className="p-3">
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-2 rounded bg-background text-foreground"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(message.id)}>
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingMessageId(null)
                              setEditingContent('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Message Actions */}
                {message.role === 'assistant' && editingMessageId !== message.id && (
                  <div className="flex items-center gap-1">
                    {/* Swipe Controls */}
                    {message.swipes && message.swipes.length > 1 && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleSwipeMessage(message.id, 'left')}
                          disabled={message.currentSwipeIndex === 0}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {(message.currentSwipeIndex || 0) + 1}/{message.swipes.length}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleSwipeMessage(message.id, 'right')}
                          disabled={message.currentSwipeIndex === message.swipes.length - 1}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleEditMessage(message.id)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleRegenerateMessage(message.id)}
                      disabled={generating}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {generating && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating response...</span>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Scene Choices */}
      {currentScene?.choices && currentScene.choices.length > 0 && (
        <div className="p-4 border-t bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">Choose your action:</p>
          <div className="flex flex-wrap gap-2">
            {currentScene.choices.map((choice, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(choice.text)}
              >
                {choice.text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex gap-2 max-w-4xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={generating ? "Waiting for response..." : "Type your message..."}
            disabled={generating}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Side Menu */}
      {showMenu && (
        <div className="absolute top-16 right-4 w-64 bg-background border rounded-lg shadow-lg p-4 z-20">
          <h3 className="font-semibold mb-2">Options</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => saveConversation()}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate(`/novels/${id}/edit`)}
              disabled
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Novel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}