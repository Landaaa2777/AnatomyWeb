/**
 * Renderiza todas las estructuras anatómicas cargadas, con sus materiales holográficos,
 * y gestiona hover / selección / atenuación / visibilidad por capas y el escaneo de entrada.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useModel, LAYER_ORDER } from '../anatomy/loader.js'
import { createHoloMaterial, createDepthOnlyMaterial } from './HoloMaterial.js'
import { styleFor } from './palette.js'

const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt))

export function AnatomyModel({
  visible, // { capa: bool }
  filter, // (part) => bool  (si se indica, sólo se muestran esas estructuras)
  hovered,
  selected,
  emphasis, // ids a resaltar (p. ej. en el quiz)
  dimOthers = true,
  interactive = true,
  intro = true,
  onHover,
  onSelect,
  styleOverride, // (part) => estilo parcial (depuración)
  halfSkin = false, // mitad del cuerpo con piel opaca
}) {
  const layers = useModel((s) => s.layers)
  const parts = useMemo(() => LAYER_ORDER.flatMap((l) => layers[l] || []), [layers])
  const entries = useRef(new Map()) // id -> { mesh, depth, mat, depthMat, fade, hover, select, dim, revealStart }
  const layerStart = useRef({})
  const clock = useRef(0)

  // materiales por estructura (cada una necesita sus propios uniforms)
  const materials = useMemo(() => {
    const m = new Map()
    for (const p of parts) {
      const style = { ...styleFor(p), ...styleOverride?.(p) }
      const isSkin = p.layer === 'piel'
      const mat = createHoloMaterial({
        ...style,
        depthWrite: !(isSkin || p.layer === 'musculos'),
        depthFunc: isSkin ? 'lequal' : undefined,
      })
      m.set(p.id, { mat, depthMat: isSkin ? createDepthOnlyMaterial() : null, style })
    }
    return m
  }, [parts])

  useEffect(() => () => materials.forEach(({ mat, depthMat }) => (mat.dispose(), depthMat?.dispose())), [materials])

  const isVisible = (p) => (visible ? visible[p.layer] !== false : true) && (filter ? filter(p) : true)

  // ¿se puede seleccionar? La piel sólo si es la única capa visible (o en su mitad opaca).
  const pickable = (obj, point) => {
    const id = obj.userData.partId
    if (!id || obj.userData.depthOnly) return false
    const e = entries.current.get(id)
    if (!e || e.fade < 0.5) return false
    if (obj.userData.layer === 'piel') {
      if (halfSkin && point && obj.worldToLocal(point.clone()).x < 0) return true
      const others = parts.some((p) => p.layer !== 'piel' && isVisible(p))
      return !others
    }
    return true
  }

  const firstHit = (e) => e.intersections.find((i) => pickable(i.object, i.point))

  useFrame((state, dt) => {
    clock.current += dt
    const now = clock.current
    const emph = emphasis && emphasis.length ? new Set(emphasis) : null
    const anySelected = !!selected || !!emph
    for (const p of parts) {
      const e = entries.current.get(p.id)
      if (!e || !e.mesh) continue
      const u = e.mat.uniforms
      // escaneo de entrada escalonado por capa
      if (layerStart.current[p.layer] === undefined) {
        const prev = Object.values(layerStart.current)
        const last = prev.length ? Math.max(...prev) : now - 0.45
        layerStart.current[p.layer] = intro ? Math.max(now, last + 0.45) : -10
      }
      // estructuras que llegan tarde (otro trabajo de la misma capa) hacen su propio barrido
      if (e.start === undefined) e.start = now - layerStart.current[p.layer] < 1.2 ? layerStart.current[p.layer] : intro ? now : -10
      const t = (now - e.start) / 1.6
      u.uReveal.value = t >= 1 ? 1.01 : Math.max(0, t * t * (3 - 2 * t))
      if (e.depthMat) e.depthMat.uniforms.uReveal.value = u.uReveal.value

      const show = isVisible(p)
      const isSel = selected === p.id || (emph && emph.has(p.id))
      e.fade = damp(e.fade, show ? 1 : 0, 7, dt)
      e.hover = damp(e.hover, hovered === p.id ? 1 : 0, 12, dt)
      e.select = damp(e.select, isSel ? 1 : 0, 8, dt)
      e.dim = damp(e.dim, dimOthers && anySelected && !isSel && p.layer !== 'piel' ? 1 : 0, 6, dt)
      if (p.layer === 'piel') u.uHalf.value = damp(u.uHalf.value, halfSkin ? 1 : 0, 5, dt)
      u.uFade.value = e.fade
      u.uHover.value = e.hover
      u.uSelect.value = e.select
      u.uDim.value = e.dim
      u.uTime.value = now
      const on = e.fade > 0.01
      e.mesh.visible = on
      if (e.depth) e.depth.visible = on
      const baseWrite = !(p.layer === 'piel' || p.layer === 'musculos')
      e.mat.depthWrite = baseWrite && e.dim < 0.5
      e.mesh.renderOrder = isSel ? 6 : e.style.order
    }
  })

  const register = (p, key) => (obj) => {
    if (!obj) return
    const e = entries.current.get(p.id) || { fade: 0, hover: 0, select: 0, dim: 0 }
    e[key] = obj
    const m = materials.get(p.id)
    e.mat = m.mat
    e.depthMat = m.depthMat
    e.style = m.style
    entries.current.set(p.id, e)
  }

  useEffect(() => {
    // limpia entradas de estructuras que ya no existen
    const ids = new Set(parts.map((p) => p.id))
    for (const k of entries.current.keys()) if (!ids.has(k)) entries.current.delete(k)
  }, [parts])

  return (
    <group
      onPointerMove={(e) => {
        if (!interactive) return
        e.stopPropagation()
        const hit = firstHit(e)
        const id = hit ? hit.object.userData.partId : null
        if (id !== hovered) onHover?.(id)
        document.body.style.cursor = id ? 'pointer' : ''
      }}
      onPointerOut={() => {
        if (!interactive) return
        onHover?.(null)
        document.body.style.cursor = ''
      }}
      onClick={(e) => {
        if (!interactive || e.delta > 6) return
        e.stopPropagation()
        const hit = firstHit(e)
        if (hit) onSelect?.(hit.object.userData.partId)
      }}
    >
      {parts.map((p) => {
        const m = materials.get(p.id)
        if (!m) return null
        return (
          <group key={p.id}>
            {m.depthMat && (
              <mesh
                ref={register(p, 'depth')}
                geometry={p.geometry}
                material={m.depthMat}
                renderOrder={8}
                userData={{ partId: p.id, layer: p.layer, depthOnly: true }}
                raycast={() => null}
              />
            )}
            <mesh
              ref={register(p, 'mesh')}
              geometry={p.geometry}
              material={m.mat}
              renderOrder={m.style.order}
              userData={{ partId: p.id, layer: p.layer }}
            />
          </group>
        )
      })}
    </group>
  )
}
