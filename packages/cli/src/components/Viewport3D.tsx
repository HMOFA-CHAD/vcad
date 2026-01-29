import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";
import { useEngineStore } from "@vcad/core";
import {
  createBuffer,
  clearBuffer,
  renderTriangles,
  meshToTriangles,
  computeBounds,
  type Camera,
  type Triangle,
  type RenderBuffer,
} from "../renderer/software-renderer.js";

// Convert buffer to chalk-styled strings for Ink compatibility
function bufferToChalkLines(buffer: RenderBuffer): string[] {
  const { width, height, pixels } = buffer;
  const lines: string[] = [];

  // Use half-block characters (▀) to get 2 pixels per character vertically
  for (let y = 0; y < height; y += 2) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const topIdx = (y * width + x) * 4;
      const botIdx = ((y + 1) * width + x) * 4;

      const tr = pixels[topIdx]!;
      const tg = pixels[topIdx + 1]!;
      const tb = pixels[topIdx + 2]!;

      let br = tr, bg = tg, bb = tb;
      if (y + 1 < height) {
        br = pixels[botIdx]!;
        bg = pixels[botIdx + 1]!;
        bb = pixels[botIdx + 2]!;
      }

      // Use chalk for proper terminal color support
      line += chalk.rgb(tr, tg, tb).bgRgb(br, bg, bb)("▀");
    }
    lines.push(line);
  }

  return lines;
}

interface Props {
  width: number;
  height: number;
}

// Part colors
const PART_COLORS: [number, number, number][] = [
  [100, 149, 237], // cornflower blue
  [144, 238, 144], // light green
  [255, 182, 193], // light pink
  [255, 218, 185], // peach
  [221, 160, 221], // plum
  [176, 224, 230], // powder blue
];

export function Viewport3D({ width, height }: Props) {
  const scene = useEngineStore((s) => s.scene);
  const [rotation, setRotation] = useState({ x: -25, y: 45 });
  const [zoom, setZoom] = useState(1);

  // Handle keyboard input for rotation
  useInput((input, key) => {
    const rotStep = 15;
    const zoomStep = 0.2;

    if (key.leftArrow || input === "h") {
      setRotation((r) => ({ ...r, y: r.y - rotStep }));
    }
    if (key.rightArrow || input === "l") {
      setRotation((r) => ({ ...r, y: r.y + rotStep }));
    }
    if (key.upArrow && !key.ctrl) {
      setRotation((r) => ({ ...r, x: Math.max(-89, r.x - rotStep) }));
    }
    if (key.downArrow && !key.ctrl) {
      setRotation((r) => ({ ...r, x: Math.min(89, r.x + rotStep) }));
    }
    if (input === "+" || input === "=") {
      setZoom((z) => Math.min(3, z + zoomStep));
    }
    if (input === "-" || input === "_") {
      setZoom((z) => Math.max(0.3, z - zoomStep));
    }
    // Reset view
    if (input === "0") {
      setRotation({ x: -25, y: 45 });
      setZoom(1);
    }
  });

  // Convert scene to triangles
  const triangles = useMemo(() => {
    if (!scene || scene.parts.length === 0) return [];

    const allTriangles: Triangle[] = [];
    scene.parts.forEach((part, idx) => {
      const color = PART_COLORS[idx % PART_COLORS.length]!;
      const partTriangles = meshToTriangles(part.mesh.positions, part.mesh.indices, color);
      allTriangles.push(...partTriangles);
    });
    return allTriangles;
  }, [scene]);

  // Render the scene
  const renderedLines = useMemo(() => {
    // Each character is 1 wide, but we use half-blocks so 2 pixels per row
    const renderWidth = width;
    const renderHeight = height * 2;

    const buffer = createBuffer(renderWidth, renderHeight);
    clearBuffer(buffer, 30, 32, 40); // Dark background

    if (triangles.length === 0) {
      // Draw a grid for empty scene
      const gridColor = [50, 52, 60];
      for (let y = 0; y < renderHeight; y++) {
        for (let x = 0; x < renderWidth; x++) {
          if (x % 10 === 0 || y % 10 === 0) {
            const idx = (y * renderWidth + x) * 4;
            buffer.pixels[idx] = gridColor[0]!;
            buffer.pixels[idx + 1] = gridColor[1]!;
            buffer.pixels[idx + 2] = gridColor[2]!;
          }
        }
      }
      return bufferToChalkLines(buffer);
    }

    // Compute camera position based on rotation and bounds
    const bounds = computeBounds(triangles);
    const distance = (bounds.size * 2) / zoom;

    const radX = rotation.x * Math.PI / 180;
    const radY = rotation.y * Math.PI / 180;

    const camera: Camera = {
      position: {
        x: bounds.center.x + distance * Math.cos(radX) * Math.sin(radY),
        y: bounds.center.y + distance * Math.sin(radX),
        z: bounds.center.z + distance * Math.cos(radX) * Math.cos(radY),
      },
      target: bounds.center,
      up: { x: 0, y: 1, z: 0 },
      fov: 45,
    };

    renderTriangles(buffer, triangles, camera);

    return bufferToChalkLines(buffer);
  }, [triangles, rotation, zoom, width, height]);

  // Debug info
  const debugInfo = useMemo(() => {
    if (triangles.length === 0) return null;
    const bounds = computeBounds(triangles);
    return {
      center: bounds.center,
      size: bounds.size,
      firstTri: triangles[0],
    };
  }, [triangles]);

  return (
    <Box flexDirection="column">
      {renderedLines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
      <Box justifyContent="space-between" paddingX={1}>
        <Text dimColor>
          ←→↑↓: rotate | +/-: zoom | 0: reset
        </Text>
        <Text dimColor>
          {triangles.length > 0 ? `${(triangles.length).toLocaleString()} tris` : "empty"}
          {debugInfo && ` | c:(${debugInfo.center.x.toFixed(0)},${debugInfo.center.y.toFixed(0)},${debugInfo.center.z.toFixed(0)}) sz:${debugInfo.size.toFixed(0)}`}
        </Text>
      </Box>
    </Box>
  );
}
