/**
 * Banco de preguntas tipo test.
 *
 * Une las preguntas redactadas a mano (content/<idioma>/questions.js) con preguntas generadas a partir
 * de las fichas anatómicas: función, nombre latino, localización, patologías, sistema y datos curiosos.
 * Los distractores se eligen de forma determinista para que cada pregunta sea siempre igual.
 */

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function rngFrom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function pick(list, n, rnd) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

/** Palabras del nombre que delatarían la respuesta si aparecen en el enunciado. */
function giveaways(nombre) {
  return norm(nombre)
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5)
    .map((w) => w.slice(0, Math.max(5, w.length - 2))) // raíz: "costillas" → "costill"
}
const leaks = (text, nombre) => giveaways(nombre).some((w) => norm(text).includes(w))

export const KINDS = ['concepto', 'funcion', 'latin', 'ubicacion', 'patologia', 'sistema', 'dato']

export function buildQuestionBank({ structures, systems, questions }) {
  const bank = []
  const sysName = Object.fromEntries(systems.map((s) => [s.id, s.nombre]))
  const entries = Object.entries(structures)

  // 1. preguntas redactadas
  questions.forEach(([system, level, prompt, options, explain], i) => {
    bank.push({ id: `c${i}`, kind: 'concepto', system, level, prompt, options, answer: options[0], explain })
  })

  // distractores: preferentemente del mismo sistema
  const namesFor = (id, s, rnd, exclude = () => false) => {
    const same = entries.filter(([oid, o]) => oid !== id && o.sistemas.some((x) => s.sistemas.includes(x)) && !exclude(o))
    const other = entries.filter(([oid, o]) => oid !== id && !o.sistemas.some((x) => s.sistemas.includes(x)) && !exclude(o))
    const chosen = pick(same, 3, rnd)
    if (chosen.length < 3) chosen.push(...pick(other, 3 - chosen.length, rnd))
    return chosen.map(([, o]) => o.nombre)
  }

  for (const [id, s] of entries) {
    const system = s.sistemas[0]
    const add = (kind, level, prompt, distractors, explain, quote) => {
      if (distractors.length < 3) return
      bank.push({ id: `${kind}-${id}`, kind, system, level, prompt, quote, options: [s.nombre, ...distractors], answer: s.nombre, explain, structureId: id })
    }

    // función → estructura
    if (!leaks(s.funcion, s.nombre)) {
      add('funcion', 1, '¿Qué estructura cumple esta función?', namesFor(id, s, rngFrom('f' + id)), `${s.nombre}: ${s.ubicacion}`, s.funcion)
    }
    // nombre latino → nombre en español
    if (norm(s.latin) !== norm(s.nombre)) {
      add('latin', 2, `¿Cuál es el nombre en español de «${s.latin}»?`, namesFor(id, s, rngFrom('l' + id)), `${s.latin} es el nombre latino de ${s.nombre.toLowerCase()}. ${s.funcion}`)
    }
    // localización → estructura
    if (!leaks(s.ubicacion, s.nombre)) {
      add('ubicacion', 2, '¿Qué estructura se encuentra en esta localización?', namesFor(id, s, rngFrom('u' + id)), `${s.nombre}: ${s.funcion}`, s.ubicacion)
    }
    // patología → estructura (los distractores no pueden compartir esa patología)
    const pat = s.patologias.find((p) => !leaks(p, s.nombre))
    if (pat) {
      add(
        'patologia',
        3,
        `¿Con qué estructura se relaciona principalmente «${pat}»?`,
        namesFor(id, s, rngFrom('p' + id), (o) => o.patologias.includes(pat)),
        `${pat} es una patología frecuente de ${s.nombre.toLowerCase()}. Otras: ${s.patologias.filter((p) => p !== pat).join(', ')}.`,
      )
    }
    // dato curioso → estructura
    const dato = s.datos.find((d) => !leaks(d, s.nombre))
    if (dato) add('dato', 2, '¿A qué estructura se refiere este dato?', namesFor(id, s, rngFrom('d' + id)), `${s.nombre}: ${s.funcion}`, dato)

    // estructura → sistema
    const otherSystems = systems.filter((x) => !s.sistemas.includes(x.id)).map((x) => x.nombre)
    if (otherSystems.length >= 3) {
      bank.push({
        id: `sistema-${id}`,
        kind: 'sistema',
        system,
        level: 1,
        prompt: `¿A qué sistema del cuerpo pertenece «${s.nombre}»?`,
        options: [sysName[system], ...pick(otherSystems, 3, rngFrom('s' + id))],
        answer: sysName[system],
        explain: `${s.nombre} forma parte del ${sysName[system].toLowerCase()}. ${s.funcion}`,
        structureId: id,
      })
    }
  }
  return bank
}

/** Construye un test: filtra por tema y dificultad, baraja y prepara las opciones (A–D). */
export function makeTest(bank, { topic = 'all', level = 0, count = 20, ids = null } = {}) {
  let pool = ids ? bank.filter((q) => ids.includes(q.id)) : bank.filter((q) => (topic === 'all' || q.system === topic) && (!level || q.level === level))
  const rnd = Math.random
  pool = pick(pool, ids ? pool.length : count, rnd)
  return pool.map((q) => ({ ...q, shuffled: pick(q.options, q.options.length, rnd) }))
}
