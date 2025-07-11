import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Use the same global storage as the [id] route
let globalPlaygroundStorage: Map<string, any>;

// Initialize global storage if it doesn't exist
if (typeof globalThis !== 'undefined') {
  if (!globalThis.playgroundStorage) {
    globalThis.playgroundStorage = new Map();
  }
  globalPlaygroundStorage = globalThis.playgroundStorage;
} else {
  globalPlaygroundStorage = new Map();
}

// In-memory array for listing (separate from the main storage)
const playgroundsArray: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Return recent playgrounds from the global storage
    const allPlaygrounds = Array.from(globalPlaygroundStorage.values());
    const recentPlaygrounds = allPlaygrounds
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    
    return NextResponse.json(recentPlaygrounds);
  } catch (error) {
    console.error('Error fetching playgrounds:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch playgrounds',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, language, template, files } = body;

    if (!name || !language) {
      return NextResponse.json(
        { error: 'Name and language are required' },
        { status: 400 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Template is required' },
        { status: 400 }
      );
    }

    const playground = {
      id: uuidv4(),
      name,
      description: description || '',
      language,
      template: template,
      files: files || [], // Will be populated when fetched if template is provided
      isRunning: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in global storage for retrieval
    globalPlaygroundStorage.set(playground.id, playground);
    
    // Also add to array for listing
    playgroundsArray.push(playground);
    
    console.log(`Created playground ${playground.id} with template: ${playground.template}`);

    return NextResponse.json(playground, { status: 201 });
  } catch (error) {
    console.error('Error creating playground:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getFileLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
    'sh': 'shell'
  };

  return languageMap[ext || ''] || 'plaintext';
}