/**
 * Triplanar projection for seamless texturing on arbitrary geometry.
 * Projects texture coordinates from world space along each axis.
 */

export const triplanarChunk = /* glsl */ `
// Compute triplanar blend weights from world normal
vec3 triplanarBlend(vec3 normal) {
  vec3 blend = abs(normal);
  // Sharpen the blend with power function
  blend = pow(blend, vec3(4.0));
  // Normalize so weights sum to 1
  blend /= (blend.x + blend.y + blend.z);
  return blend;
}

// Sample a value using triplanar projection
// valueX: value sampled using YZ coords
// valueY: value sampled using XZ coords
// valueZ: value sampled using XY coords
float triplanarSample(float valueX, float valueY, float valueZ, vec3 blend) {
  return valueX * blend.x + valueY * blend.y + valueZ * blend.z;
}

// Sample a color using triplanar projection
vec3 triplanarSampleVec3(vec3 valueX, vec3 valueY, vec3 valueZ, vec3 blend) {
  return valueX * blend.x + valueY * blend.y + valueZ * blend.z;
}
`;
