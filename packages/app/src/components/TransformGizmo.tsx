import { useEffect, useRef, useState, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useUiStore } from "@/stores/ui-store";
import { useDocumentStore } from "@/stores/document-store";
import type { RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function TransformGizmo({
  orbitControls,
}: {
  orbitControls: RefObject<OrbitControlsImpl | null>;
}) {
  const selectedPartId = useUiStore((s) => s.selectedPartId);
  const transformMode = useUiStore((s) => s.transformMode);
  const setDraggingGizmo = useUiStore((s) => s.setDraggingGizmo);

  const parts = useDocumentStore((s) => s.parts);
  const document = useDocumentStore((s) => s.document);

  const [proxy, setProxy] = useState<THREE.Object3D | null>(null);
  const proxyCallbackRef = useCallback((obj: THREE.Object3D | null) => {
    setProxy(obj);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const isDraggingRef = useRef(false);

  const selectedPart = selectedPartId
    ? parts.find((p) => p.id === selectedPartId)
    : null;

  // Sync proxy position from IR when selection/document changes (but not during drag)
  useEffect(() => {
    if (!proxy || !selectedPart) return;
    if (isDraggingRef.current) return;

    const translateNode = document.nodes[String(selectedPart.translateNodeId)];
    const rotateNode = document.nodes[String(selectedPart.rotateNodeId)];
    const scaleNode = document.nodes[String(selectedPart.scaleNodeId)];

    if (translateNode?.op.type === "Translate") {
      const { offset } = translateNode.op;
      proxy.position.set(offset.x, offset.y, offset.z);
    }
    if (rotateNode?.op.type === "Rotate") {
      const { angles } = rotateNode.op;
      proxy.rotation.set(
        angles.x * DEG2RAD,
        angles.y * DEG2RAD,
        angles.z * DEG2RAD,
      );
    }
    if (scaleNode?.op.type === "Scale") {
      const { factor } = scaleNode.op;
      proxy.scale.set(factor.x, factor.y, factor.z);
    }
  }, [proxy, selectedPart, document]);

  // Handle dragging-changed event
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onDraggingChanged = (event: { value: boolean }) => {
      const dragging = event.value;
      isDraggingRef.current = dragging;
      setDraggingGizmo(dragging);

      // Disable orbit controls during gizmo drag
      if (orbitControls.current) {
        orbitControls.current.enabled = !dragging;
      }

      if (dragging) {
        // Push undo snapshot at drag start
        useDocumentStore.getState().pushUndoSnapshot();
      }
    };

    controls.addEventListener("dragging-changed", onDraggingChanged);
    return () => {
      controls.removeEventListener("dragging-changed", onDraggingChanged);
    };
  }, [proxy, orbitControls, setDraggingGizmo]);

  // Handle transform changes during drag
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onObjectChange = () => {
      if (!proxy || !selectedPartId) return;

      const store = useDocumentStore.getState();

      if (transformMode === "translate") {
        store.setTranslation(
          selectedPartId,
          { x: proxy.position.x, y: proxy.position.y, z: proxy.position.z },
          true, // skipUndo — we pushed at drag start
        );
      } else if (transformMode === "rotate") {
        store.setRotation(
          selectedPartId,
          {
            x: proxy.rotation.x * RAD2DEG,
            y: proxy.rotation.y * RAD2DEG,
            z: proxy.rotation.z * RAD2DEG,
          },
          true,
        );
      } else if (transformMode === "scale") {
        store.setScale(
          selectedPartId,
          { x: proxy.scale.x, y: proxy.scale.y, z: proxy.scale.z },
          true,
        );
      }
    };

    controls.addEventListener("objectChange", onObjectChange);
    return () => {
      controls.removeEventListener("objectChange", onObjectChange);
    };
  }, [proxy, selectedPartId, transformMode]);

  if (!selectedPart) return null;

  return (
    <>
      <object3D ref={proxyCallbackRef} />
      {proxy && (
        <TransformControls
          ref={controlsRef}
          object={proxy}
          mode={transformMode}
          size={0.8}
        />
      )}
    </>
  );
}
