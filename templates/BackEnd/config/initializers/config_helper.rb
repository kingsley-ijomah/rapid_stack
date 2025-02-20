require 'config_helper'

# Set Rails master key from environment if available
if defined?(Rails) && (rails_key = ENV['RAILS_MASTER_KEY'])
  ENV['RAILS_MASTER_KEY'] = rails_key
end
