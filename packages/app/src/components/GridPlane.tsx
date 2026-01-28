import { Grid } from "@react-three/drei";
import { useTheme } from "@/hooks/useTheme";

export function GridPlane() {
  const { isDark } = useTheme();

  return (
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
  );
}
