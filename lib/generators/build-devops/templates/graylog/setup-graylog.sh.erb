#!/bin/bash
set -x  # Enable debug mode

echo "[$(date)] Starting Graylog setup script..." >> /var/log/setup-graylog.log

# Wait for Graylog to be ready
echo "[$(date)] Waiting for Graylog to become ready..." >> /var/log/setup-graylog.log
MAX_ATTEMPTS=30
COUNTER=0

while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    if curl -s -f http://localhost:9000/api/ > /dev/null 2>&1; then
        echo "[$(date)] Graylog is ready!" >> /var/log/setup-graylog.log
        break
    fi
    
    echo "[$(date)] Waiting for Graylog... attempt $((COUNTER+1))/$MAX_ATTEMPTS" >> /var/log/setup-graylog.log
    COUNTER=$((COUNTER+1))
    sleep 10
done

if [ $COUNTER -eq $MAX_ATTEMPTS ]; then
    echo "[$(date)] Graylog failed to become ready after $MAX_ATTEMPTS attempts" >> /var/log/setup-graylog.log
    exit 1
fi

echo "[$(date)] Attempting to configure GELF UDP Input..." >> /var/log/setup-graylog.log
# Configure GELF UDP Input
curl -v -X POST http://localhost:9000/api/system/inputs \
     -u "${GRAYLOG_ROOT_USERNAME}:${GRAYLOG_ROOT_PASSWORD}" \
     -H "Content-Type: application/json" \
     -H "X-Requested-By: CLI" \
     -d '{
       "title": "GELF UDP",
       "type": "org.graylog2.inputs.gelf.udp.GELFUDPInput",
       "configuration": {
         "port": 12201,
         "bind_address": "0.0.0.0",
         "charset_name": "UTF-8",
         "decompress_size_limit": 8388608,
         "number_worker_threads": 2,
         "recv_buffer_size": 262144
       },
       "global": true
     }' >> /var/log/setup-graylog.log 2>&1

echo "[$(date)] Setup script completed." >> /var/log/setup-graylog.log


# # Fetch the default index set ID
# DEFAULT_INDEX_SET_ID=$(curl -s -X GET "http://localhost:9000/api/system/indices/index_sets" \
#   -u "${GRAYLOG_ROOT_USERNAME}:${GRAYLOG_ROOT_PASSWORD}" \
#   -H "Content-Type: application/json" \
#   -H "X-Requested-By: CLI" | jq -r '.index_sets[] | select(.default==true) | .id')

# if [ -z "$DEFAULT_INDEX_SET_ID" ] || [ "$DEFAULT_INDEX_SET_ID" == "null" ]; then
#   echo "Failed to retrieve the default index set ID."
#   exit 1
# fi

# echo "Default Index Set ID is: $DEFAULT_INDEX_SET_ID"

# curl -X POST "http://localhost:9000/api/streams" \
#      -u "${GRAYLOG_ROOT_USERNAME}:${GRAYLOG_ROOT_PASSWORD}" \
#      -H "Content-Type: application/json" \
#      -H "X-Requested-By: CLI" \
#      -d '{
#        "title": "MongoDB Stream",
#        "description": "Stream for MongoDB service logs",
#        "rules": [
#          {
#            "field": "tag",
#            "value": "mongodb-service",
#            "type": 1,
#            "inverted": false
#          }
#        ],
#        "matching_type": "AND",
#        "remove_matches_from_default_stream": false,
#        "index_set_id": "'"${DEFAULT_INDEX_SET_ID}"'"
#      }'

# curl -X POST "http://localhost:9000/api/streams" \
#      -u "${GRAYLOG_ROOT_USERNAME}:${GRAYLOG_ROOT_PASSWORD}" \
#      -H "Content-Type: application/json" \
#      -H "X-Requested-By: CLI" \
#      -d '{
#        "title": "Backend Stream",
#        "description": "Stream for backend service logs",
#        "rules": [
#          {
#            "field": "tag",
#            "value": "backend-service",
#            "type": 1,
#            "inverted": false
#          }
#        ],
#        "matching_type": "AND",
#        "disabled": false,
#        "index_set_id": "'"${DEFAULT_INDEX_SET_ID}"'"
#      }'

# curl -X POST "http://localhost:9000/api/streams" \
#      -u "${GRAYLOG_ROOT_USERNAME}:${GRAYLOG_ROOT_PASSWORD}" \
#      -H "Content-Type: application/json" \
#      -H "X-Requested-By: CLI" \
#      -d '{
#        "title": "Frontend Stream",
#        "description": "Stream for frontend (nginx) logs",
#        "rules": [
#          {
#            "field": "tag",
#            "value": "nginx-service",
#            "type": 1,
#            "inverted": false
#          }
#        ],
#        "matching_type": "AND",
#        "disabled": false,
#        "index_set_id": "'"${DEFAULT_INDEX_SET_ID}"'"
#      }'

# curl -X POST "http://localhost:9000/api/streams" \
#      -u "${GRAYLOG_ROOT_USERNAME}:${GRAYLOG_ROOT_PASSWORD}" \
#      -H "Content-Type: application/json" \
#      -H "X-Requested-By: CLI" \
#      -d '{
#        "title": "Nginx Stream",
#        "description": "Stream for Nginx service logs",
#        "rules": [
#          {
#            "field": "tag",
#            "value": "nginx-service",
#            "type": 1,
#            "inverted": false
#          }
#        ],
#        "matching_type": "AND",
#        "disabled": false,
#        "index_set_id": "'"${DEFAULT_INDEX_SET_ID}"'"
#      }'

# # Configure Alert for High Error Rate
# curl -X POST http://localhost:9000/api/events/definitions \
#      -u admin:password \
#      -H "Content-Type: application/json" \
#      -H "X-Requested-By: CLI" \
#      -d '{
#        "title": "High Error Rate",
#        "description": "Trigger if errors exceed 50 in 10 minutes",
#        "config": {
#          "type": "aggregation",
#          "query": "level:ERROR",
#          "group_by": [],
#          "series": [
#            {
#              "id": "count()",
#              "function": "count()"
#            }
#          ],
#          "conditions": [
#            {
#              "field": "count()",
#              "comparison": ">",
#              "value": 50
#            }
#          ],
#          "execute_every_ms": 600000 # 10 minutes
#        },
#        "priority": 3,
#        "notifications": [
#          {
#            "type": "email",
#            "config": {
#              "sender": "alerts@yourdomain.com",
#              "recipients": ["admin@yourdomain.com"],
#              "subject": "Graylog Alert: High Error Rate",
#              "body": "Errors exceeded threshold."
#            }
#          }
#        ]
#      }'

echo "Graylog configuration completed!"
