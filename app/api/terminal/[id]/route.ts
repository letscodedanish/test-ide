import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Store terminal sessions in memory
const terminalSessions = new Map<string, {
  output: string[];
  isReady: boolean;
  lastActivity: number;
  currentDir: string;
}>();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Get or create terminal session
  let session = terminalSessions.get(id);
  if (!session) {
    session = {
      output: [
        'Welcome to the playground terminal!',
        'Container ready with template files from R2',
        'root@container:/workspace$ '
      ],
      isReady: true,
      lastActivity: Date.now(),
      currentDir: '/workspace'
    };
    terminalSessions.set(id, session);
    
    console.log(`Created new terminal session for playground: ${id}`);
  }
  
  session.lastActivity = Date.now();

  return NextResponse.json({
    output: session.output,
    isReady: session.isReady
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { input, action } = body;

    const session = terminalSessions.get(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Terminal session not found' },
        { status: 404 }
      );
    }

    if (action === 'clear') {
      session.output = ['Terminal cleared', 'root@container:/workspace$ '];
      session.lastActivity = Date.now();
      return NextResponse.json({ success: true });
    }

    if (input && session.isReady) {
      executeCommand(id, input);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling terminal input:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function executeCommand(playgroundId: string, input: string) {
  const session = terminalSessions.get(playgroundId);
  if (!session) return;

  const command = input.trim();
  
  // Echo the input
  session.output.push(command);
  
  try {
    simulateCommand(playgroundId, command);
  } catch (error) {
    console.error('Error executing command:', error);
    session.output.push(`Error: ${error.message}`);
  }
  
  session.lastActivity = Date.now();
}

function simulateCommand(playgroundId: string, command: string) {
  const session = terminalSessions.get(playgroundId);
  if (!session) return;

  // Directory structure simulation
  const fileSystem = {
    '/workspace': ['package.json', 'src/', 'index.html', 'README.md', 'node_modules/'],
    '/workspace/src': ['App.jsx', 'main.jsx', 'index.css', 'components/'],
    '/workspace/src/components': ['Button.jsx', 'Header.jsx'],
    '/workspace/node_modules': ['react/', 'react-dom/', 'vite/', '...']
  };

  // Basic command simulation
  if (command === 'ls') {
    const files = fileSystem[session.currentDir] || ['No files found'];
    session.output.push(files.join('  '));
  } else if (command === 'ls -la') {
    if (session.currentDir === '/workspace') {
      session.output.push('total 16');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 .');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 ..');
      session.output.push('-rw-r--r--  1 root root   256 Dec 20 10:00 .gitignore');
      session.output.push('-rw-r--r--  1 root root   512 Dec 20 10:00 README.md');
      session.output.push('-rw-r--r--  1 root root  1024 Dec 20 10:00 index.html');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 node_modules');
      session.output.push('-rw-r--r--  1 root root  2048 Dec 20 10:00 package.json');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 src');
    } else if (session.currentDir === '/workspace/src') {
      session.output.push('total 8');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 .');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 ..');
      session.output.push('-rw-r--r--  1 root root   512 Dec 20 10:00 App.jsx');
      session.output.push('drwxr-xr-x  1 root root  4096 Dec 20 10:00 components');
      session.output.push('-rw-r--r--  1 root root   256 Dec 20 10:00 index.css');
      session.output.push('-rw-r--r--  1 root root   128 Dec 20 10:00 main.jsx');
    } else {
      const files = fileSystem[session.currentDir] || ['No files found'];
      session.output.push(files.join('  '));
    }
  } else if (command === 'pwd') {
    session.output.push(session.currentDir);
  } else if (command === 'whoami') {
    session.output.push('root');
  } else if (command === 'ps') {
    session.output.push('  PID TTY          TIME CMD');
    session.output.push('    1 pts/0    00:00:00 bash');
    session.output.push('   42 pts/0    00:00:00 ps');
  } else if (command.startsWith('cd ')) {
    const dir = command.substring(3).trim();
    
    if (dir === '..') {
      // Go up one directory
      if (session.currentDir === '/workspace/src') {
        session.currentDir = '/workspace';
      } else if (session.currentDir === '/workspace/src/components') {
        session.currentDir = '/workspace/src';
      } else if (session.currentDir === '/workspace/node_modules') {
        session.currentDir = '/workspace';
      } else {
        // Already at root or higher
        session.currentDir = '/workspace';
      }
    } else if (dir === '~' || dir === '/') {
      session.currentDir = '/workspace';
    } else if (dir === 'src' || dir === './src') {
      if (session.currentDir === '/workspace') {
        session.currentDir = '/workspace/src';
      } else {
        session.output.push(`cd: ${dir}: No such file or directory`);
      }
    } else if (dir === 'components' || dir === './components') {
      if (session.currentDir === '/workspace/src') {
        session.currentDir = '/workspace/src/components';
      } else {
        session.output.push(`cd: ${dir}: No such file or directory`);
      }
    } else if (dir === 'node_modules' || dir === './node_modules') {
      if (session.currentDir === '/workspace') {
        session.currentDir = '/workspace/node_modules';
      } else {
        session.output.push(`cd: ${dir}: No such file or directory`);
      }
    } else {
      session.output.push(`cd: ${dir}: No such file or directory`);
    }
  } else if (command.startsWith('cat ')) {
    const file = command.substring(4);
    if (file === 'package.json') {
      session.output.push('{');
      session.output.push('  "name": "playground-app",');
      session.output.push('  "version": "1.0.0",');
      session.output.push('  "scripts": {');
      session.output.push('    "dev": "vite",');
      session.output.push('    "build": "vite build"');
      session.output.push('  },');
      session.output.push('  "dependencies": {');
      session.output.push('    "react": "^18.2.0",');
      session.output.push('    "react-dom": "^18.2.0"');
      session.output.push('  }');
      session.output.push('}');
    } else if (file === 'README.md') {
      session.output.push('# Playground App');
      session.output.push('');
      session.output.push('This is a template loaded from R2 storage.');
      session.output.push('');
      session.output.push('## Getting Started');
      session.output.push('');
      session.output.push('```bash');
      session.output.push('npm install');
      session.output.push('npm run dev');
      session.output.push('```');
    } else if (file === 'App.jsx') {
      session.output.push('import React from "react"');
      session.output.push('import "./index.css"');
      session.output.push('');
      session.output.push('function App() {');
      session.output.push('  return (');
      session.output.push('    <div className="App">');
      session.output.push('      <h1>Hello from React!</h1>');
      session.output.push('      <p>Template loaded from R2 storage</p>');
      session.output.push('    </div>');
      session.output.push('  )');
      session.output.push('}');
      session.output.push('');
      session.output.push('export default App');
    } else if (file === 'main.jsx') {
      session.output.push('import React from "react"');
      session.output.push('import ReactDOM from "react-dom/client"');
      session.output.push('import App from "./App.jsx"');
      session.output.push('');
      session.output.push('ReactDOM.createRoot(document.getElementById("root")).render(');
      session.output.push('  <React.StrictMode>');
      session.output.push('    <App />');
      session.output.push('  </React.StrictMode>,');
      session.output.push(')');
    } else {
      session.output.push(`Contents of ${file}:`);
      session.output.push('// Template file loaded from R2 storage');
      session.output.push('// Edit files in the editor to see changes');
    }
  } else if (command.startsWith('npm ')) {
    if (command.includes('install')) {
      session.output.push('npm install');
      session.output.push('Installing dependencies...');
      // Simulate delay
      setTimeout(() => {
        session.output.push('added 1000 packages in 5s');
        session.output.push(`root@container:${session.currentDir}$ `);
      }, 1000);
      return; // Don't add prompt immediately
    } else if (command.includes('start') || command.includes('dev')) {
      session.output.push('Starting development server...');
      setTimeout(() => {
        session.output.push('Server running at http://localhost:3000');
        session.output.push(`root@container:${session.currentDir}$ `);
      }, 500);
      return; // Don't add prompt immediately
    } else if (command.includes('build')) {
      session.output.push('Building for production...');
      setTimeout(() => {
        session.output.push('Build completed successfully!');
        session.output.push(`root@container:${session.currentDir}$ `);
      }, 2000);
      return;
    } else {
      session.output.push('npm command executed');
    }
  } else if (command.startsWith('python ')) {
    const file = command.substring(7);
    session.output.push(`Running Python script: ${file}`);
    session.output.push('Hello from Python!');
  } else if (command === 'python' || command === 'python3') {
    session.output.push('Python 3.9.2 (default, Feb 28 2021, 17:03:44)');
    session.output.push('[GCC 10.2.1 20210110] on linux');
    session.output.push('Type "help", "copyright", "credits" or "license" for more information.');
    session.output.push('>>> exit()');
  } else if (command === 'node') {
    session.output.push('Welcome to Node.js v18.17.0.');
    session.output.push('Type ".help" for more information.');
    session.output.push('> process.exit()');
  } else if (command.startsWith('node ')) {
    const file = command.substring(5);
    session.output.push(`Running Node.js script: ${file}`);
    session.output.push('Hello from Node.js!');
  } else if (command.startsWith('git ')) {
    const gitCmd = command.substring(4);
    if (gitCmd === 'status') {
      session.output.push('On branch main');
      session.output.push('nothing to commit, working tree clean');
    } else if (gitCmd === 'init') {
      session.output.push('Initialized empty Git repository in /workspace/.git/');
    } else {
      session.output.push('git command executed');
    }
  } else if (command === 'docker --version') {
    session.output.push('Docker version 24.0.7, build afdd53b');
  } else if (command === 'which node') {
    session.output.push('/usr/local/bin/node');
  } else if (command === 'which npm') {
    session.output.push('/usr/local/bin/npm');
  } else if (command === 'which python') {
    session.output.push('/usr/bin/python');
  } else if (command === 'env') {
    session.output.push('PATH=/usr/local/bin:/usr/bin:/bin');
    session.output.push('HOME=/root');
    session.output.push('SHELL=/bin/bash');
    session.output.push('USER=root');
    session.output.push('TERM=xterm');
  } else if (command === 'uname -a') {
    session.output.push('Linux container 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux');
  } else if (command === 'clear') {
    session.output = [];
  } else if (command === '') {
    // Empty command, just show prompt
  } else {
    session.output.push(`bash: ${command}: command not found`);
  }
  
  // Always show prompt after command with current directory
  session.output.push(`root@container:${session.currentDir}$ `);
} 