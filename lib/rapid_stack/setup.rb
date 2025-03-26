# frozen_string_literal: true

require "fileutils"
require "pathname"

module RapidStack
  module Setup
    def self.run
      puts "\n=== Running Rapid Stack Setup ==="
      RapidStack::PostInstall.install_generators
    end
  end
end

# Run setup if this file is being executed directly
RapidStack::Setup.run if __FILE__ == $PROGRAM_NAME
