# frozen_string_literal: true

require "open3"

module RapidStack
  module PreInstall
    def self.check_node_requirements
      puts "\n=== Checking Node.js Requirements ==="

      # Check Node.js
      begin
        node_version, _, status = Open3.capture3("node", "--version")
        if status.success?
          puts "✅ Node.js is installed (version: #{node_version.strip})"
        else
          puts "❌ Node.js is not installed"
          puts "Please install Node.js version 18.0.0 or higher"
          puts "Visit: https://nodejs.org/"
          exit 1
        end
      rescue StandardError => e
        puts "❌ Error checking Node.js installation: #{e.message}"
        puts "Please install Node.js version 18.0.0 or higher"
        puts "Visit: https://nodejs.org/"
        exit 1
      end

      # Check npm
      begin
        npm_version, _, status = Open3.capture3("npm", "--version")
        if status.success?
          puts "✅ npm is installed (version: #{npm_version.strip})"
        else
          puts "❌ npm is not installed"
          puts "Please install npm version 9.0.0 or higher"
          puts "Visit: https://nodejs.org/"
          exit 1
        end
      rescue StandardError => e
        puts "❌ Error checking npm installation: #{e.message}"
        puts "Please install npm version 9.0.0 or higher"
        puts "Visit: https://nodejs.org/"
        exit 1
      end

      puts "=== Node.js Requirements Check Complete ===\n"
    end
  end
end

# Run the check if this file is being executed directly
RapidStack::PreInstall.check_node_requirements if __FILE__ == $PROGRAM_NAME
