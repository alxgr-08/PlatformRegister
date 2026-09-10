// Cliente HTTP del backend de registro de evento, charlas y diplomas.

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
  /** Personas que pasaron por el registro y tienen su DNI en la base. */
  registradosPorDni: number
  /** Personas sumadas a mano por el administrador: solo cuentan en el total. */
  agregadosManualmente: number
  totalIngresadosAlEvento: number
  preRegistradosEnBase: number
  nuevosEnBase: number
  preRegistradosIngresados: number
  nuevosIngresados: number
  porcentajeIngresados: number
  porcentajePreRegistrados: number
  porcentajeNuevos: number
}

export interface ContadorEvento {
  registradosPorDni: number
  agregadosManualmente: number
  total: number
}

export type NivelOcupacion = 'VERDE' | 'NARANJA' | 'ROJO'
export type EstadoCharla = 'DISPONIBLE' | 'LLENA' | 'FINALIZADA'

export interface Sala {
  id: number
  nombre: string
  orden: number
  activa: boolean
  totalCharlas: number
  charlasVisibles: number
  aforoTotal: number
  registradosTotal: number
}

export interface SalaInput {
  nombre: string
  orden?: number
  activa?: boolean
}

export interface Charla {
  id: number
  nombre: string
  sala: string
  salaId: number | null
  marca: string | null
  capacitador: string | null
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

export interface CharlaInput {
  nombre: string
  salaId: number
  marca?: string
  capacitador?: string
  horaInicio: string
  horaFin: string
  aforo: number
  oculta?: boolean
}

export interface ResultadoRegistroMultiple {
  registradas: number
  errores: string[]
  charlas: Charla[]
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

export interface ResultadoCarga {
  filasLeidas: number
  filasProcesadas: number
  filasOmitidas: number
  errores: string[]
}

// ------------------------------------------------------------- Diplomas

export type EstadoDiploma = 'PENDIENTE' | 'IMPRESO'

export interface Diploma {
  registroId: number
  charlaId: number
  dni: string
  nombreCompleto: string
  charla: string
  sala: string
  marca: string | null
  capacitador: string | null
  horaInicio: string
  horaFin: string
  estado: EstadoDiploma
  impresiones: number
  reimpreso: boolean
  impresoEn: string | null
}

export interface BusquedaDiplomas {
  asistente: Asistente
  diplomas: Diploma[]
  pendientes: number
  impresos: number
}

export interface ResumenDiplomas {
  total: number
  pendientes: number
  impresos: number
  reimpresos: number
}

export type AlineacionTexto = 'izquierda' | 'centro' | 'derecha'

/** Posicion y estilo de un texto del diploma, en milimetros sobre la hoja. */
export interface CampoDiploma {
  visible: boolean
  x: number
  y: number
  ancho: number
  tamano: number
  alineacion: AlineacionTexto
  negrita: boolean
  mayusculas: boolean
}

export type CampoDiplomaId = 'nombre' | 'charla' | 'marca' | 'capacitador' | 'fecha'

export interface CalibracionDiploma {
  tamanoHoja: string
  anchoHoja: number
  altoHoja: number
  orientacion: 'horizontal' | 'vertical'
  desplazamientoX: number
  desplazamientoY: number
  fuente: string
  nombre: CampoDiploma
  charla: CampoDiploma
  marca: CampoDiploma
  capacitador: CampoDiploma
  fecha: CampoDiploma
}

// ------------------------------------------------------------- Reportes

export interface FilaEspecialidad {
  especialidad: string
  enBase: number
  ingresaron: number
  faltantes: number
  porcentajeAsistencia: number
}

export interface ReporteEspecialidad {
  filas: FilaEspecialidad[]
  total: FilaEspecialidad
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

  // --- Salas ---
  listarSalas: (incluirInactivas = false) =>
    request<Sala[]>(`/api/salas?incluirInactivas=${incluirInactivas}`),

  crearSala: (input: SalaInput) =>
    request<Sala>('/api/salas', { method: 'POST', body: input, admin: true }),

  actualizarSala: (id: number, input: SalaInput) =>
    request<Sala>(`/api/salas/${id}`, { method: 'PUT', body: input, admin: true }),

  eliminarSala: (id: number) =>
    request<void>(`/api/salas/${id}`, { method: 'DELETE', admin: true }),

  // --- Charlas ---
  listarCharlas: (salaId?: number | null, incluirOcultas = true, incluirFinalizadas = true) => {
    const params = new URLSearchParams({
      incluirOcultas: String(incluirOcultas),
      incluirFinalizadas: String(incluirFinalizadas),
    })
    if (salaId != null) params.set('salaId', String(salaId))
    return request<Charla[]>(`/api/charlas?${params.toString()}`)
  },

  crearCharla: (input: CharlaInput) =>
    request<Charla>('/api/charlas', { method: 'POST', body: input, admin: true }),

  actualizarCharla: (id: number, input: CharlaInput) =>
    request<Charla>(`/api/charlas/${id}`, { method: 'PUT', body: input, admin: true }),

  eliminarCharla: (id: number) =>
    request<void>(`/api/charlas/${id}`, { method: 'DELETE', admin: true }),

  registrarEnCharla: (charlaId: number, dni: string) =>
    request<Charla>(`/api/charlas/${charlaId}/registros`, { method: 'POST', body: { dni } }),

  /** Inscribe un DNI en varias charlas de una sola vez (boton Guardar de la sala). */
  registrarEnVariasCharlas: (dni: string, charlaIds: number[]) =>
    request<ResultadoRegistroMultiple>('/api/charlas/registros', {
      method: 'POST',
      body: { dni, charlaIds },
    }),

  deshacerRegistroCharla: (charlaId: number, dni: string) =>
    request<Charla>(`/api/charlas/${charlaId}/registros/${encodeURIComponent(dni)}`, {
      method: 'DELETE',
    }),

  cambiarVisibilidadCharla: (charlaId: number, oculta: boolean) =>
    request<Charla>(`/api/charlas/${charlaId}/visibilidad`, { method: 'PATCH', body: { oculta } }),

  // --- Configuracion ---
  contadorEvento: () => request<ContadorEvento>('/api/configuracion/contador'),

  /** Suma personas al contador del evento (negativo para restar). */
  agregarAlContador: (cantidad: number) =>
    request<ContadorEvento>('/api/configuracion/contador', {
      method: 'POST',
      body: { cantidad },
      admin: true,
    }),

  /** Fija el total de personas agregadas a mano (se usa para ponerlo en cero). */
  fijarAgregadosAlContador: (agregados: number) =>
    request<ContadorEvento>('/api/configuracion/contador', {
      method: 'PUT',
      body: { agregados },
      admin: true,
    }),

  calibracionDiploma: () => request<CalibracionDiploma>('/api/configuracion/diploma'),

  guardarCalibracionDiploma: (calibracion: CalibracionDiploma) =>
    request<CalibracionDiploma>('/api/configuracion/diploma', {
      method: 'PUT',
      body: calibracion,
      admin: true,
    }),

  // --- Diplomas ---
  buscarDiplomas: (dni: string) =>
    request<BusquedaDiplomas>(`/api/diplomas/${encodeURIComponent(dni)}`),

  resumenDiplomas: () => request<ResumenDiplomas>('/api/diplomas/resumen'),

  marcarDiplomasImpresos: (registroIds: number[]) =>
    request<Diploma[]>('/api/diplomas/impresion', { method: 'POST', body: { registroIds } }),

  marcarDiplomaPendiente: (registroId: number) =>
    request<Diploma>(`/api/diplomas/${registroId}/pendiente`, { method: 'POST' }),

  // --- Reportes ---
  reporteEspecialidad: () => request<ReporteEspecialidad>('/api/reportes/especialidad'),
}

// --------------------------------------------------- Descargas de archivos

/** Descarga un archivo del backend enviando la clave de admin si la hay. */
async function descargar(path: string, nombreArchivo: string): Promise<void> {
  const headers: Record<string, string> = {}
  const clave = getAdminKey()
  if (clave) headers['X-Admin-Key'] = clave

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { headers })
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
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const hoy = () => new Date().toISOString().slice(0, 10)

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
export function exportarExcel(): Promise<void> {
  return descargar('/api/carga/exportar', `BASE_DATOS_EVENTO_${hoy()}.xlsx`)
}

/** Descarga los asistentes de una charla especifica como archivo Excel. */
export function exportarExcelDeCharla(charlaId: number, nombreCharla?: string): Promise<void> {
  const nombreLimpio = nombreCharla
    ? nombreCharla.replace(/[^a-zA-Z0-9]+/g, '_')
    : `charla_${charlaId}`
  return descargar(`/api/carga/exportar/charla/${charlaId}`, `CHARLA_${nombreLimpio}_${hoy()}.xlsx`)
}

/** Descarga el reporte de asistencia por especialidad como archivo Excel. */
export function exportarReporteEspecialidad(): Promise<void> {
  return descargar('/api/reportes/especialidad/excel', `REPORTE_ESPECIALIDAD_${hoy()}.xlsx`)
}
