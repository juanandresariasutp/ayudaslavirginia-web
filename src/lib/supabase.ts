import { optimizeImage } from '../utils/imageOptimizer'
import type { SimilarRequestGroup } from '../types'
import { dbToCategory, dbToStatus } from '../config/constants'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)
const sessionKey = 'ayudas-admin-session'

export interface Session { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }

function headers(session?: Session, contentType = true) {
  return { apikey: key ?? '', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}), ...(contentType ? { 'Content-Type': 'application/json' } : {}) }
}

async function request<T>(path: string, options: RequestInit = {}, session?: Session): Promise<T> {
  if (!url || !key) throw new Error('Supabase no está configurado')
  const response = await fetch(`${url}${path}`, { ...options, headers: { ...headers(session), ...(options.headers ?? {}) } })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message ?? body?.error_description ?? body?.hint ?? 'Error al ingresar los datosgit ')
  return body as T
}

export function savedSession(): Session | null { try { return JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null') } catch { return null } }
export function logout() { sessionStorage.removeItem(sessionKey) }

export async function login(email: string, password: string) {
  const session = await request<Session>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) })
  sessionStorage.setItem(sessionKey, JSON.stringify(session)); return session
}

export async function getAdminProfile(session: Session) {
  const rows = await request<Array<{ id: string; full_name: string; role: 'admin' | 'superadmin'; active: boolean }>>(`/rest/v1/admin_profiles?id=eq.${session.user.id}&select=*`, {}, session)
  if (!rows[0]?.active) throw new Error('Esta cuenta no tiene acceso administrativo activo')
  return rows[0]
}

export async function getPublicRequests() { return request<Array<Record<string, unknown>>>('/rest/v1/public_help_requests?select=*&order=created_at.desc') }
export async function getPrivateRequests(session: Session) { return request<Array<Record<string, unknown>>>('/rest/v1/help_requests?select=*&order=created_at.desc', {}, session) }
export async function getPrivateRequest(session: Session, id: string) {
  const row = await request<Record<string, unknown> | null>('/rest/v1/rpc/get_private_help_request', { method: 'POST', body: JSON.stringify({ request_id: id }) }, session)
  return row ? [row] : []
}
export async function detectSimilarRequests(session: Session): Promise<SimilarRequestGroup[]> {
  const rows = await request<Array<{
    match_type: 'document' | 'phone'
    masked_value: string
    request_count: number
    requests: Array<{
      id: string
      public_code: string
      neighborhood: string
      category: string
      status: string
      created_at: string
    }>
  }>>('/rest/v1/rpc/detect_similar_help_requests', { method: 'POST', body: '{}' }, session)

  return rows.map((group) => ({
    matchType: group.match_type,
    maskedValue: group.masked_value,
    requestCount: group.request_count,
    requests: group.requests.map((item) => ({
      id: item.id,
      publicCode: item.public_code,
      neighborhood: item.neighborhood,
      category: dbToCategory[item.category] ?? 'Otros',
      status: dbToStatus[item.status] ?? 'Sin atender',
      createdAt: item.created_at
    }))
  }))
}
export async function getChanges(session: Session) { return request<Array<Record<string, unknown>>>('/rest/v1/status_change_requests?select=*,help_requests(*),reviewer:admin_profiles!status_change_requests_reviewed_by_fkey(full_name)&order=created_at.desc', {}, session) }
export async function getCollectionCenters(session?: Session) { return request<Array<Record<string, unknown>>>('/rest/v1/collection_centers?select=*&order=name.asc', {}, session) }
export async function getCompletedRequestMedia() { return request<Array<{ request_id: string; request_photo_path: string | null; solution_photo_path: string | null }>>('/rest/v1/completed_request_media?select=request_id,request_photo_path,solution_photo_path') }

export async function createCollectionCenter(session: Session, payload: Record<string, unknown>) {
  return request('/rest/v1/collection_centers', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) }, session)
}

export async function updateCollectionCenter(session: Session, id: string, payload: Record<string, unknown>) {
  return request(`/rest/v1/collection_centers?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }) }, session)
}

export async function deleteCollectionCenter(session: Session, id: string) {
  return request(`/rest/v1/collection_centers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, session)
}

export async function getEvidenceUrl(session: Session | undefined, path: string) {
  if (!url || !path) return ''
  const result = await request<{ signedURL?: string; signedUrl?: string }>(`/storage/v1/object/sign/request-evidence/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', body: JSON.stringify({ expiresIn: 600 }) }, session)
  const signedPath = result.signedURL ?? result.signedUrl ?? ''
  return signedPath.startsWith('http') ? signedPath : `${url}/storage/v1${signedPath}`
}



export async function uploadEvidence(folder: 'requests' | 'changes', file: File, session?: Session) {
  if (!url || !key) throw new Error('Supabase no está configurado')
  const optimizedFile = await optimizeImage(file)
  const safeName = `${crypto.randomUUID()}-${optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const path = `${folder}/${safeName}`
  const response = await fetch(`${url}/storage/v1/object/request-evidence/${path}`, { method: 'POST', headers: { ...headers(session, false), 'Content-Type': optimizedFile.type, 'cache-control': '31536000', 'x-upsert': 'false' }, body: optimizedFile })
  if (!response.ok) throw new Error('No fue posible cargar la fotografía')
  return path
}

export async function insertRequest(payload: Record<string, unknown>) {
  return request<Array<{ id: string; public_code: string }>>('/rest/v1/help_requests?select=id,public_code', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) })
}

export async function insertChange(payload: Record<string, unknown>) {
  return request('/rest/v1/status_change_requests', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) })
}

export async function reviewChange(session: Session, id: string, approve: boolean, reason?: string) {
  return request('/rest/v1/rpc/approve_status_change', { method: 'POST', body: JSON.stringify({ change_id: id, approve, reason: reason ?? null }) }, session)
}

export async function deleteRequest(session: Session, id: string) {
  return request(`/rest/v1/help_requests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, session)
}

export async function updateRequest(session: Session, id: string, payload: Record<string, unknown>) {
  return request(`/rest/v1/help_requests?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) }, session)
}

export async function deleteChange(session: Session, id: string) {
  return request(`/rest/v1/status_change_requests?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, session)
}

export async function updateChange(session: Session, id: string, payload: Record<string, unknown>) {
  return request(`/rest/v1/status_change_requests?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) }, session)
}

export async function createAdmin(session: Session, payload: { email: string; password: string; fullName: string; role: 'admin' | 'superadmin' }) {
  return request('/functions/v1/manage-admin', { method: 'POST', body: JSON.stringify({ action: 'create', ...payload }) }, session)
}

export async function listAdmins(session: Session) {
  return request<Array<{ id: string; email: string; name: string; role: 'admin' | 'superadmin'; active: boolean }>>('/functions/v1/manage-admin', { method: 'POST', body: JSON.stringify({ action: 'list' }) }, session)
}

export async function updateAdmin(session: Session, payload: { userId: string; email: string; fullName: string; role: 'admin' | 'superadmin'; active: boolean; password?: string }) {
  return request('/functions/v1/manage-admin', { method: 'POST', body: JSON.stringify({ action: 'update', ...payload }) }, session)
}

export async function deleteAdmin(session: Session, userId: string) {
  return request('/functions/v1/manage-admin', { method: 'POST', body: JSON.stringify({ action: 'delete', userId }) }, session)
}
