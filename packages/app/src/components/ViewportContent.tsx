import { useRef, useEffect, useMemo } from "react";
import { MOUSE, Spherical, Vector3, Box3 } from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport, Environment, ContactShadows } from "@react-three/drei";
import { EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GridPlane } from "./GridPlane";
import { SceneMesh } from "./SceneMesh";
import { ClashMesh } from "./ClashMesh";
import { TransformGizmo } from "./TransformGizmo";
import { SelectionOverlay } from "./SelectionOverlay";
import { DimensionOverlay } from "./DimensionOverlay";
import { InlineProperties } from "./InlineProperties";
import { useEngineStore, useDocumentStore, useUiStore } from "@vcad/core";
import { useCameraControls } from "@/hooks/useCameraControls";
import { useTheme } from "@/hooks/useTheme";

export function ViewportContent() {
  useCameraControls();
  const scene = useEngineStore((s) => s.scene);
  const parts = useDocumentStore((s) => s.parts);
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const { isDark } = useTheme();

  // Reusable objects to avoid GC pressure (wheel fires at 60+ Hz)
  const sphericalRef = useRef(new Spherical());
  const offsetRef = useRef(new Vector3());
  const velocityRef = useRef({ theta: 0, phi: 0 });
  const animatingRef = useRef(false);

  // Target animation for orbit focus
  const targetGoalRef = useRef(new Vector3());
  const distanceGoalRef = useRef<number | null>(null);
  const isAnimatingTargetRef = useRef(false);

  // Calculate center and size of selected parts
  const selectionInfo = useMemo(() => {
    if (selectedPartIds.size === 0 || !scene) return null;

    const box = new Box3();
    const tempVec = new Vector3();
    let hasPoints = false;

    parts.forEach((part, index) => {
      if (!selectedPartIds.has(part.id)) return;
      const evalPart = scene.parts[index];
      if (!evalPart) return;

      const positions = evalPart.mesh.positions;
      for (let i = 0; i < positions.length; i += 3) {
        tempVec.set(positions[i]!, positions[i + 1]!, positions[i + 2]!);
        box.expandByPoint(tempVec);
        hasPoints = true;
      }
    });

    if (!hasPoints) return null;
    const center = new Vector3();
    box.getCenter(center);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    return { center, maxDim };
  }, [selectedPartIds, scene, parts]);

  // Animate orbit target to selection center and zoom to fit
  useEffect(() => {
    if (selectionInfo) {
      targetGoalRef.current.copy(selectionInfo.center);
      // Distance = 2.5x the max dimension, clamped to reasonable range
      distanceGoalRef.current = Math.max(30, Math.min(300, selectionInfo.maxDim * 2.5));
      isAnimatingTargetRef.current = true;
    }
  }, [selectionInfo]);

  // Smooth target and distance animation
  useFrame(() => {
    if (!isAnimatingTargetRef.current || !orbitRef.current) return;

    const target = orbitRef.current.target;
    const targetGoal = targetGoalRef.current;
    const distanceGoal = distanceGoalRef.current;
    const lerpFactor = 0.1;

    // Animate target position
    target.lerp(targetGoal, lerpFactor);

    // Animate camera distance
    if (distanceGoal !== null) {
      const offset = offsetRef.current.subVectors(camera.position, target);
      const currentDist = offset.length();
      const newDist = currentDist + (distanceGoal - currentDist) * lerpFactor;
      offset.normalize().multiplyScalar(newDist);
      camera.position.copy(target).add(offset);
    }

    // Stop animating when close enough
    const targetDone = target.distanceTo(targetGoal) < 0.01;
    const distanceDone = distanceGoal === null ||
      Math.abs(offsetRef.current.subVectors(camera.position, target).length() - distanceGoal) < 0.1;

    if (targetDone && distanceDone) {
      target.copy(targetGoal);
      isAnimatingTargetRef.current = false;
      distanceGoalRef.current = null;
    }
  });

  // Wheel-to-orbit: two-finger trackpad drag → orbit with momentum
  useEffect(() => {
    const controls = orbitRef.current;
    const domElement = controls?.domElement;
    if (!domElement) return;

    const dampingFactor = 0.15; // fraction of velocity applied per frame
    const friction = 0.92; // velocity decay per frame

    const animate = () => {
      const vel = velocityRef.current;
      // Stop animating when velocity is negligible
      if (Math.abs(vel.theta) < 0.0001 && Math.abs(vel.phi) < 0.0001) {
        animatingRef.current = false;
        vel.theta = 0;
        vel.phi = 0;
        return;
      }

      const target = controls.target;
      const offset = offsetRef.current.subVectors(camera.position, target);
      const spherical = sphericalRef.current.setFromVector3(offset);

      // Apply fraction of velocity
      spherical.theta += vel.theta * dampingFactor;
      spherical.phi += vel.phi * dampingFactor;

      // Clamp polar angle to avoid flipping
      spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));

      // Decay velocity
      vel.theta *= friction;
      vel.phi *= friction;

      // Update camera position
      offset.setFromSpherical(spherical);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
      controls.update();

      requestAnimationFrame(animate);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Normalize deltaMode: 0=pixels, 1=lines, 2=pages
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } // lines → pixels
      if (e.deltaMode === 2) {
        dx *= 100;
        dy *= 100;
      } // pages → pixels

      // Shift + scroll = zoom
      if (e.shiftKey) {
        const zoomSpeed = 0.002;
        const delta = -(Math.abs(dy) > Math.abs(dx) ? dy : dx) * zoomSpeed;
        const target = controls.target;
        const offset = offsetRef.current.subVectors(camera.position, target);
        const distance = offset.length();
        const newDistance = Math.max(1, distance * (1 + delta));
        offset.normalize().multiplyScalar(newDistance);
        camera.position.copy(target).add(offset);
        controls.update();
        return;
      }

      // OrbitControls formula: viewport height = 2π radians
      const rotateSpeed = (2 * Math.PI) / domElement.clientHeight;

      // Accumulate velocity: deltaX → azimuthal (theta), deltaY → polar (phi)
      velocityRef.current.theta += dx * rotateSpeed;
      velocityRef.current.phi += dy * rotateSpeed;

      // Start animation loop if not already running
      if (!animatingRef.current) {
        animatingRef.current = true;
        requestAnimationFrame(animate);
      }
    };

    domElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => domElement.removeEventListener("wheel", handleWheel);
  }, [camera]);

  return (
    <>
      {/* Environment lighting - subtle studio setup */}
      <Environment preset="studio" environmentIntensity={0.4} />

      {/* Key light with shadows */}
      <directionalLight
        position={[50, 80, 40]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001}
      />
      {/* Fill light */}
      <directionalLight position={[-30, 40, -20]} intensity={0.4} />
      {/* Rim light for edge definition */}
      <directionalLight position={[-50, 20, 50]} intensity={0.2} />

      {/* Contact shadows - soft shadow beneath objects */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={isDark ? 0.4 : 0.3}
        scale={200}
        blur={2}
        far={100}
        resolution={512}
        color={isDark ? "#000000" : "#1a1a1a"}
      />

      {/* Grid */}
      <GridPlane />

      {/* Scene meshes */}
      {scene?.parts.map((evalPart, idx) => {
        const partInfo = parts[idx];
        if (!partInfo) return null;
        return (
          <SceneMesh
            key={partInfo.id}
            partInfo={partInfo}
            mesh={evalPart.mesh}
            selected={selectedPartIds.has(partInfo.id)}
          />
        );
      })}

      {/* Clash visualization (zebra pattern on intersections) */}
      {scene?.clashes.map((clashMesh, idx) => (
        <ClashMesh key={`clash-${idx}`} mesh={clashMesh} />
      ))}

      {/* Selection bounding box overlay */}
      <SelectionOverlay />

      {/* Dimension annotations for primitives */}
      <DimensionOverlay />

      {/* Inline properties card near selection */}
      <InlineProperties />

      {/* Transform gizmo for selected part */}
      <TransformGizmo orbitControls={orbitRef} />

      {/* Controls */}
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.1}
        enableZoom={false}
        mouseButtons={{
          LEFT: undefined,      // LMB reserved for selection
          MIDDLE: MOUSE.PAN,    // MMB = pan
          RIGHT: MOUSE.PAN,     // RMB = pan (fallback for mouse users)
        }}
      />

      {/* Orientation gizmo - RGB convention */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={["#e06c75", "#98c379", "#61afef"]}
          labelColor="#abb2bf"
        />
      </GizmoHelper>

      {/* Post-processing effects */}
      <EffectComposer>
        {/* N8AO - high quality ambient occlusion */}
        <N8AO
          aoRadius={0.5}
          intensity={isDark ? 2 : 1.5}
          aoSamples={6}
          denoiseSamples={4}
        />
        {/* Subtle vignette for focus */}
        <Vignette
          offset={0.3}
          darkness={isDark ? 0.5 : 0.3}
          eskil={false}
        />
      </EffectComposer>
    </>
  );
}
