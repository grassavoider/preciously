import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Sparkles, Lock } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/hooks/useAuthStore';
import { cn } from '@/lib/utils';

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: 'FREE' | 'PAID';
  type: 'text' | 'image' | 'voice';
  description?: string;
}

interface ModelSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  type?: 'text' | 'image' | 'voice';
  className?: string;
  disabled?: boolean;
}

export function ModelSelector({ 
  value, 
  onChange, 
  type = 'text', 
  className,
  disabled 
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [userTier, setUserTier] = useState<'FREE' | 'PAID'>('FREE');
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchModels();
  }, [type]);

  const fetchModels = async () => {
    try {
      const response = await axios.get('/api/models');
      const filteredModels = response.data.models.filter((m: ModelConfig) => m.type === type);
      setModels(filteredModels);
      setUserTier(response.data.userTier);
      
      // Set default value if not set
      if (!value && filteredModels.length > 0) {
        onChange(filteredModels[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading models..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem 
            key={model.id} 
            value={model.id}
            disabled={model.tier === 'PAID' && userTier === 'FREE'}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span>{model.name}</span>
                {model.tier === 'PAID' && (
                  <Badge variant="secondary" className="text-xs">
                    {userTier === 'FREE' ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Pro
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Pro
                      </>
                    )}
                  </Badge>
                )}
              </div>
              {model.description && (
                <span className="text-xs text-muted-foreground ml-4">
                  {model.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
        {userTier === 'FREE' && models.some(m => m.tier === 'PAID') && (
          <div className="px-2 py-3 text-xs text-muted-foreground border-t">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Upgrade to Pro to access premium models
            </div>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}