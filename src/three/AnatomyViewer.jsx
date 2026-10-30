/**
 * Visor 3D reutilizable (hero, explorador, sistemas y quiz).
 */
import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { AnatomyModel } from './AnatomyModel.jsx'
import { useLabelItems, LabelLines, LabelOverlay } from './HudLabels.jsx'
import { Platform, Particles } from './SceneDecor.jsx'
import { loadAnatomy, useModel } from '../anatomy/loader.js'
import { QUALITY, QUALITY_PRESETS } from '../anatomy/quality.js'

const { ACTION } = CameraControlsImpl

export const VIEWS = {
  full: { pos: [0, 1.0, 3.7], target: [0, 0.9, 0] },
  side: { pos: [3.7, 1.0, 0.0], target: [0, 0.9, 0] },
  back: { pos: [0, 1.0, -3.7], target: [0, 0.9, 0] },
  legs: { pos: [0.0, 0.5, 1.9], target: [0, 0.45, 0] },
  hand: { pos: [0.75, 0.95, 0.75], target: [0.45, 0.88, 0] },
  foot: { pos: [0.5, 0.25, 0.7], target: [0.1, 0.04, 0.05] },
  hero: { pos: [0.35, 1.05, 3.55], target: [0, 0.92, 0] },
  torso: { pos: [0, 1.25, 1.75], target: [0, 1.2, 0] },
  organs: { pos: [0, 1.12, 2.5], target: [0, 1.04, 0] },
  head: { pos: [0, 1.62, 0.85], target: [0, 1.6, 0] },
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Rig({ view, selected, focusOnSelect, modelRef, resetSignal, zoom, touchRotate, controlsRef, focusBoxFor, focusInset, viewShift = 0 }) {
  const byId = useModel((s) => s.byId)
  const { invalidate, size, camera } = useThree()
  const aspect = size.width / Math.max(1, size.height)

  // desplaza el centro de proyección (px) para dejar sitio a paneles laterales
  useEffect(() => {
    if (viewShift) camera.setViewOffset(size.width, size.height, -viewShift, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    invalidate()
  }, [viewShift, size.width, size.height, camera, invalidate])

  // en lienzos verticales (móvil) se aleja la cámara para que quepan los brazos
  const viewFor = (name) => {
    const v = VIEWS[name] || VIEWS.full
    const k = aspect < 0.85 ? Math.pow(0.85 / aspect, 0.85) : 1
    const pos = v.pos.map((p, i) => v.target[i] + (p - v.target[i]) * k)
    return { pos, target: v.target }
  }

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    c.mouseButtons.wheel = zoom ? ACTION.DOLLY : ACTION.NONE
    c.mouseButtons.middle = zoom ? ACTION.DOLLY : ACTION.NONE
    c.mouseButtons.right = zoom ? ACTION.TRUCK : ACTION.NONE
    c.touches.one = touchRotate ? ACTION.TOUCH_ROTATE : ACTION.NONE
    c.touches.two = zoom ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.NONE
    c.touches.three = zoom ? ACTION.TOUCH_TRUCK : ACTION.NONE
  }, [zoom, touchRotate, controlsRef])

  // vista inicial / reinicio
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const v = viewFor(view)
    c.setLookAt(...v.pos, ...v.target, resetSignal > 0)
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, resetSignal, controlsRef, invalidate, aspect < 0.85])

  // enfocar la estructura seleccionada
  useEffect(() => {
    const c = controlsRef.current
    if (!c || !focusOnSelect) return
    if (!selected) {
      const v = viewFor(view)
      c.setLookAt(...v.pos, ...v.target, true)
      return
    }
    const part = byId[selected]
    if (!part || !modelRef.current) return
    const box = (focusBoxFor?.(part) || part.box).clone()
    modelRef.current.updateWorldMatrix(true, false)
    box.applyMatrix4(modelRef.current.matrixWorld)
    // tamaño mínimo para no acercarse demasiado a estructuras pequeñas
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const min = 0.32
    const half = new Vector3(Math.max(size.x, min) / 2, Math.max(size.y, min) / 2, Math.max(size.z, min * 0.5) / 2)
    const fitted = new Box3(centre.clone().sub(half), centre.clone().add(half))
    // margen extra (proporcional) para dejar sitio a los paneles que tapan el lienzo
    const w = Math.max(size.x, min)
    const inset = focusInset || { left: 0.25, right: 0.25, top: 0.08, bottom: 0.08 }
    c.fitToBox(fitted, true, {
      paddingLeft: w * inset.left,
      paddingRight: w * inset.right,
      paddingTop: w * inset.top,
      paddingBottom: w * inset.bottom,
    })
  }, [selected, byId, focusOnSelect, controlsRef, modelRef, view, focusBoxFor, focusInset])

  return null
}

/**
 * Movimiento automático del modelo: giro completo ('spin') o vaivén de frente ('sway'),
 * que mantiene siempre visibles las dos mitades en el modo "media piel".
 */
function Spinner({ modelRef, autoRotate, intro, paused }) {
  const t = useRef(0)
  const spin = useRef(0)
  const swayT = useRef(0)
  const reduced = useRef(prefersReducedMotion())
  useFrame((_, dt) => {
    const g = modelRef.current
    if (!g) return
    t.current += dt
    const introDur = 2.6
    let introAngle = 0, s = 1
    if (intro && !reduced.current && t.current < introDur) {
      const k = t.current / introDur
      const e = 1 - Math.pow(1 - k, 3)
      introAngle = (1 - e) * -Math.PI * 1.25
      s = 0.94 + 0.06 * e
    }
    const moving = autoRotate && !paused?.current && !reduced.current
    if (autoRotate === 'sway') {
      if (moving) swayT.current += dt
      g.rotation.y = introAngle + Math.sin(swayT.current * 0.42) * 0.62
    } else {
      if (moving) spin.current += dt * 0.22
      g.rotation.y = introAngle + spin.current
    }
    g.scale.setScalar(s)
  })
  return null
}

export default function AnatomyViewer({
  visible,
  filter,
  hovered,
  selected,
  emphasis,
  dimOthers = true,
  interactive = true,
  autoRotate = false,
  intro = true,
  labels = [],
  nameOf = (id) => id,
  onHover,
  onSelect,
  onMissed,
  focusOnSelect = true,
  view = 'full',
  resetSignal = 0,
  zoom = true,
  touchRotate = true,
  decor = true,
  className = '',
  ariaLabel = 'Modelo 3D del cuerpo humano',
  focusBoxFor,
  focusInset,
  halfSkin = false,
  viewShift = 0,
}) {
  const modelRef = useRef()
  const controlsRef = useRef()
  const interacting = useRef(false)
  const labelSink = useRef({})
  const labelItems = useLabelItems(labels)
  const activeLabel = selected || hovered

  useEffect(() => {
    loadAnatomy()
  }, [])

  const v = VIEWS[view] || VIEWS.full

  return (
    <div className={`relative h-full w-full ${className}`} role="img" aria-label={ariaLabel}>
      <Canvas
        dpr={[1, QUALITY_PRESETS[QUALITY].dpr]}
        camera={{ position: v.pos, fov: 30, near: 0.05, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onPointerMissed={(e) => e.type === 'click' && onMissed?.()}
        style={{ touchAction: touchRotate ? 'none' : 'pan-y' }}
      >
        <CameraControls
          ref={controlsRef}
          makeDefault
          minDistance={0.35}
          maxDistance={6}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI - 0.25}
          smoothTime={0.35}
          draggingSmoothTime={0.12}
          onStart={() => (interacting.current = true)}
          onEnd={() => (interacting.current = false)}
        />
        <Rig
          view={view}
          selected={selected}
          focusOnSelect={focusOnSelect}
          modelRef={modelRef}
          resetSignal={resetSignal}
          zoom={zoom}
          touchRotate={touchRotate}
          controlsRef={controlsRef}
          focusBoxFor={focusBoxFor}
          focusInset={focusInset}
          viewShift={viewShift}
        />
        <group ref={modelRef}>
          <AnatomyModel
            visible={visible}
            filter={filter}
            hovered={hovered}
            selected={selected}
            emphasis={emphasis}
            dimOthers={dimOthers}
            interactive={interactive}
            intro={intro}
            onHover={onHover}
            onSelect={onSelect}
            halfSkin={halfSkin}
          />
          {labelItems.length > 0 && <LabelLines items={labelItems} active={activeLabel} sink={labelSink} groupRef={modelRef} />}
        </group>
        <Spinner modelRef={modelRef} autoRotate={autoRotate} intro={intro} paused={interacting} />
        {decor && <Platform />}
        {decor && <Particles />}
      </Canvas>
      {labelItems.length > 0 && <LabelOverlay items={labelItems} nameOf={nameOf} active={activeLabel} onSelect={onSelect} sink={labelSink} />}
    </div>
  )
}
