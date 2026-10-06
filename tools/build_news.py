#!/usr/bin/env python3
"""Compatibility entry point for canonical page build and existing feeds."""
import os
import subprocess
import sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run(["node", "tools/dev/build.js"], cwd=ROOT, check=True)
subprocess.run([sys.executable, "tools/build_feeds.py"], cwd=ROOT, check=True)
