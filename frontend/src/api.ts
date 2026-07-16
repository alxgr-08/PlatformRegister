// Cliente HTTP del backend de registro de evento y charlas.

const BASE: string = import.meta.env.VITE_API_URL ?? ''

// ----------------------------------------------------------------- Tipos

export interface Asistente {
  id: number
  dni: string
  nombreCompleto: string
  nombre: string | null
  apellidos: string | null
  celular: string | null
  correo: string | null
  especialidad: string | null
  tipoRegistro: string
  ingresadoAlEvento: boolean
  fechaIngresoEvento: string | null
}

export interface BusquedaAsistente {
  encontrado: boolean
  asistente: Asistente | null
}

export interface EstadisticasAsistentes {
  totalAsistentes: number
  totalIngresadosAlEvento: number
}

export type NivelOcupacion = 'VERDE' | 'NARANJA' | 'ROJO'
export type EstadoCharla = 'DISPONIBLE' | 'LLENA' | 'FINALIZADA'

export interface Charla {
  id: number
  nombre: string
  sala: string
  horaInicio: string
  horaFin: string
  aforo: number
  registrados: number
  disponibles: number
  porcentajeOcupacion: number
  nivelOcupacion: NivelOcupacion
  estado: EstadoCharla
  oculta: boolean
  finalizada: boolean
}

export interface CrearAsistenteInput {
  dni: string
  nombreCompleto: string
  celular?: string
  correo?: string
  especialidad?: string
}

export interface ActualizarAsistenteInput {
  nombreCompleto: string
  celular?: string
  correo?: string
  especialidad?: string
}

export interface CharlaInput {
  nombre: string
  sala: string
  horaInicio: string
  horaFin: string
  aforo: number
  oculta?: boolean
}

export interface ResultadoCarga {
  filasLeidas: number
  filasProcesadas: number
  filasOmitidas: number
  errores: string[]
}

// ----------------------------------------------------- Clave de administracion

const ADMIN_KEY_STORAGE = 'evento.adminKey'

export function getAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE)
}

export function setAdminKey(clave: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, clave)
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE)
}

/** Valida la clave de administrador contra el backend. Lanza ApiError si es incorrecta. */
export async function loginAdmin(clave: string): Promise<void> {
  await request('/api/admin/login', { method: 'POST', body: { clave } })
}

// --------------------------------------------------------------- Cliente HTTP

export class ApiError extends Error {
  status: number
  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.status = status
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  admin?: boolean
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.admin) {
    const clave = getAdminKey()
    if (clave) headers['X-Admin-Key'] = clave
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica que el backend este encendido.')
  }

  if (res.status === 204) return undefined as T

  const texto = await res.text()
  const data = texto ? JSON.parse(texto) : null

  if (!res.ok) {
    const mensaje = data?.mensaje ?? data?.error ?? `Error ${res.status}`
    throw new ApiError(res.status, mensaje)
  }
  return data as T
}

// ------------------------------------------------------------------- API

export const api = {
  // --- Asistentes ---
  buscarAsistente: (dni: string) =>
    request<BusquedaAsistente>(`/api/asistentes/buscar?dni=${encodeURIComponent(dni)}`),

  estadisticasAsistentes: () =>
    request<EstadisticasAsistentes>('/api/asistentes/estadisticas'),

  crearAsistente: (input: CrearAsistenteInput) =>
    request<Asistente>('/api/asistentes', { method: 'POST', body: input }),

  actualizarAsistente: (dni: string, input: ActualizarAsistenteInput) =>
    request<Asistente>(`/api/asistentes/${encodeURIComponent(dni)}`, { method: 'PUT', body: input }),

  registrarIngreso: (dni: string) =>
    request<Asistente>(`/api/asistentes/${encodeURIComponent(dni)}/ingreso`, { method: 'POST' }),

  deshacerIngreso: (dni: string) =>
    request<Asistente>(`/api/asistentes/${encodeURIComponent(dni)}/ingreso`, { method: 'DELETE' }),

  charlasDelAsistente: (dni: string) =>
    request<Charla[]>(`/api/asistentes/${encodeURIComponent(dni)}/charlas`),

  // --- Charlas ---
  listarCharlas: (incluirOcultas = true, incluirFinalizadas = true) =>
    request<Charla[]>(
      `/api/charlas?incluirOcultas=${incluirOcultas}&incluirFinalizadas=${incluirFinalizadas}`,
    ),

  crearCharla: (input: CharlaInput) =>
    request<Charla>('/api/charlas', { method: 'POST', body: input, admin: true }),

  actualizarCharla: (id: number, input: CharlaInput) =>
    request<Charla>(`/api/charlas/${id}`, { method: 'PUT', body: input, admin: true }),

  eliminarCharla: (id: number) =>
    request<void>(`/api/charlas/${id}`, { method: 'DELETE', admin: true }),

  registrarEnCharla: (charlaId: number, dni: string) =>
    request<Charla>(`/api/charlas/${charlaId}/registros`, { method: 'POST', body: { dni } }),

  deshacerRegistroCharla: (charlaId: number, dni: string) =>
    request<Charla>(`/api/charlas/${charlaId}/registros/${encodeURIComponent(dni)}`, {
      method: 'DELETE',
    }),

  cambiarVisibilidadCharla: (charlaId: number, oculta: boolean) =>
    request<Charla>(`/api/charlas/${charlaId}/visibilidad`, { method: 'PATCH', body: { oculta } }),
}

// --------------------------------------------------- Base de datos (Excel)

/** Importa la base de asistentes desde un archivo Excel (.xlsx). */
export async function importarExcel(archivo: File): Promise<ResultadoCarga> {
  const form = new FormData()
  form.append('archivo', archivo)
  const headers: Record<string, string> = {}
  const clave = getAdminKey()
  if (clave) headers['X-Admin-Key'] = clave

  let res: Response
  try {
    res = await fetch(`${BASE}/api/carga/asistentes-excel`, { method: 'POST', headers, body: form })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }
  const texto = await res.text()
  const data = texto ? JSON.parse(texto) : null
  if (!res.ok) {
    throw new ApiError(res.status, data?.mensaje ?? data?.error ?? `Error ${res.status}`)
  }
  return data as ResultadoCarga
}

/** Descarga toda la base de asistentes como archivo Excel. */
export async function exportarExcel(): Promise<void> {
  const headers: Record<string, string> = {}
  const clave = getAdminKey()
  if (clave) headers['X-Admin-Key'] = clave

  let res: Response
  try {
    res = await fetch(`${BASE}/api/carga/exportar`, { headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`
    try {
      const d = JSON.parse(await res.text())
      mensaje = d?.mensaje ?? mensaje
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, mensaje)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `BASE_DATOS_EVENTO_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Descarga los asistentes de una charla especifica como archivo Excel. */
export async function exportarExcelDeCharla(charlaId: number, nombreCharla?: string): Promise<void> {
  const headers: Record<string, string> = {}
  const clave = getAdminKey()
  if (clave) headers['X-Admin-Key'] = clave

  let res: Response
  try {
    res = await fetch(`${BASE}/api/carga/exportar/charla/${charlaId}`, { headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }
  if (!res.ok) {
    let mensaje = `Error ${res.status}`
    try {
      const d = JSON.parse(await res.text())
      mensaje = d?.mensaje ?? mensaje
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, mensaje)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const nombreLimpio = nombreCharla
    ? nombreCharla.replace(/[^a-zA-Z0-9]+/g, '_')
    : `charla_${charlaId}`
  a.download = `CHARLA_${nombreLimpio}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
