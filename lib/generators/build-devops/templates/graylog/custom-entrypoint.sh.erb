#!/bin/bash
set -e

echo "Starting custom entrypoint script..."

# Run your custom configuration merge logic
echo "Running config merge..."
/usr/local/bin/merge-graylog-conf.sh /usr/share/graylog/config/custom_graylog.conf /usr/share/graylog/data/config/graylog.conf

# Launch the setup script in the background so it can run after Graylog starts
echo "Launching setup script..."
/usr/local/bin/setup-graylog.sh > /var/log/setup-graylog.log 2>&1 &

# Now call the original entrypoint with no arguments so that it can pick up its defaults
echo "Executing original entrypoint..."
exec /docker-entrypoint.sh
