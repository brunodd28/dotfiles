#!/bin/sh
set -eu

config_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec pkexec /bin/sh -c '
  install -D -o root -g root -m 0755 "$1" /usr/local/libexec/confighypr-battery-limit &&
  install -D -o root -g root -m 0644 "$2" /usr/share/polkit-1/actions/com.bruno.confighypr.battery-limit.policy &&
  install -D -o root -g root -m 0644 "$3" /etc/polkit-1/rules.d/49-confighypr-battery-limit.rules
' install-battery-limit \
  "$config_dir/battery-limit-helper" \
  "$config_dir/battery-limit.policy" \
  "$config_dir/battery-limit.rules"
