#!/usr/bin/env python3

from pathlib import Path

VERSION_FILE = Path("/home/tails1154/ecraft/tailstalk2.version")

print("Content-Type: text/plain; charset=utf-8")
print("Access-Control-Allow-Origin: *")
print("Access-Control-Allow-Methods: GET, OPTIONS")
print("Cache-Control: no-cache, no-store, must-revalidate")
print("Pragma: no-cache")
print("Expires: 0")
print()

try:
    print(VERSION_FILE.read_text(encoding="utf-8").strip())
except OSError:
    print("0.0.0")
