#!/usr/bin/env bash

# Usage: merge-graylog-conf.sh SOURCE_FILE DEST_FILE
# Merges lines from SOURCE_FILE into DEST_FILE, by key in "key=value" format.
# If key exists in DEST_FILE, that line is replaced. Otherwise appended.

SRC_FILE="$1"
DEST_FILE="$2"

# If the destination doesn't exist, create an empty one
if [ ! -f "$DEST_FILE" ]; then
  touch "$DEST_FILE"
fi

while IFS= read -r line || [ -n "$line" ]; do
  # Skip blank lines or comment lines
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  # Extract the key (everything before the first '=')
  key=$(echo "$line" | cut -d '=' -f 1)

  # If key already exists in DEST_FILE, replace that line
  if grep -q "^$key=" "$DEST_FILE"; then
    sed -i "s|^$key=.*|$line|" "$DEST_FILE"
  else
    # Otherwise, append it at the end
    echo "$line" >> "$DEST_FILE"
  fi

done < "$SRC_FILE"
