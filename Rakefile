# frozen_string_literal: true

require "bundler/gem_tasks"
require "rspec/core/rake_task"
require_relative "lib/rapid_stack/post_install"

RSpec::Core::RakeTask.new(:spec)

require "rubocop/rake_task"

RuboCop::RakeTask.new

task default: %i[spec rubocop]

namespace :rapid_stack do
  desc "Install Rapid Stack generators"
  task :install_generators do
    puts "\n=== Installing Rapid Stack Generators ==="
    RapidStack::PostInstall.install_generators
  end
end

# Run install_generators after installation
at_exit do
  Rake::Task["rapid_stack:install_generators"].invoke if ENV["RAPID_STACK_INSTALL"] == "true"
end
