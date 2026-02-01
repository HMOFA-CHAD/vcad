#!/usr/bin/env python3
"""Upload training data to Modal volume."""

import modal
from pathlib import Path

# Get volume reference
volume = modal.Volume.from_name("vcad-training-vol")

# Get file paths
data_dir = Path("../../data")

# First, remove old files from root
print("Removing old files from root...")
try:
    volume.remove_file("train.jsonl")
    print("  Removed train.jsonl")
except Exception as e:
    print(f"  Could not remove train.jsonl: {e}")
try:
    volume.remove_file("val.jsonl")
    print("  Removed val.jsonl")
except Exception as e:
    print(f"  Could not remove val.jsonl: {e}")
try:
    volume.remove_file("test.jsonl")
    print("  Removed test.jsonl")
except Exception as e:
    print(f"  Could not remove test.jsonl: {e}")

# Upload to root using copy_files since batch_upload doesn't work with root
# Actually, let's use the CLI approach instead
import subprocess
import os

os.chdir("/Users/cam/Developer/vcad/packages/training")

print("\nUploading files using CLI...")
subprocess.run(["modal", "volume", "put", "vcad-training-vol", "data/train.jsonl", "/train.jsonl", "--force"], check=True)
print("  Uploaded train.jsonl")
subprocess.run(["modal", "volume", "put", "vcad-training-vol", "data/val.jsonl", "/val.jsonl", "--force"], check=True)
print("  Uploaded val.jsonl")
subprocess.run(["modal", "volume", "put", "vcad-training-vol", "data/test.jsonl", "/test.jsonl", "--force"], check=True)
print("  Uploaded test.jsonl")

# List files to verify
print("\nListing volume root:")
for entry in volume.listdir("/"):
    print(f"  {entry}")

print("\nDone!")
