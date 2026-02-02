# cad0 Training Pipeline

Fine-tuning pipeline for the cad0 text-to-CAD model.

## Models

| Model | Base | Size | Use Case |
|-------|------|------|----------|
| **cad0** | Qwen2.5-Coder-7B | ~14GB | Server inference (Modal) |
| **cad0-0.5b-onnx** | Qwen2.5-0.5B | ~350MB | Browser inference (WASM) |

HuggingFace: [campedersen/cad0](https://huggingface.co/campedersen/cad0)

## Quick Start

### 1. Generate Training Data

```bash
# Generate synthetic training data from part family generators
npm run generate -- --samples 500000 --output data/

# Output:
# data/train.jsonl  (530K examples)
# data/val.jsonl    (30K examples)
# data/test.jsonl   (5K examples)
```

### 2. Upload to Modal

```bash
# Create Modal secrets (one-time)
modal secret create huggingface-secret HUGGING_FACE_HUB_TOKEN=<token>
modal secret create wandb-secret WANDB_API_KEY=<key>

# Create volume and upload data
modal volume create vcad-training-vol
npm run upload-data
```

### 3. Run Training

```bash
# Start training on H100 GPU
cd src/modal
modal run modal_app.py

# Training runs detached - monitor at:
# https://modal.com/apps/ecto/main/deployed/cad0-training
# https://wandb.ai/ecto/cad0
```

### 4. Deploy Inference

```bash
# Deploy inference endpoint
modal deploy src/modal/modal_app.py

# Endpoint: https://ecto--cad0-training-inference-infer.modal.run
```

## Training Configuration

See `src/modal/config.py` for full config.

### Model Config
```python
model_name = "Qwen/Qwen2.5-Coder-7B"
lora_r = 64
lora_alpha = 128
lora_dropout = 0.05
use_4bit = True  # QLoRA
use_flash_attention = True
```

### Training Config
```python
num_train_epochs = 1
per_device_train_batch_size = 16
gradient_accumulation_steps = 4  # Effective batch = 64
learning_rate = 2e-4
max_seq_length = 1024
warmup_ratio = 0.03
lr_scheduler = "cosine"
```

### Hardware
- **Training**: 1x H100 80GB (~2.3s/step)
- **Inference**: 1x A10G 24GB (cost-efficient)

## Data Format

Training data is JSONL with `text` and `ir` fields:

```jsonl
{"text": "50x30mm mounting plate with 4 corner holes", "ir": "C 50 30 5\nY 2.5 10\nT 1 5 5 0\n..."}
{"text": "10mm diameter 25mm tall standoff", "ir": "Y 5 25"}
```

### Part Families

| Family | Generator | Examples |
|--------|-----------|----------|
| bracket | `src/generators/bracket.ts` | L-bracket, Z-bracket, mounting plate |
| standoff | `src/generators/ball.ts` | Cylindrical standoff, hex standoff |
| enclosure | `src/generators/hollow.ts` | Box, rounded box, vented |
| gear | `src/generators/radial.ts` | Spur gear, hub |
| flange | `src/generators/profile.ts` | Bolt circle, blind flange |
| clip | `src/generators/clip.ts` | Snap clip, spring clip |

## Compact IR Format

Output format designed for token efficiency:

```
C x y z          # Cube (dimensions)
Y r h            # Cylinder (radius, height)
S r              # Sphere (radius)
K r1 r2 h        # Cone (radii, height)
T n x y z        # Translate node n
R n x y z        # Rotate node n (degrees)
X n x y z        # Scale node n
U a b            # Union nodes
D a b            # Difference (subtract b from a)
I a b            # Intersection
```

## Inference API

### Modal Endpoint

```bash
curl -X POST https://ecto--cad0-training-inference-infer.modal.run \
  -H "Content-Type: application/json" \
  -d '{"prompt": "50x30mm plate with 4 corner holes", "temperature": 0.1}'

# Response:
# {"ir": "C 50 30 5\nY 2.5 10\nT 1 5 5 0\n...", "tokens": 42}
```

### Browser (Transformers.js)

```typescript
import { loadModel, generateCAD } from '@/lib/browser-inference';

await loadModel();  // Downloads campedersen/cad0-0.5b-onnx
const result = await generateCAD("mounting bracket with 4 holes");
console.log(result.ir);
```

## Evaluation

```bash
# Run evaluation on test set
cd src/modal
modal run modal_app.py --action evaluate

# Metrics:
# - syntax_accuracy: % valid Compact IR syntax
# - exact_match_accuracy: % exact match with ground truth
```

## Directory Structure

```
packages/training/
├── src/
│   ├── generators/       # Part family generators
│   │   ├── bracket.ts
│   │   ├── ball.ts
│   │   ├── hollow.ts
│   │   └── ...
│   ├── modal/           # Modal training infrastructure
│   │   ├── modal_app.py # Main app (train, evaluate, infer)
│   │   ├── config.py    # Training configuration
│   │   ├── train.py     # Training loop
│   │   ├── eval.py      # Evaluation metrics
│   │   └── data.py      # Data loading
│   ├── cli.ts           # Local CLI
│   └── index.ts         # Generator exports
├── data/                # Generated training data
└── README.md
```

## Cost Estimates

| Task | GPU | Time | Cost |
|------|-----|------|------|
| Training (1 epoch) | H100 | ~6h | ~$20 |
| Inference (cold) | A10G | ~30s | ~$0.01 |
| Inference (warm) | A10G | ~2s | ~$0.001 |

## Troubleshooting

### OOM during training
Reduce `per_device_train_batch_size` or enable `gradient_checkpointing`.

### Slow inference cold start
The inference endpoint has 5-min idle timeout. First request after idle takes ~30s to load model.

### Data upload fails
Check Modal volume exists: `modal volume list`

## Links

- [W&B Dashboard](https://wandb.ai/ecto/cad0)
- [Modal Dashboard](https://modal.com/apps/ecto/main/deployed/cad0-training)
- [HuggingFace Model](https://huggingface.co/campedersen/cad0)
- [Compact IR Spec](../../docs/features/compact-ir.md)
- [Text-to-CAD Design Doc](../../docs/features/text-to-cad.md)
