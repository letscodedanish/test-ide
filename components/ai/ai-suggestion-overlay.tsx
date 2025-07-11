'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Copy, Sparkles } from 'lucide-react';

interface AISuggestionOverlayProps {
  suggestion: string;
  type: 'code' | 'explanation';
  isVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCopy?: () => void;
  position?: { top: number; left: number };
}

export function AISuggestionOverlay({
  suggestion,
  type,
  isVisible,
  onAccept,
  onReject,
  onCopy,
  position,
}: AISuggestionOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    onCopy?.();
  };

  return (
    <Card 
      className={`fixed z-50 bg-slate-800 border-slate-700 shadow-2xl max-w-md transition-all duration-300 ${
        isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}
      style={{
        top: position?.top || '50%',
        left: position?.left || '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)',
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">
              AI {type === 'explanation' ? 'Explanation' : 'Suggestion'}
            </span>
          </div>
          <div className="flex space-x-1">
            {onCopy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onReject}
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="mb-4">
          {type === 'code' ? (
            <pre className="text-sm text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto">
              <code>{suggestion}</code>
            </pre>
          ) : (
            <div className="text-sm text-slate-300 leading-relaxed">
              {suggestion}
            </div>
          )}
        </div>

        {type === 'code' && (
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}