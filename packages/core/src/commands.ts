import type { PrimitiveKind, BooleanType, TransformMode } from "./types.js";
import type { JointKind } from "@vcad/ir";

export interface Command {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
  shortcut?: string;
  action: () => void;
  enabled?: () => boolean;
}

export type CommandRegistry = Command[];

export interface CommandActions {
  addPrimitive: (kind: PrimitiveKind) => void;
  applyBoolean: (type: BooleanType) => void;
  setTransformMode: (mode: TransformMode) => void;
  undo: () => void;
  redo: () => void;
  toggleWireframe: () => void;
  toggleGridSnap: () => void;
  toggleFeatureTree: () => void;
  save: () => void;
  open: () => void;
  exportStl: () => void;
  exportGlb: () => void;
  openAbout: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  deselectAll: () => void;
  hasTwoSelected: () => boolean;
  hasSelection: () => boolean;
  hasParts: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // Assembly actions
  createPartDef: () => void;
  insertInstance: () => void;
  addJoint: (kind: JointKind) => void;
  setGroundInstance: () => void;
  hasOnePartSelected: () => boolean;
  hasPartDefs: () => boolean;
  hasTwoInstancesSelected: () => boolean;
  hasOneInstanceSelected: () => boolean;
  // Modify operations
  applyFillet: () => void;
  applyChamfer: () => void;
  applyShell: () => void;
  applyLinearPattern: () => void;
  applyCircularPattern: () => void;
  applyMirror: () => void;
}

export function createCommandRegistry(actions: CommandActions): CommandRegistry {
  return [
    // Primitives
    {
      id: "add-box",
      label: "Add Box",
      icon: "Cube",
      keywords: ["box", "cube", "primitive", "create", "add"],
      action: () => actions.addPrimitive("cube"),
    },
    {
      id: "add-cylinder",
      label: "Add Cylinder",
      icon: "Cylinder",
      keywords: ["cylinder", "primitive", "create", "add", "tube"],
      action: () => actions.addPrimitive("cylinder"),
    },
    {
      id: "add-sphere",
      label: "Add Sphere",
      icon: "Globe",
      keywords: ["sphere", "ball", "primitive", "create", "add"],
      action: () => actions.addPrimitive("sphere"),
    },

    // Booleans
    {
      id: "boolean-union",
      label: "Union",
      icon: "Unite",
      keywords: ["union", "combine", "add", "boolean", "merge"],
      shortcut: "Ctrl+Shift+U",
      action: () => actions.applyBoolean("union"),
      enabled: actions.hasTwoSelected,
    },
    {
      id: "boolean-difference",
      label: "Difference",
      icon: "Subtract",
      keywords: ["difference", "subtract", "cut", "boolean", "minus"],
      shortcut: "Ctrl+Shift+D",
      action: () => actions.applyBoolean("difference"),
      enabled: actions.hasTwoSelected,
    },
    {
      id: "boolean-intersection",
      label: "Intersection",
      icon: "Intersect",
      keywords: ["intersection", "intersect", "boolean", "and"],
      shortcut: "Ctrl+Shift+I",
      action: () => actions.applyBoolean("intersection"),
      enabled: actions.hasTwoSelected,
    },

    // Transform modes
    {
      id: "mode-move",
      label: "Move Mode",
      icon: "ArrowsOutCardinal",
      keywords: ["move", "translate", "position", "transform"],
      shortcut: "M",
      action: () => actions.setTransformMode("translate"),
    },
    {
      id: "mode-rotate",
      label: "Rotate Mode",
      icon: "ArrowClockwise",
      keywords: ["rotate", "spin", "turn", "transform"],
      shortcut: "R",
      action: () => actions.setTransformMode("rotate"),
    },
    {
      id: "mode-scale",
      label: "Scale Mode",
      icon: "ArrowsOut",
      keywords: ["scale", "resize", "size", "transform"],
      shortcut: "S",
      action: () => actions.setTransformMode("scale"),
    },

    // Edit operations
    {
      id: "undo",
      label: "Undo",
      icon: "ArrowCounterClockwise",
      keywords: ["undo", "back", "revert"],
      shortcut: "Ctrl+Z",
      action: actions.undo,
      enabled: actions.canUndo,
    },
    {
      id: "redo",
      label: "Redo",
      icon: "ArrowClockwise",
      keywords: ["redo", "forward"],
      shortcut: "Ctrl+Shift+Z",
      action: actions.redo,
      enabled: actions.canRedo,
    },
    {
      id: "delete",
      label: "Delete Selected",
      icon: "Trash",
      keywords: ["delete", "remove", "trash"],
      shortcut: "Backspace",
      action: actions.deleteSelected,
      enabled: actions.hasSelection,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: "Copy",
      keywords: ["duplicate", "copy", "clone"],
      shortcut: "Ctrl+D",
      action: actions.duplicateSelected,
      enabled: actions.hasSelection,
    },
    {
      id: "deselect",
      label: "Deselect All",
      icon: "X",
      keywords: ["deselect", "clear", "none"],
      shortcut: "Esc",
      action: actions.deselectAll,
    },

    // View toggles
    {
      id: "toggle-wireframe",
      label: "Toggle Wireframe",
      icon: "CubeTransparent",
      keywords: ["wireframe", "edges", "view"],
      shortcut: "X",
      action: actions.toggleWireframe,
    },
    {
      id: "toggle-grid-snap",
      label: "Toggle Grid Snap",
      icon: "GridFour",
      keywords: ["snap", "grid", "align"],
      shortcut: "G",
      action: actions.toggleGridSnap,
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      icon: "SidebarSimple",
      keywords: ["sidebar", "panel", "tree", "features"],
      action: actions.toggleFeatureTree,
    },

    // File operations
    {
      id: "save",
      label: "Save",
      icon: "FloppyDisk",
      keywords: ["save", "export", "file"],
      shortcut: "Ctrl+S",
      action: actions.save,
    },
    {
      id: "open",
      label: "Open",
      icon: "FolderOpen",
      keywords: ["open", "load", "file", "import"],
      shortcut: "Ctrl+O",
      action: actions.open,
    },
    {
      id: "export-stl",
      label: "Export STL",
      icon: "Export",
      keywords: ["export", "stl", "mesh", "3d print"],
      action: actions.exportStl,
      enabled: actions.hasParts,
    },
    {
      id: "export-glb",
      label: "Export GLB",
      icon: "Export",
      keywords: ["export", "glb", "gltf", "mesh"],
      action: actions.exportGlb,
      enabled: actions.hasParts,
    },

    // Help
    {
      id: "about",
      label: "About vcad",
      icon: "Info",
      keywords: ["about", "help", "info", "version"],
      action: actions.openAbout,
    },

    // Assembly commands
    {
      id: "create-part-def",
      label: "Create Part Definition",
      icon: "Package",
      keywords: ["part", "definition", "assembly", "create", "convert"],
      action: actions.createPartDef,
      enabled: actions.hasOnePartSelected,
    },
    {
      id: "insert-instance",
      label: "Insert Instance",
      icon: "PlusSquare",
      keywords: ["insert", "instance", "assembly", "add", "part"],
      action: actions.insertInstance,
      enabled: actions.hasPartDefs,
    },
    {
      id: "add-fixed-joint",
      label: "Add Fixed Joint",
      icon: "Anchor",
      keywords: ["joint", "fixed", "assembly", "connect", "weld"],
      action: () => actions.addJoint({ type: "Fixed" }),
      enabled: actions.hasTwoInstancesSelected,
    },
    {
      id: "add-revolute-joint",
      label: "Add Revolute Joint",
      icon: "ArrowsClockwise",
      keywords: ["joint", "revolute", "hinge", "assembly", "rotate"],
      action: () =>
        actions.addJoint({
          type: "Revolute",
          axis: { x: 0, y: 0, z: 1 },
        }),
      enabled: actions.hasTwoInstancesSelected,
    },
    {
      id: "add-slider-joint",
      label: "Add Slider Joint",
      icon: "ArrowsHorizontal",
      keywords: ["joint", "slider", "prismatic", "assembly", "slide"],
      action: () =>
        actions.addJoint({
          type: "Slider",
          axis: { x: 0, y: 0, z: 1 },
        }),
      enabled: actions.hasTwoInstancesSelected,
    },
    {
      id: "set-ground",
      label: "Set as Ground",
      icon: "Anchor",
      keywords: ["ground", "fix", "base", "assembly", "anchor"],
      action: actions.setGroundInstance,
      enabled: actions.hasOneInstanceSelected,
    },

    // Modify operations
    {
      id: "apply-fillet",
      label: "Fillet",
      icon: "Circle",
      keywords: ["fillet", "round", "radius", "edge"],
      action: actions.applyFillet,
      enabled: actions.hasOnePartSelected,
    },
    {
      id: "apply-chamfer",
      label: "Chamfer",
      icon: "Octagon",
      keywords: ["chamfer", "bevel", "edge", "corner"],
      action: actions.applyChamfer,
      enabled: actions.hasOnePartSelected,
    },
    {
      id: "apply-shell",
      label: "Shell",
      icon: "Cube",
      keywords: ["shell", "hollow", "thickness", "wall"],
      action: actions.applyShell,
      enabled: actions.hasOnePartSelected,
    },
    {
      id: "apply-linear-pattern",
      label: "Linear Pattern",
      icon: "DotsThree",
      keywords: ["pattern", "linear", "array", "repeat", "copy"],
      action: actions.applyLinearPattern,
      enabled: actions.hasOnePartSelected,
    },
    {
      id: "apply-circular-pattern",
      label: "Circular Pattern",
      icon: "CircleNotch",
      keywords: ["pattern", "circular", "radial", "array", "repeat"],
      action: actions.applyCircularPattern,
      enabled: actions.hasOnePartSelected,
    },
    {
      id: "apply-mirror",
      label: "Mirror",
      icon: "ArrowsHorizontal",
      keywords: ["mirror", "reflect", "flip", "symmetry"],
      action: actions.applyMirror,
      enabled: actions.hasOnePartSelected,
    },
  ];
}
