# frozen_string_literal: true

require_relative "lib/rapid_stack/version"

Gem::Specification.new do |spec|
  spec.name = "rapid_stack"
  spec.version = RapidStack::VERSION
  spec.authors = ["Kingsley Ijomah"]
  spec.email = ["kingsley@codehance.com"]

  spec.summary = "A comprehensive full-stack development toolkit that provides a containerized Rails API backend, Ionic Angular frontend, and complete DevOps infrastructure with Terraform and Ansible"
  spec.description = "RapidStack is an all-in-one solution for modern web applications. It includes:
    - Rails 8.0 API backend with GraphQL and MongoDB
    - Ionic Angular frontend with authentication
    - HashiCorp Vault integration for secrets management
    - Complete DevOps setup with Terraform and Ansible
    - Docker containerization for development and production
    - CI/CD pipelines with GitHub Actions
    - Monitoring with Graylog
    - Container management with Portainer
    - NGINX reverse proxy with SSL
    - Automated deployment scripts"

  spec.homepage = "https://github.com/CodehanceHQ/rapid_stack"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.3.1"

  spec.metadata = {
    "homepage_uri" => spec.homepage,
    "source_code_uri" => "#{spec.homepage}/tree/v#{spec.version}",
    "changelog_uri" => "#{spec.homepage}/blob/v#{spec.version}/CHANGELOG.md",
    "documentation_uri" => "#{spec.homepage}/blob/v#{spec.version}/README.md"
  }

  # Include all files in the gem
  spec.files = Dir[
    "lib/**/*",
    "templates/**/*",
    "bin/*",
    "LICENSE.txt",
    "README.md",
    "CHANGELOG.md"
  ].reject do |f|
    f.match?(%r{
      templates/BackEnd/config/credentials/.*\.key|
      templates/FrontEnd/ios/App/Pods/.*
    }x)
  end

  spec.bindir = "exe"
  spec.executables = ["rapid_stack"]

  # Runtime dependencies
  spec.add_dependency "jwt", "~> 2.7"
  spec.add_dependency "rails", "~> 8.0", ">= 8.0.1"
  spec.add_dependency "thor", "~> 1.0"
  spec.add_dependency "vault", "~> 0.18.0"

  # Development dependencies
  spec.add_development_dependency "rspec", "~> 3.0"
  spec.add_development_dependency "rubocop", "~> 1.21"

  # For more information and examples about making a new gem, check out our
  # guide at: https://bundler.io/guides/creating_gem.html
end
