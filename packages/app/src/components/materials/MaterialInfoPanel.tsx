/**
 * MaterialInfoPanel - Rich tooltip showing material properties and mass estimate.
 */

import { Suspense } from "react";
import type { MaterialPreset } from "@/data/materials";
import { CATEGORY_LABELS } from "@/data/materials";
import { formatMass, computeMass } from "@vcad/core";
import { MaterialPreview3D } from "./MaterialPreview3D";

interface MaterialInfoPanelProps {
  material: MaterialPreset;
  volumeMm3?: number;
}

function Preview3DFallback() {
  return (
    <div className="w-20 h-20 rounded-lg bg-gradient-to-b from-neutral-700 to-neutral-800 animate-pulse" />
  );
}

export function MaterialInfoPanel({ material, volumeMm3 }: MaterialInfoPanelProps) {
  const massKg = volumeMm3 ? computeMass(volumeMm3, material.density) : null;

  return (
    <div className="w-56 p-2 space-y-2">
      {/* 3D Preview + Header */}
      <div className="flex gap-3">
        <Suspense fallback={<Preview3DFallback />}>
          <MaterialPreview3D material={material} size={80} />
        </Suspense>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text truncate">{material.name}</div>
          <div className="text-[10px] text-text-muted mb-2">
            {CATEGORY_LABELS[material.category]}
          </div>
          {/* Compact properties */}
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-text-muted">Metallic</span>
              <span className="text-text tabular-nums">{material.metallic.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Roughness</span>
              <span className="text-text tabular-nums">{material.roughness.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Physical properties */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-text-muted">Density</span>
          <span className="text-text tabular-nums">
            {material.density.toLocaleString()} kg/m³
          </span>
        </div>
        {massKg !== null && (
          <div className="flex justify-between">
            <span className="text-text-muted">Est. Mass</span>
            <span className="text-text font-medium tabular-nums">
              ~{formatMass(massKg)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
