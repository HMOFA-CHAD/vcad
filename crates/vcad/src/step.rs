//! STEP file import/export support.
//!
//! STEP (ISO 10303) is the standard format for exchanging CAD data.
//! This module provides access to vcad's native STEP implementation.
//!
//! # Feature Flag
//!
//! STEP support is always available through the vcad kernel. The `step` feature
//! flag controls whether STEP-related methods are exposed on the `Part` type.
//!
//! # Limitations
//!
//! - STEP export only works for solids that still have B-rep data. After boolean
//!   operations, solids are converted to mesh representation and cannot be exported
//!   to STEP format.
//! - Only AP214 (Automotive Design) protocol is supported.

// Re-export error types from the kernel
pub use vcad_kernel::vcad_kernel_step::StepError;
pub use vcad_kernel::StepExportError;

/// Check if STEP support is available.
///
/// This always returns `true` as STEP support is built into the vcad kernel.
/// The `step` feature flag controls whether STEP methods are exposed on `Part`.
pub fn is_available() -> bool {
    true
}
