import { describe, it, expect, beforeAll } from "vitest";
import { Engine } from "@vcad/engine";
import { createCadDocument } from "../tools/create.js";
import { exportCad } from "../tools/export.js";
import { inspectCad } from "../tools/inspect.js";
import {
  createRobotEnv,
  gymStep,
  gymReset,
  gymObserve,
  gymClose,
} from "../tools/gym.js";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

describe("create_cad_document", () => {
  it("creates a simple cube", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "test_cube",
          primitive: { type: "cube", size: { x: 10, y: 20, z: 30 } },
        },
      ],
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const doc = JSON.parse(result.content[0].text);
    expect(doc.version).toBe("0.1");
    expect(doc.roots).toHaveLength(1);
    expect(Object.keys(doc.nodes)).toHaveLength(1);
  });

  it("creates a cylinder with difference", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "plate_with_hole",
          primitive: { type: "cube", size: { x: 50, y: 50, z: 5 } },
          operations: [
            {
              type: "difference",
              primitive: { type: "cylinder", radius: 5, height: 10 },
              at: { x: 25, y: 25, z: -2.5 },
            },
          ],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    expect(doc.roots).toHaveLength(1);
    // Cube + cylinder + translate + difference = 4 nodes
    expect(Object.keys(doc.nodes).length).toBeGreaterThanOrEqual(3);
  });

  it("supports multiple parts", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "part1",
          primitive: { type: "cube", size: { x: 10, y: 10, z: 10 } },
        },
        {
          name: "part2",
          primitive: { type: "sphere", radius: 5 },
          operations: [{ type: "translate", offset: { x: 20, y: 0, z: 0 } }],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    expect(doc.roots).toHaveLength(2);
  });

  it("creates a hole with 'center' positioning", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "plate_with_hole",
          primitive: { type: "cube", size: { x: 50, y: 50, z: 5 } },
          operations: [
            {
              type: "hole",
              diameter: 6,
              at: "center",
            },
          ],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    expect(doc.roots).toHaveLength(1);
    // Should have: cube + cylinder + translate + difference = 4 nodes
    expect(Object.keys(doc.nodes).length).toBe(4);

    // Verify the difference operation exists
    const nodes = Object.values(doc.nodes) as Array<{
      op: { type: string };
    }>;
    const hasHole = nodes.some((n) => n.op.type === "Difference");
    expect(hasHole).toBe(true);
  });

  it("supports percentage positioning", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "plate",
          primitive: { type: "cube", size: { x: 100, y: 100, z: 10 } },
          operations: [
            {
              type: "difference",
              primitive: { type: "cylinder", radius: 5, height: 15 },
              at: { x: "25%", y: "75%" },
            },
          ],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    // Find the translate node and verify position
    const nodes = Object.values(doc.nodes) as Array<{
      op: { type: string; offset?: { x: number; y: number; z: number } };
    }>;
    const translateNode = nodes.find((n) => n.op.type === "Translate");
    expect(translateNode).toBeDefined();
    // 25% of 100 = 25, 75% of 100 = 75
    expect(translateNode!.op.offset!.x).toBe(25);
    expect(translateNode!.op.offset!.y).toBe(75);
  });

  it("creates through-hole with auto-sized depth", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "block",
          primitive: { type: "cube", size: { x: 20, y: 20, z: 30 } },
          operations: [
            {
              type: "hole",
              diameter: 10,
              at: "center",
            },
          ],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    // Find the cylinder node and verify height extends past part
    const nodes = Object.values(doc.nodes) as Array<{
      op: { type: string; height?: number };
    }>;
    const cylinderNode = nodes.find((n) => n.op.type === "Cylinder");
    expect(cylinderNode).toBeDefined();
    // Through-hole height should be > part height (30) to ensure clean cut
    expect(cylinderNode!.op.height).toBeGreaterThan(30);
  });

  it("creates blind hole with specified depth", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "block",
          primitive: { type: "cube", size: { x: 20, y: 20, z: 30 } },
          operations: [
            {
              type: "hole",
              diameter: 8,
              depth: 15,
              at: "center",
            },
          ],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    // Find the cylinder node and verify height matches depth
    const nodes = Object.values(doc.nodes) as Array<{
      op: { type: string; height?: number };
    }>;
    const cylinderNode = nodes.find((n) => n.op.type === "Cylinder");
    expect(cylinderNode).toBeDefined();
    expect(cylinderNode!.op.height).toBe(15);
  });

  it("supports named position 'top-center'", () => {
    const result = createCadDocument({
      parts: [
        {
          name: "block",
          primitive: { type: "cube", size: { x: 40, y: 40, z: 20 } },
          operations: [
            {
              type: "difference",
              primitive: { type: "sphere", radius: 5 },
              at: "top-center",
            },
          ],
        },
      ],
    });

    const doc = JSON.parse(result.content[0].text);
    const nodes = Object.values(doc.nodes) as Array<{
      op: { type: string; offset?: { x: number; y: number; z: number } };
    }>;
    const translateNode = nodes.find((n) => n.op.type === "Translate");
    expect(translateNode).toBeDefined();
    // top-center of cube 40x40x20: x=20, y=20, z=20
    expect(translateNode!.op.offset!.x).toBe(20);
    expect(translateNode!.op.offset!.y).toBe(20);
    expect(translateNode!.op.offset!.z).toBe(20);
  });
});

describe("inspect_cad", () => {
  let engine: Engine;

  beforeAll(async () => {
    engine = await Engine.init();
  });

  it("inspects a cube", () => {
    const createResult = createCadDocument({
      parts: [
        {
          name: "test_cube",
          primitive: { type: "cube", size: { x: 10, y: 10, z: 10 } },
        },
      ],
    });
    const doc = JSON.parse(createResult.content[0].text);

    const result = inspectCad({ ir: doc }, engine);
    const props = JSON.parse(result.content[0].text);

    // 10x10x10 cube = 1000 mm^3
    expect(props.volume_mm3).toBeCloseTo(1000, 0);
    // Surface area = 6 * 100 = 600 mm^2
    expect(props.surface_area_mm2).toBeCloseTo(600, 0);
    expect(props.triangles).toBeGreaterThan(0);
    expect(props.parts).toBe(1);
  });
});

describe("export_cad", () => {
  let engine: Engine;

  beforeAll(async () => {
    engine = await Engine.init();
  });

  it("exports to STL", () => {
    const createResult = createCadDocument({
      parts: [
        {
          name: "test_cube",
          primitive: { type: "cube", size: { x: 10, y: 10, z: 10 } },
        },
      ],
    });
    const doc = JSON.parse(createResult.content[0].text);

    const filename = "test_export.stl";
    const filepath = resolve(process.cwd(), filename);

    // Clean up if exists
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }

    const result = exportCad({ ir: doc, filename }, engine);
    const output = JSON.parse(result.content[0].text);

    expect(output.format).toBe("stl");
    expect(output.bytes).toBeGreaterThan(84); // Header + at least one triangle
    expect(existsSync(filepath)).toBe(true);

    // Clean up
    unlinkSync(filepath);
  });

  it("exports to GLB", () => {
    const createResult = createCadDocument({
      parts: [
        {
          name: "test_cube",
          primitive: { type: "cube", size: { x: 10, y: 10, z: 10 } },
        },
      ],
    });
    const doc = JSON.parse(createResult.content[0].text);

    const filename = "test_export.glb";
    const filepath = resolve(process.cwd(), filename);

    // Clean up if exists
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }

    const result = exportCad({ ir: doc, filename }, engine);
    const output = JSON.parse(result.content[0].text);

    expect(output.format).toBe("glb");
    expect(output.bytes).toBeGreaterThan(12); // Header
    expect(existsSync(filepath)).toBe(true);

    // Clean up
    unlinkSync(filepath);
  });
});

describe("gym tools", () => {
  const robotDoc = {
    version: "0.1",
    nodes: {
      "1": { id: 1, name: "base", op: { type: "Cube", size: { x: 100, y: 100, z: 50 } } },
      "2": { id: 2, name: "link1", op: { type: "Cube", size: { x: 20, y: 20, z: 100 } } },
    },
    roots: [{ root: 1, material: "default" }],
    part_materials: {},
    part_defs: {
      base: { id: "base", name: "Base", root: 1, default_material: null },
      link1: { id: "link1", name: "Link 1", root: 2, default_material: null },
    },
    instances: [
      { id: "base_inst", part_def_id: "base", name: "Base", transform: null, material: null },
      { id: "link1_inst", part_def_id: "link1", name: "Link 1", transform: null, material: null },
    ],
    joints: [
      {
        id: "joint1",
        name: "Joint 1",
        parent_instance_id: "base_inst",
        child_instance_id: "link1_inst",
        parent_anchor: { x: 0, y: 0, z: 25 },
        child_anchor: { x: 0, y: 0, z: -50 },
        kind: { type: "Revolute", axis: { x: 0, y: 1, z: 0 }, limits: [-90, 90] },
        state: 0,
      },
    ],
    ground_instance_id: "base_inst",
  };

  it("creates robot environment", () => {
    const result = createRobotEnv({
      document: robotDoc,
      end_effector_ids: ["link1_inst"],
    });

    const info = JSON.parse(result.content[0].text);
    expect(info.env_id).toBeDefined();
    expect(info.num_joints).toBe(1);
    expect(info.joint_ids).toContain("joint1");
    expect(info.end_effector_ids).toContain("link1_inst");
    expect(info.action_dim).toBe(1);

    // Clean up
    gymClose({ env_id: info.env_id });
  });

  it("steps with position control", () => {
    const createResult = createRobotEnv({
      document: robotDoc,
      end_effector_ids: ["link1_inst"],
    });
    const envId = JSON.parse(createResult.content[0].text).env_id;

    const stepResult = gymStep({
      env_id: envId,
      action_type: "position",
      values: [45],
    });

    const step = JSON.parse(stepResult.content[0].text);
    expect(step.observation).toBeDefined();
    expect(step.observation.joint_positions).toHaveLength(1);
    expect(step.observation.joint_positions[0]).toBe(45);
    expect(step.reward).toBe(0);
    expect(step.done).toBe(false);

    gymClose({ env_id: envId });
  });

  it("resets environment", () => {
    const createResult = createRobotEnv({
      document: robotDoc,
      end_effector_ids: ["link1_inst"],
    });
    const envId = JSON.parse(createResult.content[0].text).env_id;

    // Move joint
    gymStep({ env_id: envId, action_type: "position", values: [30] });

    // Reset
    const resetResult = gymReset({ env_id: envId });
    const obs = JSON.parse(resetResult.content[0].text);

    expect(obs.joint_positions[0]).toBe(0); // Back to initial state

    gymClose({ env_id: envId });
  });

  it("observes without stepping", () => {
    const createResult = createRobotEnv({
      document: robotDoc,
      end_effector_ids: ["link1_inst"],
    });
    const envId = JSON.parse(createResult.content[0].text).env_id;

    gymStep({ env_id: envId, action_type: "position", values: [60] });

    const observeResult = gymObserve({ env_id: envId });
    const obs = JSON.parse(observeResult.content[0].text);

    expect(obs.joint_positions[0]).toBe(60);
    expect(obs.joint_velocities).toHaveLength(1);
    expect(obs.end_effector_poses).toHaveLength(1);

    gymClose({ env_id: envId });
  });

  it("closes environment", () => {
    const createResult = createRobotEnv({
      document: robotDoc,
      end_effector_ids: ["link1_inst"],
    });
    const envId = JSON.parse(createResult.content[0].text).env_id;

    const closeResult = gymClose({ env_id: envId });
    const closeInfo = JSON.parse(closeResult.content[0].text);
    expect(closeInfo.success).toBe(true);

    // Should error on second close
    const closeAgain = gymClose({ env_id: envId });
    const errorInfo = JSON.parse(closeAgain.content[0].text);
    expect(errorInfo.error).toBeDefined();
  });
});
