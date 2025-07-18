import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCharacters } from '@/hooks/useCharacters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Star, Download, MessageSquare, Upload, Loader2 } from 'lucide-react'
import CharacterImportModal from '@/components/CharacterImportModal'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useDebounce } from '@/hooks/useDebounce'

export default function CharactersPage() {
  const [search, setSearch] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const { user } = useAuthStore()
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(search, 300)
  
  // Use the cached query
  const { data, isLoading, error } = useCharacters(debouncedSearch)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Characters</h1>
        {user && (
          <Button onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Character
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search characters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex justify-center py-12">
          <p className="text-destructive">Failed to load characters. Please try again.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.characters.map((character) => (
            <Card key={character.id} className="overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {character.avatarUrl ? (
                  <img
                    src={character.avatarUrl}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
                    {character.name[0]}
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle>{character.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {character.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  by {character.creator.username}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {character._count.conversations}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {character._count.ratings}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {character.downloadCount}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Link to={`/characters/${character.id}`} className="w-full">
                  <Button className="w-full" variant="outline">
                    View Character
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <CharacterImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportSuccess={() => {
          // React Query will automatically refetch due to invalidation
        }}
      />
    </div>
  )
}