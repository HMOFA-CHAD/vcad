import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { TriangleMesh } from "@vcad/engine";

interface PreviewMeshProps {
  mesh: TriangleMesh;
}

/** Semi-transparent preview mesh for extrusion preview */
export function PreviewMesh({ mesh }: PreviewMeshProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;

    const positions = new Float32Array(mesh.positions);
    const indices = new Uint32Array(mesh.indices);

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    return () => {
      geo.dispose();
    };
  }, [mesh]);

  return (
    <mesh>
      <bufferGeometry ref={geoRef} />
      <meshStandardMaterial
        color="#00d4ff"
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
