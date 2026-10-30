/**
 * Material "cristal holográfico" claro.
 *
 * Fresnel (bordes más opacos y coloreados que el centro), iluminación suave de estudio,
 * resaltado al pasar el cursor, pulso al seleccionar, atenuación del resto de estructuras
 * y un barrido de escaneo vertical para la animación de entrada.
 */
import { Color, ShaderMaterial, FrontSide, LessEqualDepth } from 'three'

const vertexShader = /* glsl */ `
  attribute float ao;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  varying float vAO;
  varying float vX;
  void main() {
    vAO = ao;
    vX = position.x;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    vHeight = position.y;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform vec3 uHighlight;
  uniform float uOpacity;
  uniform float uRimOpacity;
  uniform float uPower;
  uniform float uHover;
  uniform float uSelect;
  uniform float uDim;
  uniform float uFade;
  uniform float uReveal;
  uniform float uTime;
  uniform float uHalf;
  uniform vec3 uHalfColor;
  uniform vec3 uHalfRim;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  varying float vAO;
  varying float vX;

  void main() {
    // barrido de escaneo de abajo arriba (altura del cuerpo ≈ 1,8 m)
    float h = vHeight / 1.8;
    if (h > uReveal) discard;

    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vView);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, uPower);

    // luz de estudio blanca: principal + relleno + contraluz
    vec3 L1 = normalize(vec3(-0.45, 0.75, 0.55));
    vec3 L2 = normalize(vec3(0.6, -0.15, 0.4));
    float diff = max(dot(N, L1), 0.0) * 0.55 + max(dot(N, L2), 0.0) * 0.25;
    float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 48.0);

    // oclusión ambiental: oscurece cavidades (órbitas, surcos, espacios entre dientes)
    float occl = mix(0.36, 1.0, smoothstep(0.22, 0.92, vAO));
    vec3 col = uColor * (0.7 + diff * 0.55) * occl + vec3(spec * 0.35 * occl);
    col = mix(col, uRim * mix(0.7, 1.0, occl), fres * 0.85);
    float alpha = mix(uOpacity, uRimOpacity, fres);
    alpha = mix(alpha, min(1.0, alpha + 0.25), 1.0 - occl);

    // "media piel": el lado derecho del cuerpo (x < 0) con piel opaca, como las figuras de estudio
    if (uHalf > 0.001) {
      float side = (1.0 - smoothstep(-0.0012, 0.0012, vX)) * uHalf;
      vec3 hc = uHalfColor * (0.58 + diff * 0.72) * occl + vec3(spec * 0.4);
      hc = mix(hc, uHalfRim, fres * 0.55);
      col = mix(col, hc, side);
      alpha = mix(alpha, 0.97, side);
    }

    // interacción
    float pulse = 0.5 + 0.5 * sin(uTime * 3.2);
    float hl = max(uHover * 0.4, uSelect * (0.22 + 0.16 * pulse));
    col = mix(col, uHighlight, hl * (0.4 + 0.6 * fres));
    col += uHighlight * fres * uSelect * 0.18;
    alpha = mix(alpha, max(alpha, 0.55 + 0.4 * fres), max(uHover, uSelect));

    // atenuar lo que no está seleccionado
    alpha *= mix(1.0, 0.12, uDim);
    col = mix(col, vec3(1.0), uDim * 0.35);

    // banda luminosa del frente de escaneo
    float band = smoothstep(uReveal - 0.03, uReveal, h) * (1.0 - step(0.999, uReveal));
    col = mix(col, uRim, band);
    alpha = max(alpha, band * 0.9);

    gl_FragColor = vec4(col, alpha * uFade);
  }
`

export function createHoloMaterial(style) {
  const m = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: style.depthWrite ?? true,
    side: FrontSide,
    uniforms: {
      uColor: { value: new Color(style.base) },
      uRim: { value: new Color(style.rim) },
      uHighlight: { value: new Color('#9F84FF') },
      uOpacity: { value: style.opacity },
      uRimOpacity: { value: style.rimOpacity },
      uPower: { value: style.power },
      uHover: { value: 0 },
      uSelect: { value: 0 },
      uDim: { value: 0 },
      uFade: { value: 1 },
      uReveal: { value: 1.01 },
      uTime: { value: 0 },
      uHalf: { value: 0 },
      uHalfColor: { value: new Color('#FFE2D7') },
      uHalfRim: { value: new Color('#F2A895') },
    },
  })
  if (style.depthFunc === 'lequal') m.depthFunc = LessEqualDepth
  return m
}

/** Material que sólo escribe profundidad (prepaso para la piel). */
export function createDepthOnlyMaterial() {
  const m = new ShaderMaterial({
    vertexShader,
    fragmentShader: `uniform float uReveal; varying float vHeight; void main(){ if (vHeight / 1.8 > uReveal) discard; gl_FragColor = vec4(1.0); }`,
    uniforms: { uReveal: { value: 1.01 } },
    colorWrite: false,
    depthWrite: true,
    // debe ir en la lista de transparentes para respetar renderOrder (después del interior)
    transparent: true,
  })
  return m
}
