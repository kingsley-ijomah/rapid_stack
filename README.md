# Rapid Stack

A modern full-stack development toolkit for rapid application development.

## Installation

```bash
npm install -g rapid-stack
```

## Usage

### Initialize a new project
```bash
rapid init
```

### Build Commands
```bash
# Build backend infrastructure
rapid build:backend

# Build frontend infrastructure
rapid build:frontend

# Build devops infrastructure
rapid build:devops

# Build nginx configuration
rapid build:nginx

# Build terraform infrastructure
rapid build:terraform

# Build development lifecycle
rapid build:lifecycle

# Build fullstack application
rapid build:fullstack
```

### Schema Commands
```bash
# Create backend schema
rapid schema:create

# Run backend schema
rapid schema:run

# Remove backend schema
rapid schema:rm
```

### Frontend Commands
```bash
# Add frontend platform
rapid frontend:platform

# Add CRUD operations
rapid frontend:crud

# Add authentication
rapid frontend:auth

# Add event handling
rapid frontend:event

# Add list actions
rapid frontend:list

# Add home page
rapid frontend:home

# Add company page
rapid frontend:company
```

### Backend Commands
```bash
# Add GraphQL support
rapid backend:graphql

# Add authentication
rapid backend:auth
```

## Options

- `--yes` or `-y`: Automatically answer "yes" to all prompts
- `--auth-only`: Only add authentication

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following the commit message conventions below
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Conventions

When contributing to RapidStack, follow these commit message conventions to ensure proper changelog generation:

```bash
# Format: <type>: <description>

# Examples of git commit commands:
git commit -m "feat: Add new GraphQL mutation for user creation"
git commit -m "fix: Resolve authentication token expiration issue"
git commit -m "change: Update Docker configuration for better performance"
git commit -m "remove: Remove deprecated API endpoint"
```

The commit message types and their corresponding changelog sections:

- `feat:` - New features (Added section)
- `fix:` - Bug fixes (Fixed section)
- `change:` - Changes and improvements (Changed section)
- `remove:` - Removed features (Removed section)

## License

MIT