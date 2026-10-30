/** Elementos decorativos de la escena: plataforma holográfica y partículas suaves. */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, NormalBlending } from 'three'

export function Platform() {
  const ref = useRef()
  const rings = useMemo(() => {
    const list = []
    for (const [r, o] of [
      [0.26, 0.55],
      [0.36, 0.35],
      [0.48, 0.22],
      [0.62, 0.12],
    ]) {
      const pts = []
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2
        pts.push(Math.cos(a) * r, 0, Math.sin(a) * r)
      }
      const g = new BufferGeometry()
      g.setAttribute('position', new Float32BufferAttribute(pts, 3))
      list.push({ g, o })
    }
    // marcas radiales
    const ticks = []
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2
      const r0 = 0.36, r1 = i % 6 === 0 ? 0.41 : 0.385
      ticks.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1)
    }
    const tg = new BufferGeometry()
    tg.setAttribute('position', new Float32BufferAttribute(ticks, 3))
    return { list, tg }
  }, [])

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06
  })

  return (
    <group position={[0, 0.001, 0]}>
      {/* sombra suave */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
        <circleGeometry args={[0.55, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{ uColor: { value: new Color('#9DB8E8') } }}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`uniform vec3 uColor; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(uColor, a * a * 0.28); }`}
        />
      </mesh>
      <group ref={ref}>
        {rings.list.map(({ g, o }, i) => (
          <lineLoop key={i} geometry={g}>
            <lineBasicMaterial color="#7FB6F0" transparent opacity={o} depthWrite={false} />
          </lineLoop>
        ))}
        <lineSegments geometry={rings.tg}>
          <lineBasicMaterial color="#9F8CF5" transparent opacity={0.35} depthWrite={false} />
        </lineSegments>
      </group>
    </group>
  )
}

export function Particles({ count = 220 }) {
  const ref = useRef()
  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const palette = ['#8EC9FF', '#B9A6FF', '#FF8FA3', '#9FE3E8'].map((c) => new Color(c))
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, r = 0.35 + rnd() * 0.9
      pos.set([Math.cos(a) * r, rnd() * 2.1, Math.sin(a) * r * 0.7 - 0.1], i * 3)
      const c = palette[i % palette.length]
      col.set([c.r, c.g, c.b], i * 3)
      seed[i] = rnd()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new Float32BufferAttribute(col, 3))
    g.setAttribute('seed', new Float32BufferAttribute(seed, 1))
    const m = {
      uniforms: { uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: `
        attribute vec3 color; attribute float seed; uniform float uTime; uniform float uPixel;
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * (0.03 + seed * 0.05), 2.1);
          p.x += sin(uTime * 0.4 + seed * 20.0) * 0.03;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (4.0 + seed * 7.0) * uPixel / -mv.z * 2.2;
          vColor = color;
          vAlpha = smoothstep(0.0, 0.25, p.y) * smoothstep(2.1, 1.6, p.y) * (0.35 + seed * 0.45);
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vColor, a * vAlpha); }`,
    }
    return { geometry: g, material: m }
  }, [count])

  useFrame((_, dt) => {
    if (ref.current) ref.current.material.uniforms.uTime.value += dt
  })

  return (
    <points ref={ref} geometry={geometry} renderOrder={10}>
      <shaderMaterial args={[material]} transparent depthWrite={false} blending={NormalBlending} />
    </points>
  )
}

