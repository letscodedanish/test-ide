import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// In-memory storage for demo
let playgrounds: any[] = [
  {
    id: '1',
    name: 'React Todo App',
    description: 'A simple todo application built with React',
    language: 'React',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: '2',
    name: 'Node.js API',
    description: 'REST API with Express and MongoDB',
    language: 'Node.js',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    id: '3',
    name: 'Python Data Analysis',
    description: 'Data visualization with Pandas and Matplotlib',
    language: 'Python',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  }
];

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const limit = parseInt(searchParams.get('limit') || '6');
    
    const recentPlaygrounds = playgrounds
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    
    return NextResponse.json(recentPlaygrounds);
  } catch (error) {
    console.error('Error fetching recent playgrounds:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch recent playgrounds',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}