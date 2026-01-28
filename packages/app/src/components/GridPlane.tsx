import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Grid, Line } from "@react-three/drei";
import { useTheme } from "@/hooks/useTheme";

export function GridPlane() {
  const { isDark } = useTheme();
  const { camera } = useThree();
  const cellSizeRef = useRef(10);
  const forceUpdateRef = useRef(0);

  // Update cell size based on camera distance (only when it changes significantly)
  useFrame(() => {
    const distance = camera.position.length();
    // Compute adaptive cell size: powers of 10 based on distance
    const newCellSize = Math.pow(10, Math.floor(Math.log10(Math.max(1, distance / 5))));
    const clamped = Math.max(1, Math.min(1000, newCellSize));

    if (clamped !== cellSizeRef.current) {
      cellSizeRef.current = clamped;
      // Force re-render only when cell size actually changes
      forceUpdateRef.current += 1;
    }
  });

  // Axis lines at origin (permanent)
  const xAxisPoints = useMemo(
    () =>
      [
        [-500, 0.01, 0],
        [500, 0.01, 0],
      ] as [number, number, number][],
    [],
  );

  const zAxisPoints = useMemo(
    () =>
      [
        [0, 0.01, -500],
        [0, 0.01, 500],
      ] as [number, number, number][],
    [],
  );

  // Use fixed grid for now to avoid re-render issues
  return (
    <>
      <Grid
        args={[1000, 1000]}
        cellSize={10}
        cellThickness={0.5}
        cellColor={isDark ? "#1e293b" : "#cbd5e1"}
        sectionSize={100}
        sectionThickness={1}
        sectionColor={isDark ? "#334155" : "#94a3b8"}
        fadeDistance={500}
        fadeStrength={1.5}
        infiniteGrid
      />
      {/* X axis - red */}
      <Line
        points={xAxisPoints}
        color="#ef4444"
        lineWidth={1.5}
        transparent
        opacity={0.6}
      />
      {/* Z axis - blue */}
      <Line
        points={zAxisPoints}
        color="#3b82f6"
        lineWidth={1.5}
        transparent
        opacity={0.6}
      />
    </>
  );
}
