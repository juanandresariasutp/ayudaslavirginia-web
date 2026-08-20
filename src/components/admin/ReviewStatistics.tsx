import type { ChangeRequest } from '../../types'

interface ReviewStatisticsProps {
  changes: ChangeRequest[]
}

export function ReviewStatistics({ changes }: ReviewStatisticsProps) {
  const reviewed = changes.filter(change => change.state !== 'Pendiente')
  const approved = reviewed.filter(change => change.state === 'Aprobado').length
  const rejected = reviewed.filter(change => change.state === 'Rechazado').length
  const reviewers = Array.from(
    reviewed
      .reduce((summary, change) => {
        const name = change.reviewedByName ?? 'Administrador no identificado'
        const current = summary.get(name) ?? { name, approved: 0, rejected: 0, lastReview: '' }
        if (change.state === 'Aprobado') current.approved += 1
        if (change.state === 'Rechazado') current.rejected += 1
        if (
          change.reviewedAt &&
          (!current.lastReview || +new Date(change.reviewedAt) > +new Date(current.lastReview))
        )
          current.lastReview = change.reviewedAt
        summary.set(name, current)
        return summary
      }, new Map<string, { name: string; approved: number; rejected: number; lastReview: string }>())
      .values()
  ).sort((a, b) => b.approved + b.rejected - a.approved - a.rejected)

  return (
    <section className="review-statistics" aria-labelledby="review-statistics-title">
      <div className="review-statistics-heading">
        <div>
          <span className="eyebrow">CONTROL DE REVISIONES</span>
          <h3 id="review-statistics-title">Actividad administrativa</h3>
        </div>
        <span>{reviewed.length} decisiones registradas</span>
      </div>
      <div className="review-summary">
        <article>
          <strong>{approved}</strong>
          <span>Aprobadas</span>
        </article>
        <article>
          <strong>{rejected}</strong>
          <span>Rechazadas</span>
        </article>
        <article>
          <strong>{reviewers.length}</strong>
          <span>Revisores</span>
        </article>
      </div>
      <div className="reviewer-grid">
        {reviewers.map(reviewer => (
          <article key={reviewer.name}>
            <div className="reviewer-avatar">
              {reviewer.name.charAt(0).toLocaleUpperCase('es-CO')}
            </div>
            <div>
              <b>{reviewer.name}</b>
              <span>
                {reviewer.approved + reviewer.rejected} revisiones
                {reviewer.lastReview
                  ? ` · Última: ${new Date(reviewer.lastReview).toLocaleString('es-CO')}`
                  : ''}
              </span>
            </div>
            <div className="reviewer-counts">
              <span className="approved-count">✓ {reviewer.approved}</span>
              <span className="rejected-count">× {reviewer.rejected}</span>
            </div>
          </article>
        ))}
        {!reviewers.length && (
          <p className="muted">Todavía no hay aprobaciones o rechazos registrados.</p>
        )}
      </div>
    </section>
  )
}
