import { ArrowRight, CalendarDays, Clock3, MapPin, Scissors, Sparkles } from 'lucide-react'
import './ScrollExperience.css'

const services = [
  { number: '01', name: 'Corte Sumaq', detail: 'Diagnóstico, corte y peinado', price: 'S/ 55' },
  { number: '02', name: 'Corte & barba', detail: 'Perfilado, navaja y toalla caliente', price: 'S/ 80' },
  { number: '03', name: 'Barba clásica', detail: 'Diseño, afeitado y aceites', price: 'S/ 40' },
  { number: '04', name: 'Ritual capilar', detail: 'Detox, exfoliación y masaje', price: 'S/ 70' },
]

export function ScrollExperience({ onOpenBooking }) {
  return (
    <div className="landing" id="inicio">
      <section className="landing-hero" aria-labelledby="hero-title">
        <img
          src="/poster-0001.webp"
          alt="Corte contemporáneo creado por Sumaq Barber"
          className="landing-hero__image"
          fetchPriority="high"
          decoding="async"
        />
        <div className="landing-hero__shade" />
        <div className="landing-hero__copy">
          <p className="landing-kicker"><span /> Barbería contemporánea · Lima</p>
          <h1 id="hero-title">Tu mejor versión<br /><em>empieza aquí.</em></h1>
          <p className="landing-lead">Un corte pensado para tu rostro, tu ritmo y tu identidad. Sin fórmulas; con oficio.</p>
          <div className="landing-actions">
            <button type="button" className="landing-primary" onClick={onOpenBooking}>
              Reservar mi cita <ArrowRight size={18} />
            </button>
            <a className="landing-secondary" href="#servicios">Ver servicios</a>
          </div>
        </div>
        <div className="landing-hero__note" aria-hidden="true">
          <span>01</span><i /><span>SUMAQ</span>
        </div>
      </section>

      <section className="landing-services" id="servicios" aria-labelledby="services-title">
        <header className="section-heading">
          <p className="landing-kicker"><span /> Carta de servicios</p>
          <h2 id="services-title">Precisión en cada<br /><em>detalle.</em></h2>
          <p>Precios claros, tiempos reales y una recomendación honesta antes de empezar.</p>
        </header>
        <div className="service-list">
          {services.map((service) => (
            <article className="service-line" key={service.number}>
              <span className="service-line__number">{service.number}</span>
              <Scissors size={19} aria-hidden="true" />
              <div><h3>{service.name}</h3><p>{service.detail}</p></div>
              <strong>{service.price}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-method" id="experiencia" aria-labelledby="method-title">
        <div className="landing-method__visual">
          <span className="landing-method__monogram">S</span>
          <p>Oficio · criterio · cuidado</p>
        </div>
        <div className="landing-method__copy">
          <p className="landing-kicker"><span /> El ritual Sumaq</p>
          <h2 id="method-title">No empezamos<br />con la máquina.</h2>
          <ol>
            <li><b>01</b><div><strong>Escuchamos</strong><p>Entendemos tu rutina, referencias y lo que quieres evitar.</p></div></li>
            <li><b>02</b><div><strong>Diseñamos</strong><p>Elegimos forma, proporción y acabado para tu tipo de cabello.</p></div></li>
            <li><b>03</b><div><strong>Perfeccionamos</strong><p>Terminamos con detalle y te enseñamos a mantener el resultado.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="landing-visit" id="visitanos" aria-labelledby="visit-title">
        <div>
          <p className="landing-kicker"><span /> Tu próxima cita</p>
          <h2 id="visit-title">Haz espacio para<br /><em>verte bien.</em></h2>
        </div>
        <div className="visit-details">
          <p><MapPin size={20} /><span><small>Ubicación</small>Centro Histórico, Lima</span></p>
          <p><Clock3 size={20} /><span><small>Horario</small>Lun–Sáb · 9:00–20:00</span></p>
          <p><CalendarDays size={20} /><span><small>Atención</small>Con reserva previa</span></p>
        </div>
        <button type="button" className="landing-primary" onClick={onOpenBooking}>
          Elegir fecha y hora <Sparkles size={18} />
        </button>
      </section>

      <footer className="site-footer">
        <span>SUMAQ BARBER · LIMA</span><span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
