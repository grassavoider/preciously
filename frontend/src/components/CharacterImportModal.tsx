import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Upload, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import axios from '@/lib/axios'

interface CharacterImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportSuccess?: () => void
}

export default function CharacterImportModal({ open, onOpenChange, onImportSuccess }: CharacterImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [characterData, setCharacterData] = useState({
    name: '',
    description: '',
    personality: '',
    scenario: '',
    firstMessage: '',
    isPublic: false,
    avatarUrl: ''
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    
    // If it's a JSON/CharX file, try to parse it
    if (selectedFile.name.endsWith('.json') || selectedFile.name.endsWith('.charx')) {
      try {
        const text = await selectedFile.text()
        const data = JSON.parse(text)
        
        setCharacterData({
          name: data.name || '',
          description: data.description || '',
          personality: data.personality || '',
          scenario: data.scenario || '',
          firstMessage: data.first_mes || data.firstMessage || '',
          isPublic: false
        })
      } catch (error) {
        console.error('Error parsing character file:', error)
      }
    }
  }

  const handleFileImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      // Try to import from PNG/CharX file first
      if (file.type === 'image/png' || file.name.endsWith('.charx')) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await axios.post('/api/characters/import', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Autofill form with imported data
        if (response.data) {
          setCharacterData({
            name: response.data.name || '',
            description: response.data.description || '',
            personality: response.data.personality || '',
            scenario: response.data.scenario || '',
            firstMessage: response.data.firstMessage || '',
            isPublic: characterData.isPublic, // Keep the current privacy setting
            avatarUrl: response.data.avatarUrl || ''
          })
          
          // If it's a PNG file with avatar, use it as avatar
          if (file.type === 'image/png' && response.data.avatarUrl) {
            setAvatarFile(file)
          }
          
          toast({
            title: 'Success',
            description: 'Character data extracted! Review and save to import.',
          })
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to extract character data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!characterData.name) {
      toast({
        title: 'Error',
        description: 'Please enter a character name',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Create character with form data
      const formData = new FormData()
      const charData = {
        ...characterData,
        tags: [],
        messageExample: ''
      }
      delete charData.avatarUrl // Remove avatarUrl from character data
      
      formData.append('character', JSON.stringify(charData))
      
      // If we have an avatar file (from PNG import), include it
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      
      const response = await axios.post('/api/characters', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: 'Success',
        description: 'Character imported successfully!'
      })
      
      onOpenChange(false)
      onImportSuccess?.()
      
      // Reset form
      setFile(null)
      setAvatarFile(null)
      setCharacterData({
        name: '',
        description: '',
        personality: '',
        scenario: '',
        firstMessage: '',
        isPublic: false,
        avatarUrl: ''
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to import character',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Character</DialogTitle>
          <DialogDescription>
            Import a character from a CharX file, PNG with embedded data, or create one manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Character File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".png,.json,.charx"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </div>
                  {(file.type === 'image/png' || file.name.endsWith('.charx')) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleFileImport}
                      disabled={loading}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Extract Data
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supports PNG with embedded character data, CharX files, or JSON files
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Character Details</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={characterData.name}
                  onChange={(e) => setCharacterData({ ...characterData, name: e.target.value })}
                  placeholder="Character name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={characterData.description}
                  onChange={(e) => setCharacterData({ ...characterData, description: e.target.value })}
                  placeholder="Character description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personality</Label>
                <Textarea
                  id="personality"
                  value={characterData.personality}
                  onChange={(e) => setCharacterData({ ...characterData, personality: e.target.value })}
                  placeholder="Character personality"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario">Scenario</Label>
                <Textarea
                  id="scenario"
                  value={characterData.scenario}
                  onChange={(e) => setCharacterData({ ...characterData, scenario: e.target.value })}
                  placeholder="Default scenario"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstMessage">First Message</Label>
                <Textarea
                  id="firstMessage"
                  value={characterData.firstMessage}
                  onChange={(e) => setCharacterData({ ...characterData, firstMessage: e.target.value })}
                  placeholder="Character's first message"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isPublic">Share publicly</Label>
                <Switch
                  id="isPublic"
                  checked={characterData.isPublic}
                  onCheckedChange={(checked) => setCharacterData({ ...characterData, isPublic: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Public characters can be discovered and used by other users
              </p>
              
              {avatarFile && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ Avatar will be imported from the PNG file
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleImport}
            disabled={loading || !characterData.name}
            className="flex-1"
          >
            {loading ? 'Importing...' : 'Import Character'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}