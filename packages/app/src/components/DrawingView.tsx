import { useMemo } from "react";
import {
  useEngineStore,
  type ProjectedView,
  type RenderedDimension,
} from "@vcad/core";
import { useDrawingStore } from "../stores/drawing-store";
import { useTheme } from "@/hooks/useTheme";

// Color schemes for light and dark modes
const COLORS = {
  light: {
    background: "#ffffff",
    edge: "#1a1a1a",
    hiddenEdge: "#999999",
    dimension: "#3b82f6",
    label: "#666666",
  },
  dark: {
    background: "#0a0a0a",
    edge: "#00d4aa", // Cyan/teal like the reference
    hiddenEdge: "#006655",
    dimension: "#ff6b35", // Orange accent for contrast
    label: "#888888",
  },
};

/**
 * SVG-based 2D technical drawing view.
 *
 * Renders projected edges from 3D geometry with:
 * - Visible edges as solid lines
 * - Hidden edges as dashed lines (optional)
 * - Auto-generated dimension annotations
 * - Dark mode support with technical drawing aesthetic
 */
export function DrawingView() {
  const { viewDirection, showHiddenLines, showDimensions, scale } =
    useDrawingStore();
  const scene = useEngineStore((s) => s.scene);
  const engine = useEngineStore((s) => s.engine);
  const { isDark } = useTheme();

  const colors = isDark ? COLORS.dark : COLORS.light;

  // Project first part's mesh to 2D view
  const projectedView = useMemo<ProjectedView | null>(() => {
    if (!scene?.parts[0] || !engine) return null;

    const mesh = scene.parts[0].mesh;
    return engine.projectMesh(mesh, viewDirection);
  }, [scene, engine, viewDirection]);

  // Generate dimension annotations from bounding box
  const dimensions = useMemo<RenderedDimension[]>(() => {
    if (!projectedView || !showDimensions || !engine) return [];

    try {
      const WasmAnnotationLayer = engine.WasmAnnotationLayer;
      const annotations = new WasmAnnotationLayer();
      const { min_x, min_y, max_x, max_y } = projectedView.bounds;

      // Width dimension at bottom
      const bottomOffset = -10;
      annotations.addHorizontalDimension(
        min_x,
        min_y,
        max_x,
        min_y,
        bottomOffset
      );

      // Height dimension at right
      const rightOffset = 10;
      annotations.addVerticalDimension(
        max_x,
        min_y,
        max_x,
        max_y,
        rightOffset
      );

      const rendered = annotations.renderAll();
      annotations.free();
      return rendered as RenderedDimension[];
    } catch {
      return [];
    }
  }, [projectedView, showDimensions, engine]);

  if (!projectedView) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: colors.background, color: colors.label }}
      >
        No geometry to display
      </div>
    );
  }

  const { bounds } = projectedView;
  const width = bounds.max_x - bounds.min_x;
  const height = bounds.max_y - bounds.min_y;
  const padding = Math.max(width, height) * 0.3;

  // SVG viewBox with padding for dimensions
  const viewBox = `${bounds.min_x - padding} ${-bounds.max_y - padding} ${width + 2 * padding} ${height + 2 * padding}`;

  // Line widths scaled to view
  const strokeWidth = Math.max(width, height) * 0.005;
  const hiddenStrokeWidth = strokeWidth * 0.6;
  const dimStrokeWidth = strokeWidth * 0.4;

  return (
    <svg
      className="h-full w-full"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      style={{
        backgroundColor: colors.background,
        transform: `scale(${scale})`,
      }}
    >
      {/* Grid pattern for dark mode */}
      {isDark && (
        <defs>
          <pattern
            id="grid"
            width={strokeWidth * 20}
            height={strokeWidth * 20}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${strokeWidth * 20} 0 L 0 0 0 ${strokeWidth * 20}`}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={strokeWidth * 0.2}
            />
          </pattern>
        </defs>
      )}
      {isDark && (
        <rect
          x={bounds.min_x - padding}
          y={-bounds.max_y - padding}
          width={width + 2 * padding}
          height={height + 2 * padding}
          fill="url(#grid)"
        />
      )}

      {/* Visible edges */}
      {projectedView.edges
        .filter((e) => e.visibility === "Visible")
        .map((edge, i) => (
          <line
            key={`v-${i}`}
            x1={edge.start.x}
            y1={-edge.start.y}
            x2={edge.end.x}
            y2={-edge.end.y}
            stroke={colors.edge}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}

      {/* Hidden edges - dashed */}
      {showHiddenLines &&
        projectedView.edges
          .filter((e) => e.visibility === "Hidden")
          .map((edge, i) => (
            <line
              key={`h-${i}`}
              x1={edge.start.x}
              y1={-edge.start.y}
              x2={edge.end.x}
              y2={-edge.end.y}
              stroke={colors.hiddenEdge}
              strokeWidth={hiddenStrokeWidth}
              strokeDasharray={`${strokeWidth * 3},${strokeWidth * 2}`}
              strokeLinecap="round"
            />
          ))}

      {/* Dimension annotations */}
      {dimensions.map((dim, di) => (
        <g key={`dim-${di}`} className="dimension">
          {/* Dimension lines */}
          {dim.lines.map(([start, end], li) => (
            <line
              key={`l-${li}`}
              x1={start.x}
              y1={-start.y}
              x2={end.x}
              y2={-end.y}
              stroke={colors.dimension}
              strokeWidth={dimStrokeWidth}
            />
          ))}

          {/* Arcs (for angular dimensions) */}
          {dim.arcs.map((arc, ai) => {
            const startX =
              arc.center.x + arc.radius * Math.cos(arc.start_angle);
            const startY = -(
              arc.center.y +
              arc.radius * Math.sin(arc.start_angle)
            );
            const endX = arc.center.x + arc.radius * Math.cos(arc.end_angle);
            const endY = -(arc.center.y + arc.radius * Math.sin(arc.end_angle));
            const largeArc =
              Math.abs(arc.end_angle - arc.start_angle) > Math.PI ? 1 : 0;
            const sweep = arc.end_angle > arc.start_angle ? 0 : 1;

            return (
              <path
                key={`arc-${ai}`}
                d={`M ${startX} ${startY} A ${arc.radius} ${arc.radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`}
                fill="none"
                stroke={colors.dimension}
                strokeWidth={dimStrokeWidth}
              />
            );
          })}

          {/* Text labels */}
          {dim.texts.map((t, ti) => (
            <text
              key={`t-${ti}`}
              x={t.position.x}
              y={-t.position.y}
              fontSize={t.height}
              fill={colors.dimension}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="monospace"
              fontWeight={isDark ? "500" : "400"}
              transform={`rotate(${(-t.rotation * 180) / Math.PI}, ${t.position.x}, ${-t.position.y})`}
            >
              {t.text}
            </text>
          ))}

          {/* Arrows */}
          {dim.arrows.map((arrow, ai) => {
            const angle = arrow.direction;
            const size = arrow.size;
            const tipX = arrow.tip.x;
            const tipY = -arrow.tip.y;
            const halfAngle = Math.PI / 6;
            const p1x = tipX + size * Math.cos(angle + Math.PI - halfAngle);
            const p1y = tipY - size * Math.sin(angle + Math.PI - halfAngle);
            const p2x = tipX + size * Math.cos(angle + Math.PI + halfAngle);
            const p2y = tipY - size * Math.sin(angle + Math.PI + halfAngle);

            return (
              <polygon
                key={`a-${ai}`}
                points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`}
                fill={colors.dimension}
              />
            );
          })}
        </g>
      ))}

      {/* View label */}
      <text
        x={bounds.min_x - padding + 5}
        y={-bounds.max_y - padding + 5 + strokeWidth * 8}
        fontSize={strokeWidth * 8}
        fill={colors.label}
        textAnchor="start"
        dominantBaseline="hanging"
        fontFamily="monospace"
        fontWeight="500"
      >
        {viewDirection.toUpperCase()} VIEW
      </text>

      {/* Scale indicator in dark mode */}
      {isDark && (
        <text
          x={bounds.max_x + padding - 5}
          y={-bounds.max_y - padding + 5 + strokeWidth * 8}
          fontSize={strokeWidth * 6}
          fill={colors.label}
          textAnchor="end"
          dominantBaseline="hanging"
          fontFamily="monospace"
        >
          SCALE 1:1
        </text>
      )}
    </svg>
  );
}
