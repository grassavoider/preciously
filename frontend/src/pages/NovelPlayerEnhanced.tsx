import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from '@/lib/axios'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, ChevronRight, RotateCcw, MessageSquare, Settings, Loader2, Volume2, VolumeX } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/hooks/useAuthStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoice } from '@/hooks/useVoice'
import { VoicePlayer } from '@/components/VoicePlayer'
import { ModelSelector } from '@/components/ModelSelector'

interface Scene {
  id: string
  background?: string
  music?: string
  characters?: Array<{
    name: string
    position: 'left' | 'center' | 'right'
    emotion?: string
  }>
  dialogue: {
    speaker?: string
    text: string
  }
  narration?: string
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
  backgroundUrl?: string
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

interface DisplayMode {
  mode: 'vn' | 'chat'
  autoAdvance: boolean
  textSpeed: number
  soundEnabled: boolean
}

export default function NovelPlayerEnhanced() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const textRef = useRef<HTMLDivElement>(null)
  const { generateCharacterVoice, isGenerating: isGeneratingVoice } = useVoice()
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState<string | null>(null)
  
  // Novel state
  const [novel, setNovel] = useState<Novel | null>(null)
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<any>(null)
  
  // Display state
  const [displayMode, setDisplayMode] = useState<DisplayMode>({
    mode: 'vn',
    autoAdvance: false,
    textSpeed: 30,
    soundEnabled: true
  })
  const [showSettings, setShowSettings] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  
  // Interaction state
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string>('')

  useEffect(() => {
    if (id) {
      fetchNovelAndConversation()
    }
  }, [id])

  useEffect(() => {
    // Text animation effect for VN mode
    if (displayMode.mode === 'vn' && isTyping && currentScene) {
      const fullText = currentScene.dialogue?.text || currentScene.narration || ''
      
      if (currentTextIndex < fullText.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(fullText.slice(0, currentTextIndex + 1))
          setCurrentTextIndex(currentTextIndex + 1)
        }, displayMode.textSpeed)
        
        return () => clearTimeout(timeout)
      } else {
        setIsTyping(false)
        if (displayMode.autoAdvance && currentScene.nextSceneId) {
          setTimeout(() => handleNextScene(), 2000)
        }
      }
    }
  }, [currentTextIndex, isTyping, displayMode, currentScene])

  const fetchNovelAndConversation = async () => {
    setLoading(true)
    try {
      const novelRes = await axios.get(`/api/novels/${id}`)
      const novelData = novelRes.data
      novelData.scenes = JSON.parse(novelData.scenes || '[]')
      setNovel(novelData)

      // Fetch or create conversation
      const convRes = await axios.get(`/api/novels/${id}/conversation`)
      if (convRes.data) {
        const conv = convRes.data
        conv.messages = JSON.parse(conv.messages || '[]')
        setConversation(conv)
        setMessages(conv.messages)
        
        const scene = novelData.scenes.find((s: Scene) => s.id === conv.currentSceneId) || novelData.scenes[0]
        setCurrentScene(scene)
        startTextAnimation(scene)
      } else {
        // Create new conversation
        const firstScene = novelData.scenes[0]
        setCurrentScene(firstScene)
        startTextAnimation(firstScene)
        
        const initialMessages: Message[] = []
        if (novelData.character?.firstMessage) {
          initialMessages.push({
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: novelData.character.firstMessage,
            character: novelData.character.name,
            timestamp: new Date().toISOString()
          })
        }
        
        const response = await axios.post(`/api/novels/${id}/conversation`, {
          currentSceneId: firstScene.id,
          messages: JSON.stringify(initialMessages),
          variables: JSON.stringify({})
        })
        
        setConversation(response.data)
        setMessages(initialMessages)
      }

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

  const startTextAnimation = (scene: Scene) => {
    if (displayMode.mode === 'vn') {
      setDisplayedText('')
      setCurrentTextIndex(0)
      setIsTyping(true)
    }
  }

  const handleSkipText = () => {
    if (isTyping && currentScene) {
      const fullText = currentScene.dialogue?.text || currentScene.narration || ''
      setDisplayedText(fullText)
      setCurrentTextIndex(fullText.length)
      setIsTyping(false)
    }
  }

  const handleNextScene = () => {
    if (!novel || !currentScene) return
    
    if (currentScene.nextSceneId) {
      const nextScene = novel.scenes.find(s => s.id === currentScene.nextSceneId)
      if (nextScene) {
        setCurrentScene(nextScene)
        startTextAnimation(nextScene)
        saveProgress(nextScene.id)
        setCurrentVoiceUrl(null) // Clear voice when changing scenes
      }
    }
  }

  const handleChoice = (nextSceneId: string) => {
    if (!novel) return
    setCurrentVoiceUrl(null) // Clear voice when making choices
    
    const nextScene = novel.scenes.find(s => s.id === nextSceneId)
    if (nextScene) {
      setCurrentScene(nextScene)
      startTextAnimation(nextScene)
      saveProgress(nextScene.id)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || generating || !novel) return

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
      const systemPrompt = `You are ${novel.character?.name || 'a character'} in a visual novel.
${novel.character?.description ? `Description: ${novel.character.description}` : ''}
${novel.character?.personality ? `Personality: ${novel.character.personality}` : ''}
${novel.character?.scenario ? `Current scenario: ${novel.character.scenario}` : ''}
${currentScene?.dialogue?.text ? `Current scene: ${currentScene.dialogue.text}` : ''}

Respond in character. Keep responses concise and fitting for a visual novel.`

      const response = await axios.post('/api/generate/text', {
        model: selectedModel || 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          { role: 'user', content: input.trim() }
        ],
        temperature: 0.8,
        max_tokens: 300
      })

      const aiContent = response.data.choices?.[0]?.message?.content || ''
      
      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        character: novel.character?.name,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])
      
      // In VN mode, display the response as dialogue
      if (displayMode.mode === 'vn' && currentScene) {
        const responseScene: Scene = {
          ...currentScene,
          dialogue: {
            speaker: novel.character?.name,
            text: aiContent
          }
        }
        setCurrentScene(responseScene)
        startTextAnimation(responseScene)
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

  const saveProgress = async (sceneId: string) => {
    if (!conversation) return
    
    try {
      await axios.put(`/api/novels/${id}/conversation/${conversation.id}`, {
        currentSceneId: sceneId,
        messages: JSON.stringify(messages),
        variables: JSON.stringify({})
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
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
    <div className="relative h-screen overflow-hidden bg-black">
      {/* Background */}
      {(currentScene?.background || novel.backgroundUrl) && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${novel.backgroundUrl || currentScene?.background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.7)'
          }}
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/novels')}
          className="text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <h1 className="text-xl font-semibold text-white">{novel.title}</h1>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDisplayMode(prev => ({ ...prev, mode: prev.mode === 'vn' ? 'chat' : 'vn' }))}
            className="text-white hover:bg-white/20"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white hover:bg-white/20"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Character Sprites */}
      {displayMode.mode === 'vn' && currentScene?.characters && (
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[70%] flex items-end justify-center pointer-events-none">
          <AnimatePresence>
            {currentScene.characters.map((char, index) => (
              <motion.div
                key={`${char.name}-${index}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  x: char.position === 'left' ? '-25%' : char.position === 'right' ? '25%' : '0%'
                }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "absolute bottom-0",
                  char.position === 'center' && "animate-float"
                )}
              >
                {novel.character?.avatarUrl ? (
                  <img 
                    src={novel.character.avatarUrl} 
                    alt={char.name}
                    className="h-[90%] max-h-[600px] object-contain"
                    style={{
                      filter: char.name === currentScene.dialogue?.speaker ? 'brightness(1)' : 'brightness(0.6)'
                    }}
                  />
                ) : (
                  <div className="w-48 h-64 bg-white/10 rounded-lg flex items-center justify-center">
                    <span className="text-white/50">{char.name}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* VN Mode - Text Box */}
      {displayMode.mode === 'vn' && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
          onClick={isTyping ? handleSkipText : undefined}
        >
          <div className="max-w-4xl mx-auto">
            {/* Speaker Name */}
            {currentScene?.dialogue?.speaker && (
              <div className="mb-2 flex items-center gap-2">
                <span className="px-4 py-1 bg-black/50 rounded-full text-white font-semibold">
                  {currentScene.dialogue.speaker}
                </span>
                {displayMode.soundEnabled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-white/70 hover:text-white"
                    onClick={async () => {
                      if (currentScene?.dialogue?.text && currentScene?.dialogue?.speaker) {
                        const character = novel?.characters?.find(c => c.name === currentScene.dialogue.speaker);
                        const url = await generateCharacterVoice({
                          characterName: currentScene.dialogue.speaker,
                          text: currentScene.dialogue.text,
                          personality: character?.personality
                        });
                        setCurrentVoiceUrl(url);
                      }
                    }}
                    disabled={isGeneratingVoice}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            
            {/* Dialogue Text */}
            <div 
              ref={textRef}
              className="text-white text-xl leading-relaxed font-['Courier_New'] drop-shadow-lg"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              {displayMode.mode === 'vn' ? displayedText : (currentScene?.dialogue?.text || currentScene?.narration || '')}
            </div>
            
            {/* Voice Player */}
            {currentVoiceUrl && displayMode.soundEnabled && (
              <div className="mt-2">
                <VoicePlayer 
                  src={currentVoiceUrl} 
                  autoPlay 
                  onEnded={() => {
                    if (displayMode.autoAdvance && currentScene?.nextSceneId) {
                      handleNextScene();
                    }
                  }}
                  minimal 
                />
              </div>
            )}

            {/* Choices or Continue */}
            <div className="mt-6">
              {currentScene?.choices ? (
                <div className="space-y-2">
                  {currentScene.choices.map((choice, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start bg-black/50 text-white border-white/20 hover:bg-white/20"
                      onClick={() => handleChoice(choice.nextSceneId)}
                      disabled={isTyping}
                    >
                      {choice.text}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {!isTyping && currentScene?.nextSceneId && (
                      <Button
                        onClick={handleNextScene}
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Input for AI interaction */}
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Say something..."
                      className="bg-black/50 text-white border-white/20 placeholder:text-white/50"
                      disabled={generating}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || generating}
                      className="bg-white/20 hover:bg-white/30 text-white"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Mode */}
      {displayMode.mode === 'chat' && (
        <div className="absolute inset-x-0 bottom-0 top-16 z-20 flex flex-col bg-black/50">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
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
                  
                  <Card className={cn(
                    "max-w-[70%]",
                    message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white/90"
                  )}>
                    <div className="p-3">
                      {message.character && message.role !== 'user' && (
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">{message.character}</p>
                          {displayMode.soundEnabled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={async () => {
                                const url = await generateCharacterVoice({
                                  characterName: message.character || novel?.character?.name || 'Assistant',
                                  text: message.content,
                                  personality: novel?.character?.personality
                                });
                                setCurrentVoiceUrl(url);
                              }}
                              disabled={isGeneratingVoice}
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </Card>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {generating && (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generating response...</span>
                </div>
              )}
              
              {/* Voice Player for Chat Mode */}
              {currentVoiceUrl && displayMode.soundEnabled && (
                <div className="mt-4">
                  <VoicePlayer src={currentVoiceUrl} autoPlay />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-white/10 text-white border-white/20 placeholder:text-white/50"
                disabled={generating}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || generating}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-80 bg-black/90 border border-white/20 rounded-lg p-4 z-30">
          <h3 className="font-semibold text-white mb-4">Settings</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm text-white/80">AI Model</span>
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                type="text"
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Auto-advance</span>
              <Button
                size="sm"
                variant={displayMode.autoAdvance ? "default" : "outline"}
                onClick={() => setDisplayMode(prev => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
                className="h-8"
              >
                {displayMode.autoAdvance ? 'On' : 'Off'}
              </Button>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm text-white/80">Text Speed</span>
              <input
                type="range"
                min="10"
                max="100"
                value={displayMode.textSpeed}
                onChange={(e) => setDisplayMode(prev => ({ ...prev, textSpeed: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Sound</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDisplayMode(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                className="h-8 text-white"
              >
                {displayMode.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}