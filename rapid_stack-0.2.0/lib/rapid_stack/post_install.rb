# frozen_string_literal: true

require "fileutils"
require "pathname"

def install_generators
  # Find the generator directory in the installed gem
  gem_dir = Pathname.new(__dir__).parent.parent
  generator_dir = gem_dir.join("lib/rapid_stack/generators/generator-rapid")

  return unless generator_dir.exist?

  begin
    # Change to the generator directory
    Dir.chdir(generator_dir) do
      # Install npm dependencies
      system("npm install") or raise "Failed to install npm dependencies"

      # Link the generator globally
      system("npm link") or raise "Failed to link generator globally"

      puts "\nRapid Stack generators installed successfully!"
      puts "\nYou can now use the generators with:"
      puts "  rapid # To see the available generators"
      puts "  rapid init     # Generate a new RapidStack application"
      puts "  rapid schema:create     # Generate a new RapidStack schema"
      puts "  rapid frontend:create # Generate a new RapidStack frontend"
    end
  rescue StandardError => e
    puts "\nWarning: Failed to install Rapid Stack generators: #{e.message}"
    puts "You can try installing them manually with: rapid_stack install-generators"
  end
end

# Run the installation if this file is being executed directly
install_generators if __FILE__ == $PROGRAM_NAME
