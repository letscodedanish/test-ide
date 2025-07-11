'use client';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIPromptBar } from '@/components/ai/ai-prompt-bar';
import { AISuggestionOverlay } from '@/components/ai/ai-suggestion-overlay';
import { useAISuggestions } from '@/hooks/use-ai-suggestions';
import { 
  Play, 
  Square, 
  Save, 
  Share, 
  Users, 
  Settings, 
  Terminal,
  Eye,
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileItem[];
  expanded?: boolean;
}

interface PlaygroundData {
  id: string;
  name: string;
  description: string;
  language: string;
  files: FileItem[];
  isRunning: boolean;
  previewUrl?: string;
}

export default function PlaygroundPage() {
  const params = useParams();
  const { toast } = useToast();
  const editorRef = useRef<any>(null);
  
  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Connecting to container terminal...',
    'Please wait while we establish connection...'
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [aiSuggestion, setAISuggestion] = useState<{
    content: string;
    type: 'code' | 'explanation';
    position?: { top: number; left: number };
  } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showAISidebar, setShowAISidebar] = useState(false);
  
  const {
    isLoading: aiLoading,
    inlineSuggestion,
    getInlineSuggestion,
    clearInlineSuggestion,
    acceptInlineSuggestion,
    explainCode,
  } = useAISuggestions();

  useEffect(() => {
    if (params.id) {
      fetchPlayground(params.id as string);
      startTerminalConnection(params.id as string);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [params.id]);

  const fetchPlayground = async (id: string) => {
    try {
      const response = await fetch(`/api/playgrounds/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Playground ${id} not found, showing error`);
          toast({
            title: "Playground Not Found",
            description: "The playground you're looking for doesn't exist or has been deleted.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Fetched playground ${id}:`, data);
      setPlayground(data);
      
      // Set the first file as active
      if (data.files && data.files.length > 0) {
        const firstFile = findFirstFile(data.files);
        if (firstFile) {
          setActiveFile(firstFile);
        }
      }
    } catch (error) {
      console.error('Failed to fetch playground:', error);
      toast({
        title: "Error",
        description: "Failed to load playground",
        variant: "destructive",
      });
    }
  };

  const findFirstFile = (files: FileItem[]): FileItem | null => {
    for (const file of files) {
      if (file.type === 'file') {
        return file;
      } else if (file.children) {
        const found = findFirstFile(file.children);
        if (found) return found;
      }
    }
    return null;
  };

  const startTerminalConnection = (playgroundId: string) => {
    console.log('Starting terminal connection for playground:', playgroundId);
    
    // Create terminal session
    initializeTerminal(playgroundId);
  };

  const initializeTerminal = async (playgroundId: string) => {
    try {
      const response = await fetch(`/api/terminal/${playgroundId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Terminal session initialized:', data);
        setIsTerminalReady(data.isActive);
        setTerminalOutput(['Terminal connected to container', 'Type commands to interact with your playground environment', '']);
        
        if (terminalInputRef.current) {
          terminalInputRef.current.focus();
        }
      } else {
        setTerminalOutput(['Failed to connect to terminal', 'Please try starting the container first']);
      }
    } catch (error) {
      console.error('Error initializing terminal:', error);
      setTerminalOutput(['Terminal connection failed', 'Please check if the container is running']);
    }
  };

  const executeTerminalCommand = async (command: string) => {
    if (!params.id) return;
    
    // Add command to output immediately for better UX
    setTerminalOutput(prev => [...prev, `$ ${command}`, 'Executing...']);
    
    try {
      const response = await fetch(`/api/terminal/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'execute',
          command: command
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setTerminalOutput(prev => {
          const newOutput = [...prev];
          // Remove the "Executing..." line
          newOutput.pop();
          // Add the actual output
          if (result.output) {
            newOutput.push(result.output);
          }
          return newOutput;
        });
      } else {
        setTerminalOutput(prev => {
          const newOutput = [...prev];
          newOutput.pop(); // Remove "Executing..."
          newOutput.push('Command execution failed');
          return newOutput;
        });
      }
    } catch (error) {
      console.error('Error sending terminal input:', error);
      setTerminalOutput(prev => {
        const newOutput = [...prev];
        newOutput.pop(); // Remove "Executing..."
        newOutput.push('Network error executing command');
        return newOutput;
      });
    }
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      // Update local state
      setActiveFile(prev => prev ? { ...prev, content: value } : null);
      
      // Clear AI suggestions when content changes
      clearInlineSuggestion();
      
      // Note: For collaborative editing, you would send changes via WebSocket here
      // but for this demo, we'll just update locally
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Add AI-related event listeners
    editor.onDidChangeCursorPosition((e: any) => {
      const position = e.position;
      const model = editor.getModel();
      
      if (model && activeFile) {
        const offset = model.getOffsetAt(position);
        const code = model.getValue();
        
        // Get inline suggestions with debouncing
        if (code.length > 10) {
          getInlineSuggestion(code, activeFile.language || 'javascript', offset);
        }
      }
    });
    
    // Add selection change listener
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      
      if (model && selection && !selection.isEmpty()) {
        const selectedText = model.getValueInRange(selection);
        setSelectedText(selectedText);
      } else {
        setSelectedText('');
      }
    });
    
    // Add keyboard shortcuts for AI features
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setShowAIPrompt(true);
    });
    
    // Tab to accept inline suggestions
    editor.addCommand(monaco.KeyCode.Tab, () => {
      if (inlineSuggestion) {
        const suggestion = acceptInlineSuggestion();
        if (suggestion) {
          const position = editor.getPosition();
          editor.executeEdits('ai-suggestion', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: suggestion.text
          }]);
        }
        return null; // Prevent default tab behavior
      }
    });
    
    // Context menu for AI actions
    editor.addAction({
      id: 'ai-explain',
      label: 'Explain Code',
      contextMenuGroupId: 'ai',
      contextMenuOrder: 1,
      run: async () => {
        const selection = editor.getSelection();
        const model = editor.getModel();
        
        if (model && selection && !selection.isEmpty()) {
          const selectedCode = model.getValueInRange(selection);
          const explanation = await explainCode(selectedCode, activeFile?.language || 'javascript');
          
          if (explanation) {
            setAISuggestion({
              content: explanation,
              type: 'explanation',
            });
          }
        }
      }
    });
    
    editor.addAction({
      id: 'ai-prompt',
      label: 'Ask AI',
      contextMenuGroupId: 'ai',
      contextMenuOrder: 2,
      run: () => {
        setShowAIPrompt(true);
      }
    });
  };
  
  const handleAISuggestion = (suggestion: string, type: 'code' | 'explanation') => {
    setAISuggestion({
      content: suggestion,
      type,
    });
    setShowAIPrompt(false);
  };
  
  const handleAcceptAISuggestion = () => {
    if (aiSuggestion && aiSuggestion.type === 'code' && editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      
      if (selection) {
        editor.executeEdits('ai-suggestion', [{
          range: selection,
          text: aiSuggestion.content
        }]);
      } else {
        const position = editor.getPosition();
        const model = editor.getModel();
        if (model) {
        editor.executeEdits('ai-suggestion', [{
            range: selection || model.getFullModelRange(),
          text: aiSuggestion.content
        }]);
        }
      }
    }
    setAISuggestion(null);
  };
  
  const handleRejectAISuggestion = () => {
    setAISuggestion(null);
  };
  const saveFile = async () => {
    if (!activeFile || !playground) return;
    
    try {
      await fetch(`/api/containers/${playground.id}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'write',
          filePath: activeFile.path || `/workspace/${activeFile.name}`,
          content: activeFile.content
        }),
      });
      
      toast({
        title: "Success",
        description: "File saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    }
  };

  const runPlayground = async () => {
    if (!playground) return;
    
    setIsRunning(true);
    setTerminalOutput(['Starting container...']);
    
    try {
      const response = await fetch(`/api/playgrounds/${playground.id}/run`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Set preview URL based on container ports
        if (result.container && result.container.ports && result.container.ports['3000']) {
          setPreviewUrl(`/api/containers/${playground.id}/preview`);
        }
        
        toast({
          title: "Success",
          description: "Playground started successfully",
        });
        
        // Reinitialize terminal connection
        setTimeout(() => {
          initializeTerminal(playground.id);
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run playground",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stopPlayground = async () => {
    if (!playground) return;
    
    try {
      await fetch(`/api/playgrounds/${playground.id}/stop`, {
        method: 'POST'
      });
      
      setIsRunning(false);
      setPreviewUrl('');
      
      toast({
        title: "Success",
        description: "Playground stopped",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop playground",
        variant: "destructive",
      });
    }
  };

  const handleTerminalInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = terminalInput.trim();
      if (input) {
        executeTerminalCommand(input);
        setTerminalInput('');
      }
    }
  };

  const handleTerminalClick = () => {
    // Focus on terminal input when terminal is clicked
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  };

  const clearTerminal = async () => {
    if (!params.id) return;
    
    try {
      await fetch(`/api/terminal/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear' }),
      });
      
      // Immediately fetch updated output
      fetchTerminalOutput(params.id as string);
    } catch (error) {
      console.error('Error clearing terminal:', error);
    }
  };

  const renderFileTree = (files: FileItem[]) => {
    return files.map(file => (
      <div key={file.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-700/50 rounded-md transition-colors ${
            activeFile?.id === file.id ? 'bg-slate-600 text-white' : 'text-slate-300'
          }`}
          onClick={() => {
            if (file.type === 'file') {
              setActiveFile(file);
            } else {
              // Toggle folder expansion
              const updatedFiles = toggleFolderExpansion(playground!.files, file.id);
              setPlayground(prev => prev ? { ...prev, files: updatedFiles } : null);
            }
          }}
        >
          {file.type === 'folder' ? (
            <>
              {file.expanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <Folder className="h-4 w-4 text-blue-400" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileText className="h-4 w-4 text-green-400" />
            </>
          )}
          <span className="font-medium">{file.name}</span>
        </div>
        {file.type === 'folder' && file.expanded && file.children && (
          <div className="ml-6 border-l border-slate-700/50 pl-3 mt-1">
            {renderFileTree(file.children)}
          </div>
        )}
      </div>
    ));
  };

  const toggleFolderExpansion = (files: FileItem[], folderId: string): FileItem[] => {
    return files.map(file => {
      if (file.id === folderId) {
        return { ...file, expanded: !file.expanded };
      } else if (file.children) {
        return { ...file, children: toggleFolderExpansion(file.children, folderId) };
      }
      return file;
    });
  };

  if (!playground) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading playground...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4 sticky top-0 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-white">{playground.name}</h1>
            <Badge variant="secondary" className="bg-slate-700 text-slate-300 px-3 py-1">
              {playground.language}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            {collaborators.length > 0 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded-md">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">{collaborators.length}</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={saveFile}
              disabled={!activeFile}
              className="text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-2"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-2"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAISidebar(!showAISidebar)}
              className={`px-3 py-2 transition-colors ${
                showAISidebar 
                  ? 'text-white bg-slate-700' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI
            </Button>
            
            {isRunning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopPlayground}
                className="bg-red-600 hover:bg-red-700 px-4 py-2"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={runPlayground}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 font-medium"
              >
                <Play className="h-4 w-4 mr-2" />
                Run
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Playground Area */}
        <div className="flex-1 flex p-4 gap-4">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15}>
              <div className="h-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">Files</h3>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-700">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
                <div className="p-3">
                {renderFileTree(playground.files)}
              </div>
            </div>
          </ResizablePanel>

            <ResizableHandle className="w-2 bg-slate-700 hover:bg-slate-600 transition-colors" />

          {/* Editor Area */}
          <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
              {/* File Tabs */}
              {activeFile && (
                  <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300 font-medium">{activeFile.name}</span>
                  </div>
                </div>
              )}
              
              {/* Editor */}
                <div className="flex-1 rounded-b-lg overflow-hidden">
                {activeFile ? (
                  <Editor
                    height="100%"
                    defaultLanguage={activeFile.language || 'javascript'}
                    value={activeFile.content || ''}
                    onChange={handleEditorChange}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      suggestOnTriggerCharacters: true,
                      quickSuggestions: true,
                        wordBasedSuggestions: "matchingDocuments",
                        padding: { top: 16, bottom: 16 },
                    }}
                  />
                ) : (
                  <div className="h-full bg-slate-900 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Select a file to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

            <ResizableHandle className="w-2 bg-slate-700 hover:bg-slate-600 transition-colors" />

          {/* Right Panel */}
          <ResizablePanel defaultSize={30} minSize={20}>
              <div className="h-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
              <Tabs defaultValue="preview" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-b border-slate-700 rounded-none">
                    <TabsTrigger value="preview" className="text-slate-300 hover:text-white data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                    <TabsTrigger value="terminal" className="text-slate-300 hover:text-white data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                    <Terminal className="h-4 w-4 mr-2" />
                    Terminal
                  </TabsTrigger>
                </TabsList>
                
                  <TabsContent value="preview" className="flex-1 m-0 p-0">
                    <div className="h-full bg-white rounded-b-lg overflow-hidden">
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500">
                        <div className="text-center">
                          <Eye className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                          <p className="text-slate-500">Start the container to see the preview</p>
                          <p className="text-xs text-slate-400 mt-2">Run 'npm run dev' in terminal to start your app</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                  <TabsContent value="terminal" className="flex-1 m-0 p-0">
                    <div className="h-full bg-slate-900 rounded-b-lg flex flex-col">
                      {/* Terminal Header */}
                      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                        <div className="flex items-center space-x-2">
                          <Terminal className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium text-slate-300">Terminal</span>
                          <div className={`w-2 h-2 rounded-full ${
                            isTerminalReady ? 'bg-green-400' : 'bg-gray-400'
                          }`} title={isTerminalReady ? 'Connected' : 'Connecting...'} />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearTerminal}
                          className="h-6 w-6 p-0 hover:bg-slate-700 text-slate-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Terminal Output */}
                      <div 
                        ref={terminalRef}
                        className="flex-1 p-4 font-mono text-sm overflow-y-auto cursor-text"
                        onClick={handleTerminalClick}
                      >
                    {terminalOutput.map((line, index) => (
                          <div key={index} className="text-slate-300 whitespace-pre-wrap break-words">
                        {line}
                      </div>
                    ))}
                    {terminalOutput.length === 0 && (
                      <div className="text-slate-500">Terminal output will appear here...</div>
                    )}
                      </div>
                      
                      {/* Terminal Input */}
                      <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400 text-sm font-mono">$</span>
                          <input
                            ref={terminalInputRef}
                            type="text"
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            onKeyDown={handleTerminalInput}
                            placeholder={isTerminalReady ? "Type your command..." : "Connecting to container..."}
                            disabled={!isTerminalReady}
                            className="flex-1 bg-transparent border-0 text-slate-300 font-mono text-sm focus:outline-none placeholder-slate-500"
                            autoComplete="off"
                            spellCheck="false"
                          />
                        </div>
                      </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
        {/* AI Sidebar */}
        <div className={`transition-all duration-300 ease-in-out ${
          showAISidebar ? 'w-96' : 'w-0'
        } overflow-hidden`}>
          <div className="h-full bg-slate-800 border-l border-slate-700 shadow-lg">
            <div className="h-full flex flex-col">
              {/* AI Sidebar Header */}
              <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-slate-300">AI Assistant</h3>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 hover:bg-slate-700"
                    onClick={() => setShowAISidebar(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* AI Sidebar Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* AI Prompt Section */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIPrompt(true)}
                      className="w-full justify-start bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ask AI
                    </Button>
                  </div>

                  {/* AI Suggestions */}
                  {aiSuggestion && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        AI Suggestion
                      </h4>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="text-sm text-slate-300 mb-3">
                          {aiSuggestion.content}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={handleAcceptAISuggestion}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRejectAISuggestion}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (aiSuggestion) {
                                navigator.clipboard.writeText(aiSuggestion.content);
                                toast({
                                  title: "Copied to clipboard",
                                  description: "AI suggestion copied to clipboard",
                                });
                              }
                            }}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected Text Analysis */}
                  {selectedText && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Selected Text
                      </h4>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="text-sm text-slate-300 mb-3 font-mono">
                          {selectedText.substring(0, 100)}...
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const explanation = await explainCode(selectedText, activeFile?.language || 'javascript');
                            if (explanation) {
                              setAISuggestion({
                                content: explanation,
                                type: 'explanation',
                              });
                            }
                          }}
                          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Explain Code
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Inline Suggestions */}
                  {inlineSuggestion && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Inline Suggestion
                      </h4>
                      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="text-sm text-slate-300 mb-3 font-mono">
                          {inlineSuggestion.text}
                        </div>
                        <div className="text-xs text-slate-500">
                          Press Tab in editor to accept
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Prompt Modal */}
      <AIPromptBar
        isVisible={showAIPrompt}
        onClose={() => setShowAIPrompt(false)}
        onSuggestion={handleAISuggestion}
        currentCode={activeFile?.content}
        selectedText={selectedText}
        language={activeFile?.language || 'javascript'}
        fileName={activeFile?.name}
      />
    </div>
  );
}