'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export function useErrorHandler() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: unknown) => {
    console.error('Error:', error);
    
    let message = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = (error as ApiError).message;
    }

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: unknown) => void;
    }
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      
      if (options?.loadingMessage) {
        toast({
          title: "Loading",
          description: options.loadingMessage,
        });
      }

      const result = await asyncFn();
      
      if (options?.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }
      
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      options?.onError?.(error);
      handleError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, toast]);

  return {
    handleError,
    executeAsync,
    isLoading,
  };
}