import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, Pencil, Search, ShieldAlert, UserPlus, Users } from 'lucide-react'
import {
  api,
  ApiError,
  type Asistente,
  type BusquedaAsistente,
  type EstadisticasAsistentes,
} from '../api'
import EditarPersonaModal from '../components/EditarPersonaModal'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAdmin } from '../components/admin'
import { formatoFechaHora } from '../lib/formato'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

interface NuevoAsistente {
  dni: string
  nombreCompleto: string
  celular: string
  correo: string
  especialidad: string
}

const NUEVO_VACIO: NuevoAsistente = {
  dni: '',
  nombreCompleto: '',
  celular: '',
  correo: '',
  especialidad: '',
}

export default function Asistentes() {
  const { notificar } = useToast()
  const [stats, setStats] = useState<EstadisticasAsistentes | null>(null)
  const [dni, setDni] = useState('')
  const [busqueda, setBusqueda] = useState<BusquedaAsistente | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const [nuevo, setNuevo] = useState<NuevoAsistente>(NUEVO_VACIO)
  const [editando, setEditando] = useState(false)
  const dniRef = useRef<HTMLInputElement>(null)

  const cargarStats = useCallback(async () => {
    try {
      setStats(await api.estadisticasAsistentes())
    } catch {
      /* silencioso: las estadisticas no son criticas */
    }
  }, [])

  useEffect(() => {
    cargarStats()
  }, [cargarStats])

  /** Deja la pantalla en blanco, lista para la siguiente persona de la fila. */
  function limpiar() {
    setDni('')
    setBusqueda(null)
    setNuevo(NUEVO_VACIO)
    dniRef.current?.focus()
  }

  async function buscar() {
    const d = dni.trim()
    if (!d) {
      notificar('info', 'Ingresa un DNI para buscar.')
      return
    }
    setBuscando(true)
    setBusqueda(null)
    try {
      const r = await api.buscarAsistente(d)
      setBusqueda(r)
      if (!r.encontrado) {
        setNuevo({ ...NUEVO_VACIO, dni: d })
      }
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al buscar')
    } finally {
      setBuscando(false)
    }
  }

  /** Solo guarda al asistente en la base. No lo agrega al evento todavia. */
  async function guardarAsistente() {
    if (!nuevo.dni.trim() || !nuevo.nombreCompleto.trim()) {
      notificar('info', 'El DNI y el nombre completo son obligatorios.')
      return
    }
    setAccionando(true)
    try {
      const creado = await api.crearAsistente({
        dni: nuevo.dni.trim(),
        nombreCompleto: nuevo.nombreCompleto.trim(),
        celular: nuevo.celular.trim() || undefined,
        correo: nuevo.correo.trim() || undefined,
        especialidad: nuevo.especialidad.trim() || undefined,
      })
      setBusqueda({ encontrado: true, asistente: creado })
      notificar('exito', `${creado.nombreCompleto} guardado. Ahora agregalo al evento.`)
      cargarStats()
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setAccionando(false)
    }
  }

  /** Agrega al evento y deja todo en blanco para la siguiente consulta. */
  async function agregarAlEvento(asistente: Asistente) {
    setAccionando(true)
    try {
      await api.registrarIngreso(asistente.dni)
      notificar('exito', `${asistente.nombreCompleto} agregado al evento.`)
      cargarStats()
      limpiar()
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al agregar al evento')
    } finally {
      setAccionando(false)
    }
  }

  async function deshacerIngreso(asistente: Asistente) {
    if (!confirm(`¿Deshacer el ingreso al evento de ${asistente.nombreCompleto}?`)) return
    setAccionando(true)
    try {
      const actualizado = await api.deshacerIngreso(asistente.dni)
      setBusqueda({ encontrado: true, asistente: actualizado })
      notificar('info', 'Ingreso al evento deshecho.')
      cargarStats()
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error')
    } finally {
      setAccionando(false)
    }
  }

  const asistente = busqueda?.encontrado ? busqueda.asistente : null

  return (
    <>
      <PageHeader
        icono={<Users className="h-6 w-6" />}
        titulo="Asistentes"
        subtitulo="Registro general al evento"
      />
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <TarjetaStat
            etiqueta="REGISTRADOS AL EVENTO"
            valor={stats?.totalIngresadosAlEvento}
            detalle={
              stats
                ? stats.agregadosManualmente > 0
                  ? `${stats.registradosPorDni.toLocaleString('es-PE')} por DNI + ${stats.agregadosManualmente.toLocaleString('es-PE')} agregados`
                  : 'DNI únicos registrados'
                : undefined
            }
            acento
          />
          <TarjetaStat
            etiqueta="PRE-REGISTRADOS QUE INGRESARON"
            valor={stats?.preRegistradosIngresados}
            detalle={
              stats ? `${stats.porcentajePreRegistrados}% de los registrados por DNI` : undefined
            }
          />
          <TarjetaStat
            etiqueta="NUEVOS QUE INGRESARON"
            valor={stats?.nuevosIngresados}
            detalle={stats ? `${stats.porcentajeNuevos}% de los registrados por DNI` : undefined}
          />
        </div>

        <ContadorManualPanel stats={stats} onCambio={cargarStats} />

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-blue-700">1. Buscar por DNI</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              ref={dniRef}
              className={inputCls}
              placeholder="Ingrese DNI"
              inputMode="numeric"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
            />
            <button
              onClick={buscar}
              disabled={buscando}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {asistente && (
            <PersonaEncontrada
              asistente={asistente}
              accionando={accionando}
              onAgregarEvento={() => agregarAlEvento(asistente)}
              onDeshacer={() => deshacerIngreso(asistente)}
              onEditar={() => setEditando(true)}
              onNuevaBusqueda={limpiar}
            />
          )}
        </section>

        {busqueda && !busqueda.encontrado && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="font-semibold text-blue-700">2. No se encontro la persona</h2>
            <p className="mb-4 text-sm text-slate-500">
              Complete los datos para guardarlo como registrado. Luego podra agregarlo al evento.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="DNI" obligatorio>
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={nuevo.dni}
                  onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Nombre completo" obligatorio>
                <input
                  className={inputCls}
                  value={nuevo.nombreCompleto}
                  onChange={(e) => setNuevo({ ...nuevo, nombreCompleto: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Celular">
                <input
                  className={inputCls}
                  inputMode="numeric"
                  value={nuevo.celular}
                  onChange={(e) => setNuevo({ ...nuevo, celular: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Correo">
                <input
                  className={inputCls}
                  type="email"
                  value={nuevo.correo}
                  onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Especialidad">
                <select
                  className={inputCls}
                  value={nuevo.especialidad}
                  onChange={(e) => setNuevo({ ...nuevo, especialidad: e.target.value })}
                >
                  <option value="" disabled>
                    Seleccione una especialidad
                  </option>
                  {[
                    "Albañil",
                    "Arquitecto",
                    "Carpintero",
                    "Contratista",
                    "Electricista",
                    "Gasfitero o técnico sanitario",
                    "Ingeniero",
                    "Pintor",
                    "Carpintero mueblista",
                    "Constructor metálico",
                    "Especialista en terminaciones / acabados",
                    "Todista / Servicios generales",
                    "Experto en diseño de interiores / Decorador",
                    "Constructor de jardines",
                    "Drywallero"
                  ].map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Tipo de registro">
                <input
                  className={`${inputCls} bg-slate-100 text-slate-500`}
                  value="NUEVO REGISTRADO"
                  disabled
                />
              </Campo>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={guardarAsistente}
                disabled={accionando}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                Guardar asistente
              </button>
            </div>
          </section>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Importante:</span> Cada DNI solo puede registrarse una
            vez al evento. Se guarda la fecha y hora de ingreso automaticamente.
          </p>
        </div>
      </div>

      {editando && asistente && (
        <EditarPersonaModal
          asistente={asistente}
          onCerrar={() => setEditando(false)}
          onGuardado={(a) => {
            setBusqueda({ encontrado: true, asistente: a })
            setEditando(false)
          }}
        />
      )}
    </>
  )
}

function TarjetaStat({
  etiqueta,
  valor,
  detalle,
  acento,
}: {
  etiqueta: string
  valor?: number
  detalle?: string
  acento?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold tracking-wide text-slate-500">{etiqueta}</p>
      <p className={`mt-1 text-3xl font-bold ${acento ? 'text-green-600' : 'text-blue-700'}`}>
        {valor === undefined ? '—' : valor.toLocaleString('es-PE')}
      </p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  )
}

/**
 * Contador de asistentes al evento (solo administrador).
 *
 * El evento no tiene tope: esto no limita nada. Sirve para sumar a mano la
 * gente que entro sin pasar por el registro, para que el total refleje cuanta
 * gente hubo. Esas personas son solo un numero: no tienen DNI, no se pueden
 * inscribir en charlas ni les sale diploma.
 */
function ContadorManualPanel({
  stats,
  onCambio,
}: {
  stats: EstadisticasAsistentes | null
  onCambio: () => void
}) {
  const { notificar } = useToast()
  const { esAdmin, salir } = useAdmin()
  const [editando, setEditando] = useState(false)
  const [cantidad, setCantidad] = useState('10')
  const [guardando, setGuardando] = useState(false)

  // El personal de puerta no ve ni toca este contador.
  if (!stats || !esAdmin) return null

  const agregados = stats.agregadosManualmente

  function manejarError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      salir()
      notificar('error', 'Sesión de administrador expirada. Ingresa la clave de nuevo.')
    } else {
      notificar('error', e instanceof Error ? e.message : 'Error al cambiar el contador')
    }
  }

  async function agregar(n: number) {
    if (!Number.isFinite(n) || n === 0) {
      notificar('info', 'Escribe cuántas personas quieres agregar.')
      return
    }
    setGuardando(true)
    try {
      await api.agregarAlContador(n)
      notificar(
        'exito',
        n > 0 ? `${n} persona(s) agregadas al contador.` : `${-n} persona(s) descontadas.`,
      )
      setEditando(false)
      onCambio()
    } catch (e) {
      manejarError(e)
    } finally {
      setGuardando(false)
    }
  }

  async function ponerEnCero() {
    if (!confirm('¿Quitar las personas agregadas a mano y dejar solo las registradas por DNI?')) {
      return
    }
    setGuardando(true)
    try {
      await api.fijarAgregadosAlContador(0)
      notificar('info', 'Contador manual en cero.')
      onCambio()
    } catch (e) {
      manejarError(e)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500">
            CONTADOR DE ASISTENTES{' '}
            <span className="font-normal text-slate-400">· solo administrador</span>
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {stats.registradosPorDni.toLocaleString('es-PE')} por DNI
            {agregados > 0 && (
              <>
                {' + '}
                <span className="text-blue-700">
                  {agregados.toLocaleString('es-PE')} agregadas
                </span>
                {' = '}
                {stats.totalIngresadosAlEvento.toLocaleString('es-PE')}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {agregados > 0 && (
            <button
              onClick={ponerEnCero}
              disabled={guardando}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Poner en cero
            </button>
          )}
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <UserPlus className="h-4 w-4" />
              Agregar personas
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            ¿Cuántas personas agregar?
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              autoFocus
              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregar(Number(cantidad))}
            />
            <button
              onClick={() => agregar(Number(cantidad))}
              disabled={guardando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {guardando ? 'Agregando...' : 'Agregar'}
            </button>
            <button
              onClick={() => setEditando(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              Cancelar
            </button>
            <div className="flex gap-1.5">
              {[10, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setCantidad(String(n))}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  +{n}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Suma la gente que entró sin registrar su DNI. Es <b>solo un contador</b>: no aparecen
            en charlas, diplomas ni reportes. Usa un número negativo para descontar.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          El evento no tiene tope de personas. Usa esto para sumar a los que entraron sin
          registrar su DNI.
        </p>
      )}
    </section>
  )
}

function Campo({
  etiqueta,
  obligatorio,
  children,
}: {
  etiqueta: string
  obligatorio?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {etiqueta} {obligatorio && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-slate-500 sm:w-36">{etiqueta}:</span>
      <span className="break-words font-medium text-slate-800">{valor}</span>
    </div>
  )
}

function PersonaEncontrada({
  asistente,
  accionando,
  onAgregarEvento,
  onDeshacer,
  onEditar,
  onNuevaBusqueda,
}: {
  asistente: Asistente
  accionando: boolean
  onAgregarEvento: () => void
  onDeshacer: () => void
  onEditar: () => void
  onNuevaBusqueda: () => void
}) {
  return (
    <div className="mt-4 rounded-xl border border-green-300 bg-green-50/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          Persona encontrada
        </div>
        <button
          onClick={onEditar}
          title="Editar datos del asistente"
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
      </div>
      <div className="space-y-1.5 text-sm">
        <Dato etiqueta="DNI" valor={asistente.dni} />
        <Dato etiqueta="Nombre completo" valor={asistente.nombreCompleto} />
        <Dato etiqueta="Celular" valor={asistente.celular ?? '—'} />
        <Dato etiqueta="Correo" valor={asistente.correo ?? '—'} />
        <Dato etiqueta="Especialidad" valor={asistente.especialidad ?? '—'} />
        <div className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-slate-500 sm:w-36">Tipo de registro:</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-blue-700">
            {asistente.tipoRegistro}
          </span>
        </div>
      </div>
      <div className="mt-4 border-t border-green-200 pt-4">
        {asistente.ingresadoAlEvento ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Ya esta registrado en el evento
              {asistente.fechaIngresoEvento && (
                <span className="font-normal text-slate-500">
                  ({formatoFechaHora(asistente.fechaIngresoEvento)})
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onDeshacer}
                disabled={accionando}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                Deshacer ingreso
              </button>
              <button
                onClick={onNuevaBusqueda}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Nueva busqueda
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-blue-700">
              <Info className="h-4 w-4" />
              Esta persona aun no esta en el evento.
            </p>
            <button
              onClick={onAgregarEvento}
              disabled={accionando}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {accionando ? 'Agregando...' : 'Agregar al evento'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
