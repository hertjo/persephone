"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  layers: Float32Array[];
  ts: Float32Array;
  cursor: number;
  min: number;
  max: number;
};

const LANDSCAPE_W = 8;
const LANDSCAPE_H = 5;

function LandscapeMesh({ layers, ts, min, max }: Omit<Props, "cursor">) {
  const meshRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const span = max - min || 1;
    const sampleCount = ts.length;
    const layerCount = layers.length;
    let peak = 1e-6;
    for (const layer of layers) for (let i = 0; i < layer.length; i++) if (layer[i] > peak) peak = layer[i];

    const out: Array<{
      positions: Float32Array;
      color: THREE.Color;
      layer: number;
    }> = [];

    for (let k = 0; k < layerCount; k++) {
      const positions = new Float32Array(sampleCount * 3);
      const layer = layers[k];
      const zOffset = -LANDSCAPE_H * 0.5 + (k / Math.max(1, layerCount - 1)) * LANDSCAPE_H;
      for (let i = 0; i < sampleCount; i++) {
        const tNorm = (ts[i] - min) / span;
        const x = -LANDSCAPE_W * 0.5 + tNorm * LANDSCAPE_W;
        const y = (layer[i] / peak) * 2.2;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = zOffset;
      }
      const hue = 0.55 - (k / Math.max(1, layerCount)) * 0.45;
      const color = new THREE.Color().setHSL(hue, 0.85, 0.55);
      out.push({ positions, color, layer: k });
    }
    return out;
  }, [layers, ts, min, max]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = Math.sin(t * 0.15) * 0.25 + t * 0.04;
    meshRef.current.position.y = Math.sin(t * 0.4) * 0.04;
  });

  return (
    <group ref={meshRef} rotation={[-0.35, 0, 0]}>
      {/* ground grid */}
      <gridHelper
        args={[LANDSCAPE_W * 1.4, 14, "#1d2238", "#11162a"]}
        position={[0, -0.02, 0]}
      />

      {/* a connecting mesh under the curves: a soft "landscape" ribbon */}
      {lines.length > 1 && (
        <RibbonMesh lines={lines} sampleCount={ts.length} />
      )}

      {lines.map((l, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[l.positions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={l.color}
            transparent
            opacity={Math.max(0.25, 1 - i * 0.05)}
            linewidth={1}
            toneMapped={false}
          />
        </line>
      ))}
    </group>
  );
}

function RibbonMesh({
  lines,
  sampleCount,
}: {
  lines: Array<{ positions: Float32Array; color: THREE.Color }>;
  sampleCount: number;
}) {
  const geometry = useMemo(() => {
    const layerCount = lines.length;
    const positions = new Float32Array(layerCount * sampleCount * 3);
    const colors = new Float32Array(layerCount * sampleCount * 3);
    for (let k = 0; k < layerCount; k++) {
      const l = lines[k];
      for (let i = 0; i < sampleCount; i++) {
        const base = (k * sampleCount + i) * 3;
        positions[base] = l.positions[i * 3];
        positions[base + 1] = l.positions[i * 3 + 1];
        positions[base + 2] = l.positions[i * 3 + 2];
        colors[base] = l.color.r;
        colors[base + 1] = l.color.g;
        colors[base + 2] = l.color.b;
      }
    }
    const indices: number[] = [];
    for (let k = 0; k < layerCount - 1; k++) {
      for (let i = 0; i < sampleCount - 1; i++) {
        const a = k * sampleCount + i;
        const b = a + 1;
        const c = (k + 1) * sampleCount + i;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [lines, sampleCount]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function CursorPlane({ cursor, min, max }: Pick<Props, "cursor" | "min" | "max">) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const span = max - min || 1;
    const tNorm = (cursor - min) / span;
    ref.current.position.x = -LANDSCAPE_W * 0.5 + tNorm * LANDSCAPE_W;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2 - 0.35, Math.PI / 2, 0]}>
      <planeGeometry args={[LANDSCAPE_H * 1.4, 2.6]} />
      <meshBasicMaterial color="#7adcff" transparent opacity={0.10} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// Fixed star field from a seeded generator, so rendering stays pure.
const STAR_POSITIONS = (() => {
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    positions[i * 3] = (rand() - 0.5) * 40;
    positions[i * 3 + 1] = (rand() - 0.5) * 20;
    positions[i * 3 + 2] = (rand() - 0.5) * 40 - 5;
  }
  return positions;
})();

function Stars() {
  const points = STAR_POSITIONS;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#8fa8d8" transparent opacity={0.6} sizeAttenuation toneMapped={false} />
    </points>
  );
}

function ResizeKick() {
  const size = useThree((state) => state.size);
  const get = useThree((state) => state.get);
  useLayoutEffect(() => {
    const { gl, camera } = get();
    gl.setSize(size.width, size.height, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    }
  }, [get, size.width, size.height]);
  return null;
}

export default function PersistenceLandscape3D({ layers, ts, cursor, min, max }: Props) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        camera={{ position: [0, 3.4, 7.2], fov: 42 }}
        style={{ background: "linear-gradient(180deg,#070914 0%,#0c1124 100%)" }}
      >
        <ResizeKick />
        <ambientLight intensity={0.45} />
        <pointLight position={[6, 4, 6]} intensity={0.6} color="#86d3ff" />
        <pointLight position={[-6, 3, -4]} intensity={0.5} color="#ff7ad6" />

        <Stars />
        <LandscapeMesh layers={layers} ts={ts} min={min} max={max} />
        <CursorPlane cursor={cursor} min={min} max={max} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.18}
          maxPolarAngle={Math.PI * 0.6}
          autoRotate
          autoRotateSpeed={0.4}
        />

        <EffectComposer multisampling={0}>
          <Bloom intensity={1.1} luminanceThreshold={0.18} luminanceSmoothing={0.6} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
