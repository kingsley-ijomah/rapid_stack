# Rapid Stack

A modern full-stack development toolkit for rapid application development.

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Global Installation

To install Rapid Stack globally and use it as a CLI tool:

```bash
npm install -g @codehance/rapid-stack
```

This will install the `rapid` command globally on your system.

### Local Installation

To install Rapid Stack as a development dependency in your project:

```bash
npm install --save-dev @codehance/rapid-stack
```

## Usage

After installation, you can use the `rapid` command to access various generators:

```bash
# Initialize a new project
rapid init
rapid run:devops

# Build commands
rapid build:backend
rapid build:frontend
rapid build:devops
rapid build:nginx
rapid build:lifecycle
rapid build:fullstack

# Schema commands
rapid schema:create
rapid schema:remove
rapid schema:runner

# Frontend commands
rapid frontend:platform
rapid frontend:auth
rapid frontend:crud
rapid frontend:home
rapid frontend:company
rapid frontend:event
rapid frontend:list-action

# Backend commands
rapid backend:auth
rapid backend:model
rapid backend:schema
rapid backend:schema-runner

# GraphQL commands
rapid graphql:create
rapid graphql:remove

# Options
--yes        # Skip all prompts and use default values
--auth-only  # Only generate authentication-related files
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Conventions

We follow conventional commit messages for changelog generation:

```
feat: Add new feature X
fix: Fix bug in Y
change: Update Z to be better
remove: Remove deprecated feature W
```

Examples:
```
feat: Add user authentication
fix: Resolve login page styling issues
change: Update API response format
remove: Remove legacy authentication method
```

Commit types and their corresponding changelog sections:
- `feat`: Features
- `fix`: Bug Fixes
- `change`: Changes
- `remove`: Removed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.