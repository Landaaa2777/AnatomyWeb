import { useEffect } from 'react'
import { I18nProvider } from './i18n/index.jsx'
import { Navbar } from './components/Navbar.jsx'
import { Hero } from './components/Hero.jsx'
import { Explorer } from './components/Explorer.jsx'
import { Systems } from './components/Systems.jsx'
import { Study } from './components/Study.jsx'
import { Glossary } from './components/Glossary.jsx'
import { Footer } from './components/Footer.jsx'
import { loadAnatomy } from './anatomy/loader.js'

export default function App() {
  // empieza a generar el modelo en segundo plano en cuanto carga la página
  useEffect(() => {
    loadAnatomy()
  }, [])

  return (
    <I18nProvider>
      <div className="page-bg" aria-hidden="true" />
      <Navbar />
      <main id="contenido">
        <Hero />
        <Explorer />
        <Systems />
        <Study />
        <Glossary />
      </main>
      <Footer />
    </I18nProvider>
  )
}
