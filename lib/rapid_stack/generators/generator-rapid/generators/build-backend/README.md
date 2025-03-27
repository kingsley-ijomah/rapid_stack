# Rails API Installer Generator

This generator helps you set up a new Rails API application with a specific version of Rails, configured to use MongoDB.

## Features

- Installs a specific version of Rails
- Creates a new Rails API application
- Sets up MongoDB with Mongoid as the database solution
- Skips unnecessary test frameworks and system tests
- Provides helpful next steps after installation

## Usage

Run the generator using:

```bash
yo rapid:rails-api-installer
```

The generator will:

1. Ask which Rails version you want to install (defaults to 7.1.3)
2. Ask where you want to install the Rails API application (defaults to current directory)
3. Confirm before proceeding with the installation
4. Check if Ruby, Rails, and MongoDB are installed
5. Install the specified Rails version if needed
6. Create a new Rails API application with MongoDB support
7. Install all dependencies and generate Mongoid configuration

## Prerequisites

- Ruby must be installed on your system
- Node.js and npm/yarn (for running the generator)
- MongoDB (for the database)

## Options

The generator accepts the following options:

- `--debug`: Enable debug mode for more detailed output

## Generated Application Features

The generated Rails API application includes:

- API-only mode enabled
- MongoDB integration with Mongoid
- Minimal setup without test frameworks
- Ready for API development
- Mongoid configuration file

## Next Steps

After installation, you should:

1. Configure your MongoDB connection settings in `config/mongoid.yml`
2. Ensure MongoDB is running on your system
3. Start your server using `rails s`

## MongoDB Configuration

The default MongoDB configuration will be generated in `config/mongoid.yml`. You can customize it based on your needs:

```yaml
development:
  clients:
    default:
      database: your_app_development
      hosts:
        - localhost:27017
      options:
        # Configure any additional MongoDB options here

test:
  clients:
    default:
      database: your_app_test
      hosts:
        - localhost:27017
```

## Contributing

Feel free to submit issues and enhancement requests! 