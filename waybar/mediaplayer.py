#!/usr/bin/env python3
import gi
import json
import subprocess

gi.require_version("Playerctl", "2.0")
from gi.repository import Playerctl

def get_metadata(key):
    try:
        return subprocess.check_output(
            ["playerctl", "metadata", key]
        ).decode().strip()
    except:
        return ""

def get_status():
    try:
        return subprocess.check_output(
            ["playerctl", "status"]
        ).decode().strip()
    except Exception as e:
        print(e)
        return None

status = get_status()
title = get_metadata("title")
artist = get_metadata("artist")

if status == "Paused":
    text = f"  {artist}-{title}"
elif status == "Playing":
    text = f"{artist}-{title}"   # no muestra nada cuando reproduce
else:
    text = f"{artist}-{title}"

print(json.dumps({"text": text}))

