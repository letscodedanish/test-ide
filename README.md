# Code Playground - Cloud-Native Development Environment

A full-stack web application that provides cloud-based, isolated development environments for multiple programming languages and frameworks. Built with Next.js, TypeScript, and designed for deployment on Google Cloud Platform (GCP).

## 🚀 Features

- **Multi-Language Support**: React, Node.js, Python, Next.js, and more
- **Real-time Collaboration**: Multiple users can edit the same playground simultaneously
- **Isolated Environments**: Each playground runs in a secure, containerized environment
- **Live Preview**: Instant preview of web applications with port forwarding
- **File Management**: Full file explorer with create, edit, and delete capabilities
- **Monaco Editor**: VS Code-powered editor with syntax highlighting and IntelliSense
- **Terminal Access**: Integrated terminal for running commands
- **Cloud-Native**: Designed for scalability and deployment on Kubernetes

## 🤖 AI-Powered Features

- **Code Completion**: AI-powered code suggestions and completions
- **Inline Suggestions**: Real-time code suggestions as you type (ghost text)
- **Code Explanation**: Get explanations for selected code blocks
- **Code Refactoring**: AI-assisted code improvements and refactoring
- **Bug Detection**: AI-powered bug finding and fixing suggestions
- **Multi-turn Chat**: Interactive AI assistant for coding help
- **Context-Aware**: AI understands your project context and file structure

## 🏗️ Architecture

### Frontend
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Monaco Editor** for code editing

### Backend
- **Next.js API Routes** for REST endpoints
- **WebSocket** support for real-time features
- **JWT Authentication** with HTTP-only cookies
- **Docker** containers for playground isolation

### Infrastructure
- **Google Kubernetes Engine (GKE)** for container orchestration
- **Cloud SQL (PostgreSQL)** for data persistence
- **Memorystore (Redis)** for sessions and caching
- **Container Registry** for Docker image storage

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google Cloud SDK (`gcloud`)
- `kubectl` CLI tool
- A Google Cloud Platform account with billing enabled

## 🛠️ Local Development Setup

### 1. Clone and Install Dependencies

\`\`\`bash
git clone <repository-url>
cd code-playground
npm install
\`\`\`

### 2. Environment Configuration

\`\`\`bash
# Copy the example environment file
cp .env.example .env.local

# Update the environment variables in .env.local
\`\`\`

Required environment variables:
\`\`\`bash
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret
DATABASE_URL=postgresql://playground:password@localhost:5432/playgrounds
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-api-key
\`\`\`

### 3. Start with Docker Compose

\`\`\`bash
# Start all services (app, database, redis)
docker-compose up -d

# View logs
docker-compose logs -f app
\`\`\`

### 4. Alternative: Local Development

\`\`\`bash
# Start PostgreSQL and Redis manually or via Docker
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start the development server
npm run dev
\`\`\`

Visit `http://localhost:3000` to see the application.

## ☁️ Google Cloud Platform Setup

### 1. Initial GCP Configuration

\`\`\`bash
# Set your project ID
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Run the GCP setup script
chmod +x scripts/setup-gcp.sh
./scripts/setup-gcp.sh
\`\`\`

This script will:
- Enable required Google Cloud APIs
- Create a GKE cluster
- Set up Cloud SQL (PostgreSQL) instance
- Create Redis instance
- Configure IAM service accounts
- Create static IP address

### 2. Configure Secrets

Update the Kubernetes secrets with your actual values:

\`\`\`bash
# Base64 encode your secrets
echo -n "your-jwt-secret" | base64
echo -n "your-db-password" | base64

# Update k8s/secret.yaml with the encoded values
\`\`\`

### 3. Deploy to GKE

\`\`\`bash
# Make the deploy script executable
chmod +x scripts/deploy-gke.sh

# Deploy the application
./scripts/deploy-gke.sh
\`\`\`

## 🏢 Production Deployment

### Environment Variables

For production deployment, ensure these environment variables are properly configured:

\`\`\`bash
# Production settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://playground.yourdomain.com

# Database (Cloud SQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (Memorystore)
REDIS_URL=redis://redis-host:6379

# Authentication
JWT_SECRET=your-super-secure-production-jwt-secret

# GCP Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# AI Integration
OPENAI_API_KEY=your-openai-api-key
AI_MODEL=gpt-4-turbo-preview
AI_RATE_LIMIT_PER_MINUTE=20
\`\`\`

### SSL and Domain Configuration

1. **Configure DNS**: Point your domain to the static IP created during setup
2. **Update SSL Certificate**: Modify `k8s/ingress.yaml` with your domain
3. **Apply Changes**: Run `kubectl apply -f k8s/ingress.yaml`

### Monitoring and Scaling

\`\`\`bash
# View application status
kubectl get pods -n code-playground

# Scale the application
kubectl scale deployment playground-app --replicas=5 -n code-playground

# View logs
kubectl logs deployment/playground-app -n code-playground

# Monitor resource usage
kubectl top pods -n code-playground
\`\`\`

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Playgrounds
- `GET /api/playgrounds` - List all playgrounds
- `POST /api/playgrounds` - Create new playground
- `GET /api/playgrounds/[id]` - Get playground details
- `PUT /api/playgrounds/[id]` - Update playground
- `DELETE /api/playgrounds/[id]` - Delete playground

### Playground Operations
- `POST /api/playgrounds/[id]/run` - Start playground container
- `POST /api/playgrounds/[id]/stop` - Stop playground container
- `PUT /api/playgrounds/[id]/files/[fileId]` - Save file content

### AI Features
- `POST /api/ai/completion` - Generate code completions and suggestions
- `POST /api/ai/inline` - Get inline code suggestions
- `POST /api/ai/explain` - Explain selected code

### WebSocket
- `WS /api/ws/[id]` - Real-time collaboration and terminal

## 🛡️ Security Features

- **Container Isolation**: Each playground runs in a separate container
- **Resource Limits**: CPU and memory limits for each container
- **Network Policies**: Restricted network access between containers
- **JWT Authentication**: Secure user authentication with HTTP-only cookies
- **HTTPS/TLS**: SSL encryption for all communications
- **Input Validation**: Server-side validation for all API inputs

## 🤖 AI Integration

### Setup
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add the API key to your environment variables
3. Configure rate limits and model settings

### Features
- **Keyboard Shortcuts**: Press `Ctrl+K` (or `Cmd+K`) to open AI prompt
- **Context Menu**: Right-click in editor for AI actions
- **Inline Suggestions**: AI suggestions appear as you type
- **Quick Actions**: One-click code explanation, refactoring, and debugging

### Rate Limiting
- 20 AI requests per minute per user
- 10 inline suggestions per 10 seconds
- Configurable limits in environment variables

## 📊 Monitoring and Logging

### Application Monitoring
- Health check endpoint: `/api/health`
- Kubernetes liveness and readiness probes
- Resource usage monitoring via Kubernetes metrics

### Logging
- Structured logging with different levels (debug, info, warn, error)
- Centralized logging via Google Cloud Logging
- Request/response logging for API endpoints

### Alerting
Configure alerts for:
- High CPU/memory usage
- Container restart loops
- Database connection issues
- API error rates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Container fails to start:**
\`\`\`bash
# Check logs
kubectl logs deployment/playground-app -n code-playground

# Check resource usage
kubectl describe pod <pod-name> -n code-playground
\`\`\`

**Database connection issues:**
\`\`\`bash
# Test database connectivity
kubectl exec -it deployment/playground-app -n code-playground -- sh
# Inside container: pg_isready -h postgres-service -p 5432
\`\`\`

**WebSocket connection problems:**
- Ensure ingress is properly configured for WebSocket upgrades
- Check firewall rules for WebSocket ports (1337, 1338)
- Verify CORS settings in production

**AI features not working:**
- Verify OpenAI API key is correctly set
- Check rate limiting settings
- Ensure user is authenticated
- Check browser console for JavaScript errors

### Performance Optimization

1. **Database**: Enable connection pooling, add indexes for frequent queries
2. **Redis**: Configure appropriate memory limits and eviction policies
3. **Containers**: Optimize Docker images, use multi-stage builds
4. **Kubernetes**: Configure horizontal pod autoscaling (HPA)

## 📞 Support

For support and questions:
- Create an issue in this repository
- Check the [documentation](docs/)
- Review existing issues and discussions

---

Built with ❤️ using Next.js, TypeScript, and Google Cloud Platform