#!/usr/bin/env ruby

require "fileutils"
require "date"

def current_version
  version_file = File.join(__dir__, "lib", "rapid_stack", "version.rb")
  content = File.read(version_file)
  content.match(/VERSION = "([^"]+)"/)[1]
end

def update_version(new_version)
  version_file = File.join(__dir__, "lib", "rapid_stack", "version.rb")
  content = File.read(version_file)
  updated_content = content.gsub(/VERSION = "[^"]+"/, %(VERSION = "#{new_version}"))
  File.write(version_file, updated_content)
end

def validate_version(version)
  version.match?(/^\d+\.\d+\.\d+$/)
end

def get_changes
  changes = {
    added: [],
    changed: [],
    fixed: [],
    removed: []
  }

  puts "\nEnter changes for each category (press Enter twice to skip a category):"

  changes.each do |category, _|
    puts "\n#{category.capitalize} changes:"
    puts "Enter each change and press Enter. Press Enter twice to finish this category."

    while true
      print "> "
      change = STDIN.gets&.chomp
      break if change.nil? || change.empty?

      changes[category] << change
    end
  end

  changes
end

def update_changelog(version, changes)
  changelog_file = File.join(__dir__, "CHANGELOG.md")
  current_content = File.read(changelog_file)

  today = Date.today.strftime("%Y-%m-%d")
  new_entry = ["## [#{version}] - #{today}"]

  changes.each do |category, items|
    next if items.empty?

    new_entry << "### #{category.capitalize}"
    items.each { |item| new_entry << "- #{item}" }
    new_entry << ""
  end

  new_entry = new_entry.join("\n")
  updated_content = "#{new_entry}\n#{current_content}"

  File.write(changelog_file, updated_content)
end

def build_gem
  puts "\nBuilding gem..."

  # Ensure pkg directory exists
  pkg_dir = File.join(__dir__, "pkg")
  FileUtils.mkdir_p(pkg_dir) unless Dir.exist?(pkg_dir)

  # Build the gem
  system("gem build rapid_stack.gemspec") or raise "Failed to build gem"

  # Move the gem to pkg directory
  gem_file = Dir.glob("rapid_stack-*.gem").first
  raise "No gem file was created" unless gem_file

  pkg_gem_path = File.join(pkg_dir, gem_file)
  FileUtils.mv(gem_file, pkg_dir)
  puts "Gem built successfully and moved to pkg directory"
  pkg_gem_path
end

def install_gem_locally(gem_path)
  puts "\nInstalling gem locally..."
  system("gem install #{gem_path} --no-document") or raise "Failed to install gem locally"
  puts "Gem installed successfully!"
end

def get_release_type
  loop do
    print "\nDo you want to (1) Test locally or (2) Release to RubyGems? [1/2]: "
    choice = STDIN.gets&.chomp
    return choice if %w[1 2].include?(choice)

    puts "Please enter 1 or 2"
  end
end

def main
  puts "\n============================================"
  puts "       Rapid Stack Release Helper"
  puts "============================================\n\n"

  current = current_version
  puts "Current version: #{current}"

  loop do
    print "\nEnter new version (format: major.minor.patch): "
    new_version = STDIN.gets&.chomp

    break if new_version.nil? # Handle Ctrl+C gracefully

    if validate_version(new_version)
      puts "\nUpdating version from #{current} to #{new_version}..."
      update_version(new_version)
      puts "Version updated successfully!"

      release_type = get_release_type

      if release_type == "1" # Local testing
        gem_path = build_gem
        install_gem_locally(gem_path)
        puts "\nLocal testing complete! You can now test the gem."
        break
      else # Release to RubyGems
        puts "\nNow let's update the CHANGELOG.md..."
        changes = get_changes
        update_changelog(new_version, changes)
        puts "CHANGELOG.md updated successfully!"
        build_gem
        break
      end
    else
      puts "Invalid version format. Please use major.minor.patch (e.g., 0.1.1)"
    end
  end
rescue Interrupt
  puts "\n\nRelease process cancelled."
  exit 1
rescue StandardError => e
  puts "\nError: #{e.message}"
  exit 1
end

main
