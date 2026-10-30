/**
 * Vista de depuración del modelo (sólo en desarrollo: /debug.html).
 * Parámetros: ?layers=piel,esqueleto  &only=craneo,mandibula  &cam=x,y,z  &target=x,y,z  &half=1
 */
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { AnatomyModel } from './three/AnatomyModel.jsx'
import { loadAnatomy, useModel, LAYER_ORDER } from './anatomy/loader.js'
import './index.css'

const q = new URLSearchParams(location.search)
const nums = (s, d) => (s ? s.split(',').map(Number) : d)
const layers = q.get('layers')
const visible = layers ? Object.fromEntries(LAYER_ORDER.map((l) => [l, layers.split(',').includes(l)])) : undefined
const only = q.get('only') ? new Set(q.get('only').split(',')) : null
const cam = nums(q.get('cam'), [0, 1.0, 3.7])
const target = nums(q.get('target'), [0, 0.9, 0])

function App() {
  const ready = useModel((s) => s.ready)
  useEffect(() => {
    loadAnatomy()
  }, [])
  return (
    <div style={{ height: '100vh' }} data-ready={ready}>
      <Canvas camera={{ position: cam, fov: 30, near: 0.01, far: 50 }} gl={{ antialias: true, alpha: true }}>
        <CameraControls makeDefault ref={(c) => c && c.setLookAt(...cam, ...target, false)} />
        <AnatomyModel visible={visible} filter={only ? (p) => only.has(p.id) : undefined} intro={false} halfSkin={q.get('half') === '1'} styleOverride={q.get('solid') ? () => ({ opacity: 1, rimOpacity: 1, base: '#E9EEF7', rim: '#93B2E0' }) : undefined} />
      </Canvas>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
