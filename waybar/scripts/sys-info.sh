#!/bin/bash

STATE="/tmp/waybar_sys_state"

CPU=$(grep 'cpu ' /proc/stat | awk '{u=($2+$4)*100/($2+$4+$5)} END {print int(u)}')
MEM=$(free -m | awk '/Mem/ {printf "%.1f", $3/1024}')
MEM=$(echo "$MEM" | sed 's/\./,/')

if [ -f "$STATE" ]; then
    echo "{\"text\":\"▶ ${CPU}%  ${MEM}GB\",\"class\":\"open\",\"tooltip\":\"Click CPU/RAM\"}"
else
    echo "{\"text\":\"◀\",\"class\":\"closed\"}"
fi
