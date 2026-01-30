/**
 * Fractal Brownian Motion - layered noise for natural patterns.
 * Requires noise.glsl.ts to be included first.
 */

export const fbmChunk = /* glsl */ `
// Fractal Brownian Motion - 4 octaves
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// FBM with configurable octaves
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < octaves; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// 2D FBM
float fbm2(vec2 p) {
  return fbm(vec3(p, 0.0));
}
`;
