"""
cad0 Demo Space - Text to CAD
"""

import gradio as gr
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import spaces
import urllib.parse

# Model config
MODEL_ID = "campedersen/cad0"
BASE_MODEL = "Qwen/Qwen2.5-Coder-7B-Instruct"

# Load tokenizer at startup
print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)

model = None

def load_model():
    global model
    if model is None:
        print("Loading cad0 model...")
        from transformers import BitsAndBytesConfig
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            quantization_config=bnb_config,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        print("Model loaded on GPU")
    return model


def generate(prompt, temperature=0.1):
    """Generate Compact IR from prompt."""
    model = load_model()

    system_prompt = "You are a CAD assistant. Output only Compact IR code (C for box, Y for cylinder, T for translate, U for union, D for difference). No explanations, just the IR code."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to("cuda")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=temperature if temperature > 0 else 1.0,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

    # Clean up response
    for stop in ["User", "user", "\n\n\n", "Assistant"]:
        if stop in response:
            response = response.split(stop)[0]

    if "Compact IR" in response:
        response = response.split("Compact IR")[0]

    # Extract IR lines
    lines = response.strip().split('\n')
    ir_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if ir_lines and not (line[0] in 'CYTUDSMRFBXH' or line[0].isdigit()):
            break
        if line[0] in 'CYTUDSMRFBXH':
            ir_lines.append(line)

    return '\n'.join(ir_lines) if ir_lines else response.strip()


@spaces.GPU
def text_to_cad(prompt, temperature=0.1):
    """Main function."""
    if not prompt.strip():
        return "Enter a prompt", ""

    ir = generate(prompt, temperature)
    vcad_url = f"https://vcad.io/?ir={urllib.parse.quote(ir)}"

    return ir, vcad_url


DESCRIPTION = """
Generate **parametric CAD geometry** from natural language descriptions.

**How it works:** Describe a part → cad0 outputs Compact IR → open in vcad.io to view

**Compact IR syntax:** `C w h d` (box), `Y r h` (cylinder), `T idx x y z` (translate), `U a b` (union), `D a b` (difference)

**Model:** Qwen2.5-Coder-7B fine-tuned on 530K synthetic CAD examples

[Model](https://huggingface.co/campedersen/cad0) · [Blog](https://campedersen.com/cad0) · [vcad.io](https://vcad.io)
"""

with gr.Blocks(theme=gr.themes.Base(), title="cad0: Text to CAD") as demo:
    gr.Markdown("# cad0: Text to CAD")
    gr.Markdown(DESCRIPTION)

    with gr.Row(equal_height=True):
        with gr.Column(scale=1):
            gr.Markdown("### 1. Describe")
            prompt = gr.Textbox(
                label="Part description",
                placeholder="L-bracket: 50mm x 30mm x 3mm",
                lines=4,
                show_label=False
            )
            temperature = gr.Slider(minimum=0, maximum=1, value=0.1, step=0.1, label="Temperature")
            submit_btn = gr.Button("Generate →", variant="primary")

        with gr.Column(scale=1):
            gr.Markdown("### 2. Compact IR")
            ir_output = gr.Textbox(label="Generated IR", lines=10, show_label=False)

        with gr.Column(scale=1):
            gr.Markdown("### 3. View in vcad.io")
            vcad_link = gr.Markdown("*Generate IR to get link*")
            open_btn = gr.Button("Open in vcad.io →", variant="secondary", interactive=False)

    def on_generate(prompt, temperature):
        ir, url = text_to_cad(prompt, temperature)
        link_md = f"[**Open in vcad.io →**]({url})" if url else "*Generate IR to get link*"
        return ir, link_md, gr.update(interactive=bool(url))

    submit_btn.click(
        fn=on_generate,
        inputs=[prompt, temperature],
        outputs=[ir_output, vcad_link, open_btn]
    )

    # Open vcad.io in new tab when button clicked
    open_btn.click(
        fn=None,
        inputs=[ir_output],
        js="(ir) => { if (ir) window.open('https://vcad.io/?ir=' + encodeURIComponent(ir), '_blank'); }"
    )

    gr.Examples(
        examples=[
            ["L-bracket: 50mm x 30mm x 3mm thick", 0.1],
            ["50x30mm mounting plate with 4 corner holes", 0.1],
            ["enclosure box 80x60x40mm", 0.1],
            ["cylindrical standoff 10mm diameter, 25mm tall", 0.1],
        ],
        inputs=[prompt, temperature],
    )

if __name__ == "__main__":
    demo.launch()
