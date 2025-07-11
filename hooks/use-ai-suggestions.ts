'use client';

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface InlineSuggestion {
  text: string;
  position: number;
  timestamp: number;
}

export function useAISuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [inlineSuggestion, setInlineSuggestion] = useState<InlineSuggestion | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const getInlineSuggestion = useCallback(async (
    code: string,
    language: string,
    cursorPosition: number
  ) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the request
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/ai/inline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            language,
            cursorPosition,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get inline suggestion');
        }

        const result = await response.json();
        
        if (result.suggestion && result.suggestion.trim()) {
          setInlineSuggestion({
            text: result.suggestion,
            position: cursorPosition,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Inline suggestion error:', error);
        // Don't show toast for inline suggestion errors to avoid spam
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce
  }, []);

  const clearInlineSuggestion = useCallback(() => {
    setInlineSuggestion(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  const acceptInlineSuggestion = useCallback(() => {
    const suggestion = inlineSuggestion;
    setInlineSuggestion(null);
    return suggestion;
  }, [inlineSuggestion]);

  const explainCode = useCallback(async (code: string, language: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to explain code');
      }

      const result = await response.json();
      return result.explanation;
    } catch (error) {
      console.error('Code explanation error:', error);
      toast({
        title: "Explanation Failed",
        description: error instanceof Error ? error.message : "Failed to explain code",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    inlineSuggestion,
    getInlineSuggestion,
    clearInlineSuggestion,
    acceptInlineSuggestion,
    explainCode,
  };
}