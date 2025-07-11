# R2 Integration - Boilerplate Code System

## Overview

This document describes the R2 integration system that fetches boilerplate code from Cloudflare R2 storage and loads it into playground containers.

## Architecture

### 1. Template Storage in R2

- **Bucket**: `repl`
- **Path Structure**: `repl/base/{language}/`
- **Examples**:
  - `repl/base/react-js/` - React boilerplate
  - `repl/base/node-js/` - Node.js boilerplate
  - `repl/base/python/` - Python boilerplate
  - `repl/base/next-js/` - Next.js boilerplate
  - `repl/base/cpp/` - C++ boilerplate
  - `repl/base/rust/` - Rust boilerplate

### 2. Flow Architecture

```
User Selection → Template Fetch → Container Creation → Boilerplate Download → Ready Container
```

**Step-by-Step Process**:
1. User selects a template from the UI
2. Frontend fetches template metadata from `/api/templates`
3. User creates playground, triggering container creation
4. Init container downloads boilerplate from R2
5. Main container starts with boilerplate code ready
6. Terminal operates inside the container with actual file system

## Components

### R2Service (`lib/r2-service.ts`)

**Key Methods**:
- `getAvailableTemplates()` - Lists all available templates
- `getBoilerplateFiles(templateId)` - Fetches files for a template
- `getBoilerplateTemplate(templateId)` - Gets template with metadata
- `generateBoilerplateInitScript(templateId)` - Creates init script for container

**Features**:
- S3-compatible API for Cloudflare R2
- Automatic dependency installation (npm, pip, cargo)
- Proper permissions setup (1001:1001)
- Error handling and fallbacks

### Templates API (`app/api/templates/route.ts`)

**Endpoints**:
- `GET /api/templates` - List all templates
- `GET /api/templates?templateId=react-js` - Get specific template

**Response Format**:
```json
{
  "id": "react-js",
  "name": "React",
  "description": "Modern React application with Vite",
  "language": "javascript",
  "icon": "⚛️",
  "fileCount": 4
}
```

### Container Integration

**Init Container**:
- Uses `amazon/aws-cli:2.13.0` image
- Downloads boilerplate using AWS CLI
- Sets up workspace at `/workspace`
- Installs dependencies automatically

**Main Container**:
- Starts with boilerplate ready
- Working directory: `/workspace`
- Runs as user 1001 for security
- Shared volume with init container

## Configuration

### R2 Credentials

```javascript
const R2_ENDPOINT = 'https://ad08bde786909448bfaac2692349abd4.r2.cloudflarestorage.com';
const R2_ACCESS_KEY_ID = '8d94442465c24b84c7c205bac45af892';
const R2_SECRET_ACCESS_KEY = 'ef4d0d25e924a0954f1b38e3e004b97f9455c61792e164a24d8ae7810e5a51c6';
const R2_TOKEN = 'g6ESvjJCZ96ZDZFF9pvUjFDGydAb_cI4ypcG12pz';
```

### Container Pod Specification

```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
    - name: boilerplate-init
      image: amazon/aws-cli:2.13.0
      command: ['/bin/sh', '-c']
      args: ['<init-script>']
      volumeMounts:
        - name: workspace
          mountPath: /workspace
  containers:
    - name: playground
      image: <language-image>
      workingDir: /workspace
      volumeMounts:
        - name: workspace
          mountPath: /workspace
  volumes:
    - name: workspace
      emptyDir: {}
```

## Supported Languages

| Language | Template ID | Image | Default Port |
|----------|-------------|-------|--------------|
| React | `react-js` | `node:18-alpine` | 3000 |
| Node.js | `node-js` | `node:18-alpine` | 3000 |
| Python | `python` | `python:3.11-alpine` | 5000 |
| Next.js | `next-js` | `node:18-alpine` | 3000 |
| C++ | `cpp` | `gcc:latest` | 8080 |
| Rust | `rust` | `rust:1.70-alpine` | 8080 |

## Template Structure

Each template in R2 should follow this structure:

```
repl/base/{template-id}/
├── src/
│   ├── main.js
│   └── App.jsx
├── package.json
├── index.html
├── README.md
└── .gitignore
```

## Automatic Dependency Installation

The init script automatically detects and installs dependencies:

- **package.json** → `npm install`
- **requirements.txt** → `pip install -r requirements.txt`
- **Cargo.toml** → `cargo fetch`

## Terminal Integration

The terminal now operates inside the actual container:

- **Working Directory**: `/workspace`
- **User**: `playground@container:/workspace$`
- **Commands**: Real commands executed in container environment
- **File System**: Actual boilerplate files from R2

## Error Handling

### Fallback Templates

If R2 is unavailable, the system falls back to minimal hardcoded templates:

```javascript
const fallbackTemplates = [
  {
    id: 'react-js',
    name: 'React',
    description: 'Create React apps with Vite',
    // ...
  }
];
```

### Init Container Failures

If the init container fails:
1. Pod creation fails gracefully
2. Error message returned to user
3. Cleanup initiated automatically

## Security

- **Container User**: 1001 (non-root)
- **Resource Limits**: 1Gi memory, 500m CPU
- **Network**: Restricted container network
- **Credentials**: Stored in environment variables
- **Timeouts**: 1 hour pod timeout

## Performance

- **Template Loading**: Cached for 5 minutes
- **Boilerplate Download**: Parallel file fetching
- **Container Startup**: ~30-60 seconds including dependency installation
- **File System**: Shared volume for optimal performance

## Development

### Adding New Templates

1. Create template directory in R2: `repl/base/{template-id}/`
2. Upload boilerplate files
3. Update metadata in `R2Service.getTemplateMetadata()`
4. Test template creation and container startup

### Testing

```bash
# Test template loading
curl http://localhost:3000/api/templates

# Test specific template
curl http://localhost:3000/api/templates?templateId=react-js

# Test playground creation
curl -X POST http://localhost:3000/api/playgrounds \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","template":"react-js","language":"javascript"}'
```

## Monitoring

### Logs to Monitor

- Init container logs: `kubectl logs <pod-name> -c boilerplate-init`
- Main container logs: `kubectl logs <pod-name> -c playground`
- R2 API calls: Check application logs for R2Service operations

### Common Issues

1. **R2 Connection Failed**: Check credentials and network
2. **Template Not Found**: Verify template exists in R2
3. **Dependency Installation Failed**: Check package.json/requirements.txt
4. **Container Startup Timeout**: Increase resource limits

## Future Enhancements

- Template versioning
- User-uploadable templates
- Template validation
- Advanced dependency caching
- Multi-language project support
- Real-time collaboration on files 