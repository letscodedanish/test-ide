import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@/lib/docker-service';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

const dockerService = DockerService.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const container = await dockerService.getContainer(id);
    
    if (!container || container.status !== 'running') {
      return new NextResponse(
        generatePlaceholderHTML('Container not running', 'Please start the container first'),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }
      );
    }

    // Get the mapped port for the container's port 3000
    const port = container.ports['3000'];
    if (!port) {
      return new NextResponse(
        generatePlaceholderHTML('No application running', 'Start your development server with: npm run dev'),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }
      );
    }

    // Proxy the request to the container's application
    const containerUrl = `http://localhost:${port}`;
    
    try {
      const response = await fetch(containerUrl, {
        headers: {
          'User-Agent': 'Playground-Preview',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const html = await response.text();
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Frame-Options': 'SAMEORIGIN'
          }
        });
      }
    } catch (error) {
      console.log(`Container app not responding on port ${port}`);
    }
    
    // If the app is not responding, show instructions
    return new NextResponse(
      generatePlaceholderHTML(
        'Development server not started',
        'Run the following command in the terminal to start your application:',
        getStartCommand(container.name)
      ),
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function generatePlaceholderHTML(title: string, message: string, command?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playground Preview</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 28px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        .message {
            font-size: 16px;
            margin-bottom: 24px;
            opacity: 0.9;
            line-height: 1.5;
        }
        .command {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 16px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            color: #00ff88;
            margin-bottom: 20px;
            word-break: break-all;
        }
        .refresh-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .refresh-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🚀</div>
        <div class="title">${title}</div>
        <div class="message">${message}</div>
        ${command ? `<div class="command">${command}</div>` : ''}
        <button class="refresh-btn" onclick="location.reload()">
            Refresh Preview
        </button>
    </div>
    
    <script>
        // Auto-refresh every 10 seconds to check if the server is ready
        let refreshCount = 0;
        const maxRefreshes = 30; // Stop after 5 minutes
        
        function autoRefresh() {
            if (refreshCount < maxRefreshes) {
                refreshCount++;
                setTimeout(() => {
                    location.reload();
                }, 10000);
            }
        }
        
        autoRefresh();
    </script>
</body>
</html>`;
}

function getStartCommand(containerName: string): string {
  if (containerName.includes('react') || containerName.includes('next')) {
    return 'npm run dev';
  } else if (containerName.includes('python')) {
    return 'python app.py';
  } else if (containerName.includes('node')) {
    return 'npm start';
  } else {
    return 'npm run dev';
  }
}