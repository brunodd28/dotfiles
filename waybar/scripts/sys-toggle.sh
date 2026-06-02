#!/bin/bash
STATE="/tmp/waybar_sys_state"

if [ -f "$STATE" ]; then
    rm "$STATE"
else
    touch "$STATE"
fi
