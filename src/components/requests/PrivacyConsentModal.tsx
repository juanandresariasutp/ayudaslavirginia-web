import { useState } from 'react'

interface PrivacyConsentModalProps {
  close: () => void
  confirm: () => Promise<void>
}

export function PrivacyConsentModal({ close, confirm }: PrivacyConsentModalProps) {
  const [dataConsent, setDataConsent] = useState(false)
  const [humanConfirmed, setHumanConfirmed] = useState(false)
  const [publicContactConsent, setPublicContactConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function accept() {
    setBusy(true)
    try {
      await confirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop privacy-consent-backdrop" onMouseDown={close}>
      <section
        className="modal privacy-consent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <button className="close" onClick={close}>
          ×
        </button>
        <span className="eyebrow">AUTORIZACIÓN PREVIA, EXPRESA E INFORMADA</span>
        <h2 id="privacy-title">Tratamiento de datos personales</h2>
        <div className="privacy-copy">
          <p>
            En cumplimiento de la Ley 1581 de 2012 y sus normas reglamentarias, autorizo de
            manera libre, previa, expresa e informada a <b>Ayudas La Virginia</b>, como
            responsable del tratamiento, para recolectar, almacenar, consultar, actualizar,
            usar, circular de forma restringida y suprimir mis datos personales con las
            condiciones indicadas en este aviso.
          </p>
          <section>
            <h3>Datos tratados</h3>
            <p>
              Nombre, tipo y número de documento, teléfono, barrio, dirección, descripción de la
              necesidad, categoría, prioridad, ubicación exacta cuando sea compartida,
              fotografías, evidencias y firmas vinculadas con la solicitud.
            </p>
          </section>
          <section>
            <h3>Finalidades</h3>
            <ul>
              <li>Registrar, clasificar, priorizar y gestionar la solicitud de ayuda.</li>
              <li>Contactar al solicitante y coordinar la atención.</li>
              <li>Ubicar el lugar de atención y relacionar solicitudes cercanas.</li>
              <li>Verificar evidencias, firmas y cambios de estado.</li>
              <li>Prevenir fraude, automatizaciones y uso indebido.</li>
              <li>Conservar trazabilidad, seguridad y auditoría del servicio.</li>
              <li>
                Cumplir obligaciones legales y atender requerimientos de autoridades
                competentes.
              </li>
            </ul>
          </section>
          <section>
            <h3>Acceso y circulación</h3>
            <p>
              El número de documento y la firma seguirán restringidos a administradores
              autorizados y proveedores indispensables. Para facilitar la coordinación y
              demostrar la necesidad, el teléfono, la dirección exacta y la fotografía inicial
              se mostrarán públicamente en los detalles de la solicitud después de otorgar la
              autorización específica que aparece al final. Cuando la ayuda se complete,
              también podrá publicarse la fotografía de la solución como evidencia del
              resultado. No deben adjuntarse imágenes de documentos de identidad, menores de
              edad ni información ajena a la necesidad reportada.
            </p>
          </section>
          <section>
            <h3>Conservación</h3>
            <p>
              La información se conservará durante el tiempo necesario para gestionar la ayuda,
              atender obligaciones legales, resolver reclamaciones y mantener la trazabilidad.
              Después deberá eliminarse o anonimizarse cuando ya no sea necesaria y no exista un
              deber legal o contractual de conservación.
            </p>
          </section>
          <section>
            <h3>Derechos del titular</h3>
            <p>
              Puedo conocer, actualizar y rectificar mis datos; solicitar prueba de esta
              autorización; ser informado sobre su uso; presentar consultas o reclamos; revocar
              la autorización o solicitar la supresión cuando proceda; y acudir ante la
              Superintendencia de Industria y Comercio después de agotar el trámite ante el
              responsable. Para ejercer estos derechos puedo escribir a{' '}
              <a href="mailto:ayudaslavirginia@gmail.com">ayudaslavirginia@gmail.com</a>,
              identificando la solicitud y el derecho que deseo ejercer.
            </p>
          </section>
          <p className="privacy-note">
            La fotografía y la ubicación deben limitarse a lo necesario para gestionar la ayuda.
            La autorización puede consultarse posteriormente como evidencia del consentimiento
            otorgado.
          </p>
        </div>
        <div className="privacy-checks">
          <label className="consent">
            <input
              type="checkbox"
              required
              checked={dataConsent}
              onChange={event => setDataConsent(event.target.checked)}
            />{' '}
            <span>
              He leído este aviso y autorizo expresamente el tratamiento de mis datos
              personales para las finalidades descritas.
            </span>
          </label>
          <label className="consent bot-check">
            <input
              type="checkbox"
              required
              checked={humanConfirmed}
              onChange={event => setHumanConfirmed(event.target.checked)}
            />{' '}
            <span>Confirmo que soy una persona y que la información suministrada es auténtica.</span>
          </label>
          <label className="consent public-contact-check">
            <input
              type="checkbox"
              required
              checked={publicContactConsent}
              onChange={event => setPublicContactConsent(event.target.checked)}
            />{' '}
            <span>
              Autorizo expresamente que mi número de contacto, dirección exacta y fotografía de
              la solicitud se publiquen para que cualquier visitante pueda comprender la
              necesidad, comunicarse conmigo o llegar al lugar.
            </span>
          </label>
        </div>
        <div className="detail-actions">
          <button className="secondary" disabled={busy} onClick={close}>
            Volver
          </button>
          <button
            className="primary"
            disabled={!dataConsent || !humanConfirmed || !publicContactConsent || busy}
            onClick={accept}
          >
            {busy ? 'Enviando…' : 'Autorizar y enviar solicitud'}
          </button>
        </div>
      </section>
    </div>
  )
}
