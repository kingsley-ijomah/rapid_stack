require "mkmf"
require_relative "../../lib/rapid_stack/post_install"

puts "\n=== Running Rapid Stack Extension Setup ==="
RapidStack::PostInstall.install_generators

# Create a dummy makefile since we don't actually need to compile anything
File.write("Makefile", "all:\ninstall:\n")
