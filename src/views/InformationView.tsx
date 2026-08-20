import { useState } from 'react'

interface InformationViewProps {
  requestHelp: () => void
}

export function InformationView({ requestHelp }: InformationViewProps) {
  const [videoUnavailable, setVideoUnavailable] = useState(false)
  return (
    <section className="information-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GUÍA PARA LA COMUNIDAD</span>
          <h2>Información</h2>
          <p className="muted">Aprende a consultar, solicitar y reportar una ayuda.</p>
        </div>
      </div>
      <div className="information-layout">
        <div className="tutorial-video-card">
          <div className="vertical-video">
            {videoUnavailable ? (
              <div className="video-placeholder" role="status">
                <span>▶</span>
                <b>Video explicativo</b>
                <p>El video estará disponible próximamente.</p>
              </div>
            ) : (
              <video
                controls
                playsInline
                preload="metadata"
                onError={() => setVideoUnavailable(true)}
                aria-label="Video: cómo usar Ayudas La Virginia"
              >
                <source src="/videos/manual-usuario.mp4" type="video/mp4" />
                Tu navegador no puede reproducir este video.
              </video>
            )}
          </div>
          <div>
            <h3>Cómo usar Ayudas La Virginia</h3>
            <p>Mira esta guía breve antes de enviar tu primera solicitud.</p>
          </div>
        </div>
        <div className="user-manual">
          <span className="eyebrow">MANUAL DE USUARIO</span>
          <h3>Pasos para solicitar ayuda</h3>
          <ol>
            <li>
              <span>1</span>
              <div>
                <b>Consulta las solicitudes</b>
                <p>Revisa las ayudas existentes y usa los filtros para encontrarlas por categoría, estado o prioridad.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <b>Selecciona “Solicitar ayuda”</b>
                <p>No necesitas crear una cuenta. Completa tus datos de contacto y describe claramente lo que necesitas.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <b>Guarda la ubicación</b>
                <p>Usa la ubicación del dispositivo o toca manualmente el punto exacto en el mapa.</p>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <b>Adjunta una fotografía</b>
                <p>Puedes tomar una foto o escogerla de la galería. Para escombros y mudanzas es obligatoria.</p>
              </div>
            </li>
            <li>
              <span>5</span>
              <div>
                <b>Autoriza y envía</b>
                <p>Lee el aviso de tratamiento de datos, confirma que eres una persona y envía la solicitud.</p>
              </div>
            </li>
            <li>
              <span>6</span>
              <div>
                <b>Reporta un avance</b>
                <p>Cuando una ayuda sea atendida, selecciona “Reportar avance” y adjunta evidencia y firma. La administración revisará el cambio.</p>
              </div>
            </li>
          </ol>
          <button className="primary manual-action" onClick={requestHelp}>
            ＋ Solicitar ayuda
          </button>
        </div>
      </div>
      <aside className="information-tip">
        <b>¿Necesitas encontrar una solicitud?</b>
        <p>
          En la sección Mapa puedes ver las ubicaciones aproximadas y abrir la ruta en Google Maps. Esta plataforma no reemplaza las líneas oficiales de emergencia.
        </p>
      </aside>
    </section>
  )
}
