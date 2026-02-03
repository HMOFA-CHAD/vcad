"""
cad0 Demo Space - Text to CAD with visualization
"""

import gradio as gr
import numpy as np
from PIL import Image
import io
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# Colors
GREEN = '#22c55e'
PURPLE = '#a855f7'
ORANGE = '#f97316'

# Load model
print("Loading cad0 model...")
MODEL_ID = "campedersen/cad0"
BASE_MODEL = "Qwen/Qwen2.5-Coder-7B-Instruct"

# Use base model tokenizer (more compatible)
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)

# Load model with 4-bit quantization
from transformers import BitsAndBytesConfig
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
print(f"Model loaded on GPU")


def parse_compact_ir(ir_text):
    """Parse Compact IR into operations."""
    nodes = []
    for line in ir_text.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split()
        if not parts:
            continue
        op = parts[0]
        try:
            args = [float(x) for x in parts[1:]]
        except:
            continue

        if op == 'C' and len(args) >= 3:
            nodes.append({'type': 'box', 'dims': args[:3], 'offset': [0,0,0]})
        elif op == 'Y' and len(args) >= 2:
            nodes.append({'type': 'cylinder', 'radius': args[0], 'height': args[1], 'offset': [0,0,0]})
        elif op == 'T' and len(args) >= 4:
            idx = int(args[0])
            if idx < len(nodes):
                nodes[idx]['offset'] = args[1:4]
    return nodes


def box_vertices(dims, offset):
    x, y, z = [d/2 for d in dims]
    ox, oy, oz = offset
    verts = np.array([
        [-x,-y,-z], [x,-y,-z], [x,y,-z], [-x,y,-z],
        [-x,-y,z], [x,-y,z], [x,y,z], [-x,y,z],
    ]) + np.array([ox, oy, oz])
    faces = [[0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [0,3,7,4], [1,2,6,5]]
    return verts, faces


def cylinder_vertices(radius, height, offset, segments=16):
    ox, oy, oz = offset
    angles = np.linspace(0, 2*np.pi, segments, endpoint=False)
    bottom = np.array([[radius*np.cos(a), radius*np.sin(a), -height/2] for a in angles])
    top = np.array([[radius*np.cos(a), radius*np.sin(a), height/2] for a in angles])
    verts = np.vstack([bottom, top]) + np.array([ox, oy, oz])
    faces = []
    for i in range(segments):
        j = (i+1) % segments
        faces.append([i, j, j+segments, i+segments])
    return verts, faces


def render(nodes):
    """Render nodes to image."""
    fig = plt.figure(figsize=(6, 6), dpi=100)
    ax = fig.add_subplot(111, projection='3d')

    fig.patch.set_facecolor('#1a1a1a')
    ax.set_facecolor('#1a1a1a')
    ax.xaxis.pane.fill = False
    ax.yaxis.pane.fill = False
    ax.zaxis.pane.fill = False

    all_verts = []

    for node in nodes:
        if node['type'] == 'box':
            verts, faces = box_vertices(node['dims'], node['offset'])
            color = GREEN
        elif node['type'] == 'cylinder':
            verts, faces = cylinder_vertices(node['radius'], node['height'], node['offset'])
            color = PURPLE
        else:
            continue

        all_verts.extend(verts)
        polys = [[verts[i] for i in face] for face in faces]
        ax.add_collection3d(Poly3DCollection(polys, alpha=0.8, facecolor=color, edgecolor='white', linewidth=0.5))

    if all_verts:
        all_verts = np.array(all_verts)
        max_range = np.max(np.abs(all_verts)) * 1.2
        ax.set_xlim(-max_range, max_range)
        ax.set_ylim(-max_range, max_range)
        ax.set_zlim(-max_range, max_range)

    ax.view_init(elev=25, azim=45)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_zticks([])

    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='#1a1a1a')
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf)


def generate(prompt, temperature=0.1):
    """Generate Compact IR from prompt using cad0 model."""
    messages = [{"role": "user", "content": prompt}]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt")

    if torch.cuda.is_available():
        inputs = inputs.to("cuda")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=temperature if temperature > 0 else 1.0,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.eos_token_id,
        )

    response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
    return response.strip()


def text_to_cad(prompt, temperature=0.1):
    """Main function."""
    if not prompt.strip():
        return "Enter a prompt", None

    # Generate IR using model
    ir = generate(prompt, temperature)

    # Parse and render
    nodes = parse_compact_ir(ir)
    if nodes:
        img = render(nodes)
    else:
        img = None

    return ir, img


# Simple interface
demo = gr.Interface(
    fn=text_to_cad,
    inputs=[
        gr.Textbox(label="Describe a part", placeholder="L-bracket: 50mm x 30mm x 3mm"),
        gr.Slider(minimum=0, maximum=1, value=0.1, step=0.1, label="Temperature"),
    ],
    outputs=[
        gr.Textbox(label="Compact IR"),
        gr.Image(label="Preview"),
    ],
    title="cad0: Text to CAD",
    description="Generate parametric CAD geometry from natural language. Model: [campedersen/cad0](https://huggingface.co/campedersen/cad0)",
    examples=[
        ["L-bracket: 50mm x 30mm x 3mm thick", 0.1],
        ["50x30mm mounting plate with 4 corner holes", 0.1],
        ["enclosure box 80x60x40mm", 0.1],
        ["cylindrical standoff 10mm diameter, 25mm tall", 0.1],
    ],
    theme=gr.themes.Base(),
)

if __name__ == "__main__":
    demo.launch()
