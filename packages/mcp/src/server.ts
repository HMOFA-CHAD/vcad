/**
 * MCP server implementation with vcad tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Engine } from "@vcad/engine";
import { createCadDocument, createCadDocumentSchema } from "./tools/create.js";
import { exportCad, exportCadSchema } from "./tools/export.js";
import { inspectCad, inspectCadSchema } from "./tools/inspect.js";
import {
  createRobotEnv,
  createRobotEnvSchema,
  gymStep,
  gymStepSchema,
  gymReset,
  gymResetSchema,
  gymObserve,
  gymObserveSchema,
  gymClose,
  gymCloseSchema,
} from "./tools/gym.js";

export async function createServer(): Promise<Server> {
  // Initialize the WASM engine
  const engine = await Engine.init();

  const server = new Server(
    {
      name: "vcad",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "create_cad_document",
        description:
          "Create a CAD document from structured geometry input. Returns an IR document that can be exported or inspected.\n\n" +
          "Primitive origins:\n" +
          "- Cube: corner at (0,0,0), extends to (size.x, size.y, size.z)\n" +
          "- Cylinder: base center at (0,0,0), height along +Z\n" +
          "- Sphere: center at (0,0,0)\n" +
          "- Cone: base center at (0,0,0), height along +Z\n\n" +
          "Positioning:\n" +
          "- Absolute: {x: 25, y: 15, z: 0}\n" +
          "- Named: 'center', 'top-center', 'bottom-center'\n" +
          "- Percentage: {x: '50%', y: '50%'}\n\n" +
          "Hole operation: {type: 'hole', diameter: 3, at: 'center'} creates a vertical through-hole. " +
          "Omit 'depth' for through-hole, or specify depth in mm for blind hole.",
        inputSchema: createCadDocumentSchema,
      },
      {
        name: "export_cad",
        description:
          "Export a CAD document to a file. Supports STL (3D printing) and GLB (visualization) formats. Format is determined by file extension.",
        inputSchema: exportCadSchema,
      },
      {
        name: "inspect_cad",
        description:
          "Inspect a CAD document to get geometry properties: volume, surface area, bounding box, center of mass, and triangle count.",
        inputSchema: inspectCadSchema,
      },
      {
        name: "create_robot_env",
        description:
          "Create a physics simulation environment from a vcad assembly. " +
          "Returns an environment ID that can be used with gym_step, gym_reset, and gym_observe. " +
          "The environment provides a gym-style interface for RL training.",
        inputSchema: createRobotEnvSchema,
      },
      {
        name: "gym_step",
        description:
          "Step the physics simulation with an action. " +
          "action_type can be 'torque' (Nm), 'position' (degrees/mm), or 'velocity' (deg/s or mm/s). " +
          "Returns observation (joint positions/velocities, end effector poses), reward, and done flag.",
        inputSchema: gymStepSchema,
      },
      {
        name: "gym_reset",
        description:
          "Reset the simulation environment to its initial state. Returns the initial observation.",
        inputSchema: gymResetSchema,
      },
      {
        name: "gym_observe",
        description:
          "Get the current observation from the simulation without stepping. " +
          "Returns joint positions, velocities, and end effector poses.",
        inputSchema: gymObserveSchema,
      },
      {
        name: "gym_close",
        description: "Close and clean up a simulation environment.",
        inputSchema: gymCloseSchema,
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "create_cad_document":
          return createCadDocument(args);

        case "export_cad":
          return exportCad(args, engine);

        case "inspect_cad":
          return inspectCad(args, engine);

        case "create_robot_env":
          return createRobotEnv(args);

        case "gym_step":
          return gymStep(args);

        case "gym_reset":
          return gymReset(args);

        case "gym_observe":
          return gymObserve(args);

        case "gym_close":
          return gymClose(args);

        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
