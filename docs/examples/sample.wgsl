// Sample WGSL shader — vertex + fragment with uniforms

struct Uniforms {
  modelMatrix : mat4x4f,
  viewProj : mat4x4f,
  time : f32,
}

struct VertexIn {
  @location(0) position : vec3f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
}

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) worldNormal : vec3f,
  @location(1) uv : vec2f,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(1) @binding(0) var diffuseTex : texture_2d<f32>;
@group(1) @binding(1) var diffuseSampler : sampler;

@vertex
fn vs_main(in : VertexIn) -> VertexOut {
  var out : VertexOut;
  let worldPos = uniforms.modelMatrix * vec4f(in.position, 1.0);
  out.position = uniforms.viewProj * worldPos;
  out.worldNormal = normalize((uniforms.modelMatrix * vec4f(in.normal, 0.0)).xyz);
  out.uv = in.uv;
  return out;
}

@fragment
fn fs_main(in : VertexOut) -> @location(0) vec4f {
  let light = normalize(vec3f(1.0, 2.0, 3.0));
  let diffuse = max(dot(in.worldNormal, light), 0.0);
  let color = textureSample(diffuseTex, diffuseSampler, in.uv);
  return vec4f(color.rgb * diffuse, color.a);
}
