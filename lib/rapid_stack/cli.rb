require "thor"
require "fileutils"

module RapidStack
  class CLI < Thor
    desc "hello", "Prints a hello message from RapidStack"
    def hello
      puts "Hello from RapidStack!"
    end

    desc "new APP_NAME", "Create a new Rails application with RapidStack configuration"
    def new(app_name)
      target_dir = File.expand_path(app_name, Dir.pwd)

      if Dir.exist?(target_dir)
        say(
          "Directory '#{app_name}' already exists. Please choose a different name or remove the existing directory.", :red
        )
        return
      end

      # Find the templates directory relative to the gem's root
      template_dir = find_template_dir
      unless Dir.exist?(template_dir)
        say("Error: Template directory not found at #{template_dir}", :red)
        say("Please ensure the templates directory exists in the gem.", :red)
        return
      end

      say("Creating project directory: #{target_dir}", :green)
      FileUtils.mkdir_p(target_dir)

      say("Copying boilerplate files from: #{template_dir}", :green)
      begin
        # Copy template contents
        FileUtils.cp_r(Dir.glob("#{template_dir}/*"), target_dir)
        say("Project '#{app_name}' created successfully!", :green)
      rescue StandardError => e
        say("Error copying template files: #{e.message}", :red)
        FileUtils.rm_rf(target_dir) # Cleanup on failure
      end

      # Display requirements after successful creation
      display_requirements(app_name)
    end

    private

    def find_template_dir
      possible_locations = [
        File.expand_path("../../templates", __dir__), # When running as a gem
        File.expand_path("templates", Dir.pwd) # When running locally
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
      say("5. Start the development environment:")
      say("   ./dev-start.sh")
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
