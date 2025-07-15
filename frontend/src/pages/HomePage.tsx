import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, Sparkles, Palette, PlusCircle } from 'lucide-react'
import { useAuthStore } from '@/hooks/useAuthStore'

export default function HomePage() {
  const { user } = useAuthStore()
  return (
    <div className="space-y-12">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Welcome to <span className="text-primary">Preciously.ai</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Create and experience AI-powered visual novels with your favorite characters
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link to="/novels">
            <Button size="lg">
              <BookOpen className="mr-2 h-5 w-5" />
              Browse Novels
            </Button>
          </Link>
          <Link to="/characters">
            <Button size="lg" variant="outline">
              <Users className="mr-2 h-5 w-5" />
              Explore Characters
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <Sparkles className="h-10 w-10 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">AI-Powered Stories</h3>
          <p className="text-sm text-muted-foreground">
            Generate engaging visual novels with advanced AI models
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <Users className="h-10 w-10 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">Character Cards</h3>
          <p className="text-sm text-muted-foreground">
            Import and use CharX files and PNG character cards
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <BookOpen className="h-10 w-10 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">Visual Novels</h3>
          <p className="text-sm text-muted-foreground">
            Create branching stories with choices and multiple endings
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <Palette className="h-10 w-10 text-primary mb-4" />
          <h3 className="font-semibold text-lg mb-2">Customization</h3>
          <p className="text-sm text-muted-foreground">
            Fine-tune AI models with presets and voice generation
          </p>
        </div>
      </section>

      <section className="bg-muted/50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Create?</h2>
        <p className="text-muted-foreground mb-6">
          {user 
            ? "Start creating your own AI-powered visual novels"
            : "Sign up now to start creating your own AI-powered visual novels"
          }
        </p>
        {user ? (
          <Link to="/novels/create">
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Novel
            </Button>
          </Link>
        ) : (
          <Link to="/register">
            <Button size="lg">Get Started</Button>
          </Link>
        )}
      </section>
    </div>
  )
}