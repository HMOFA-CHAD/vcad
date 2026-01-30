import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Cube,
  Export,
  MagnifyingGlass,
  ArrowsOutCardinal,
  Palette,
  Robot,
  CheckCircle,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

const features = [
  {
    icon: Cube,
    title: "CSG",
    description: "union, difference, intersection — as operators (+, -, &)",
  },
  {
    icon: Export,
    title: "Export",
    description: "stl, gltf, usd, dxf, step. one model, every format.",
  },
  {
    icon: MagnifyingGlass,
    title: "Inspect",
    description: "volume, surface area, bounding box, center of mass",
  },
  {
    icon: ArrowsOutCardinal,
    title: "Transform",
    description: "mirror, linear pattern, circular pattern, translate, rotate, scale",
  },
  {
    icon: Palette,
    title: "Materials",
    description: "pbr from toml. metallic, roughness, color, density.",
  },
  {
    icon: Robot,
    title: "Agents",
    description: "built for coding agents. api tables, cookbook, blender mcp.",
  },
];

const whyVcad = [
  {
    title: "Not OpenSCAD",
    description: "no custom language. your models are real rust — cargo, crates, tests, ci.",
  },
  {
    title: "Watertight",
    description: "built on manifold. every boolean produces valid 2-manifold geometry. no mesh healing.",
  },
  {
    title: "Every format",
    description: "stl, gltf, usd, dxf, step from one codebase. no conversion pipeline.",
  },
  {
    title: "Agent-native",
    description: "small api, operator overloads, consistent patterns. ai agents generate models from text.",
  },
];

const galleryItems = [
  { id: "plate", src: "/assets/plate.png", caption: "plate.rs" },
  { id: "bracket", src: "/assets/bracket.png", caption: "bracket.rs" },
  { id: "mascot", src: "/assets/mascot.png", caption: "mascot.rs" },
  { id: "hub", src: "/assets/hub.png", caption: "flanged hub" },
  { id: "vent", src: "/assets/vent.png", caption: "radial vent" },
];

function CopyCommand() {
  return (
    <code className="inline-flex items-center gap-2 text-sm bg-surface px-4 py-2 rounded-md border border-border cursor-pointer hover:border-text-muted transition-colors group">
      <span className="text-text-muted select-none">$</span>
      <span>cargo add vcad</span>
      <span className="w-2 h-4 bg-text-muted cursor-blink" />
    </code>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 lg:py-24">
          <div className="max-w-[720px] mx-auto px-8">
            <Image
              src="/assets/mascot.png"
              alt="vcad mascot"
              width={64}
              height={64}
              className="mb-8 opacity-90"
            />
            <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter mb-4">
              vcad<span className="text-accent">.</span>
            </h1>
            <p className="text-lg text-text-muted mb-2">
              parametric cad in rust
            </p>
            <p className="text-text-muted max-w-md mb-8">
              csg primitives, boolean operators, multi-format export.
              built on manifold. mit licensed.
            </p>
            <CopyCommand />
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[720px] mx-auto px-8">
          <hr className="border-border" />
        </div>

        {/* Code Example */}
        <section className="py-12">
          <div className="max-w-[720px] mx-auto px-8">
            <p className="text-sm text-text-muted mb-6 tracking-wide">
              // plate.rs
            </p>
            <pre className="text-[13px] leading-relaxed overflow-x-auto bg-surface p-5 rounded-lg border border-border">
              <code>
                <span className="text-syntax-keyword">use</span>{" "}
                vcad::{"{"}centered_cube, centered_cylinder, Part{"}"};{"\n\n"}
                <span className="text-syntax-comment">// plate with four mounting holes</span>{"\n"}
                <span className="text-syntax-keyword">let</span> plate = centered_cube(
                <span className="text-syntax-string">&quot;plate&quot;</span>,{" "}
                <span className="text-syntax-number">100.0</span>,{" "}
                <span className="text-syntax-number">60.0</span>,{" "}
                <span className="text-syntax-number">5.0</span>);{"\n\n"}
                <span className="text-syntax-keyword">let</span> hole = centered_cylinder(
                <span className="text-syntax-string">&quot;hole&quot;</span>,{" "}
                <span className="text-syntax-number">3.0</span>,{" "}
                <span className="text-syntax-number">10.0</span>,{" "}
                <span className="text-syntax-number">32</span>);{"\n"}
                <span className="text-syntax-keyword">let</span> holes = hole.linear_pattern(
                <span className="text-syntax-number">80.0</span>,{" "}
                <span className="text-syntax-number">0.0</span>,{" "}
                <span className="text-syntax-number">0.0</span>,{" "}
                <span className="text-syntax-number">2</span>){"\n"}
                {"    "}.linear_pattern(
                <span className="text-syntax-number">0.0</span>,{" "}
                <span className="text-syntax-number">40.0</span>,{" "}
                <span className="text-syntax-number">0.0</span>,{" "}
                <span className="text-syntax-number">2</span>){"\n"}
                {"    "}.translate(
                <span className="text-syntax-number">-40.0</span>,{" "}
                <span className="text-syntax-number">-20.0</span>,{" "}
                <span className="text-syntax-number">0.0</span>);{"\n\n"}
                <span className="text-syntax-keyword">let</span> part = plate{" "}
                <span className="text-text">-</span> holes;{"\n"}
                part.write_stl(<span className="text-syntax-string">&quot;plate.stl&quot;</span>).unwrap();
              </code>
            </pre>
            <p className="text-sm text-text-muted mt-4">
              <span className="text-syntax-string">→</span> plate.stl · 28274 mm³ · 392 triangles
            </p>
            <Image
              src="/assets/plate.png"
              alt="Rendered mounting plate with bolt pattern"
              width={400}
              height={300}
              className="mt-6 rounded-lg border border-border opacity-90"
            />
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[720px] mx-auto px-8">
          <hr className="border-border" />
        </div>

        {/* Features */}
        <section id="features" className="py-12">
          <div className="max-w-[720px] mx-auto px-8">
            <p className="text-sm text-text-muted mb-8 tracking-wide">
              // features
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {features.map((feature) => (
                <div key={feature.title}>
                  <dt className="font-bold text-text mb-1">
                    {feature.title.toLowerCase()}
                  </dt>
                  <dd className="text-sm text-text-muted">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[720px] mx-auto px-8">
          <hr className="border-border" />
        </div>

        {/* Why vcad */}
        <section className="py-12">
          <div className="max-w-[720px] mx-auto px-8">
            <p className="text-sm text-text-muted mb-8 tracking-wide">
              // why vcad
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {whyVcad.map((item) => (
                <div key={item.title}>
                  <dt className="font-bold text-text mb-1">
                    {item.title.toLowerCase()}
                  </dt>
                  <dd className="text-sm text-text-muted">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[720px] mx-auto px-8">
          <hr className="border-border" />
        </div>

        {/* Gallery */}
        <section className="py-12">
          <div className="max-w-[720px] mx-auto px-8">
            <p className="text-sm text-text-muted mb-8 tracking-wide">
              // gallery
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {galleryItems.map((item) => (
                <figure key={item.id}>
                  <Image
                    src={item.src}
                    alt={item.caption}
                    width={200}
                    height={200}
                    className="w-full rounded-lg border border-border opacity-90"
                  />
                  <figcaption className="text-xs text-text-muted mt-2 text-center">
                    {item.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[720px] mx-auto px-8">
          <hr className="border-border" />
        </div>

        {/* Soon */}
        <section className="py-12">
          <div className="max-w-[720px] mx-auto px-8">
            <p className="text-sm text-text-muted mb-4 tracking-wide">
              // soon
            </p>
            <p className="text-text-muted">
              <span className="font-bold text-text">interactive web gui.</span>{" "}
              code → geometry in real time.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
