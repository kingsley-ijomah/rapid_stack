# frozen_string_literal: true

require_relative "lib/rapid_stack/version"
require_relative "lib/rapid_stack/post_install"

Gem::Specification.new do |spec|
  spec.name = "rapid_stack"
  spec.version = RapidStack::VERSION
  spec.authors = ["Kingsley Ijomah"]
  spec.email = ["kingsley@codehance.com"]

  spec.summary = "Rapid Stack transforms complex technical architecture into a simple, repeatable process using generators."
  spec.description = "It's your entire technical stack, from cloud architecture to databases, from server-side services to client interfaces, all unified into one cohesive system.\n\n" \
    "Think of it as your development blueprint that ensures consistency, accelerates learning, and eliminates the guesswork from building modern applications. " \
    "Whether you're starting a new project or scaling an existing one, Rapid Stack gives you the confidence to build faster and smarter, with every component perfectly orchestrated." \
    "Key Features:\n" \
    "• Automated Infrastructure: Leverages Terraform, Ansible, DigitalOcean droplets, and Docker for automated provisioning\n" \
    "• Backend Stack: Rails 8.0 API with MongoDB and GraphQL integration\n" \
    "• Frontend Framework: Ionic Angular with automated iOS/Android deployment\n" \
    "• DevOps Tools: HashiCorp Vault for secrets, GitHub Actions CI/CD, Graylog monitoring\n" \
    "• Production Ready: NGINX reverse proxy with SSL, Portainer container management\n\n"

  spec.homepage = "https://github.com/kingsley-ijomah/rapid_stack"
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
    "bin/**/*",
    "LICENSE.txt",
    "README.md",
    "CHANGELOG.md"
  ].reject do |f|
    f.match?(%r{
      templates/BackEnd/config/credentials/.*\.key|
      templates/FrontEnd/ios/App/Pods/.*
    }x)
  end

  spec.bindir = "bin"
  spec.executables = %w[rapid_stack rapid_stack_setup]
  spec.require_paths = ["lib"]

  # Runtime dependencies
  spec.add_dependency "jwt", "~> 2.7"
  spec.add_dependency "rails", "~> 8.0", ">= 8.0.1"
  spec.add_dependency "thor", "~> 1.0"
  spec.add_dependency "vault", "~> 0.18.0"

  # Development dependencies
  spec.add_development_dependency "npm", "~> 0.1.0" # For handling npm operations
  spec.add_development_dependency "rspec", "~> 3.0"
  spec.add_development_dependency "rubocop", "~> 1.21"

  # Post-install message
  spec.post_install_message = <<~MSG
    =======================================
    Thank you for installing Rapid Stack!
    =======================================

    To complete the installation and set up the generators:

    1. Run the following command:
        rapid_stack_setup

    For more information, visit: #{spec.homepage}
  MSG

  # For more information and examples about making a new gem, check out our
  # guide at: https://bundler.io/guides/creating_gem.html
end
