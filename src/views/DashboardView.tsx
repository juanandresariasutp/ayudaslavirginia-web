import React from 'react'
import type { Category, HelpRequest, ImagePreview, Priority, Sort, Status } from '../types'
import { categories, statuses } from '../config/constants'
import { LogoMark } from '../components/common/LogoMark'
import { RequestCard } from '../components/requests/RequestCard'

interface DashboardViewProps {
  requests: HelpRequest[]
  ordered: HelpRequest[]
  visible: HelpRequest[]
  page: number
  pages: number
  category: 'Todas' | Category
  status: 'Activas' | Status
  sort: Sort
  requestSearch: string
  requestDate: string
  completedMedia: Record<string, { requestUrl?: string; solutionUrl?: string }>
  setCategory: (val: 'Todas' | Category) => void
  setStatus: (val: 'Activas' | Status) => void
  setSort: (val: Sort) => void
  setRequestSearch: (val: string) => void
  setRequestDate: (val: string) => void
  setPage: React.Dispatch<React.SetStateAction<number>>
  setShowForm: (val: boolean) => void
  setChangeFor: (req: HelpRequest) => void
  setDetailFor: (req: HelpRequest) => void
  setImagePreview: (img: ImagePreview) => void
}

export function DashboardView({
  requests,
  ordered,
  visible,
  page,
  pages,
  category,
  status,
  sort,
  requestSearch,
  requestDate,
  completedMedia,
  setCategory,
  setStatus,
  setSort,
  setRequestSearch,
  setRequestDate,
  setPage,
  setShowForm,
  setChangeFor,
  setDetailFor,
  setImagePreview
}: DashboardViewProps) {
  return (
    <>
      <section className="help-cta">
        <LogoMark className="help-cta-logo" />
        <div>
          <span>ESTAMOS PARA AYUDARTE</span>
          <h2>¿Necesitas ayuda?</h2>
          <p>Cuéntanos qué necesitas y registra tu solicitud en pocos minutos.</p>
        </div>
        <button onClick={() => setShowForm(true)}>
          Solicitar ayuda <b>→</b>
        </button>
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">SOLICITUDES PÚBLICAS</span>
          <h2>Ayudas solicitadas</h2>
          <p className="muted">
            Consulta la información y ubicación autorizadas para coordinar la ayuda.
          </p>
        </div>
      </div>

      <section className="stats">
        <article>
          <span className="stat-icon orange">○</span>
          <div>
            <strong>{requests.filter(r => r.status === 'Sin atender').length}</strong>
            <p>Sin atender</p>
          </div>
        </article>
        <article>
          <span className="stat-icon blue">↻</span>
          <div>
            <strong>{requests.filter(r => r.status === 'En progreso').length}</strong>
            <p>En progreso</p>
          </div>
        </article>
        <article>
          <span className="stat-icon green">✓</span>
          <div>
            <strong>{requests.filter(r => r.status === 'Completada').length}</strong>
            <p>Completadas</p>
          </div>
        </article>
      </section>

      <section className="dashboard-filters">
        <label>
          Categoría
          <select value={category} onChange={e => setCategory(e.target.value as typeof category)}>
            {categories.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
            {statuses.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="creation-date-filter">
          Fecha de creación
          <input
            type="date"
            value={requestDate}
            onChange={event => setRequestDate(event.target.value)}
            aria-label="Filtrar por fecha de creación"
          />
        </label>
        <label>
          Ordenar por
          <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="priority">Prioridad</option>
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguas</option>
          </select>
        </label>
      </section>

      <section className="request-search-panel">
        <label>
          <span>Buscar solicitud por número</span>
          <input
            type="text"
            maxLength={80}
            value={requestSearch}
            onChange={event => {
              const val = event.target.value
              if (val.includes('"')) {
                setRequestSearch(val)
              } else {
                setRequestSearch(val.replace(/\D/g, ''))
              }
            }}
            placeholder='Ej. 70'
            aria-label="Buscar por número de solicitud"
          />
        </label>
      </section>

      <div className="result-count">
        {ordered.length} solicitudes · Página {page} de {pages} · 25 por página
      </div>

      <section className="ticket-grid">
        {visible.map(r => (
          <RequestCard
            key={r.id}
            request={r}
            onChange={setChangeFor}
            onDetails={setDetailFor}
            completedMedia={completedMedia[r.id]}
            onOpenImage={setImagePreview}
          />
        ))}
      </section>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          ← Anterior
        </button>
        <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>
          Siguiente →
        </button>
      </div>
    </>
  )
}
