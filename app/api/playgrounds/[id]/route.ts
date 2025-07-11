import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { DockerService } from '@/lib/docker-service';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Create a global storage for playgrounds
let globalPlaygroundStorage: Map<string, any>;

// Initialize global storage if it doesn't exist
if (typeof globalThis !== 'undefined') {
  if (!(globalThis as any).playgroundStorage) {
    (globalThis as any).playgroundStorage = new Map();
  }
  globalPlaygroundStorage = (globalThis as any).playgroundStorage;
} else {
  globalPlaygroundStorage = new Map();
}

const dockerService = DockerService.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`Fetching playground: ${id}`);
    
    // Debug: Check what's in storage
    console.log(`Storage keys:`, Array.from(globalPlaygroundStorage.keys()));
    console.log(`Storage size:`, globalPlaygroundStorage.size);
    
    // Try to get playground from global storage
    let playground = globalPlaygroundStorage.get(id);
    
    if (!playground) {
      console.log(`Playground ${id} not found in storage`);
      return NextResponse.json(
        { error: 'Playground not found' },
        { status: 404 }
      );
    }

    console.log(`Found playground ${id} with template: ${playground.template}`);

    // If playground doesn't have files yet, create sample file structure
    // In production, files would come from the container file system
    if (!playground.files || playground.files.length === 0) {
      console.log(`Creating sample file structure for ${playground.template}`);
      
      // Try to get files from container first
      try {
        const containerFiles = await dockerService.getContainerFiles(id);
        if (containerFiles.length > 0) {
          playground.files = await Promise.all(
            containerFiles.slice(0, 20).map(async (file) => {
              if (file.type === 'file') {
                const content = await dockerService.readFile(id, file.path);
                return {
                  ...file,
                  content
                };
              }
              return file;
            })
          );
        } else {
          playground.files = createSampleFileStructure(playground.template, playground.language);
        }
      } catch (error) {
        console.log('Container not available, using sample files');
        playground.files = createSampleFileStructure(playground.template, playground.language);
      }
      
      // Update storage with sample files
      globalPlaygroundStorage.set(id, playground);
      
      console.log(`Created ${playground.files.length} sample files for playground ${id}`);
    }
    
    return NextResponse.json(playground);
  } catch (error) {
    console.error('Error fetching playground:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function createSampleFileStructure(template: string, language: string): any[] {
  // Create sample file structure based on template
  // In production, this would read from the actual container file system
  
  const baseFiles = [
    {
      id: uuidv4(),
      name: 'README.md',
      type: 'file',
      language: 'markdown',
      content: `# ${template.charAt(0).toUpperCase() + template.slice(1)} Playground\n\nThis is a ${template} project created in the playground.\n\nFiles are loaded from the container and synchronized with R2 storage.`
    }
  ];

  switch (template) {
    case 'react-js':
      return [
        ...baseFiles,
        {
          id: uuidv4(),
          name: 'package.json',
          type: 'file',
          language: 'json',
          content: JSON.stringify({
            name: 'react-playground',
            version: '1.0.0',
            dependencies: {
              'react': '^18.2.0',
              'react-dom': '^18.2.0'
            }
          }, null, 2)
        },
        {
          id: uuidv4(),
          name: 'src',
          type: 'folder',
          expanded: true,
          children: [
            {
              id: uuidv4(),
              name: 'App.jsx',
              type: 'file',
              language: 'javascript',
              content: `import React from 'react';\n\nfunction App() {\n  return (\n    <div>\n      <h1>Hello from React Playground!</h1>\n      <p>Start building your app here.</p>\n    </div>\n  );\n}\n\nexport default App;`
            },
            {
              id: uuidv4(),
              name: 'index.js',
              type: 'file',
              language: 'javascript',
              content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);`
            }
          ]
        }
      ];

    case 'node-js':
      return [
        ...baseFiles,
        {
          id: uuidv4(),
          name: 'package.json',
          type: 'file',
          language: 'json',
          content: JSON.stringify({
            name: 'node-playground',
            version: '1.0.0',
            main: 'index.js',
            dependencies: {
              'express': '^4.18.0'
            }
          }, null, 2)
        },
        {
          id: uuidv4(),
          name: 'index.js',
          type: 'file',
          language: 'javascript',
          content: `const express = require('express');\nconst app = express();\nconst port = 3000;\n\napp.get('/', (req, res) => {\n  res.send('Hello from Node.js Playground!');\n});\n\napp.listen(port, () => {\n  console.log(\`Server running at http://localhost:\${port}\`);\n});`
        }
      ];

    case 'python':
      return [
        ...baseFiles,
        {
          id: uuidv4(),
          name: 'main.py',
          type: 'file',
          language: 'python',
          content: `#!/usr/bin/env python3\n\ndef main():\n    print("Hello from Python Playground!")\n    print("Start coding here...")\n\nif __name__ == "__main__":\n    main()`
        }
      ];

    default:
      return baseFiles;
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
    'sh': 'shell',
    'toml': 'toml',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c'
  };
  return languageMap[ext || ''] || 'plaintext';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Get existing playground from storage
    let playground = globalPlaygroundStorage.get(id);
    
    if (!playground) {
      return NextResponse.json(
        { error: 'Playground not found' },
        { status: 404 }
      );
    }
    
    // Update playground with new data
    const updatedPlayground = { 
      ...playground, 
      ...body, 
      updatedAt: new Date().toISOString() 
    };
    
    // Save back to storage
    globalPlaygroundStorage.set(id, updatedPlayground);
    
    return NextResponse.json(updatedPlayground);
  } catch (error) {
    console.error('Error updating playground:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Remove from storage
    const deleted = globalPlaygroundStorage.delete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Playground not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Playground deleted successfully' });
  } catch (error) {
    console.error('Error deleting playground:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export the storage for use in other routes
export { globalPlaygroundStorage };