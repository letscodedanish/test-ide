import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // In a real implementation, this would proxy to the actual container
    // For now, we'll simulate the container's localhost:3000
    const containerUrl = `http://localhost:3000`; // This would be the container's URL
    
    try {
      // Try to fetch from the container (this would work in a real container environment)
      const response = await fetch(containerUrl, {
        headers: {
          'User-Agent': 'Playground-Preview'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    } catch (error) {
      console.log('Container not responding, showing placeholder');
    }
    
    // If container is not responding, show a placeholder
    const placeholderHtml = `
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
        }
        .status {
            font-size: 24px;
            margin-bottom: 20px;
            color: #333;
        }
        .message {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
            line-height: 1.5;
        }
        .command {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 12px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            color: #495057;
            margin-bottom: 20px;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007bff;
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
        .refresh-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }
        .refresh-btn:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <div class="status">🚀 Starting Development Server</div>
        <div class="message">
            Your application is starting up. Run the following command in the terminal to start the server:
        </div>
        <div class="command">npm run dev</div>
        <div class="message">
            Once the server is running, refresh this preview to see your application.
        </div>
        <button class="refresh-btn" onclick="location.reload()">
            Refresh Preview
        </button>
    </div>
    
    <script>
        // Auto-refresh every 5 seconds to check if the server is ready
        let refreshCount = 0;
        const maxRefreshes = 12; // Stop after 1 minute
        
        function autoRefresh() {
            if (refreshCount < maxRefreshes) {
                refreshCount++;
                setTimeout(() => {
                    location.reload();
                }, 5000);
            }
        }
        
        autoRefresh();
    </script>
</body>
</html>`;
    
    return new NextResponse(placeholderHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Error generating preview:', error);
    return new NextResponse(
      '<html><body><h1>Preview Error</h1><p>Failed to generate preview</p></body></html>',
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
} 