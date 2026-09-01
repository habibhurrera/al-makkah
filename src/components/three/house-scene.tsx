'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ease, stageById, stageProgress } from './construction-stages';
import type { Quality } from './use-quality-tier';

/**
 * A premium two-storey bungalow, built procedurally.
 *
 * Deliberately not a downloaded model: marketplace GLBs arrive as one welded
 * mesh, which cannot be built up stage by stage. Generating the geometry means
 * every slab, column, panel and pane is a separate object whose appearance is
 * driven by scroll. The trade is photorealism for control, and control is the
 * whole point of a sequence that has to run backwards and forwards at whatever
 * speed the visitor scrolls.
 *
 * The design follows the brief: two storeys, pitched roof, floor-to-ceiling
 * glazing in dark frames, warm timber cladding, a stone feature wall, a
 * cantilevered first floor over the entrance, balcony, and a landscaped
 * approach. The last stages fade the daylight to dusk and light the interior,
 * which is what makes a render of a house look like a home.
 */

const PALETTE = {
  ground: '#8f8878',
  soil: '#6f6555',
  concrete: '#9a958c',
  column: '#6f6b66',
  block: '#a89d8d',
  timber: '#a97443',
  timberDark: '#8a5c34',
  stone: '#7d7973',
  plaster: '#efece6',
  roof: '#26262a',
  frame: '#1c1c1e',
  glassDay: '#8fb4d0',
  glassDusk: '#3d4a5c',
  interior: '#ffc98a',
  grass: '#4f6b3f',
  paving: '#b9b4aa',
  trunk: '#4a3a2c',
  leaves: '#3f5c37',
  water: '#4d7f8f',
};

/** Grows from its base as its stage progresses. */
function Rise({
  progress,
  height,
  children,
}: {
  progress: number;
  height: number;
  children: React.ReactNode;
}) {
  const scale = Math.max(0.0001, progress);
  return (
    <group scale={[1, scale, 1]} position={[0, (-height / 2) * (1 - scale), 0]}>
      {children}
    </group>
  );
}

type SceneProps = {
  progress: number;
  quality: Quality;
  /** Camera aim point. Moving it shifts the house within the frame. */
  focusX: number;
  focusY: number;
  /** Extra distance for narrow viewports, where a portrait frame crops the
   *  horizontal field of view and makes the house fill the screen. */
  distanceScale: number;
};

// Building dimensions, in metres. Named so the geometry below reads as a
// building rather than a pile of numbers.
const W = 16; // facade width
const D = 11; // depth
const GF = 3.6; // ground floor height
const FF = 3.3; // first floor height
const SLAB = 0.45;
const BASE = 0.55; // plinth the house sits on
const GF_Y = BASE + SLAB; // ground floor level
const FF_Y = GF_Y + GF; // first floor level
const ROOF_Y = FF_Y + FF; // eaves level
const RIDGE = 3.2; // ridge height above the eaves

export function HouseScene({
  progress,
  quality,
  focusX,
  focusY,
  distanceScale,
}: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const sky = useRef<THREE.HemisphereLight>(null);

  const stages = useMemo(
    () => ({
      preparation: stageById('preparation'),
      foundation: stageById('foundation'),
      structure: stageById('structure'),
      walls: stageById('walls'),
      roof: stageById('roof'),
      openings: stageById('openings'),
      finishing: stageById('finishing'),
      landscaping: stageById('landscaping'),
    }),
    [],
  );

  const p = {
    preparation: ease(stageProgress(progress, stages.preparation)),
    foundation: ease(stageProgress(progress, stages.foundation)),
    structure: ease(stageProgress(progress, stages.structure)),
    walls: ease(stageProgress(progress, stages.walls)),
    roof: ease(stageProgress(progress, stages.roof)),
    openings: ease(stageProgress(progress, stages.openings)),
    finishing: ease(stageProgress(progress, stages.finishing)),
    landscaping: ease(stageProgress(progress, stages.landscaping)),
  };

  // Dusk arrives with the landscaping, so the finished house is the only frame
  // lit from within - the shot the whole sequence is building towards.
  const dusk = ease(Math.max(0, (progress - 0.82) / 0.18));
  const glassColor = useMemo(
    () =>
      new THREE.Color(PALETTE.glassDay).lerp(new THREE.Color(PALETTE.glassDusk), dusk),
    [dusk],
  );

  useFrame((state, delta) => {
    const t = Math.min(1, Math.max(0, progress));

    // Both ends of the orbit sit on the -Z side, so the glazed facade - the
    // reason the house looks expensive - is what the visitor actually sees.
    const angle = 3.65 - t * 0.95;
    const radius = (58 - t * 22) * distanceScale;
    const height = (23 - t * 12) * distanceScale;

    const target = new THREE.Vector3(
      Math.sin(angle) * radius,
      height,
      Math.cos(angle) * radius,
    );

    const lerp = 1 - Math.pow(0.001, delta);
    state.camera.position.lerp(target, lerp);
    state.camera.lookAt(focusX, focusY + 4, 0);

    if (sun.current) {
      // Sun swings across and drops towards the horizon as dusk comes in.
      sun.current.position.set(-14 + t * 26, 22 - dusk * 12, 12 + t * 6);
      sun.current.intensity = 2.6 - dusk * 0.9;
      sun.current.color.setHex(dusk > 0.5 ? 0xffb27a : 0xfff2e0);
    }

    if (sky.current) {
      sky.current.intensity = 1.15 - dusk * 0.2;
      sky.current.color.lerpColors(
        new THREE.Color('#cfe0f0'),
        new THREE.Color('#9d86ad'),
        dusk,
      );
    }

    // Background and fog follow the same day-to-dusk curve.
    // Dusk sky stays luminous: a silhouette against black reads as nothing.
    const bg = new THREE.Color('#141824').lerp(new THREE.Color('#6b4f74'), dusk);
    state.scene.background = bg;
    if (state.scene.fog) (state.scene.fog as THREE.Fog).color.copy(bg);

    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        t * 0.1,
        lerp,
      );
    }
  });

  const shadows = quality.shadows;

  return (
    <group ref={group}>
      <hemisphereLight ref={sky} args={['#cfe0f0', '#6b6155', 1.15]} />
      <directionalLight
        ref={sun}
        position={[-14, 22, 12]}
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {quality.tier === 'high' && (
        <directionalLight position={[10, 8, -14]} intensity={0.35} color="#9fb6d6" />
      )}

      {/* Warm light spilling out of the house once it is lit. */}
      {dusk > 0.05 && (
        <>
          <pointLight
            position={[0, GF_Y + 1.8, -1]}
            intensity={dusk * 40}
            distance={26}
            color={PALETTE.interior}
          />
          {quality.tier !== 'low' && (
            <pointLight
              position={[0, FF_Y + 1.6, -1]}
              intensity={dusk * 26}
              distance={22}
              color={PALETTE.interior}
            />
          )}
        </>
      )}

      {/* ---------------------------------------------------------- the plot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={PALETTE.ground} roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow={shadows}>
        <planeGeometry args={[30, 34]} />
        <meshStandardMaterial
          color={PALETTE.soil}
          roughness={1}
          transparent
          opacity={p.preparation}
        />
      </mesh>

      {p.preparation > 0.4 &&
        quality.extras &&
        [
          [-W / 2 - 1, -D / 2 - 1],
          [W / 2 + 1, -D / 2 - 1],
          [-W / 2 - 1, D / 2 + 1],
          [W / 2 + 1, D / 2 + 1],
        ].map(([x, z]) => (
          <mesh key={`peg-${x}-${z}`} position={[x, 0.4, z]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshStandardMaterial color="#c8a24a" />
          </mesh>
        ))}

      {/* -------------------------------------------------------- foundation */}
      <group visible={p.foundation > 0}>
        <Rise progress={p.foundation} height={BASE}>
          <mesh position={[0, BASE / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={[W + 3, BASE, D + 3]} />
            <meshStandardMaterial color={PALETTE.concrete} roughness={0.95} />
          </mesh>
        </Rise>
        <Rise progress={p.foundation} height={SLAB}>
          <mesh position={[0, BASE + SLAB / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={[W, SLAB, D]} />
            <meshStandardMaterial color={PALETTE.concrete} roughness={0.9} />
          </mesh>
        </Rise>
      </group>

      {/* --------------------------------------------------------- structure */}
      <group visible={p.structure > 0}>
        {[-W / 2 + 0.4, -4, 1, W / 2 - 0.4].map((x) =>
          [-D / 2 + 0.4, D / 2 - 0.4].map((z) => (
            <Rise key={`c-${x}-${z}`} progress={p.structure} height={GF}>
              <mesh position={[x, GF_Y + GF / 2, z]} castShadow={shadows}>
                <boxGeometry args={[0.45, GF, 0.45]} />
                <meshStandardMaterial color={PALETTE.column} roughness={0.85} />
              </mesh>
            </Rise>
          )),
        )}

        {/* First floor slab, cantilevered over the entrance. */}
        <group visible={p.structure > 0.55}>
          <Rise progress={(p.structure - 0.55) / 0.45} height={SLAB}>
            <mesh
              position={[0, FF_Y - SLAB / 2, -0.6]}
              castShadow={shadows}
              receiveShadow={shadows}
            >
              <boxGeometry args={[W, SLAB, D + 1.2]} />
              <meshStandardMaterial color={PALETTE.concrete} roughness={0.9} />
            </mesh>
          </Rise>
        </group>

        {/* First floor columns. */}
        <group visible={p.structure > 0.75}>
          {[-W / 2 + 0.4, W / 2 - 0.4].map((x) =>
            [-D / 2 + 0.4, D / 2 - 0.4].map((z) => (
              <mesh key={`c2-${x}-${z}`} position={[x, FF_Y + FF / 2, z]} castShadow={shadows}>
                <boxGeometry args={[0.4, FF, 0.4]} />
                <meshStandardMaterial color={PALETTE.column} roughness={0.85} />
              </mesh>
            )),
          )}
        </group>
      </group>

      {/* ------------------------------------------------------------- walls
          Solid panels only. The gaps between them become the glazing, so the
          openings are real rather than painted on. */}
      <group visible={p.walls > 0}>
        {/* Ground floor: stone feature wall on the left, timber on the right. */}
        <Rise progress={p.walls} height={GF}>
          <mesh position={[-6, GF_Y + GF / 2, -D / 2]} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={[4, GF, 0.4]} />
            <meshStandardMaterial
              color={p.finishing > 0.3 ? PALETTE.stone : PALETTE.block}
              roughness={0.95}
            />
          </mesh>
        </Rise>

        <Rise progress={p.walls} height={GF}>
          <mesh position={[6.6, GF_Y + GF / 2, -D / 2]} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={[2.8, GF, 0.4]} />
            <meshStandardMaterial
              color={p.finishing > 0.3 ? PALETTE.timber : PALETTE.block}
              roughness={0.8}
            />
          </mesh>
        </Rise>

        {/* Side and rear walls. */}
        {[-W / 2, W / 2].map((x) => (
          <Rise key={`sw-${x}`} progress={p.walls} height={GF}>
            <mesh position={[x, GF_Y + GF / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
              <boxGeometry args={[0.4, GF, D]} />
              <meshStandardMaterial
                color={p.finishing > 0.3 ? PALETTE.plaster : PALETTE.block}
                roughness={0.9}
              />
            </mesh>
          </Rise>
        ))}
        <Rise progress={p.walls} height={GF}>
          <mesh position={[0, GF_Y + GF / 2, D / 2]} castShadow={shadows} receiveShadow={shadows}>
            <boxGeometry args={[W, GF, 0.4]} />
            <meshStandardMaterial
              color={p.finishing > 0.3 ? PALETTE.plaster : PALETTE.block}
              roughness={0.9}
            />
          </mesh>
        </Rise>

        {/* First floor: timber bay on the left, glazing centre and right. */}
        <group visible={p.walls > 0.45}>
          <Rise progress={(p.walls - 0.45) / 0.55} height={FF}>
            <mesh
              position={[-6.2, FF_Y + FF / 2, -D / 2 - 1.2]}
              castShadow={shadows}
              receiveShadow={shadows}
            >
              <boxGeometry args={[3.6, FF, 0.4]} />
              <meshStandardMaterial
                color={p.finishing > 0.3 ? PALETTE.timberDark : PALETTE.block}
                roughness={0.8}
              />
            </mesh>
          </Rise>

          {[-W / 2, W / 2].map((x) => (
            <Rise key={`sw2-${x}`} progress={(p.walls - 0.45) / 0.55} height={FF}>
              <mesh position={[x, FF_Y + FF / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
                <boxGeometry args={[0.4, FF, D]} />
                <meshStandardMaterial
                  color={p.finishing > 0.3 ? PALETTE.plaster : PALETTE.block}
                  roughness={0.9}
                />
              </mesh>
            </Rise>
          ))}
          <Rise progress={(p.walls - 0.45) / 0.55} height={FF}>
            <mesh position={[0, FF_Y + FF / 2, D / 2]} castShadow={shadows} receiveShadow={shadows}>
              <boxGeometry args={[W, FF, 0.4]} />
              <meshStandardMaterial
                color={p.finishing > 0.3 ? PALETTE.plaster : PALETTE.block}
                roughness={0.9}
              />
            </mesh>
          </Rise>
        </group>
      </group>

      {/* -------------------------------------------------------------- roof
          A pitched roof: two slabs leaning against a ridge, with gable ends
          filling the triangles at either side. */}
      <group visible={p.roof > 0}>
        <group scale={[1, p.roof, 1]} position={[0, ROOF_Y * (1 - p.roof), 0]}>
          {[-1, 1].map((side) => {
            const run = D / 2 + 0.9;
            const pitch = Math.atan2(RIDGE, run);
            const length = Math.hypot(run, RIDGE);
            return (
              <mesh
                key={`roof-${side}`}
                position={[0, ROOF_Y + RIDGE / 2, (side * run) / 2 - 0.6]}
                rotation={[side * pitch, 0, 0]}
                castShadow={shadows}
                receiveShadow={shadows}
              >
                <boxGeometry args={[W + 1.4, 0.28, length]} />
                <meshStandardMaterial
                  color={PALETTE.roof}
                  roughness={0.55}
                  metalness={0.15}
                />
              </mesh>
            );
          })}

        </group>
      </group>

      {/* --------------------------------------------------- glazing and door */}
      <group visible={p.openings > 0}>
        {/* Ground floor glazing: the gap between stone and timber. */}
        <mesh position={[0.4, GF_Y + GF / 2, -D / 2]} scale={[1, p.openings, 1]}>
          <boxGeometry args={[8.2, GF - 0.3, 0.16]} />
          <meshStandardMaterial
            color={glassColor}
            roughness={0.08}
            metalness={0.75}
            transparent
            opacity={0.82}
          />
        </mesh>

        {/* Interior glow plane, just behind the glass. */}
        {dusk > 0.02 && (
          <mesh position={[0.4, GF_Y + GF / 2, -D / 2 + 0.35]}>
            <planeGeometry args={[8, GF - 0.5]} />
            <meshBasicMaterial
              color={PALETTE.interior}
              transparent
              opacity={dusk * 0.8}
            />
          </mesh>
        )}

        {/* First floor glazing across the cantilever. */}
        <mesh position={[1.4, FF_Y + FF / 2, -D / 2 - 1.2]} scale={[1, p.openings, 1]}>
          <boxGeometry args={[8.6, FF - 0.4, 0.16]} />
          <meshStandardMaterial
            color={glassColor}
            roughness={0.08}
            metalness={0.75}
            transparent
            opacity={0.82}
          />
        </mesh>

        {dusk > 0.02 && (
          <mesh position={[1.4, FF_Y + FF / 2, -D / 2 - 0.9]}>
            <planeGeometry args={[8.4, FF - 0.6]} />
            <meshBasicMaterial
              color={PALETTE.interior}
              transparent
              opacity={dusk * 0.75}
            />
          </mesh>
        )}

        {/* Dark mullions - what makes glazing read as architecture. */}
        {quality.extras &&
          [-3.4, 0.4, 4.2].map((x) => (
            <mesh key={`mul-${x}`} position={[x, GF_Y + GF / 2, -D / 2 - 0.06]} scale={[1, p.openings, 1]}>
              <boxGeometry args={[0.12, GF - 0.3, 0.2]} />
              <meshStandardMaterial color={PALETTE.frame} roughness={0.5} metalness={0.4} />
            </mesh>
          ))}

        {/* Entrance door, recessed under the cantilever. */}
        <mesh position={[-2.6, GF_Y + 1.25, -D / 2 - 0.02]} scale={[1, p.openings, 1]}>
          <boxGeometry args={[1.5, 2.5, 0.18]} />
          <meshStandardMaterial color={PALETTE.frame} roughness={0.4} metalness={0.3} />
        </mesh>
      </group>

      {/* ---------------------------------------------------------- finishing */}
      <group visible={p.finishing > 0}>
        {/* Balcony rail on the cantilever. */}
        <group visible={p.finishing > 0.3}>
          <mesh position={[6.4, FF_Y + 0.55, -D / 2 - 1.9]} castShadow={shadows}>
            <boxGeometry args={[3.2, 1.1, 0.1]} />
            <meshStandardMaterial
              color={glassColor}
              roughness={0.1}
              metalness={0.6}
              transparent
              opacity={0.45}
            />
          </mesh>
          <mesh position={[6.4, FF_Y + 1.12, -D / 2 - 1.9]} castShadow={shadows}>
            <boxGeometry args={[3.3, 0.08, 0.14]} />
            <meshStandardMaterial color={PALETTE.frame} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>

        {/* Entrance steps. */}
        {[0, 1, 2].map((step) => (
          <mesh
            key={`step-${step}`}
            position={[-2.6, BASE - step * 0.18 - 0.09, -D / 2 - 1.1 - step * 0.5]}
            castShadow={shadows}
            receiveShadow={shadows}
            scale={[1, p.finishing, 1]}
          >
            <boxGeometry args={[4.2, 0.18, 0.5]} />
            <meshStandardMaterial color={PALETTE.paving} roughness={0.9} />
          </mesh>
        ))}

        {/* Timber cladding battens over the right-hand bay. */}
        {quality.extras &&
          p.finishing > 0.5 &&
          Array.from({ length: 7 }, (_, i) => (
            <mesh
              key={`batten-${i}`}
              position={[5.4 + i * 0.36, GF_Y + GF / 2, -D / 2 - 0.22]}
              castShadow={shadows}
            >
              <boxGeometry args={[0.18, GF - 0.2, 0.08]} />
              <meshStandardMaterial color={PALETTE.timberDark} roughness={0.85} />
            </mesh>
          ))}
      </group>

      {/* -------------------------------------------------------- landscaping */}
      <group visible={p.landscaping > 0}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -12]} receiveShadow={shadows}>
          <planeGeometry args={[30, 14]} />
          <meshStandardMaterial
            color={PALETTE.grass}
            roughness={1}
            transparent
            opacity={p.landscaping}
          />
        </mesh>

        {/* Stepping-stone path to the entrance. */}
        {Array.from({ length: 6 }, (_, i) => (
          <mesh
            key={`slab-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-2.6, 0.05, -7.5 - i * 1.7]}
            receiveShadow={shadows}
            scale={ease(Math.max(0, p.landscaping * 1.4 - i * 0.12))}
          >
            <planeGeometry args={[2.6, 1.2]} />
            <meshStandardMaterial color={PALETTE.paving} roughness={0.95} />
          </mesh>
        ))}

        {/* Garden lights along the path, lit at dusk. */}
        {quality.extras &&
          [-5.4, -5.4, 0.2, 0.2].map((x, i) => {
            const z = -8.5 - (i % 2) * 4.5;
            return (
              <group key={`lamp-${i}`} position={[x, 0, z]} scale={p.landscaping}>
                <mesh position={[0, 0.35, 0]}>
                  <cylinderGeometry args={[0.05, 0.06, 0.7, quality.detail]} />
                  <meshStandardMaterial color={PALETTE.frame} />
                </mesh>
                <mesh position={[0, 0.72, 0]}>
                  <sphereGeometry args={[0.11, quality.detail, quality.detail]} />
                  <meshBasicMaterial
                    color={PALETTE.interior}
                    transparent
                    opacity={0.35 + dusk * 0.65}
                  />
                </mesh>
              </group>
            );
          })}

        {/* Planting. */}
        {quality.extras &&
          [
            [-11, -9, 1],
            [11, -9, 1.1],
            [-12, 4, 1.25],
            [12, 5, 0.95],
          ].map(([x, z, s], i) => (
            <group
              key={`tree-${i}`}
              position={[x, 0, z]}
              scale={ease(Math.max(0, p.landscaping * 1.3 - i * 0.1)) * s}
            >
              <mesh position={[0, 1.3, 0]} castShadow={shadows}>
                <cylinderGeometry args={[0.16, 0.24, 2.6, quality.detail]} />
                <meshStandardMaterial color={PALETTE.trunk} roughness={1} />
              </mesh>
              <mesh position={[0, 3.1, 0]} castShadow={shadows}>
                <sphereGeometry args={[1.5, quality.detail, quality.detail]} />
                <meshStandardMaterial color={PALETTE.leaves} roughness={1} />
              </mesh>
            </group>
          ))}

        {/* Low hedges either side of the path. */}
        {quality.extras &&
          [-4.6, -0.6].map((x) => (
            <mesh
              key={`hedge-${x}`}
              position={[x, 0.3, -11]}
              scale={[1, p.landscaping, 1]}
              castShadow={shadows}
            >
              <boxGeometry args={[0.8, 0.6, 7]} />
              <meshStandardMaterial color={PALETTE.leaves} roughness={1} />
            </mesh>
          ))}
      </group>
    </group>
  );
}
