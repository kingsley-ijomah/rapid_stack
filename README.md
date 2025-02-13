# RapidStack

RapidStack is a Ruby gem that provides a complete development stack for modern web applications. It includes templates and configurations for a Rails backend, React frontend, and DevOps infrastructure using Docker.

## Features

- **Backend (Rails 8.0)**
  - GraphQL API setup with Apollo
  - MongoDB integration with Mongoid
  - JWT authentication with Devise
  - Vault integration for secrets management
  - Email handling with Postmark
  - Comprehensive test setup with RSpec

- **Frontend (React)**
  - Modern React setup with TypeScript
  - Apollo Client for GraphQL
  - TailwindCSS for styling
  - Jest and React Testing Library
  - ESLint and Prettier configuration

- **DevOps**
  - Docker and Docker Compose setup
  - HashiCorp Vault for secrets management
  - NGINX reverse proxy
  - GitHub Actions CI/CD pipelines
  - Monitoring with Graylog
  - Container management with Portainer

## Prerequisites

- Ruby 3.3.1
- Node.js 20+
- Docker and Docker Compose
- Git

## Installation

Install the gem by executing:
```bash
gem install rapid_stack
```

## Usage

1. Create a new project:
```bash
rapid_stack new my_project
```

2. Set up your environment:
```bash
cd my_project
./dev-start.sh
```

3. Configure your secrets:
   - Create a Vault server or use the provided development configuration
   - Set up your credentials in `config/credentials.yml.enc`
   - Configure environment variables in `.env` files

## Development Environment

The development environment includes:

- Backend server: http://localhost:3000
- Frontend server: http://localhost:5173
- Vault UI: http://localhost:8200
- MongoDB: localhost:27017
- Portainer: http://localhost:9000
- Graylog: http://localhost:9001

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Code of Conduct

Everyone interacting in the RapidStack project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).