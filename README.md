# Anatomía 3D

Plataforma web interactiva para que los estudiantes aprendan anatomía humana explorando un
**modelo 3D translúcido** capa por capa: piel, músculos, sistema circulatorio, sistema nervioso,
órganos y esqueleto. El estilo es claro y luminoso (predomina el blanco), con acentos rosa/coral,
celeste y lavanda, y elementos de interfaz tipo HUD.

## Funcionalidades

- **Hero** con el cuerpo 3D girando, animación de entrada (giro + escaneo que revela las capas una a una),
  etiquetas HUD con líneas de conexión y partículas suaves.
- **Explorador 3D** en pantalla completa:
  - Rotación 360°, zoom y desplazamiento con ratón y gestos táctiles.
  - Panel de capas (activar/desactivar) y control de **profundidad** que retira capas de la piel al esqueleto.
  - **Buscador** accesible de órganos, huesos, músculos, vasos y nervios (también por nombre latino).
  - Al pasar el cursor una estructura brilla; al hacer clic la cámara se acerca, el resto se atenúa
    y se abre su **ficha**: nombre en español y latín, función, ubicación, datos curiosos y patologías comunes.
  - Botón **Aislar**, vistas frontal/lateral/posterior, etiquetas on/off, reinicio y pantalla completa.
  - Modo **media piel**: una mitad del cuerpo con piel opaca y la otra translúcida, como las figuras
    anatómicas de estudio (también es la vista de la portada).
  - Índice de estructuras navegable con teclado.
- **Sistemas del cuerpo**: 10 tarjetas (óseo, muscular, circulatorio, nervioso, respiratorio, digestivo,
  urinario, endocrino, linfático y tegumentario), cada una con su vista 3D aislada.
- **Modo estudio**:
  - Tarjetas (flashcards) con giro 3D, mazos por sistema, "Lo sé / Repasar" y progreso.
  - **Quiz 3D** de 10 preguntas: *Señala en el modelo* (clic sobre la estructura) u *Opción múltiple*
    (identifica la estructura resaltada), con puntuación y mejor marca guardada en el navegador.
- **Tests de anatomía**: banco de más de 500 preguntas de opción múltiple (124 redactadas con explicación y
  el resto generadas a partir de las fichas: función, nombre latino, localización, patologías, sistema y datos
  curiosos). Filtros por tema y dificultad, modo práctica (corrección inmediata) y modo examen (con tiempo,
  navegador de preguntas y marcadas para revisar), nota sobre 10 con calificación, resultado por tema,
  revisión de cada respuesta con enlace a la estructura en 3D, repetición de fallos e historial de intentos.
  Se responde también con el teclado (1–4 / A–D y Enter). Las preguntas redactadas están en
  `src/content/es/questions.js` y el generador en `src/lib/questionBank.js`.
- **Glosario** de más de 60 términos anatómicos con buscador y filtros por categoría.

## Modelo 3D procedural (sin descargas)

No se usa ningún archivo `.glb` externo: **todo el modelo se genera por código** en `src/anatomy/`.

- Huesos, órganos, piel y encéfalo se modelan como **superficies implícitas (SDF)** combinadas con
  uniones suaves y se convierten en malla con **marching cubes** (`sdf.js`).
- Vasos, nervios, costillas y músculos son **tubos de radio variable** a lo largo de curvas (`mesh.js`).
- Cada capa vive en su archivo: `skeleton.js`, `organs.js`, `circulatory.js`, `nervous.js`,
  `muscles.js` y `skin.js`. Los puntos de referencia compartidos están en `landmarks.js` y `extremities.js`.
- El cráneo (`skull.js`) sigue proporciones reales: bóveda, órbitas, abertura piriforme, arcos cigomáticos,
  mandíbula con rama, cóndilo y coronoides, y 32 dientes en oclusión. Las vértebras tienen cuerpo,
  pedículos, láminas y apófisis, con el conducto vertebral abierto.
- Cada vértice de las mallas SDF lleva **oclusión ambiental** calculada a partir de la propia función de
  distancia, lo que oscurece órbitas, surcos y huecos y da profundidad sin coste en tiempo real.
- La generación se hace en **varios Web Workers en paralelo** (`worker.js`, `loader.js`) y el resultado se
  guarda en **IndexedDB**, así que en visitas posteriores el modelo aparece casi al instante.
- Hay dos niveles de detalle (`quality.js`): alto en escritorio y ligero en móviles. Se puede forzar con
  `?calidad=alta` o `?calidad=baja`.
- El material holográfico (`src/three/HoloMaterial.js`) es un shader propio con efecto fresnel,
  iluminación de estudio, resaltado, pulso de selección, atenuación y barrido de escaneo.

Para revisar el modelo en desarrollo hay una vista de depuración en `/debug.html`
(por ejemplo `/debug.html?only=craneo,mandibula&cam=0,1.62,0.55&target=0,1.62,0`, `?layers=piel&solid=1`
o `?half=1`).

Cada malla tiene un `id` (por ejemplo `femur`, `corazon`, `nervio-ciatico`) que coincide con su ficha en
`src/content/es/structures.js`.

### ¿Y si quiero usar un modelo `.glb` real?

Puedes sustituir la generación procedural por un modelo descargado (por ejemplo de Z-Anatomy,
BodyParts3D o Sketchfab con licencia CC): carga el archivo con `GLTFLoader`, nombra cada malla con el
mismo `id` de las fichas y publícalas en el store `useModel` con el mismo formato que usa `loader.js`
(`{ id, layer, geometry, anchor, box }`). El resto de la web (fichas, quiz, sistemas) funcionará igual.

## Tecnologías

React 19 · Vite · Three.js · React Three Fiber · Drei · Zustand · Framer Motion · Tailwind CSS 4

## Puesta en marcha

Requiere Node.js 18 o superior.

```bash
cd anatomia-web
npm install
npm run dev        # http://localhost:5173
```

Compilación para producción (genera `dist/`, que se puede servir desde cualquier hosting estático):

```bash
npm run build
npm run preview
```

## Estructura

```
anatomia-web/
├── index.html
├── public/favicon.svg
└── src/
    ├── anatomy/        # generación procedural del modelo 3D (SDF, tubos, capas, workers, caché)
    ├── three/          # visor 3D: material holográfico, modelo, etiquetas HUD, decoración
    ├── components/     # secciones y componentes de la interfaz
    ├── content/es/     # fichas anatómicas, sistemas y glosario (contenido traducible)
    ├── i18n/           # textos de interfaz y proveedor de idioma
    ├── state/          # estado del explorador (Zustand)
    ├── lib/            # hooks y utilidades
    ├── App.jsx
    └── index.css       # tokens de diseño (paleta clara) y estilos base
```

## Añadir un idioma

1. Copia `src/i18n/es.js` como `src/i18n/en.js` y traduce los textos.
2. Copia la carpeta `src/content/es/` como `src/content/en/` y traduce las fichas, los sistemas y el glosario
   (las claves/ids no cambian).
3. Regístralo en `LOCALES` dentro de `src/i18n/index.jsx`. Aparecerá en el selector del pie de página.

## Accesibilidad

- Contraste AA en textos, foco visible y navegación completa por teclado (buscador tipo *combobox*,
  índice de estructuras, pestañas, tarjetas y quiz).
- El lienzo 3D tiene descripción accesible y toda la información está también disponible en HTML.
- Se respeta `prefers-reduced-motion` (sin giro automático ni animaciones de entrada).

## Aviso

Modelo 3D creado con fines educativos y aproximaciones anatómicas simplificadas. No sustituye a los atlas
anatómicos oficiales ni a la consulta médica.
