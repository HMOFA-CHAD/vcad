import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { TriangleMesh } from "@vcad/engine";
import type { PartInfo } from "@/types";
import { useUiStore } from "@/stores/ui-store";

const DEFAULT_COLOR = new THREE.Color(0.7, 0.7, 0.75);
const SELECTED_COLOR = new THREE.Color(0x60a5fa);
const SELECTED_EMISSIVE = new THREE.Color(0x2563eb);

interface SceneMeshProps {
  partInfo: PartInfo;
  mesh: TriangleMesh;
  selected: boolean;
}

export function SceneMesh({ partInfo, mesh, selected }: SceneMeshProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const select = useUiStore((s) => s.select);

  useEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(mesh.positions, 3),
    );
    geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geo.computeVertexNormals();

    return () => {
      geo.dispose();
    };
  }, [mesh]);

  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        select(partInfo.id);
      }}
    >
      <bufferGeometry ref={geoRef} />
      <meshStandardMaterial
        color={selected ? SELECTED_COLOR : DEFAULT_COLOR}
        emissive={selected ? SELECTED_EMISSIVE : undefined}
        emissiveIntensity={selected ? 0.15 : 0}
        metalness={0.1}
        roughness={0.6}
        flatShading={false}
      />
    </mesh>
  );
}
