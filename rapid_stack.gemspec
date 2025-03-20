# frozen_string_literal: true

require_relative "lib/rapid_stack/version"

Gem::Specification.new do |spec|
  spec.name = "rapid_stack"
  spec.version = RapidStack::VERSION
  spec.authors = ["Kingsley Ijomah"]
  spec.email = ["kingsley@codehance.com"]

  spec.summary = "A comprehensive full-stack development toolkit that provides a containerized Rails API backend, Ionic Angular frontend, and complete DevOps infrastructure with Terraform and Ansible"
  spec.description = "Rapid Stack (RS) is a framework designed to streamline modern application development and deployment. " \
    "It addresses the complexity of setting up infrastructure, backend, and frontend systems by providing a fully " \
    "operational cloud-based stack that can be deployed in a single day.\n\n" \
    "Key Features:\n" \
    "• Automated Infrastructure: Leverages Terraform, Ansible, DigitalOcean droplets, and Docker for automated provisioning\n" \
    "• Backend Stack: Rails 8.0 API with MongoDB and GraphQL integration\n" \
    "• Frontend Framework: Ionic Angular with automated iOS/Android deployment\n" \
    "• DevOps Tools: HashiCorp Vault for secrets, GitHub Actions CI/CD, Graylog monitoring\n" \
    "• Production Ready: NGINX reverse proxy with SSL, Portainer container management\n\n" \
    "Rapid Stack enables teams to focus on core feature development by eliminating repetitive boilerplate configurations " \
    "while providing a comprehensive learning resource through well-structured, auto-generated code."

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
