'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Code, Database, Globe, Terminal, Zap, Cpu, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  language: string;
  icon: string;
  tags: string[];
  fileCount: number;
}

const languageIcons = {
  javascript: Code,
  typescript: Code,
  python: Terminal,
  'next-js': Globe,
  'react-js': Globe,
  'node-js': Database,
  rust: Zap,
  cpp: Cpu,
  empty: FileText
};

// Static template definitions - no API fetching needed
const STATIC_TEMPLATES: Template[] = [
  {
    id: 'react-js',
    name: 'React',
    description: 'Modern React app with Vite and TypeScript',
    language: 'react-js',
    icon: '⚛️',
    tags: ['frontend', 'spa', 'component'],
    fileCount: 15
  },
  {
    id: 'next-js',
    name: 'Next.js',
    description: 'Full-stack React framework with SSR',
    language: 'next-js',
    icon: '▲',
    tags: ['frontend', 'fullstack', 'react', 'ssr'],
    fileCount: 15
  },
  {
    id: 'node-js',
    name: 'Node.js',
    description: 'Server-side JavaScript with Express',
    language: 'node-js',
    icon: '🟢',
    tags: ['backend', 'server', 'api'],
    fileCount: 3
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python environment with Flask',
    language: 'python',
    icon: '🐍',
    tags: ['backend', 'scripting', 'data'],
    fileCount: 1
  },
  {
    id: 'rust',
    name: 'Rust',
    description: 'Systems programming with Cargo',
    language: 'rust',
    icon: '🦀',
    tags: ['systems', 'performance', 'memory-safe'],
    fileCount: 1
  },
  {
    id: 'cpp',
    name: 'C++',
    description: 'Native C++ development environment',
    language: 'cpp',
    icon: '⚙️',
    tags: ['systems', 'performance', 'native'],
    fileCount: 1
  },
  {
    id: 'empty',
    name: 'Empty',
    description: 'Start with a blank environment',
    language: 'empty',
    icon: '📄',
    tags: ['blank', 'custom'],
    fileCount: 1
  }
];

export default function NewPlaygroundPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [playgroundName, setPlaygroundName] = useState('');
  const [playgroundDescription, setPlaygroundDescription] = useState('');

  const createPlayground = async () => {
    if (!selectedTemplate || !playgroundName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a template and enter a playground name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/playgrounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playgroundName,
          description: playgroundDescription,
          language: selectedTemplate.language,
          template: selectedTemplate.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create playground');
      }

      const playground = await response.json();
      
      toast({
        title: "Success",
        description: "Playground created successfully!",
      });
      
      // Navigate to the new playground
      router.push(`/playground/${playground.id}`);
    } catch (error) {
      console.error('Error creating playground:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create playground",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getTemplateIcon = (language: string) => {
    const IconComponent = languageIcons[language as keyof typeof languageIcons] || Code;
    return <IconComponent className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create New Playground</h1>
          <p className="text-lg text-gray-600">
            Choose a template to get started with your coding playground
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Template Selection */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Select a Template</h2>
            <div className="grid gap-4">
              {STATIC_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate?.id === template.id
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getTemplateIcon(template.language)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{template.language}</Badge>
                      <Badge variant="outline">{template.fileCount} files</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Playground Details */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Playground Details</h2>
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Set up your playground with a name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="playground-name">Playground Name</Label>
                  <Input
                    id="playground-name"
                    placeholder="My Awesome Project"
                    value={playgroundName}
                    onChange={(e) => setPlaygroundName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playground-description">Description (Optional)</Label>
                  <Textarea
                    id="playground-description"
                    placeholder="Describe what you're building..."
                    value={playgroundDescription}
                    onChange={(e) => setPlaygroundDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {selectedTemplate && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Selected Template</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-blue-100 rounded">
                        {getTemplateIcon(selectedTemplate.language)}
                      </div>
                      <span className="font-medium">{selectedTemplate.name}</span>
                    </div>
                    <p className="text-sm text-blue-700">{selectedTemplate.description}</p>
                  </div>
                )}

                <Button
                  onClick={createPlayground}
                  disabled={!selectedTemplate || !playgroundName.trim() || isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Playground...
                    </>
                  ) : (
                    'Create Playground'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}