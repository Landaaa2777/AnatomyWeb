/**
 * Etiquetas estilo HUD con líneas finas de conexión hacia cada estructura.
 *
 * Las líneas se dibujan en 3D (dentro del Canvas) y las etiquetas son botones HTML normales
 * en una capa superpuesta, cuya posición se actualiza cada frame proyectando el punto 3D.
 */
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Vector3 } from 'three'
import { useModel } from '../anatomy/loader.js'
import { LAYER_ACCENT } from './palette.js'

const LABEL_X = 0.6
const MIN_GAP = 0.055

/** Calcula la disposición de las etiquetas (lado, altura sin solapes y puntos de la línea). */
export function useLabelItems(ids) {
  const byId = useModel((s) => s.byId)
  return useMemo(() => {
    const list = ids
      .map((id) => byId[id])
      .filter(Boolean)
      .sort((a, b) => b.anchor.y - a.anchor.y)
    const sides = { 1: [], [-1]: [] }
    // las estructuras simétricas pueden etiquetarse en cualquier lado: se reparten para equilibrar
    for (const p of list) {
      const symmetric = p.box.min.x < -0.02 && p.box.max.x > 0.02 && Math.abs(p.box.min.x + p.box.max.x) < 0.03
      let side = p.anchor.x >= -0.005 ? 1 : -1
      if (symmetric) side = sides[1].length <= sides[-1].length ? 1 : -1
      const anchor = side === Math.sign(p.anchor.x || 1) ? p.anchor.clone() : p.anchor.clone().setX(-p.anchor.x)
      sides[side].push({ part: p, side, y: anchor.y, anchor })
    }
    for (const s of [1, -1]) {
      const arr = sides[s].sort((a, b) => b.y - a.y)
      for (let i = 1; i < arr.length; i++) if (arr[i - 1].y - arr[i].y < MIN_GAP) arr[i].y = arr[i - 1].y - MIN_GAP
    }
    return [...sides[1], ...sides[-1]].map((it) => {
      const a = it.anchor
      const end = new Vector3(it.side * LABEL_X, it.y, a.z * 0.3)
      const knee = new Vector3(it.side * (LABEL_X - 0.08), it.y, a.z * 0.4)
      return { id: it.part.id, layer: it.part.layer, side: it.side, points: [a.clone(), knee, end], end }
    })
  }, [ids, byId])
}

const _v = new Vector3()
const _k = new Vector3()

/** Dentro del Canvas: líneas 3D + proyección de la posición de cada etiqueta. */
export function LabelLines({ items, active, sink, groupRef }) {
  const { camera, size } = useThree()

  useFrame(() => {
    const els = sink.current
    if (!els) return
    for (const it of items) {
      const el = els[it.id]
      if (!el) continue
      _v.copy(it.end)
      if (groupRef.current) groupRef.current.localToWorld(_v)
      _v.project(camera)
      _k.copy(it.points[1])
      if (groupRef.current) groupRef.current.localToWorld(_k)
      _k.project(camera)
      const behind = _v.z > 1
      const x = (_v.x * 0.5 + 0.5) * size.width
      const y = (-_v.y * 0.5 + 0.5) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.style.opacity = behind ? '0' : '1'
      // la etiqueta se extiende hacia fuera de la línea (cambia de lado al girar el modelo)
      el.dataset.side = _v.x >= _k.x ? 'right' : 'left'
    }
  })

  return (
    <group>
      {items.map(({ id, layer, points }) => {
        const color = LAYER_ACCENT[layer]
        const on = active === id
        return (
          <group key={id}>
            <Line points={points} color={on ? '#8B6CF6' : color} lineWidth={on ? 1.6 : 1} transparent opacity={on ? 1 : 0.75} depthTest={false} renderOrder={20} />
            <mesh position={points[0]} renderOrder={21}>
              <sphereGeometry args={[0.005, 10, 10]} />
              <meshBasicMaterial color={on ? '#8B6CF6' : color} depthTest={false} transparent />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Fuera del Canvas: capa HTML con los botones de las etiquetas. */
export function LabelOverlay({ items, nameOf, active, onSelect, sink }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
      {items.map(({ id, layer }) => (
        <div
          key={id}
          ref={(el) => {
            if (!sink.current) sink.current = {}
            if (el) sink.current[id] = el
            else delete sink.current[id]
          }}
          className="hud-anchor absolute left-0 top-0"
          style={{ opacity: 0 }}
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onSelect?.(id)}
            className={`hud-label ${active === id ? 'is-active' : ''}`}
            style={{ '--accent': LAYER_ACCENT[layer] }}
          >
            <span className="hud-label__dot" />
            {nameOf(id)}
          </button>
        </div>
      ))}
    </div>
  )
}
