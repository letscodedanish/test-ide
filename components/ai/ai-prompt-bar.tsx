'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  X, 
  Code, 
  MessageSquare, 
  RefreshCw,
  Bug,
  HelpCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIPromptBarProps {
  isVisible: boolean;
  onClose: () => void;
  onSuggestion: (suggestion: string, type: 'code' | 'explanation') => void;
  currentCode?: string;
  selectedText?: string;
  language: string;
  fileName?: string;
}

const AI_ACTIONS = [
  { id: 'completion', label: 'Complete Code', icon: Code, color: 'bg-blue-500' },
  { id: 'explanation', label: 'Explain Code', icon: HelpCircle, color: 'bg-green-500' },
  { id: 'refactor', label: 'Refactor', icon: RefreshCw, color: 'bg-purple-500' },
  { id: 'debug', label: 'Find Bugs', icon: Bug, color: 'bg-red-500' },
  { id: 'chat', label: 'Ask AI', icon: MessageSquare, color: 'bg-orange-500' },
];

export function AIPromptBar({
  isVisible,
  onClose,
  onSuggestion,
  currentCode,
  selectedText,
  language,
  fileName,
}: AIPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('completion');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedAction,
          code: selectedText || currentCode,
          language,
          prompt: prompt.trim(),
          context: {
            fileName,
            selectedText,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI request failed');
      }
      
      const result = await response.json();
      const suggestion = result.data;
      
      setSuggestions(prev => [suggestion, ...prev.slice(0, 4)]); // Keep last 5 suggestions
      onSuggestion(suggestion.content, suggestion.type);
      
      toast({
        title: "AI Suggestion Generated",
        description: "The AI has provided a suggestion for your code.",
      });
      
      setPrompt('');
      
    } catch (error) {
      console.error('AI request error:', error);
      toast({
        title: "AI Request Failed",
        description: error instanceof Error ? error.message : "Failed to get AI suggestion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (actionId: string) => {
    if (!selectedText && !currentCode) {
      toast({
        title: "No Code Selected",
        description: "Please select some code or ensure there's code in the editor.",
        variant: "destructive",
      });
      return;
    }

    setSelectedAction(actionId);
    
    let quickPrompt = '';
    switch (actionId) {
      case 'explanation':
        quickPrompt = 'Explain what this code does';
        break;
      case 'refactor':
        quickPrompt = 'Refactor this code to improve readability and performance';
        break;
      case 'debug':
        quickPrompt = 'Find potential bugs and suggest fixes';
        break;
      case 'completion':
        quickPrompt = 'Complete this code';
        break;
      default:
        return;
    }
    
    setPrompt(quickPrompt);
    
    // Auto-submit for quick actions
    setTimeout(() => {
      const form = document.querySelector('#ai-prompt-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-slate-800 border-slate-700 shadow-2xl z-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">AI Assistant</span>
            {selectedText && (
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                {selectedText.length} chars selected
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {AI_ACTIONS.map((action) => (
            <Button
              key={action.id}
              variant={selectedAction === action.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickAction(action.id)}
              className={`${
                selectedAction === action.id 
                  ? `${action.color} text-white` 
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
              disabled={isLoading}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Prompt Input */}
        <form id="ai-prompt-form" onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to help with your code..."
            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Recent Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <span className="text-sm text-slate-400">Recent suggestions:</span>
            {suggestions.slice(0, 2).map((suggestion, index) => (
              <div
                key={index}
                className="p-2 bg-slate-700 rounded cursor-pointer hover:bg-slate-600 transition-colors"
                onClick={() => onSuggestion(suggestion.content, suggestion.type)}
              >
                <div className="text-xs text-slate-400 mb-1">
                  {suggestion.type === 'explanation' ? 'Explanation' : 'Code'}
                </div>
                <div className="text-sm text-slate-300 truncate">
                  {suggestion.content.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}