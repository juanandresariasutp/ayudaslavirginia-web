import { LogoMark } from '../components/common/LogoMark'

interface MaintenanceViewProps {
  onAdminAccess: () => void
}

export function MaintenanceView({ onAdminAccess }: MaintenanceViewProps) {
  return (
    <main className="maintenance-page">
      <section className="maintenance-card" aria-labelledby="maintenance-title">
        <div className="maintenance-brand">
          <LogoMark />
          <div>
            <strong>Ayudas La Virginia</strong>
            <span>Juntos nos levantamos</span>
          </div>
        </div>

        <span className="maintenance-code">503</span>
        <p className="maintenance-eyebrow">SERVICIO TEMPORALMENTE PAUSADO</p>
        <h1 id="maintenance-title">Página temporalmente fuera de servicio</h1>
        <p className="maintenance-message">
          Estamos trabajando para mejorar su funcionamiento y experiencia.
        </p>

        <button className="maintenance-admin-button" type="button" onClick={onAdminAccess}>
          Acceso para administradores
        </button>
      </section>
    </main>
  )
}
