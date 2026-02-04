#!/bin/bash
# Setup script for Lambda Labs distillation

set -e

echo "=== Setting up cad0 distillation environment ==="

# Create directories
mkdir -p /lambda/nfs/cad0/data
mkdir -p /lambda/nfs/cad0/checkpoints

# Install Python dependencies
echo "Installing dependencies..."
pip install --quiet --upgrade pip
pip install --quiet \
    torch==2.5.1 \
    transformers==4.47.0 \
    datasets==3.2.0 \
    accelerate==1.2.1 \
    bitsandbytes==0.45.0 \
    wandb==0.19.1 \
    hf_transfer \
    tqdm

# Enable HF transfer for faster downloads
export HF_HUB_ENABLE_HF_TRANSFER=1

echo "=== Setup complete ==="
echo "Data directory: /lambda/nfs/cad0/data"
echo "Checkpoint directory: /lambda/nfs/cad0/checkpoints"
