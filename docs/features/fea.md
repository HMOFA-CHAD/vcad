# FEA (Finite Element Analysis)

## Overview

Engineers need stress validation before manufacturing. vcad implements a hybrid client-server FEA architecture that balances computational power with browser accessibility.

## Architecture

The FEA pipeline consists of three stages:

1. **Preprocessing**: BRep → Mesh (via Gmsh) → Materials/BCs/Loads
2. **Solver**: CalculiX (server) or lightweight WASM (<10k DOF)
3. **Postprocessing**: Parse results → Color mapping → Three.js visualization

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   BRep      │────▶│   Gmsh      │────▶│  Solver     │────▶│  Visualize  │
│   Model     │     │   Meshing   │     │  CalculiX   │     │  Three.js   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                   │
                          ▼                   ▼
                    Materials/BCs         Results
                    Loads                 (.frd/.vtu)
```

## Solver Comparison

| Solver | Strengths | Best For |
|--------|-----------|----------|
| CalculiX | Abaqus-compatible, good docs | Primary - structural |
| Code_Aster | Excellent nonlinear | Advanced structural |
| Elmer | Best multiphysics | Thermal-structural coupling |

**Primary choice**: CalculiX for its Abaqus input format compatibility and extensive documentation.

## Mesh Generation

### Tool: Gmsh

Gmsh provides robust mesh generation with STEP import support.

### Pipeline

1. Export vcad model to STEP format
2. Import STEP into Gmsh
3. Apply mesh control parameters (element size, refinement regions)
4. Generate tetrahedral mesh
5. Export to `.inp` format for solver

### Quality Metrics

- **Boundary conformance**: Mesh must capture all geometric features
- **Dihedral angles**: Avoid degenerate elements (target >20°)
- **Aspect ratio**: Keep elements well-shaped (target <5:1)

## Analysis Types

| Type | Complexity | Effort |
|------|------------|--------|
| Linear Static | Low | 2-3 weeks |
| Modal | Low-Medium | 1-2 weeks |
| Steady-State Thermal | Low | 1-2 weeks |
| Coupled Thermo-Structural | Medium | 3-4 weeks |
| Nonlinear | High | 4-6 weeks |

### Linear Static

Standard stress/strain analysis under applied loads. Foundation for all other analyses.

### Modal Analysis

Compute natural frequencies and mode shapes. Critical for vibration-sensitive designs.

### Thermal Analysis

Steady-state temperature distribution under heat sources and boundary conditions.

### Coupled Thermo-Structural

Sequential or fully-coupled thermal-mechanical analysis for thermal stress evaluation.

### Nonlinear

Large deformation, material nonlinearity, or contact. Requires iterative Newton-Raphson solver.

## Data Formats

| Format | Purpose | Direction |
|--------|---------|-----------|
| `.inp` | Abaqus input format | Solver input |
| `.frd` | CalculiX results | Solver output |
| `.vtu` | VTK unstructured grid | Visualization |
| `.unv` | I-deas Universal | Interchange |

### Workflow

```
vcad document → STEP → Gmsh → .inp → CalculiX → .frd → .vtu → Three.js
```

## WASM Feasibility

### Assessment

| Approach | Feasibility | Notes |
|----------|-------------|-------|
| Small FEA solver | Feasible | FEAScript demonstrates this approach |
| Full CalculiX | Very difficult | Fortran codebase, BLAS/LAPACK dependencies |
| Custom solver | Moderate | 2-4 months for basic linear static |

### Recommendation

- **Server**: Models >10k DOF, nonlinear, complex analyses
- **WASM**: Models <10k DOF, quick validation, offline use

The 10k DOF threshold balances reasonable browser performance with useful analysis scope (simple parts, preliminary checks).

## Visualization

### Three.js Integration

FEA results display as vertex-colored meshes in the existing Three.js viewport.

### Features

- **Stress/strain contours**: Vertex colors mapped from result fields
- **Deformed shape**: Scaled displacement overlay (adjustable scale factor)
- **Modal animation**: Animated mode shapes at computed frequencies
- **Color scale legend**: Min/max values with color gradient
- **Probing**: Click to query nodal/element values
- **Section cuts**: Plane-based clipping for internal stress visualization

### Color Mapping

```typescript
// Von Mises stress to color
const normalizedStress = (vonMises - min) / (max - min);
const color = colorScale.sample(normalizedStress); // Rainbow, thermal, etc.
```

## Document Model Extension

The vcad document format extends to include FEA setup and results:

```json
{
  "feaSetup": {
    "materials": [
      {
        "id": "steel-1",
        "name": "Steel AISI 1020",
        "youngsModulus": 200000,
        "poissonsRatio": 0.3,
        "density": 7850,
        "yieldStrength": 350,
        "thermalConductivity": 51.9,
        "thermalExpansion": 11.7e-6
      }
    ],
    "boundaryConditions": [
      {
        "id": "bc-1",
        "type": "fixed",
        "faceIds": ["face-123", "face-456"],
        "dofs": ["dx", "dy", "dz", "rx", "ry", "rz"]
      }
    ],
    "loads": [
      {
        "id": "load-1",
        "type": "pressure",
        "faceIds": ["face-789"],
        "magnitude": 10.0,
        "unit": "MPa"
      },
      {
        "id": "load-2",
        "type": "force",
        "faceIds": ["face-012"],
        "vector": [0, 0, -1000],
        "unit": "N"
      }
    ],
    "meshSettings": {
      "elementSize": 5.0,
      "refinementRegions": [],
      "elementOrder": 2
    }
  },
  "feaResults": {
    "analysisType": "linearStatic",
    "timestamp": "2024-01-15T10:30:00Z",
    "displacement": {
      "url": "results/displacement.vtu",
      "maxMagnitude": 0.123
    },
    "stress": {
      "url": "results/stress.vtu",
      "maxVonMises": 245.6,
      "maxPrincipal": 267.3
    },
    "strain": {
      "url": "results/strain.vtu"
    }
  }
}
```

## MCP Tools

### analyze_stress

Run structural analysis on the current model.

```typescript
interface AnalyzeStressParams {
  documentId: string;
  analysisType: 'linearStatic' | 'modal' | 'thermal';
  meshSize?: number;
}

interface AnalyzeStressResult {
  jobId: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  maxVonMises?: number;
  safetyFactor?: number;
}
```

### get_fea_results

Retrieve completed analysis results.

```typescript
interface GetFeaResultsParams {
  jobId: string;
  fields?: ('displacement' | 'stress' | 'strain')[];
}

interface GetFeaResultsResult {
  status: 'complete' | 'pending' | 'failed';
  results?: {
    displacement: { max: number; field: Float32Array };
    stress: { vonMises: { max: number; field: Float32Array } };
  };
}
```

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)

End-to-end linear static analysis with server-side solver.

- [ ] STEP export for meshing
- [ ] Gmsh integration for mesh generation
- [ ] Material property UI
- [ ] Boundary condition assignment (face selection)
- [ ] Load application (pressure, force)
- [ ] CalculiX job submission
- [ ] Result parsing (.frd → .vtu)
- [ ] Basic stress contour visualization

### Phase 2: Enhanced Analysis (4-6 weeks)

Additional analysis types and improved workflow.

- [ ] Modal analysis (frequencies, mode shapes)
- [ ] Steady-state thermal analysis
- [ ] Coupled thermo-structural
- [ ] Mesh refinement controls
- [ ] Convergence study tools
- [ ] Report generation

### Phase 3: Browser FEA (4-6 weeks)

WASM-based solver for small models.

- [ ] Custom linear FEM solver in Rust
- [ ] WASM compilation and integration
- [ ] Automatic server/WASM routing based on model size
- [ ] Offline analysis capability
- [ ] Progressive result streaming

### Phase 4: Advanced (ongoing)

Complex analysis capabilities.

- [ ] Geometric nonlinearity (large deformation)
- [ ] Material nonlinearity (plasticity)
- [ ] Contact analysis
- [ ] Fatigue life estimation
- [ ] Topology optimization integration
