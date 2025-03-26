require "thor"
require "fileutils"

module RapidStack
  class CLI < Thor
    desc "hello", "Prints a hello message from RapidStack"
    def hello
      puts "Hello from RapidStack!"
    end

    desc "install-generators", "Install Yeoman generators globally"
    def install_generators
      generator_dir = find_generator_dir
      unless Dir.exist?(generator_dir)
        say("Error: Generator directory not found at #{generator_dir}", :red)
        return
      end

      say("Installing generators...", :green)

      begin
        # Navigate to the generator directory
        Dir.chdir(generator_dir) do
          # Install npm dependencies
          system("npm install") or raise "Failed to install npm dependencies"

          # Link the generator globally
          system("npm link") or raise "Failed to link generator globally"

          say("Generators installed successfully!", :green)
          say("\nYou can now use the generators with:", :green)
          say("  rapid # To see the available generators", :green)
          say("  rapid init     # Generate a new RapidStack application", :green)
          say("  rapid schema:create     # Generate a new RapidStack schema", :green)
          say("  rapid frontend:create # Generate a new RapidStack frontend", :green)
        end
      rescue StandardError => e
        say("Error installing generators: #{e.message}", :red)
      end
    end

    desc "new APP_NAME", "Create a new RapidStack application"
    def new(app_name)
      target_dir = File.expand_path(app_name, Dir.pwd)

      if Dir.exist?(target_dir)
        say(
          "Directory '#{app_name}' already exists. Please choose a different name or remove the existing directory.", :red
        )
        return
      end

      say("Creating new RapidStack application...", :green)
      say("Please use the following command to generate your application:", :green)
      say("  rapid init #{app_name}", :green)
    end

    private

    def find_generator_dir
      possible_locations = [
        File.expand_path("../generators/generator-rapid", __dir__), # When running as a gem
        File.expand_path("lib/rapid_stack/generators/generator-rapid", Dir.pwd) # When running locally
      ]

      possible_locations.find { |dir| Dir.exist?(dir) } || possible_locations.first
    end

    def display_requirements(app_name)
      say("\nProject Requirements:", :green)
      say("─" * 50)
      say("Ruby Version: >= 3.3.1")
      say("Rails Version: ~> 8.0.1")
      say("Other dependencies:")
      say("  • Thor (~> 1.0)")
      say("  • Vault (~> 0.18.0)")
      say("  • JWT (~> 2.7)")
      say("\nTo get started:")
      say("1. Ensure you have Ruby 3.3.1+ installed:")
      say("   rvm install 3.3.1 # or use your preferred Ruby version manager")
      say("2. Install Rails 8.0.1:")
      say("   gem install rails -v 8.0.1")
      say("3. Install project dependencies:")
      say("   bundle install")
      say("4. Navigate to your project:")
      say("   cd #{app_name}")
      say("─" * 50)
    end

    # Helper method to output messages with color.
    def say(message, color = nil)
      if color == :green
        puts "\e[32m#{message}\e[0m"
      elsif color == :red
        puts "\e[31m#{message}\e[0m"
      else
        puts message
      end
    end

    # Remove or make private the init method if it exists
    private :init if method_defined?(:init)
  end
end
