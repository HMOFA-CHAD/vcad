import { useEffect, useRef, useState, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useUiStore, useDocumentStore } from "@vcad/core";
import type { RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function TransformGizmo({
  orbitControls,
}: {
  orbitControls: RefObject<OrbitControlsImpl | null>;
}) {
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const transformMode = useUiStore((s) => s.transformMode);
  const setDraggingGizmo = useUiStore((s) => s.setDraggingGizmo);
  const gridSnap = useUiStore((s) => s.gridSnap);
  const snapIncrement = useUiStore((s) => s.snapIncrement);

  const parts = useDocumentStore((s) => s.parts);
  const document = useDocumentStore((s) => s.document);

  const [proxy, setProxy] = useState<THREE.Object3D | null>(null);
  const proxyCallbackRef = useCallback((obj: THREE.Object3D | null) => {
    setProxy(obj);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const isDraggingRef = useRef(false);

  // Only show gizmo for single selection
  const singleSelectedId =
    selectedPartIds.size === 1
      ? Array.from(selectedPartIds)[0]!
      : null;

  // Check if selection is a part or an instance
  const selectedPart = singleSelectedId
    ? parts.find((p) => p.id === singleSelectedId)
    : null;
  const selectedInstance = singleSelectedId
    ? document.instances?.find((i) => i.id === singleSelectedId)
    : null;

  // We can transform either a part or an instance (but not joints)
  const hasTransformableSelection = selectedPart !== null || selectedInstance !== null;

  // Sync proxy position from IR when selection/document changes (but not during drag)
  useEffect(() => {
    if (!proxy || !hasTransformableSelection) return;
    if (isDraggingRef.current) return;

    if (selectedPart) {
      // Handle part transform (from nodes)
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
    } else if (selectedInstance) {
      // Handle instance transform
      const transform = selectedInstance.transform;
      if (transform) {
        proxy.position.set(
          transform.translation.x,
          transform.translation.y,
          transform.translation.z,
        );
        proxy.rotation.set(
          transform.rotation.x * DEG2RAD,
          transform.rotation.y * DEG2RAD,
          transform.rotation.z * DEG2RAD,
        );
        proxy.scale.set(
          transform.scale.x,
          transform.scale.y,
          transform.scale.z,
        );
      } else {
        // Default identity transform
        proxy.position.set(0, 0, 0);
        proxy.rotation.set(0, 0, 0);
        proxy.scale.set(1, 1, 1);
      }
    }
  }, [proxy, selectedPart, selectedInstance, hasTransformableSelection, document]);

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
      if (!proxy || !singleSelectedId) return;

      const store = useDocumentStore.getState();

      if (selectedPart) {
        // Update part transform
        if (transformMode === "translate") {
          store.setTranslation(
            singleSelectedId,
            { x: proxy.position.x, y: proxy.position.y, z: proxy.position.z },
            true, // skipUndo — we pushed at drag start
          );
        } else if (transformMode === "rotate") {
          store.setRotation(
            singleSelectedId,
            {
              x: proxy.rotation.x * RAD2DEG,
              y: proxy.rotation.y * RAD2DEG,
              z: proxy.rotation.z * RAD2DEG,
            },
            true,
          );
        } else if (transformMode === "scale") {
          store.setScale(
            singleSelectedId,
            { x: proxy.scale.x, y: proxy.scale.y, z: proxy.scale.z },
            true,
          );
        }
      } else if (selectedInstance) {
        // Update instance transform (all in one call)
        store.setInstanceTransform(
          singleSelectedId,
          {
            translation: {
              x: proxy.position.x,
              y: proxy.position.y,
              z: proxy.position.z,
            },
            rotation: {
              x: proxy.rotation.x * RAD2DEG,
              y: proxy.rotation.y * RAD2DEG,
              z: proxy.rotation.z * RAD2DEG,
            },
            scale: {
              x: proxy.scale.x,
              y: proxy.scale.y,
              z: proxy.scale.z,
            },
          },
          true, // skipUndo
        );
      }
    };

    controls.addEventListener("objectChange", onObjectChange);
    return () => {
      controls.removeEventListener("objectChange", onObjectChange);
    };
  }, [proxy, singleSelectedId, selectedPart, selectedInstance, transformMode]);

  if (!hasTransformableSelection) return null;

  const snapProps = gridSnap
    ? {
        translationSnap: snapIncrement,
        rotationSnap: (Math.PI / 180) * 15,
        scaleSnap: 0.1,
      }
    : {};

  return (
    <>
      <object3D ref={proxyCallbackRef} />
      {proxy && (
        <TransformControls
          ref={controlsRef}
          object={proxy}
          mode={transformMode}
          size={0.8}
          {...snapProps}
        />
      )}
    </>
  );
}
