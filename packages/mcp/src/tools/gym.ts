/**
 * Gym-style physics simulation tools for RL training.
 *
 * These tools provide a gym-like interface for simulating robot assemblies
 * with physics, enabling reinforcement learning training.
 */

import type { Document } from "@vcad/ir";

/** Observation from the robot environment */
export interface Observation {
  joint_positions: number[];
  joint_velocities: number[];
  end_effector_poses: Array<[number, number, number, number, number, number, number]>;
}

/** Step result from the environment */
export interface StepResult {
  observation: Observation;
  reward: number;
  done: boolean;
}

/** Active simulation environment state */
interface SimulationState {
  doc: Document;
  endEffectorIds: string[];
  dt: number;
  substeps: number;
  maxSteps: number;
  currentStep: number;
  jointPositions: Map<string, number>;
  jointVelocities: Map<string, number>;
  jointIds: string[];
}

/** In-memory storage for active simulations */
const simulations = new Map<string, SimulationState>();
let nextSimId = 1;

/** JSON Schema for create_robot_env input */
export const createRobotEnvSchema = {
  type: "object" as const,
  properties: {
    document: {
      type: "object" as const,
      description: "vcad IR Document describing the robot assembly",
    },
    end_effector_ids: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Instance IDs to track as end effectors",
    },
    dt: {
      type: "number" as const,
      description: "Simulation timestep in seconds (default: 1/240)",
    },
    substeps: {
      type: "number" as const,
      description: "Number of physics substeps per step (default: 4)",
    },
    max_steps: {
      type: "number" as const,
      description: "Maximum episode length (default: 1000)",
    },
  },
  required: ["document", "end_effector_ids"],
};

/** JSON Schema for gym_step input */
export const gymStepSchema = {
  type: "object" as const,
  properties: {
    env_id: {
      type: "string" as const,
      description: "Environment ID returned by create_robot_env",
    },
    action_type: {
      type: "string" as const,
      enum: ["torque", "position", "velocity"],
      description: "Type of action to apply",
    },
    values: {
      type: "array" as const,
      items: { type: "number" as const },
      description:
        "Action values for each joint (Nm for torque, degrees/mm for position, deg/s or mm/s for velocity)",
    },
  },
  required: ["env_id", "action_type", "values"],
};

/** JSON Schema for gym_reset input */
export const gymResetSchema = {
  type: "object" as const,
  properties: {
    env_id: {
      type: "string" as const,
      description: "Environment ID returned by create_robot_env",
    },
  },
  required: ["env_id"],
};

/** JSON Schema for gym_observe input */
export const gymObserveSchema = {
  type: "object" as const,
  properties: {
    env_id: {
      type: "string" as const,
      description: "Environment ID returned by create_robot_env",
    },
  },
  required: ["env_id"],
};

/** JSON Schema for gym_close input */
export const gymCloseSchema = {
  type: "object" as const,
  properties: {
    env_id: {
      type: "string" as const,
      description: "Environment ID to close",
    },
  },
  required: ["env_id"],
};

/** Extract joint IDs from document */
function extractJointIds(doc: Document): string[] {
  if (!doc.joints) return [];
  return doc.joints.map((j) => j.id);
}

/** Create initial observation from state */
function createObservation(state: SimulationState): Observation {
  const positions: number[] = [];
  const velocities: number[] = [];

  for (const jointId of state.jointIds) {
    positions.push(state.jointPositions.get(jointId) ?? 0);
    velocities.push(state.jointVelocities.get(jointId) ?? 0);
  }

  // For now, return zeros for end effector poses
  // A full implementation would compute forward kinematics
  const endEffectorPoses: Array<
    [number, number, number, number, number, number, number]
  > = state.endEffectorIds.map(() => [0, 0, 0, 1, 0, 0, 0]);

  return {
    joint_positions: positions,
    joint_velocities: velocities,
    end_effector_poses: endEffectorPoses,
  };
}

/** Create a new robot simulation environment */
export function createRobotEnv(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  const args = input as {
    document: Document;
    end_effector_ids: string[];
    dt?: number;
    substeps?: number;
    max_steps?: number;
  };

  const envId = `sim_${nextSimId++}`;
  const jointIds = extractJointIds(args.document);

  // Initialize joint state
  const jointPositions = new Map<string, number>();
  const jointVelocities = new Map<string, number>();

  // Initialize from document joint states
  if (args.document.joints) {
    for (const joint of args.document.joints) {
      jointPositions.set(joint.id, joint.state ?? 0);
      jointVelocities.set(joint.id, 0);
    }
  }

  const state: SimulationState = {
    doc: args.document,
    endEffectorIds: args.end_effector_ids,
    dt: args.dt ?? 1 / 240,
    substeps: args.substeps ?? 4,
    maxSteps: args.max_steps ?? 1000,
    currentStep: 0,
    jointPositions,
    jointVelocities,
    jointIds,
  };

  simulations.set(envId, state);

  const info = {
    env_id: envId,
    num_joints: jointIds.length,
    joint_ids: jointIds,
    end_effector_ids: args.end_effector_ids,
    action_dim: jointIds.length,
    observation_dim: jointIds.length * 2 + args.end_effector_ids.length * 7,
    dt: state.dt,
    substeps: state.substeps,
    max_steps: state.maxSteps,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
  };
}

/** Step the simulation with an action */
export function gymStep(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  const args = input as {
    env_id: string;
    action_type: "torque" | "position" | "velocity";
    values: number[];
  };

  const state = simulations.get(args.env_id);
  if (!state) {
    return {
      content: [
        { type: "text", text: JSON.stringify({ error: `Unknown env_id: ${args.env_id}` }) },
      ],
    };
  }

  // Apply action based on type
  for (let i = 0; i < state.jointIds.length && i < args.values.length; i++) {
    const jointId = state.jointIds[i];

    switch (args.action_type) {
      case "position":
        // Set target position directly (simplified simulation)
        state.jointPositions.set(jointId, args.values[i]);
        break;
      case "velocity":
        // Apply velocity and update position (simplified)
        state.jointVelocities.set(jointId, args.values[i]);
        const currentPos = state.jointPositions.get(jointId) ?? 0;
        const deltaPos = args.values[i] * state.dt * state.substeps;
        state.jointPositions.set(jointId, currentPos + deltaPos);
        break;
      case "torque":
        // Torque control (simplified - would need mass/inertia for real simulation)
        // For now, treat torque as acceleration and update velocity
        const currentVel = state.jointVelocities.get(jointId) ?? 0;
        const newVel = currentVel + args.values[i] * state.dt * state.substeps * 0.01;
        state.jointVelocities.set(jointId, newVel);
        const pos = state.jointPositions.get(jointId) ?? 0;
        state.jointPositions.set(jointId, pos + newVel * state.dt * state.substeps);
        break;
    }
  }

  state.currentStep++;

  const observation = createObservation(state);
  const reward = 0; // Placeholder - would be task-specific
  const done = state.currentStep >= state.maxSteps;

  const result: StepResult = { observation, reward, done };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

/** Reset the environment to initial state */
export function gymReset(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  const args = input as { env_id: string };

  const state = simulations.get(args.env_id);
  if (!state) {
    return {
      content: [
        { type: "text", text: JSON.stringify({ error: `Unknown env_id: ${args.env_id}` }) },
      ],
    };
  }

  // Reset to initial state
  state.currentStep = 0;
  state.jointPositions.clear();
  state.jointVelocities.clear();

  if (state.doc.joints) {
    for (const joint of state.doc.joints) {
      state.jointPositions.set(joint.id, joint.state ?? 0);
      state.jointVelocities.set(joint.id, 0);
    }
  }

  const observation = createObservation(state);

  return {
    content: [{ type: "text", text: JSON.stringify(observation, null, 2) }],
  };
}

/** Get current observation without stepping */
export function gymObserve(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  const args = input as { env_id: string };

  const state = simulations.get(args.env_id);
  if (!state) {
    return {
      content: [
        { type: "text", text: JSON.stringify({ error: `Unknown env_id: ${args.env_id}` }) },
      ],
    };
  }

  const observation = createObservation(state);

  return {
    content: [{ type: "text", text: JSON.stringify(observation, null, 2) }],
  };
}

/** Close and clean up a simulation environment */
export function gymClose(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  const args = input as { env_id: string };

  if (simulations.has(args.env_id)) {
    simulations.delete(args.env_id);
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }) }],
    };
  }

  return {
    content: [
      { type: "text", text: JSON.stringify({ error: `Unknown env_id: ${args.env_id}` }) },
    ],
  };
}
