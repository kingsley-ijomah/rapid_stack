require "thor"
require "fileutils"
require "pathname"

module RapidStack
  class CLI < Thor
    desc "hello", "Prints a hello message from RapidStack"
    def hello
      puts "Hello from RapidStack!"
    end

    desc "install-generators", "Install Yeoman generators globally"
    def install_generators
      puts "\n=== Starting Manual Generator Installation ==="

      # Find the generator directory in the installed gem
      gem_dir = Pathname.new(__dir__).parent.parent
      puts "Looking for generator in: #{gem_dir}"

      generator_dir = gem_dir.join("lib/rapid_stack/generators/generator-rapid")

      unless generator_dir.exist?
        say("Error: Generator directory not found at #{generator_dir}", :red)
        return
      end

      begin
        # Change to the generator directory
        puts "\nChanging to generator directory: #{generator_dir}"
        Dir.chdir(generator_dir) do
          puts "Current directory: #{Dir.pwd}"

          # Install npm dependencies
          puts "\nInstalling npm dependencies..."
          npm_result = system("npm install")
          puts "npm install result: #{npm_result}"
          raise "Failed to install npm dependencies" unless npm_result

          # Link the generator globally
          puts "\nLinking generator globally..."
          link_result = system("npm link")
          puts "npm link result: #{link_result}"
          raise "Failed to link generator globally" unless link_result

          say("\n=== Generator Installation Complete ===", :green)
          say("\nYou can now use the generators with:", :green)
          say("  rapid # To see the available generators", :green)
          say("  rapid init     # Generate a new RapidStack application", :green)
          say("  rapid schema:create     # Generate a new RapidStack schema", :green)
          say("  rapid frontend:create # Generate a new RapidStack frontend", :green)
        end
      rescue StandardError => e
        say("\n=== Generator Installation Failed ===", :red)
        say("Error: #{e.message}", :red)
        puts "Backtrace:"
        puts e.backtrace
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

    def display_requirements(app_name)
      say("\nProject Requirements:", :green)
      say("─" * 50)
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
