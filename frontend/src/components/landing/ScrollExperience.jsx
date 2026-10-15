import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { ArrowUpRight, CalendarDays, CirclePlay, Clock3, MapPin, Mouse, Quote, Scissors, Sparkles } from 'lucide-react'
import { useFrameSequence } from '../../hooks/useFrameSequence'
import './ScrollExperience.css'

export const ScrollExperience = memo(function ScrollExperience({ onOpenBooking }) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const [isCanvasReady, setIsCanvasReady] = useState(false)

  const handleFirstFrameDecoded = useCallback(() => {
    setIsCanvasReady(true)
  }, [])

  useFrameSequence(sectionRef, canvasRef, handleFirstFrameDecoded)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    let isDisposed = false
    let context = null

    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger')
    ]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (isDisposed || !sectionRef.current) return
      gsap.registerPlugin(ScrollTrigger)

      const panels = gsap.utils.toArray('.scroll-scene__panel')
      const header = document.querySelector('.site-header')
      const scrollHint = sectionRef.current.querySelector('.scroll-experience__hint')

      context = gsap.context(() => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true
          }
        })
        timeline.set(panels, { autoAlpha: 0, y: 28 })
          .to(scrollHint, { autoAlpha: 0, duration: .08 }, .01)
          .to(panels[0], { autoAlpha: 1, y: 0, duration: .08 }, .12)
          .to(panels[0], { autoAlpha: 0, y: -28, duration: .08 }, .36)
          .to(panels[1], { autoAlpha: 1, y: 0, duration: .08 }, .44)
          .to(panels[1], { autoAlpha: 0, y: -28, duration: .08 }, .6)
          .to(panels[2], { autoAlpha: 1, y: 0, duration: .08 }, .68)
          .to(panels[2], { autoAlpha: 0, y: -28, duration: .08 }, .84)
          .to(panels[3], { autoAlpha: 1, y: 0, duration: .08 }, .92)
          .to(panels[4], { autoAlpha: 1, y: 0, duration: .08 }, .92)

        if (header) {
          let headerVisible = true
          const setHeaderVisibility = (visible) => {
            if (visible === headerVisible) return
            headerVisible = visible
            gsap.to(header, {
              autoAlpha: visible ? 1 : 0,
              y: visible ? 0 : -12,
              pointerEvents: visible ? 'auto' : 'none',
              duration: .32,
              overwrite: true
            })
          }
          gsap.set(header, { autoAlpha: 1, y: 0, pointerEvents: 'auto' })
          ScrollTrigger.create({
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: ({ progress }) => setHeaderVisibility(progress <= 0.12 || progress >= 0.94),
          })
        }
      }, sectionRef)
    }).catch((err) => {
      console.warn('GSAP lazy load error in ScrollExperience:', err)
    })

    return () => {
      isDisposed = true
      context?.revert()
    }
  }, [])

  return (
    <section className="scroll-experience" ref={sectionRef} id="top">
      <div className="scroll-experience__stage">
        {/* Poster (frame-0001) para primer look instantáneo */}
        <img
          src="/poster-0001.webp"
          alt="NOVA Barbershop estilo inicial"
          className="scroll-experience__poster"
          fetchPriority="high"
          decoding="sync"
        />
        <canvas
          ref={canvasRef}
          className={`scroll-experience__canvas ${isCanvasReady ? 'is-ready' : 'is-loading'}`}
          aria-label="Secuencia visual de estilos NOVA"
        />
        <div className="scroll-experience__veil" />
        <div className="scroll-scene__panel scroll-scene__panel--hero"><p className="scene-eyebrow">Tu estilo, sin límites</p><h1>Descubre tu<br /><em>próximo look</em></h1><p>Prueba nuevos estilos, visualiza el resultado y reserva tu cita en segundos.</p><div className="scene-actions"><a className="scene-button" href="#reserva" onClick={(e) => { e.preventDefault(); onOpenBooking?.(); }}>Reservar ahora <ArrowUpRight size={16} /></a><a className="scene-button scene-button--ghost" href="#simulacion"><CirclePlay size={16} /> Probar simulación</a></div></div>
        <div className="scroll-scene__panel scroll-scene__panel--services"><p className="scene-eyebrow">Nuestros servicios</p><h2>Más que un corte,<br /><em>una experiencia</em></h2><p>Estilo, precisión y cuidado personal en un solo lugar. Reserva en segundos y déjalo en manos de expertos.</p><div className="scene-service-grid"><span><Scissors /><b>Corte personalizado</b><small>Diseñado para ti</small></span><span><Sparkles /><b>Barba y afeitado</b><small>Precisión y cuidado</small></span><span><Sparkles /><b>Peinado y styling</b><small>Encuentra tu estilo</small></span><span><Sparkles /><b>Tratamientos premium</b><small>Cuidado experto</small></span></div><a className="scene-booking" href="#reserva" onClick={(e) => { e.preventDefault(); onOpenBooking?.(); }}><CalendarDays size={17} /><b>Reserva tu cita</b><small>Selecciona fecha y hora en segundos.</small><ArrowUpRight size={16} /></a></div>
        <div className="scroll-scene__panel scroll-scene__panel--simulation"><p className="scene-eyebrow">El método NOVA</p><h2>Un ritual<br /><em>hecho a tu medida.</em></h2><p>No empezamos con una máquina. Empezamos contigo.</p><div className="method-list"><span><b>01</b><strong>Diagnóstico</strong><small>Escuchamos lo que buscas.</small></span><span><b>02</b><strong>Diseño</strong><small>Definimos tu mejor forma.</small></span><span><b>03</b><strong>Acabado</strong><small>El detalle cambia todo.</small></span></div></div>
        <div className="scroll-scene__panel scroll-scene__panel--final"><p className="scene-eyebrow">Historias reales</p><h2>Sal con otra<br /><em>actitud.</em></h2><div className="social-proof"><Quote size={20} /><p>“Por fin encontré un corte que se siente como yo.”</p><span>— Mateo R. / Cliente NOVA</span></div><a className="scene-button" href="#reserva" onClick={(e) => { e.preventDefault(); onOpenBooking?.(); }}>Reservar ahora <ArrowUpRight size={16} /></a></div>
        <div className="scroll-scene__panel scroll-scene__panel--closing"><p className="scene-eyebrow">Pruébalo en ti</p><h2>Encuentra tu<br /><em>próximo estilo.</em></h2><p>Compara diferentes looks antes de reservar.</p><div className="visit-details"><span><MapPin size={16} /><b>Centro Histórico, Lima</b></span><span><Clock3 size={16} /><b>Lun — Sáb / 9:00 — 20:00</b></span></div><a className="scene-button" href="#simulacion"><CirclePlay size={16} /> Probar simulación <ArrowUpRight size={16} /></a></div>
        <span className="scroll-experience__progress">01 <i /> 05</span><span className="scroll-experience__hint"><Mouse size={15} strokeWidth={1.5} aria-hidden="true" /> Desliza para descubrir</span>
      </div>
    </section>
  )
})