/**
 * Neutronics tools — the `vcad-kernel-neutronics` crate over MCP.
 *
 * `simulate_neutron_shield` runs analog Monte Carlo neutron transport
 * through a spherical shield stack (`spec`) or a room-scale 3D scene of
 * boxes/spheres/cylinders (`scene`: chamber, HDPE castle, concrete room)
 * and returns dose rates — and, for scenes, a voxel dose map and expected
 * instrument readings (moderated ³He counts/min, bubbles/h) — WITH
 * batch-statistics error bars, plus the
 * `vcad.neutronics-claims/1` set and unified-receipt claims. Fail-closed
 * throughout: truncated histories or unscored tallies refuse to price
 * claims (the fix is more histories). Predictions carry
 * `basis: "predicted"` and roll up Provisional — never verified — until
 * a survey meter measurement is bound.
 */

import { behavior, type ToolDef } from "./tool-def.js";

const paramValue = {
  description:
    "A number, or the name of a named parameter bound via `parameters`.",
  anyOf: [{ type: "number" as const }, { type: "string" as const }],
};

const shieldSpecSchema = {
  type: "object" as const,
  required: ["layers", "source", "detectors"],
  description:
    "Spherical shield: concentric layers from r=0 outward around a point " +
    "source, with detector shells that must each sit strictly inside one " +
    "layer (put them in air gaps). Units mm. Any numeric field may " +
    "instead be a string naming a parameter supplied in `parameters` " +
    "(fail-closed: unbound names error).",
  properties: {
    layers: {
      type: "array" as const,
      minItems: 1,
      items: {
        type: "object" as const,
        required: ["material", "thickness_mm"],
        properties: {
          material: {
            type: "string" as const,
            description:
              "Built-in library material: hdpe, paraffin, borated-hdpe-5, " +
              "water, lead, concrete, air, void.",
          },
          thickness_mm: paramValue,
        },
      },
    },
    source: {
      type: "object" as const,
      required: ["rate_n_per_s", "energy_ev"],
      description:
        "Isotropic point source at r=0. Energy must lie in the 5-group " +
        "structure [1e-4, 3e6] eV — D-D 2.45e6 eV is in range; D-T 14.1 " +
        "MeV is rejected.",
      properties: {
        rate_n_per_s: paramValue,
        energy_ev: paramValue,
      },
    },
    detectors: {
      type: "array" as const,
      minItems: 1,
      items: {
        type: "object" as const,
        required: ["label", "radius_mm"],
        properties: {
          label: { type: "string" as const },
          radius_mm: paramValue,
          half_width_mm: {
            ...paramValue,
            description: "Shell half-thickness. Default 20 mm.",
          },
        },
      },
    },
    run: {
      type: "object" as const,
      description: "Monte Carlo controls (deterministic for a given seed).",
      properties: {
        histories_per_batch: {
          type: "number" as const,
          description: "Default 20000.",
        },
        batches: {
          type: "number" as const,
          description: "Error-bar batches (>= 2). Default 20.",
        },
        seed: { type: "number" as const, description: "Default 20260717." },
      },
    },
  },
};

const p3 = {
  type: "array" as const,
  minItems: 3,
  maxItems: 3,
  items: paramValue,
  description: "[x, y, z] in mm (Z-up); entries may be named parameters.",
};

const shapeSchema = {
  type: "object" as const,
  required: ["type"],
  description:
    "Convex primitive (mm). type=box {min_mm,max_mm} | box_centered " +
    "{center_mm,half_mm} | sphere {center_mm,radius_mm} | cylinder " +
    "{base_mm, axis:'x'|'y'|'z', radius_mm, height_mm}.",
  properties: {
    type: {
      type: "string" as const,
      enum: ["box", "box_centered", "sphere", "cylinder"],
    },
    min_mm: p3,
    max_mm: p3,
    center_mm: p3,
    half_mm: p3,
    base_mm: p3,
    axis: { type: "string" as const, enum: ["x", "y", "z"] },
    radius_mm: paramValue,
    height_mm: paramValue,
  },
};

const instrumentSchema = {
  type: "object" as const,
  required: ["type"],
  description:
    "Instrument folded at the detector. moderated_counter {gas:{gas:'he3', " +
    "pressure_atm} | {gas:'bf3', pressure_atm, b10_fraction}, tube_diameter_mm, " +
    "active_length_mm, moderator_thickness_mm (HDPE), counting_efficiency?=1, " +
    "response_histories_per_batch?=10000, response_batches?=10} — response R(E) " +
    "computed by MC through the counter geometry, reported as counts/min. " +
    "bubble {sensitivity_bubbles_per_usv (REQUIRED: each unit's own " +
    "calibration), threshold_ev?=1e5} → bubbles/h. cr39 " +
    "{tracks_per_cm2_per_msv (REQUIRED), threshold_ev?=2e5} → tracks/cm2/h. " +
    "rem_meter {counts_per_usv} (ideal H*(10) follower). Optional `name` labels " +
    "the claim.",
  properties: {
    type: {
      type: "string" as const,
      enum: ["moderated_counter", "bubble", "cr39", "rem_meter"],
    },
    name: { type: "string" as const },
  },
  additionalProperties: true,
};

const sceneSpecSchema = {
  type: "object" as const,
  required: ["cells", "source"],
  description:
    "Room-scale 3D scene. Cells are in PRIORITY order: a point belongs to " +
    "the first cell containing it, so list holes before what they are cut " +
    "from (chamber vacuum sphere, then steel sphere; castle cavity, then " +
    "castle; room air, then concrete). The LAST cell is the world and must " +
    "enclose every other cell (fail-closed); leaving it is leakage. Units mm.",
  properties: {
    cells: {
      type: "array" as const,
      minItems: 1,
      items: {
        type: "object" as const,
        required: ["name", "material", "shape"],
        properties: {
          name: { type: "string" as const },
          material: {
            type: "string" as const,
            description:
              "hdpe, paraffin, borated-hdpe-5, water, lead, concrete, air, " +
              "steel, void.",
          },
          shape: shapeSchema,
        },
      },
    },
    source: {
      type: "object" as const,
      required: ["position_mm", "rate_n_per_s", "energy_ev"],
      description: "Isotropic point source (D-D 2.45e6 eV; max 3e6 eV).",
      properties: {
        position_mm: p3,
        rate_n_per_s: paramValue,
        energy_ev: paramValue,
      },
    },
    detectors: {
      type: "array" as const,
      items: {
        type: "object" as const,
        required: ["label", "position_mm"],
        properties: {
          label: { type: "string" as const },
          position_mm: p3,
          radius_mm: {
            ...paramValue,
            description: "Virtual tally-sphere radius. Default 50 mm.",
          },
          instruments: { type: "array" as const, items: instrumentSchema },
        },
      },
    },
    mesh: {
      type: "object" as const,
      required: ["min_mm", "max_mm", "shape"],
      description:
        "Voxel H*(10) dose map: bounds in mm (literal numbers), shape " +
        "[nx, ny, nz]; a 1-voxel-thick slab at source height is the cheap " +
        "floor-plan map. Each voxel carries its own RSE (null = nothing scored).",
      properties: {
        min_mm: { type: "array" as const, items: { type: "number" as const } },
        max_mm: { type: "array" as const, items: { type: "number" as const } },
        shape: { type: "array" as const, items: { type: "number" as const } },
      },
    },
    run: shieldSpecSchema.properties.run,
  },
};

type Json = Record<string, unknown>;

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export const toolDefs: ToolDef[] = [
  {
    name: "simulate_neutron_shield",
    pack: null,
    description:
      "Monte Carlo neutron shielding run (analog transport, 5-group multigroup library " +
      "with exact elastic kinematics). Pass EITHER `spec` (1D spherical layer stack " +
      "around a point source: H*(10) at detector shells, attenuation factor, thermal " +
      "flux) OR `scene` (room-scale 3D: priority-ordered box/sphere/cylinder cells — " +
      "chamber wall, HDPE castle, concrete floor/walls/door — with room return, an " +
      "optional voxel dose map, and detectors that report expected instrument readings: " +
      "moderated He-3/BF3 counts/min, bubble-dosimeter bubbles/h, CR-39 tracks/cm2/h). " +
      "Every number carries 1-sigma batch error bars (rse) — " +
      "as data plus `vcad.neutronics-claims/1` and unified-receipt claims. " +
      "Fail-closed: truncated histories or a tally that scored nothing refuses claims " +
      "(raise histories). Predictions carry basis \"predicted\" and roll up Provisional " +
      "until surveyed. Design-estimate physics: 5-group library (not ENDF continuous-" +
      "energy), convex-primitive geometry only, no gamma dose (per-cell capture rates are " +
      "the capture-gamma source term), no activation, source energy " +
      "capped at 3 MeV (no D-T). Deterministic per seed. Cost ~histories (cap 5M); " +
      "error bars shrink as 1/sqrt(N). The 400k default runs in seconds.",
    inputSchema: {
      type: "object" as const,
      properties: {
        spec: shieldSpecSchema,
        scene: sceneSpecSchema,
        parameters: {
          type: "object" as const,
          additionalProperties: { type: "number" as const },
          description: "Bindings for named spec parameters, `{name: value}`.",
        },
      },
    },
    handler: (args, ctx) => {
      const a = args as Json;
      const hasSpec = a.spec !== undefined;
      const hasScene = a.scene !== undefined;
      if (hasSpec === hasScene) {
        throw new Error(
          "simulate_neutron_shield takes exactly one of `spec` (1D spherical) or `scene` (3D room)",
        );
      }
      const params = JSON.stringify(a.parameters ?? {});
      const out = hasScene
        ? ctx.engine.neutronicsSimulateScene(JSON.stringify(a.scene), params)
        : ctx.engine.neutronicsSimulate(JSON.stringify(a.spec), params);
      return textResult(out);
    },
    behavior: behavior({}),
  },
];
