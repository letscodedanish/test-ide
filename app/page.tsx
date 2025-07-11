'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Code, Users, Zap, Shield, Cloud, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const stacks = [
  { name: 'React', icon: '⚛️', description: 'Build modern UIs with React', color: 'bg-blue-500' },
  { name: 'Node.js', icon: '🟢', description: 'Server-side JavaScript', color: 'bg-green-500' },
  { name: 'Python', icon: '🐍', description: 'Data science & web development', color: 'bg-yellow-500' },
  { name: 'Next.js', icon: '▲', description: 'Full-stack React framework', color: 'bg-black' },
  { name: 'Vue.js', icon: '🟢', description: 'Progressive JavaScript framework', color: 'bg-green-600' },
  { name: 'Express', icon: '🚀', description: 'Fast Node.js web framework', color: 'bg-gray-600' },
];

const features = [
  {
    icon: <Code className="h-6 w-6" />,
    title: 'Monaco Editor',
    description: 'VS Code-powered editor with IntelliSense, syntax highlighting, and auto-completion'
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Real-time Collaboration',
    description: 'Work together with your team in real-time using operational transformation'
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Instant Preview',
    description: 'See your changes immediately with live preview and port mapping'
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Secure Isolation',
    description: 'Each playground runs in an isolated Docker container for security'
  },
  {
    icon: <Cloud className="h-6 w-6" />,
    title: 'Cloud Native',
    description: 'Built for scale with Kubernetes and Google Cloud Platform'
  }
];

export default function HomePage() {
  const [recentPlaygrounds, setRecentPlaygrounds] = useState([]);

  useEffect(() => {
    // Fetch recent playgrounds from API
    fetch('/api/playgrounds/recent')
      .then(res => res.json())
      .then(data => setRecentPlaygrounds(data))
      .catch(err => console.error('Failed to fetch recent playgrounds:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Code className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">CodePlayground</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Sign Up
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Code in the
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {' '}Cloud
            </span>
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Build, collaborate, and deploy your projects in isolated cloud environments. 
            No setup required—just code, preview, and share.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/playground/new">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-5 w-5" />
                Create Playground
              </Button>
            </Link>
            <Link href="/explore">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                Explore Templates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Start Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {stacks.map((stack, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg ${stack.color} flex items-center justify-center text-white font-bold`}>
                      {stack.icon}
                    </div>
                    <CardTitle className="text-white">{stack.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                    Template
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400">
                  {stack.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white text-center mb-12">
            Everything you need to code
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-400">
                    {feature.icon}
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Playgrounds */}
        {recentPlaygrounds.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Recent Playgrounds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentPlaygrounds.map((playground: any) => (
                <Card key={playground.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-white">{playground.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {playground.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                        {playground.language}
                      </Badge>
                      <Link href={`/playground/${playground.id}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}