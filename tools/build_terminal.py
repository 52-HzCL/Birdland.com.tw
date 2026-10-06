#!/usr/bin/env python3
"""Compatibility entry point for the canonical public search index."""
import os
import subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
subprocess.run(["node", "tools/dev/gen-terminal.js"], cwd=ROOT, check=True)
