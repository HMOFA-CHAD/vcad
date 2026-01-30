/**
 * MaterialPreview3D - Photorealistic PBR sphere preview using Three.js
 * Supports procedural shaders for realistic material textures.
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import type { MaterialPreset } from "@/data/materials";
import {
  hasProceduralShader,
  getProceduralShaderForMaterial,
} from "@/shaders";

interface MaterialSphereProps {
  material: MaterialPreset;
  animate?: boolean;
}

function MaterialSphere({ material, animate = true }: MaterialSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const color = useMemo(
    () => new THREE.Color(material.color[0], material.color[1], material.color[2]),
    [material.color]
  );

  // Check for procedural shader
  const proceduralShader = useMemo(() => {
    if (!hasProceduralShader(material.key)) return null;
    return getProceduralShaderForMaterial(material.key);
  }, [material.key]);

  // Create shader material if needed
  const shaderMaterial = useMemo(() => {
    if (!proceduralShader) return null;

    return new THREE.ShaderMaterial({
      vertexShader: proceduralShader.vertexShader,
      fragmentShader: proceduralShader.fragmentShader,
      uniforms: proceduralShader.uniforms,
      side: THREE.DoubleSide,
    });
  }, [proceduralShader]);

  // Cleanup shader material
  useEffect(() => {
    return () => {
      shaderMaterial?.dispose();
    };
  }, [shaderMaterial]);

  // Subtle rotation animation
  useFrame((_, delta) => {
    if (animate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      material={shaderMaterial ?? undefined}
    >
      <sphereGeometry args={[1, 64, 64]} />
      {!shaderMaterial && (
        <meshStandardMaterial
          color={color}
          metalness={material.metallic}
          roughness={material.roughness}
          envMapIntensity={1.2}
        />
      )}
    </mesh>
  );
}

interface MaterialPreview3DProps {
  material: MaterialPreset;
  size?: number;
  animate?: boolean;
}

export function MaterialPreview3D({
  material,
  size = 80,
  animate = true,
}: MaterialPreview3DProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg overflow-hidden bg-gradient-to-b from-neutral-800 to-neutral-900"
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        {/* Ambient fill */}
        <ambientLight intensity={0.3} />

        {/* Key light - warm */}
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.5}
          color="#fff5e6"
          castShadow
        />

        {/* Fill light - cool */}
        <directionalLight
          position={[-3, 2, -2]}
          intensity={0.5}
          color="#e6f0ff"
        />

        {/* Rim light */}
        <directionalLight
          position={[0, -3, -5]}
          intensity={0.3}
          color="#ffffff"
        />

        {/* HDR environment for realistic reflections */}
        <Environment preset="studio" />

        <MaterialSphere material={material} animate={animate} />
      </Canvas>
    </div>
  );
}
