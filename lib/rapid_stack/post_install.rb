# frozen_string_literal: true

require "fileutils"
require "pathname"

module RapidStack
  module PostInstall
    def self.install_generators
      puts "\n=== Starting Rapid Stack Generator Installation ==="

      # Find the generator directory in the installed gem
      gem_dir = Pathname.new(__dir__).parent.parent

      generator_dir = gem_dir.join("lib/rapid_stack/generators/generator-rapid")

      unless generator_dir.exist?
        puts "Error: Generator directory not found at #{generator_dir}"
        return
      end

      begin
        # Change to the generator directory
        Dir.chdir(generator_dir) do
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
        end
      rescue StandardError => e
        puts "\n=== Rapid Stack Generator Installation Failed ==="
        puts "Error: #{e.message}"
        puts "Backtrace:"
        puts e.backtrace
        puts "\nYou can try installing them manually with: rapid_stack install-generators"
      end
    end
  end
end

# Run the installation if this file is being executed directly
if __FILE__ == $PROGRAM_NAME
  puts "Running post_install.rb directly"
  RapidStack::PostInstall.install_generators
end
