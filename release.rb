#!/usr/bin/env ruby

require "fileutils"
require "date"

# Commit message patterns:
# feat: Add new feature X
# fix: Fix bug in Y
# change: Update Z to be better
# remove: Remove deprecated feature W

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

def get_last_tag
  last_tag = `git describe --tags --abbrev=0 2>/dev/null`.chomp
  last_tag.empty? ? nil : last_tag
end

def get_commits_since_last_tag
  last_tag = get_last_tag
  if last_tag
    `git log #{last_tag}..HEAD --pretty=format:"%s"`.split("\n")
  else
    `git log --pretty=format:"%s"`.split("\n")
  end
end

def parse_commit_message(message)
  case message
  when /^feat: (.+)$/i
    [:added, Regexp.last_match(1)]
  when /^fix: (.+)$/i
    [:fixed, Regexp.last_match(1)]
  when /^change: (.+)$/i
    [:changed, Regexp.last_match(1)]
  when /^remove: (.+)$/i
    [:removed, Regexp.last_match(1)]
  end
end

def get_changes_from_commits
  changes = {
    added: [],
    changed: [],
    fixed: [],
    removed: []
  }

  commits = get_commits_since_last_tag
  return changes if commits.empty?

  puts "\nFound the following changes in commits:"
  puts "----------------------------------------"

  commits.each do |commit|
    result = parse_commit_message(commit)
    next unless result

    category, message = result
    changes[category] << message
    puts "#{category.upcase}: #{message}"
  end

  print "\nDo you want to use these changes for the changelog? [Y/n]: "
  return changes if STDIN.gets&.chomp&.downcase != "n"

  # If user doesn't want to use commit messages, fall back to manual entry
  puts "\nEnter changes manually:"
  get_changes
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

def handle_git_operations(version)
  puts "\nPreparing git operations for release..."

  # Stage all changes
  system("git add .") or raise "Failed to stage changes"

  # Commit changes with default message
  commit_message = "Release version #{version}"
  system(%(git commit -m "#{commit_message}")) or raise "Failed to commit changes"

  # Create tag with default message
  tag_name = "v#{version}"
  tag_message = "Release version #{version}"
  system(%(git tag -a #{tag_name} -m "#{tag_message}")) or raise "Failed to create tag"
end

def push_to_rubygems(version)
  gem_file = "rapid_stack-#{version}.gem"
  gem_path = File.join(__dir__, "pkg", gem_file)

  puts "\nPushing gem to RubyGems..."
  system("gem push #{gem_path}") or raise "Failed to push gem to RubyGems"
  puts "Gem pushed to RubyGems successfully!"
end

def cleanup
  puts "\nCleaning up..."
  # Remove the gem file from pkg directory
  pkg_dir = File.join(__dir__, "pkg")
  gem_files = Dir.glob(File.join(pkg_dir, "rapid_stack-*.gem"))
  gem_files.each do |file|
    File.delete(file)
    puts "Removed: #{File.basename(file)}"
  end
  puts "Cleanup complete!"
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
        changes = get_changes_from_commits
        update_changelog(new_version, changes)
        puts "CHANGELOG.md updated successfully!"

        build_gem
        handle_git_operations(new_version)
        push_to_rubygems(new_version)
        cleanup

        # Push changes to git after cleanup
        print "\nPush changes to remote? [y/N]: "
        should_push = STDIN.gets&.chomp&.downcase == "y"

        if should_push
          system("git push origin main") or raise "Failed to push changes"
          system("git push origin v#{new_version}") or raise "Failed to push tag"
          puts "Changes and tag pushed to remote successfully!"
        else
          puts "Skipping push to remote. You can push manually later."
        end
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
