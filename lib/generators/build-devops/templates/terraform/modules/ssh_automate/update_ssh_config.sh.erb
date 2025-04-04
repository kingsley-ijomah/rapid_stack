#!/bin/bash

config="$HOME/.ssh/config"
ssh_key_path="$3"  # SSH key path from the third argument

update_or_add() {
  local name="$1"
  local ip="$2"
  
  # Skip if name or ip is empty
  if [ -z "$name" ] || [ -z "$ip" ]; then
    return
  fi
  
  local new_entry="Host $name\n  HostName $ip\n  User root\n  IdentityFile $ssh_key_path"
  
  # Check if the host entry exists
  if grep -q "^Host $name\$" "$config"; then
    # Host exists, check if any details need updating
    local current_entry=$(grep -A 3 "^Host $name\$" "$config")
    if ! echo "$current_entry" | grep -q "HostName $ip"; then
      # IP address has changed, or does not exist as expected
      echo "Updating IP for $name as it has changed."
      sed -i.bak "/^Host $name\$/,/^$/d" "$config"
      echo -e "\n$new_entry" >> "$config"
    elif ! echo "$current_entry" | grep -q "IdentityFile $ssh_key_path"; then
      # SSH key path has changed, or does not exist as expected
      echo "Updating SSH key for $name as it has changed."
      sed -i.bak "/^Host $name\$/,/^$/d" "$config"
      echo -e "\n$new_entry" >> "$config"
    else
      echo "No changes needed for $name."
    fi
  else
    # Host does not exist, add new entry
    echo "Adding new host $name."
    echo -e "\n$new_entry" >> "$config"
  fi
}

managers_config="$1"
workers_config="$2"
IFS=$'\n'

# Process managers
echo "$managers_config" | while IFS= read -r line; do
  name=$(echo "$line" | awk -F ' ips=' '{print $1}')
  ip=$(echo "$line" | awk -F ' ips=' '{print $2}')
  update_or_add "$name" "$ip"
done

# Process workers
echo -e "$workers_config" | while IFS= read -r line; do
  name=$(echo "$line" | awk -F ' ips=' '{print $1}')
  ip=$(echo "$line" | awk -F ' ips=' '{print $2}')
  update_or_add "$name" "$ip"
done
