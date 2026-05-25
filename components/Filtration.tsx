"use client";

import { useEffect, useRef } from "react";

const VERTEX_SRC = /* glsl */ `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = /* glsl */ `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_field;
uniform float u_t;        // current filtration value, 0..1
uniform float u_pulse;    // 0..1 animation phase for the level-set glow
uniform vec2 u_aspect;    // image w/h scaled to fit

vec3 viridis(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.267, 0.005, 0.329);
  vec3 c1 = vec3(0.190, 0.408, 0.555);
  vec3 c2 = vec3(0.121, 0.633, 0.531);
  vec3 c3 = vec3(0.993, 0.906, 0.144);
  if (t < 0.33) return mix(c0, c1, t / 0.33);
  if (t < 0.66) return mix(c1, c2, (t - 0.33) / 0.33);
  return mix(c2, c3, (t - 0.66) / 0.34);
}

vec3 magma(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.001, 0.000, 0.014);
  vec3 c1 = vec3(0.412, 0.094, 0.502);
  vec3 c2 = vec3(0.929, 0.378, 0.341);
  vec3 c3 = vec3(0.997, 0.831, 0.582);
  if (t < 0.33) return mix(c0, c1, t / 0.33);
  if (t < 0.66) return mix(c1, c2, (t - 0.33) / 0.33);
  return mix(c2, c3, (t - 0.66) / 0.34);
}

void main() {
  vec2 uv = v_uv;
  vec2 c = (uv - 0.5) / u_aspect + 0.5;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) {
    gl_FragColor = vec4(0.02, 0.03, 0.05, 1.0);
    return;
  }
  float f = texture2D(u_field, c).r;

  // Sublevel set { f <= u_t } gets the warm magma palette; the rest is the
  // cool background (viridis × dimming) — the boundary is the level set.
  float inside = step(f, u_t);

  // Width of the "tide front" depends on the local gradient magnitude.
  vec2 px = vec2(1.0 / 256.0);
  float fx = texture2D(u_field, c + vec2(px.x, 0)).r - texture2D(u_field, c - vec2(px.x, 0)).r;
  float fy = texture2D(u_field, c + vec2(0, px.y)).r - texture2D(u_field, c - vec2(0, px.y)).r;
  float grad = max(length(vec2(fx, fy)), 1e-3);
  float band = exp(-pow((f - u_t) / (grad * 0.6 + 0.012), 2.0));

  vec3 cold = viridis(f * 0.85 + 0.05) * 0.35;
  vec3 warm = magma(f) * 1.05;
  vec3 col = mix(cold, warm, inside);

  // Glow on the level set, modulated by the pulse phase.
  vec3 glow = vec3(0.36, 0.95, 1.10) * band * (0.65 + 0.45 * sin(u_pulse * 6.283));
  col += glow;

  // Vignette to settle into the dark UI.
  vec2 d = uv - 0.5;
  float vig = smoothstep(0.95, 0.35, length(d));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

type Props = {
  values: Float32Array;
  width: number;
  height: number;
  /** Filtration value normalized to [0, 1] over [min, max] of the field. */
  t: number;
};

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "unknown";
    gl.deleteShader(sh);
    throw new Error(`shader compile error: ${log}`);
  }
  return sh;
}

export default function Filtration({ values, width, height, t }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    tex: WebGLTexture;
    locT: WebGLUniformLocation | null;
    locPulse: WebGLUniformLocation | null;
    locAspect: WebGLUniformLocation | null;
    raf: number;
    startedAt: number;
    currentT: number;
    width: number;
    height: number;
  } | null>(null);

  // Initialize WebGL once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program link error: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const locPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform1i(gl.getUniformLocation(program, "u_field"), 0);

    stateRef.current = {
      gl,
      program,
      tex,
      locT: gl.getUniformLocation(program, "u_t"),
      locPulse: gl.getUniformLocation(program, "u_pulse"),
      locAspect: gl.getUniformLocation(program, "u_aspect"),
      raf: 0,
      startedAt: performance.now(),
      currentT: 0,
      width: 0,
      height: 0,
    };

    const draw = () => {
      const s = stateRef.current;
      if (!s) return;
      const cv = canvasRef.current;
      if (!cv) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = cv.clientWidth || 1;
      const cssH = cv.clientHeight || 1;
      const targetW = Math.max(1, Math.floor(cssW * dpr));
      const targetH = Math.max(1, Math.floor(cssH * dpr));
      if (cv.width !== targetW || cv.height !== targetH) {
        cv.width = targetW;
        cv.height = targetH;
      }
      s.gl.viewport(0, 0, cv.width, cv.height);
      const pulse = ((performance.now() - s.startedAt) % 4000) / 4000;
      s.gl.uniform1f(s.locPulse, pulse);
      s.gl.uniform1f(s.locT, s.currentT);
      const ar = cv.width / cv.height;
      const imgAr = (s.width || 1) / (s.height || 1);
      let ax = 1;
      let ay = 1;
      if (ar > imgAr) {
        ax = imgAr / ar;
      } else {
        ay = ar / imgAr;
      }
      s.gl.uniform2f(s.locAspect, ax, ay);
      s.gl.drawArrays(s.gl.TRIANGLES, 0, 6);
      s.raf = requestAnimationFrame(draw);
    };
    stateRef.current.raf = requestAnimationFrame(draw);

    return () => {
      const s = stateRef.current;
      if (s) cancelAnimationFrame(s.raf);
      gl.deleteTexture(tex);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      stateRef.current = null;
    };
  }, []);

  // Upload the field whenever it changes.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const { gl, tex } = s;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Convert Float32Array → 8-bit luminance for WebGL1 portability.
    const lum = new Uint8Array(values.length);
    for (let i = 0; i < values.length; i++) {
      lum[i] = Math.max(0, Math.min(255, Math.round(values[i] * 255)));
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      width,
      height,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      lum,
    );
    s.width = width;
    s.height = height;
  }, [values, width, height]);

  // Keep the current t in a ref so the rAF loop sees it without re-running.
  useEffect(() => {
    if (stateRef.current) stateRef.current.currentT = t;
  }, [t]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block rounded-2xl"
      aria-label="filtration sweep"
    />
  );
}
