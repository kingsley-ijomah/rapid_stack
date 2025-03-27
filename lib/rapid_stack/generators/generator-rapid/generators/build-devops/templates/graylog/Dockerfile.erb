# Start from the official Graylog image
FROM graylog/graylog:6.1.5

# Switch to root to handle file operations
USER root

# Create log directory with proper permissions
RUN mkdir -p /var/log && \
    touch /var/log/setup-graylog.log && \
    chown -R graylog:graylog /var/log

RUN chmod 666 /var/log/setup-graylog.log

# Copy files with correct permissions
COPY merge-graylog-conf.sh /usr/local/bin/merge-graylog-conf.sh
COPY config/custom_graylog.conf /usr/share/graylog/config/custom_graylog.conf
COPY custom-entrypoint.sh /usr/local/bin/custom-entrypoint.sh
COPY setup-graylog.sh /usr/local/bin/setup-graylog.sh


# Set permissions
RUN chmod +x /usr/local/bin/merge-graylog-conf.sh && \
    chmod +x /usr/local/bin/custom-entrypoint.sh && \
    chmod +x /usr/local/bin/setup-graylog.sh && \
    chmod 644 /usr/share/graylog/config/custom_graylog.conf

# Set environment variables
ENV GRAYLOG_PREFLIGHT_COMPLETED="true" \
    GRAYLOG_ELASTICSEARCH_VERSION="7" \
    GRAYLOG_ROOT_TIMEZONE="UTC" \
    GRAYLOG_ELASTICSEARCH_HOSTS="http://elasticsearch:9200" \
    GRAYLOG_INPUT_GELF_UDP_ENABLED="true" \
    GRAYLOG_INPUT_GELF_UDP_PORT="12201" \
    GRAYLOG_INPUT_GELF_UDP_BIND_ADDRESS="0.0.0.0" \
    GRAYLOG_HTTP_EXTERNAL_URI="http://localhost:9001/" \
    GRAYLOG_MONGODB_URI="mongodb://mongo:27017/graylog" \
    GRAYLOG_WEB_ENDPOINT_URI="http://localhost:9001/api"
# Switch back to graylog user
USER graylog

# Expose ports
EXPOSE 9000
EXPOSE 12201/udp

# Set entrypoint and command
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]