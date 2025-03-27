# RapidStack

Rapid Stack transforms complex technical architecture into a simple, repeatable process using generators.

It's your entire technical stack, from cloud architecture to databases, from server-side services to client interfaces, all unified into one cohesive system.

Think of it as your development blueprint that ensures consistency, accelerates learning, and eliminates the guesswork from building modern applications. Whether you're starting a new project or scaling an existing one, Rapid Stack gives you the confidence to build faster and smarter, with every component perfectly orchestrated.

## Features

- **Backend (Rails 8.0)**
  - GraphQL API setup with Apollo
  - MongoDB integration with Mongoid
  - JWT authentication with Devise
  - Vault integration for secrets management
  - Email handling with Postmark
  - Comprehensive test setup with RSpec
  - Schema management and runners
  - Model generation and removal
  - GraphQL type generation

- **Frontend (Ionic Angular)**
  - Modern Ionic Angular setup with TypeScript
  - Apollo Client for GraphQL
  - SCSS for styling
  - Jest and Angular Testing Library
  - ESLint and Prettier configuration
  - CRUD component generation
  - Authentication components
  - Platform-specific components
  - Event handling setup
  - List action components
  - Ionic UI components and theming
  - Angular Material integration
  - Mobile-first responsive design

- **DevOps**
  - Docker and Docker Compose setup
  - HashiCorp Vault for secrets management
  - NGINX reverse proxy configuration
  - GitHub Actions CI/CD pipelines
  - Monitoring with Graylog
  - Container management with Portainer
  - Terraform infrastructure as code
  - Development lifecycle management
  - Router configuration

- **Development Workflow**
  - Automated initialization process
  - Development environment setup
  - Component removal capabilities
  - Schema management tools
  - Frontend platform customization
  - Backend model management
  - GraphQL schema management

## Prerequisites

- Ruby 3.3.1
- Node.js 20+
- Docker and Docker Compose
- Git

## Installation

1. Install the gem by executing:
```bash
gem install rapid_stack
```

2. Install the generators:
```bash
rapid_stack_setup
```

## Using Generators

After installing the generators, you can use the following commands:

```bash
# Generate a new RapidStack application
rapid init

# Generate a new RapidStack API
rapid build:backend

# Generate a new RapidStack frontend
rapid build:frontend

# See all generators
rapid
```

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

When you run `release.rb`, it will automatically:
1. Collect all commits since the last tag
2. Parse commit messages following these conventions
3. Generate appropriate changelog entries
4. Show you the changes it found for confirmation

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Code of Conduct

Everyone interacting in the RapidStack project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).