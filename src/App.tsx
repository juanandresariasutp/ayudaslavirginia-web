import { useEffect, useMemo, useState } from 'react'
import { initialAdmins, initialChanges, initialRequests } from './data'
import type {
  AdminUser,
  Category,
  ChangeRequest,
  CollectionCenter,
  HelpRequest,
  ImagePreview,
  Priority,
  Session,
  Sort,
  View
} from './types'
import { PAGE_SIZE, categoryToDb, priorityToDb, priorityWeight } from './config/constants'
import {
  getAdminProfile,
  getCollectionCenters,
  getCompletedRequestMedia,
  getEvidenceUrl,
  getPublicRequests,
  insertRequest,
  logout,
  savedSession,
  supabaseConfigured,
  uploadEvidence
} from './lib/supabase'
import { requestCalendarDate, requestCodeNumber } from './utils/formatters'
import { mapCollectionCenter, mapPublic } from './utils/mappers'
import { requestSubmissionError } from './utils/validators'

// UI Components
import { LogoMark } from './components/common/LogoMark'
import { Header } from './components/common/Header'
import { ImageModal } from './components/common/ImageModal'
import {
  AdminIcon,
  CollectionCentersIcon,
  InfoIcon,
  LogoutIcon,
  MapIcon,
  RequestsIcon,
  StatisticsIcon
} from './components/common/Icons'
import { RequestForm } from './components/requests/RequestForm'
import { RequestDetailModal } from './components/requests/RequestDetailModal'
import { StatusChangeFormModal } from './components/admin/StatusChangeFormModal'
import { AdminLoginModal } from './components/admin/AdminLoginModal'
import { AdminPanel } from './components/admin/AdminPanel'

// Views
import { DashboardView } from './views/DashboardView'
import { MapView } from './views/MapView'
import { CollectionCentersPageView } from './views/CollectionCentersPageView'
import { InformationView } from './views/InformationView'
import { MaintenanceView } from './views/MaintenanceView'
import { StatisticsView } from './views/StatisticsView'

const MAINTENANCE_MODE = false

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [completedMedia, setCompletedMedia] = useState<
    Record<string, { requestUrl?: string; solutionUrl?: string }>
  >({})
  const [imagePreview, setImagePreview] = useState<ImagePreview>()
  const [centers, setCenters] = useState<CollectionCenter[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [changes, setChanges] = useState<ChangeRequest[]>(initialChanges)

  // Filters & State
  const [category, setCategory] = useState<'Todas' | Category>('Todas')
  const [status, setStatus] = useState<'Activas' | import('./types').Status>('Activas')
  const [sort, setSort] = useState<Sort>('priority')
  const [requestSearch, setRequestSearch] = useState('')
  const [requestDate, setRequestDate] = useState('')
  const [mapCategory, setMapCategory] = useState<'Todas' | Category>('Todas')
  const [mapPriority, setMapPriority] = useState<'Todas' | Priority>('Todas')
  const [page, setPage] = useState(1)

  // Modals & Navigation
  const [showForm, setShowForm] = useState(false)
  const [changeFor, setChangeFor] = useState<HelpRequest>()
  const [detailFor, setDetailFor] = useState<HelpRequest>()
  const [showLogin, setShowLogin] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [session, setSession] = useState<Session | null>(savedSession())
  const [adminProfile, setAdminProfile] = useState<{
    full_name: string
    role: 'admin' | 'superadmin'
  } | null>(null)
  const [notice, setNotice] = useState('')

  const ordered = useMemo(
    () =>
      requests
        .filter(
          r =>
            (!requestDate || requestCalendarDate(r.createdAt) === requestDate) &&
            (requestSearch
              ? requestCodeNumber(r) === String(Number(requestSearch))
              : (category === 'Todas' || r.category === category) &&
                (status === 'Activas' ? r.status !== 'Completada' : r.status === status))
        )
        .sort((a, b) => {
          if (a.status === 'Completada' && b.status !== 'Completada') return 1
          if (b.status === 'Completada' && a.status !== 'Completada') return -1
          if (sort === 'priority')
            return (
              priorityWeight[a.priority] - priorityWeight[b.priority] ||
              +new Date(b.createdAt) - +new Date(a.createdAt)
            )
          return sort === 'oldest'
            ? +new Date(a.createdAt) - +new Date(b.createdAt)
            : +new Date(b.createdAt) - +new Date(a.createdAt)
        }),
    [requests, category, status, sort, requestSearch, requestDate]
  )

  const mapRequests = useMemo(
    () =>
      requests.filter(
        request =>
          (mapCategory === 'Todas' || request.category === mapCategory) &&
          (mapPriority === 'Todas' || request.priority === mapPriority)
      ),
    [requests, mapCategory, mapPriority]
  )

  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))
  const visible = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const visibleCompletedMediaKey = visible
    .filter(request => request.status === 'Completada')
    .map(request => request.id)
    .join(',')

  useEffect(() => setPage(1), [category, status, sort, requestSearch, requestDate])

  useEffect(() => {
    if (!supabaseConfigured) {
      setRequests(initialRequests)
      return
    }
    getPublicRequests()
      .then(rows => setRequests(rows.map(mapPublic)))
      .catch(() => setNotice('No fue posible cargar Supabase.'))
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !visibleCompletedMediaKey) {
      setCompletedMedia({})
      return
    }
    const visibleIds = new Set(visibleCompletedMediaKey.split(','))
    getCompletedRequestMedia()
      .then(async rows => {
        const entries = await Promise.all(
          rows
            .filter(row => visibleIds.has(row.request_id))
            .map(async row => {
              const [requestUrl, solutionUrl] = await Promise.all([
                row.request_photo_path
                  ? getEvidenceUrl(undefined, row.request_photo_path).catch(() => '')
                  : '',
                row.solution_photo_path
                  ? getEvidenceUrl(undefined, row.solution_photo_path).catch(() => '')
                  : ''
              ])
              return [
                row.request_id,
                { requestUrl: requestUrl || undefined, solutionUrl: solutionUrl || undefined }
              ] as const
            })
        )
        setCompletedMedia(Object.fromEntries(entries))
      })
      .catch(() => undefined)
  }, [visibleCompletedMediaKey])

  useEffect(() => {
    if (!supabaseConfigured) return
    getCollectionCenters(session ?? undefined)
      .then(rows => setCenters(rows.map(mapCollectionCenter)))
      .catch(() => setNotice('No fue posible cargar los centros de acopio.'))
  }, [session])

  useEffect(() => {
    if (!session) return
    getAdminProfile(session)
      .then(setAdminProfile)
      .catch(() => {
        logout()
        setSession(null)
      })
  }, [session])

  async function refresh() {
    const rows = await getPublicRequests()
    setRequests(rows.map(mapPublic))
  }

  async function create(request: HelpRequest, photo?: File) {
    try {
      const photoPath = photo ? await uploadEvidence('requests', photo) : null
      const consentAt = new Date().toISOString()
      await insertRequest({
        full_name: request.fullName,
        document_type: request.documentType,
        document_number: request.documentNumber,
        phone: request.phone,
        neighborhood: request.neighborhood,
        exact_address: request.address,
        description: request.description.trim(),
        category: categoryToDb[request.category],
        declared_priority: priorityToDb[request.priority],
        exact_latitude: request.location?.latitude ?? null,
        exact_longitude: request.location?.longitude ?? null,
        request_photo_path: photoPath,
        privacy_consent_at: consentAt,
        privacy_notice_version: '2026-08-16-v3',
        human_confirmation_at: consentAt,
        public_contact_phone: request.phone,
        public_contact_address: request.address,
        public_contact_consent_at: consentAt,
        public_contact_notice_version: '2026-08-16-v3'
      })
      await refresh()
      setShowForm(false)
      setNotice('Solicitud enviada correctamente.')
    } catch (error) {
      alert(requestSubmissionError(error))
    }
  }

  function navigate(next: View) {
    setView(next)
    setMobileMenu(false)
  }

  function openAdmin() {
    setMobileMenu(false)
    if (session && adminProfile) setView('admin')
    else setShowLogin(true)
  }

  function closeSession() {
    logout()
    setSession(null)
    setAdminProfile(null)
    setView('dashboard')
    setMobileMenu(false)
  }

  if (MAINTENANCE_MODE && !(session && adminProfile)) {
    return (
      <>
        <MaintenanceView onAdminAccess={() => setShowLogin(true)} />
        {showLogin && (
          <AdminLoginModal
            close={() => setShowLogin(false)}
            success={(nextSession, profile) => {
              setSession(nextSession)
              setAdminProfile(profile)
              setShowLogin(false)
              setView('admin')
            }}
          />
        )}
      </>
    )
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside id="main-sidebar" className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <button
          className="sidebar-close"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenu(false)}
        >
          ×
        </button>
        <a className="logo" href="#dashboard" onClick={() => navigate('dashboard')}>
          <LogoMark />
          <b>
            Ayudas
            <br />
            La Virginia
          </b>
        </a>
        <nav>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => navigate('dashboard')}
          >
            <RequestsIcon />
            <span>Solicitudes</span>
          </button>
          <button
            className={view === 'mapa' ? 'active' : ''}
            onClick={() => navigate('mapa')}
          >
            <MapIcon />
            <span>Mapa</span>
          </button>
          <button
            className={view === 'acopios' ? 'active' : ''}
            onClick={() => navigate('acopios')}
          >
            <CollectionCentersIcon />
            <span>Centros de Acopio</span>
          </button>
          <button
            className={view === 'informacion' ? 'active' : ''}
            onClick={() => navigate('informacion')}
          >
            <InfoIcon />
            <span>Información</span>
          </button>
          {session && adminProfile && (
            <button
              className={view === 'estadisticas' ? 'active' : ''}
              onClick={() => navigate('estadisticas')}
            >
              <StatisticsIcon />
              <span>Estadísticas</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          {session && adminProfile ? (
            <>
              <button
                className={view === 'admin' ? 'active' : ''}
                onClick={() => navigate('admin')}
              >
                <AdminIcon />
                <span>Administración</span>
              </button>
              <button onClick={closeSession}>
                <LogoutIcon />
                <span>Cerrar sesión</span>
              </button>
              <small>
                {adminProfile.full_name} · {adminProfile.role}
              </small>
            </>
          ) : (
            <button onClick={openAdmin}>
              <AdminIcon />
              <span>Acceso admin</span>
            </button>
          )}
        </div>
      </aside>

      <main>
        <Header menuOpen={mobileMenu} toggleMenu={() => setMobileMenu(open => !open)} />
        {notice && <div className="notice">{notice}</div>}

        {view === 'dashboard' && (
          <DashboardView
            requests={requests}
            ordered={ordered}
            visible={visible}
            page={page}
            pages={pages}
            category={category}
            status={status}
            sort={sort}
            requestSearch={requestSearch}
            requestDate={requestDate}
            completedMedia={completedMedia}
            setCategory={setCategory}
            setStatus={setStatus}
            setSort={setSort}
            setRequestSearch={setRequestSearch}
            setRequestDate={setRequestDate}
            setPage={setPage}
            setShowForm={setShowForm}
            setChangeFor={setChangeFor}
            setDetailFor={setDetailFor}
            setImagePreview={setImagePreview}
          />
        )}

        {view === 'mapa' && (
          <MapView
            mapRequests={mapRequests}
            mapCategory={mapCategory}
            mapPriority={mapPriority}
            setMapCategory={setMapCategory}
            setMapPriority={setMapPriority}
            setChangeFor={setChangeFor}
            setDetailFor={setDetailFor}
          />
        )}

        {view === 'acopios' && <CollectionCentersPageView centers={centers} />}

        {view === 'informacion' && <InformationView requestHelp={() => setShowForm(true)} />}

        {view === 'estadisticas' && session && adminProfile && (
          <StatisticsView requests={requests} changes={changes} role={adminProfile.role} />
        )}

        {view === 'admin' && session && adminProfile && (
          <AdminPanel
            requests={requests}
            admins={admins}
            changes={changes}
            centers={centers}
            setAdmins={setAdmins}
            setChanges={setChanges}
            setRequests={setRequests}
            setCenters={setCenters}
            session={session}
            role={adminProfile.role}
            onNewRequest={() => setShowForm(true)}
          />
        )}
      </main>

      {view !== 'admin' && view !== 'estadisticas' && (
        <button className="floating-help" onClick={() => setShowForm(true)}>
          ＋ <span>Solicitar ayuda</span>
        </button>
      )}

      {showForm && <RequestForm close={() => setShowForm(false)} create={create} />}

      {changeFor && (
        <StatusChangeFormModal
          request={changeFor}
          close={() => setChangeFor(undefined)}
          sent={() => setNotice('Cambio enviado para revisión administrativa.')}
        />
      )}

      {detailFor && (
        <RequestDetailModal
          publicRequest={detailFor}
          session={session && adminProfile ? session : undefined}
          close={() => setDetailFor(undefined)}
          onOpenImage={setImagePreview}
        />
      )}

      {imagePreview && (
        <ImageModal image={imagePreview} close={() => setImagePreview(undefined)} />
      )}

      {showLogin && (
        <AdminLoginModal
          close={() => setShowLogin(false)}
          success={(nextSession, profile) => {
            setSession(nextSession)
            setAdminProfile(profile)
            setShowLogin(false)
            setView('admin')
          }}
        />
      )}
    </div>
  )
}
