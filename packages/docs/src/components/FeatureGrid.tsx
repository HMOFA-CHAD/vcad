import {
  Cube,
  Export,
  MagnifyingGlass,
  ArrowsOutCardinal,
  Palette,
  Robot,
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

export function FeatureGrid() {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {features.map((feature) => (
        <div key={feature.title} className="space-y-2">
          <dt className="flex items-center gap-2 font-bold text-text">
            <feature.icon size={18} weight="regular" className="text-accent" />
            {feature.title.toLowerCase()}
          </dt>
          <dd className="text-sm text-text-muted">
            {feature.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}
