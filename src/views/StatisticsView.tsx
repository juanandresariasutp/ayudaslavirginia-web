import { type CSSProperties, useMemo, useState } from "react";
import { categories, priorities } from "../config/constants";
import type {
  Category,
  ChangeRequest,
  HelpRequest,
  Priority,
  Status,
} from "../types";
import { displayRequestCode, requestCalendarDate } from "../utils/formatters";

interface StatisticsViewProps {
  requests: HelpRequest[];
  changes: ChangeRequest[];
  role: "admin" | "superadmin";
}

interface ChartItem {
  label: string;
  value: number;
}

function countBy<T>(items: T[], getLabel: (item: T) => string): ChartItem[] {
  const totals = new Map<string, number>();
  items.forEach((item) => {
    const label = getLabel(item);
    totals.set(label, (totals.get(label) ?? 0) + 1);
  });
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"));
}

function HorizontalBars({ items }: { items: ChartItem[] }) {
  const maximum = Math.max(...items.map((item) => item.value), 1);
  if (!items.length)
    return <p className="statistics-empty">Sin datos para mostrar.</p>;
  return (
    <div className="horizontal-chart">
      {items.map((item) => (
        <div className="horizontal-chart-row" key={item.label}>
          <div className="horizontal-chart-label">
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
          <div className="horizontal-chart-track" aria-hidden="true">
            <span
              style={{ width: `${Math.max(3, (item.value / maximum) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatisticsView({
  requests,
  changes,
  role,
}: StatisticsViewProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [category, setCategory] = useState<"Todas" | Category>("Todas");
  const [priority, setPriority] = useState<"Todas" | Priority>("Todas");
  const [status, setStatus] = useState<"Todos" | Status>("Todos");

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const date = requestCalendarDate(request.createdAt);
        return (
          (!fromDate || date >= fromDate) &&
          (!toDate || date <= toDate) &&
          (category === "Todas" || request.category === category) &&
          (priority === "Todas" || request.priority === priority) &&
          (status === "Todos" || request.status === status)
        );
      }),
    [category, fromDate, priority, requests, status, toDate],
  );

  const statistics = useMemo(() => {
    const requestIds = new Set(filteredRequests.map((request) => request.id));
    const relatedChanges = changes.filter((change) =>
      requestIds.has(change.requestId),
    );
    const reviewed = relatedChanges.filter(
      (change) => change.state !== "Pendiente",
    );
    const statusTotals = {
      pending: filteredRequests.filter(
        (request) => request.status === "Sin atender",
      ).length,
      progress: filteredRequests.filter(
        (request) => request.status === "En progreso",
      ).length,
      completed: filteredRequests.filter(
        (request) => request.status === "Completada",
      ).length,
    };
    const activity = countBy(
      reviewed,
      (change) => change.reviewedByName ?? "No identificado",
    ).map((reviewer) => {
      const reviewerChanges = reviewed.filter(
        (change) =>
          (change.reviewedByName ?? "No identificado") === reviewer.label,
      );
      return {
        ...reviewer,
        approved: reviewerChanges.filter(
          (change) => change.state === "Aprobado",
        ).length,
        rejected: reviewerChanges.filter(
          (change) => change.state === "Rechazado",
        ).length,
      };
    });
    return {
      statusTotals,
      completionRate: filteredRequests.length
        ? (statusTotals.completed / filteredRequests.length) * 100
        : 0,
      criticalActive: filteredRequests.filter(
        (request) =>
          request.priority === "Crítica" && request.status !== "Completada",
      ),
      categoryTotals: countBy(filteredRequests, (request) => request.category),
      neighborhoodTotals: countBy(
        filteredRequests,
        (request) => request.neighborhood,
      ).slice(0, 8),
      priorityTotals: countBy(filteredRequests, (request) => request.priority),
      dailyTotals: countBy(filteredRequests, (request) =>
        requestCalendarDate(request.createdAt),
      )
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(-14),
      pendingReviews: relatedChanges.filter(
        (change) => change.state === "Pendiente",
      ).length,
      activity,
    };
  }, [changes, filteredRequests]);

  const total = Math.max(filteredRequests.length, 1);
  const pendingEnd = (statistics.statusTotals.pending / total) * 360;
  const progressEnd =
    pendingEnd + (statistics.statusTotals.progress / total) * 360;
  const donutStyle = {
    "--pending-end": `${pendingEnd}deg`,
    "--progress-end": `${progressEnd}deg`,
  } as CSSProperties;

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setCategory("Todas");
    setPriority("Todas");
    setStatus("Todos");
  }

  return (
    <section className="statistics-page">
      <div className="section-heading statistics-heading">
        <div>
          <span className="eyebrow">ÁREA RESTRINGIDA · {role}</span>
          <h2>Estadísticas</h2>
          <p className="muted">
            Indicadores operativos calculados con las solicitudes y aprobaciones
            actuales.
          </p>
        </div>
      </div>

      <section
        className="statistics-filters"
        aria-label="Filtros de estadísticas"
      >
        <label>
          Desde
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as typeof category)
            }
          >
            {categories.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as typeof priority)
            }
          >
            {priorities.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option>Todos</option>
            <option>Sin atender</option>
            <option>En progreso</option>
            <option>Completada</option>
          </select>
        </label>
        <button type="button" className="secondary" onClick={clearFilters}>
          Limpiar filtros
        </button>
      </section>

      <div className="statistics-kpis">
        <article>
          <span>Total filtrado</span>
          <strong>{filteredRequests.length}</strong>
          <small>Solicitudes</small>
        </article>
        <article>
          <span>Atención completada</span>
          <strong>{statistics.completionRate.toFixed(1)}%</strong>
          <small>{statistics.statusTotals.completed} completadas</small>
        </article>
        <article>
          <span>Críticas activas</span>
          <strong>{statistics.criticalActive.length}</strong>
          <small>Requieren seguimiento</small>
        </article>
        <article>
          <span>Aprobaciones pendientes</span>
          <strong>{statistics.pendingReviews}</strong>
          <small>Por revisar</small>
        </article>
      </div>

      <div className="statistics-grid">
        <article className="statistics-card status-chart-card">
          <header>
            <div>
              <span className="eyebrow">ESTADO</span>
              <h3>Avance de solicitudes</h3>
            </div>
          </header>
          <div className="status-donut-layout">
            <div
              className={`status-donut ${filteredRequests.length ? "" : "is-empty"}`}
              style={donutStyle}
            >
              <span>
                <b>{filteredRequests.length}</b>
                <small>Total</small>
              </span>
            </div>
            <div className="chart-legend">
              <span className="legend-pending">
                Sin atender <b>{statistics.statusTotals.pending}</b>
              </span>
              <span className="legend-progress">
                En progreso <b>{statistics.statusTotals.progress}</b>
              </span>
              <span className="legend-completed">
                Completadas <b>{statistics.statusTotals.completed}</b>
              </span>
            </div>
          </div>
        </article>
        <article className="statistics-card">
          <header>
            <div>
              <span className="eyebrow">NECESIDADES</span>
              <h3>Solicitudes por categoría</h3>
            </div>
          </header>
          <HorizontalBars items={statistics.categoryTotals} />
        </article>
        <article className="statistics-card">
          <header>
            <div>
              <span className="eyebrow">TERRITORIO</span>
              <h3>Barrios con más solicitudes</h3>
            </div>
          </header>
          <HorizontalBars items={statistics.neighborhoodTotals} />
        </article>
        <article className="statistics-card">
          <header>
            <div>
              <span className="eyebrow">PRIORIDAD</span>
              <h3>Distribución de urgencia</h3>
            </div>
          </header>
          <HorizontalBars items={statistics.priorityTotals} />
        </article>
        <article className="statistics-card statistics-wide">
          <header>
            <div>
              <span className="eyebrow">TENDENCIA</span>
              <h3>Solicitudes creadas por día</h3>
            </div>
            <small>Últimos 14 días con actividad</small>
          </header>
          <div className="daily-chart">
            {statistics.dailyTotals.map((item) => {
              const maximum = Math.max(
                ...statistics.dailyTotals.map((day) => day.value),
                1,
              );
              return (
                <div className="daily-column" key={item.label}>
                  <b>{item.value}</b>
                  <span
                    style={{
                      height: `${Math.max(6, (item.value / maximum) * 100)}%`,
                    }}
                  />
                  <small>
                    {new Date(`${item.label}T12:00:00`).toLocaleDateString(
                      "es-CO",
                      { day: "2-digit", month: "short" },
                    )}
                  </small>
                </div>
              );
            })}
            {!statistics.dailyTotals.length && (
              <p className="statistics-empty">
                Sin actividad en el periodo seleccionado.
              </p>
            )}
          </div>
        </article>
        <article className="statistics-card">
          <header>
            <div>
              <span className="eyebrow">ATENCIÓN PRIORITARIA</span>
              <h3>Críticas todavía activas</h3>
            </div>
          </header>
          <div className="critical-list">
            {statistics.criticalActive.slice(0, 6).map((request) => (
              <div key={request.id}>
                <b>{displayRequestCode(request)}</b>
                <span>
                  {request.neighborhood} · {request.category}
                </span>
                <small>{request.status}</small>
              </div>
            ))}
            {!statistics.criticalActive.length && (
              <p className="statistics-empty">
                No hay solicitudes críticas activas.
              </p>
            )}
          </div>
        </article>
        <article className="statistics-card">
          <header>
            <div>
              <span className="eyebrow">EQUIPO</span>
              <h3>Actividad administrativa</h3>
            </div>
          </header>
          <div className="reviewer-activity">
            {statistics.activity.map((reviewer) => (
              <div key={reviewer.label}>
                <span>
                  <b>{reviewer.label}</b>
                  <small>{reviewer.value} revisiones</small>
                </span>
                <span>
                  <i className="activity-approved">
                    {reviewer.approved} aprobadas
                  </i>
                  <i className="activity-rejected">
                    {reviewer.rejected} rechazadas
                  </i>
                </span>
              </div>
            ))}
            {!statistics.activity.length && (
              <p className="statistics-empty">
                No hay revisiones en el periodo seleccionado.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
