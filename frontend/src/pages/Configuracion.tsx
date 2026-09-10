import { useCallback, useEffect, useState } from 'react'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  Presentation,
  Save,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import {
  api,
  ApiError,
  type Charla,
  type CharlaInput,
  type Sala,
  type SalaInput,
} from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAdmin } from '../components/admin'
import { formatoHora, separarFechaHora, unirFechaHora } from '../lib/formato'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const labelCls = 'mb-1 block text-xs font-medium text-slate-500'

/** Datos de la charla tal como se editan en el formulario. */
interface FormCharla {
  nombre: string
  marca: string
  capacitador: string
  fecha: string
  horaInicio: string
  horaFin: string
  aforo: number
  visible: boolean
}

function formDesdeCharla(c: Charla): FormCharla {
  const inicio = separarFechaHora(c.horaInicio)
  return {
    nombre: c.nombre,
    marca: c.marca ?? '',
    capacitador: c.capacitador ?? '',
    fecha: inicio.fecha,
    horaInicio: inicio.hora,
    horaFin: separarFechaHora(c.horaFin).hora,
    aforo: c.aforo,
    visible: !c.oculta,
  }
}

function formVacio(): FormCharla {
  return {
    nombre: '',
    marca: '',
    capacitador: '',
    fecha: new Date().toISOString().slice(0, 10),
    horaInicio: '10:00',
    horaFin: '10:45',
    aforo: 50,
    visible: true,
  }
}

/**
 * Configuracion de salas y charlas (solo administrador).
 *
 * A la izquierda estan todas las salas del evento; al tocar una, a la derecha
 * se editan sus charlas de a una: nombre, marca, capacitador, fecha, horario y
 * aforo, con la opcion de ocultarlas sin borrarlas.
 */
export default function Configuracion() {
  const { notificar } = useToast()
  const { esAdmin, salir } = useAdmin()
  const [salas, setSalas] = useState<Sala[]>([])
  const [charlas, setCharlas] = useState<Charla[]>([])
  const [salaSelId, setSalaSelId] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [editandoSala, setEditandoSala] = useState(false)
  const [charlaEnEdicion, setCharlaEnEdicion] = useState<number | 'nueva' | null>(null)

  const recargar = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.listarSalas(true), api.listarCharlas(null, true, true)])
      setSalas(s)
      setCharlas(c)
      setSalaSelId((actual) =>
        actual != null && s.some((x) => x.id === actual) ? actual : (s[0]?.id ?? null),
      )
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al cargar la configuracion')
    } finally {
      setCargando(false)
    }
  }, [notificar])

  useEffect(() => {
    if (esAdmin) recargar()
  }, [esAdmin, recargar])

  const manejarError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        salir()
        notificar('error', 'Sesión de administrador expirada. Ingresa la clave de nuevo.')
        return
      }
      notificar('error', e instanceof Error ? e.message : 'Error inesperado')
    },
    [notificar, salir],
  )

  if (!esAdmin) {
    return (
      <>
        <PageHeader
          icono={<Settings className="h-6 w-6" />}
          titulo="Configuración de salas y charlas"
          subtitulo="Administra las salas y la programación del evento"
        />
        <div className="mx-auto max-w-md p-4 sm:p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
            <Lock className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-3 font-semibold text-red-900">Acceso denegado</h2>
            <p className="mt-2 text-sm text-red-700">
              Esta sección solo es accesible para administradores. Usa el botón "Ingresar como
              Admin" en la barra superior.
            </p>
          </div>
        </div>
      </>
    )
  }

  const sala = salas.find((s) => s.id === salaSelId) ?? null
  const charlasDeSala = charlas.filter((c) => c.salaId === salaSelId)

  function elegirSala(id: number) {
    setSalaSelId(id)
    setEditandoSala(false)
    setCharlaEnEdicion(null)
  }

  return (
    <>
      <PageHeader
        icono={<Settings className="h-6 w-6" />}
        titulo="Configuración de salas y charlas"
        subtitulo="Administra las salas y la programación del evento"
      />

      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
          {/* -------------------------------------------- Salas del evento */}
          <section className="h-fit rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-800">Salas del evento</h2>
            <NuevaSala onCreada={recargar} onError={manejarError} />

            <div className="mt-3 space-y-2">
              {cargando && salas.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">Cargando...</p>
              )}
              {!cargando && salas.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">Todavía no hay salas.</p>
              )}
              {salas.map((s) => (
                <button
                  key={s.id}
                  onClick={() => elegirSala(s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    s.id === salaSelId
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Presentation
                    className={`h-4 w-4 shrink-0 ${
                      s.id === salaSelId ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{s.nombre}</span>
                  {!s.activa && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                      Oculta
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          {/* ------------------------------------------ Detalle de la sala */}
          <section className="space-y-4">
            {!sala ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                Crea una sala para empezar a configurar sus charlas.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-800">{sala.nombre}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setEditandoSala((v) => !v)}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar sala
                      </button>
                      <BotonVisibilidadSala
                        sala={sala}
                        onCambios={recargar}
                        onError={manejarError}
                      />
                    </div>
                  </div>

                  {editandoSala && (
                    <EditarSala
                      sala={sala}
                      onCerrar={() => setEditandoSala(false)}
                      onCambios={recargar}
                      onError={manejarError}
                    />
                  )}
                </div>

                {charlaEnEdicion !== null && (
                  <EditarCharla
                    salaId={sala.id}
                    charla={
                      charlaEnEdicion === 'nueva'
                        ? null
                        : (charlasDeSala.find((c) => c.id === charlaEnEdicion) ?? null)
                    }
                    onCerrar={() => setCharlaEnEdicion(null)}
                    onCambios={async () => {
                      await recargar()
                      setCharlaEnEdicion(null)
                    }}
                    onError={manejarError}
                  />
                )}

                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                    <h3 className="font-semibold text-slate-800">Charlas de {sala.nombre}</h3>
                    <button
                      onClick={() => setCharlaEnEdicion('nueva')}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar charla
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {charlasDeSala.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-slate-400">
                        Esta sala todavía no tiene charlas.
                      </p>
                    )}
                    {charlasDeSala.map((c) => (
                      <FilaCharla
                        key={c.id}
                        charla={c}
                        onEditar={() => setCharlaEnEdicion(c.id)}
                        onCambios={recargar}
                        onError={manejarError}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

// --------------------------------------------------------------------- Salas

function NuevaSala({
  onCreada,
  onError,
}: {
  onCreada: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function crear() {
    if (!nombre.trim()) {
      notificar('info', 'Escribe el nombre de la sala.')
      return
    }
    setOcupado(true)
    try {
      await api.crearSala({ nombre: nombre.trim() })
      notificar('exito', `Sala "${nombre.trim()}" creada.`)
      setNombre('')
      setAbierto(false)
      onCreada()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        Agregar sala
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3">
      <label className={labelCls}>Nombre de la nueva sala</label>
      <input
        className={inputCls}
        autoFocus
        placeholder="Sala 3"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && crear()}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={crear}
          disabled={ocupado}
          className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {ocupado ? '...' : 'Crear'}
        </button>
        <button
          onClick={() => setAbierto(false)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function BotonVisibilidadSala({
  sala,
  onCambios,
  onError,
}: {
  sala: Sala
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const [ocupado, setOcupado] = useState(false)

  /** Ocultar una sala la saca de la pantalla de seleccion, sin borrar nada. */
  async function alternar() {
    setOcupado(true)
    try {
      await api.actualizarSala(sala.id, {
        nombre: sala.nombre,
        orden: sala.orden,
        activa: !sala.activa,
      })
      notificar('info', sala.activa ? `"${sala.nombre}" oculta.` : `"${sala.nombre}" visible.`)
      onCambios()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <button
      onClick={alternar}
      disabled={ocupado}
      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
    >
      {sala.activa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {sala.activa ? 'Ocultar sala' : 'Mostrar sala'}
    </button>
  )
}

function EditarSala({
  sala,
  onCerrar,
  onCambios,
  onError,
}: {
  sala: Sala
  onCerrar: () => void
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const [form, setForm] = useState<SalaInput>({
    nombre: sala.nombre,
    orden: sala.orden,
    activa: sala.activa,
  })
  const [ocupado, setOcupado] = useState(false)

  async function guardar() {
    setOcupado(true)
    try {
      await api.actualizarSala(sala.id, form)
      notificar('exito', 'Sala actualizada.')
      onCambios()
      onCerrar()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar la sala "${sala.nombre}"?`)) return
    setOcupado(true)
    try {
      await api.eliminarSala(sala.id)
      notificar('exito', 'Sala eliminada.')
      onCambios()
      onCerrar()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Nombre de la sala</label>
          <input
            className={inputCls}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Orden en la lista</label>
          <input
            type="number"
            className={inputCls}
            value={form.orden ?? 0}
            onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={eliminar}
          disabled={ocupado}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> Eliminar sala
        </button>
        <div className="flex gap-2">
          <button
            onClick={onCerrar}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- Charlas

function EditarCharla({
  salaId,
  charla,
  onCerrar,
  onCambios,
  onError,
}: {
  salaId: number
  charla: Charla | null
  onCerrar: () => void
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const [form, setForm] = useState<FormCharla>(() =>
    charla ? formDesdeCharla(charla) : formVacio(),
  )
  const [ocupado, setOcupado] = useState(false)

  async function guardar() {
    if (!form.nombre.trim() || !form.fecha || !form.horaInicio || !form.horaFin) {
      notificar('info', 'Completa el nombre, la fecha y el horario de la charla.')
      return
    }
    const datos: CharlaInput = {
      nombre: form.nombre.trim(),
      salaId,
      marca: form.marca.trim() || undefined,
      capacitador: form.capacitador.trim() || undefined,
      horaInicio: unirFechaHora(form.fecha, form.horaInicio),
      horaFin: unirFechaHora(form.fecha, form.horaFin),
      aforo: form.aforo,
      oculta: !form.visible,
    }
    setOcupado(true)
    try {
      if (charla) {
        await api.actualizarCharla(charla.id, datos)
        notificar('exito', `Charla "${datos.nombre}" actualizada.`)
      } else {
        await api.crearCharla(datos)
        notificar('exito', `Charla "${datos.nombre}" creada.`)
      }
      onCambios()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">
          {charla ? 'Editar charla' : 'Nueva charla'}
        </h3>
        <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Nombre de la charla</label>
          <input
            className={inputCls}
            autoFocus
            placeholder="Instalación de porcelanatos"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Marca</label>
          <input
            className={inputCls}
            placeholder="Saint Gobain"
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Capacitador</label>
          <input
            className={inputCls}
            placeholder="Nombre del capacitador"
            value={form.capacitador}
            onChange={(e) => setForm({ ...form, capacitador: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Fecha</label>
          <input
            type="date"
            className={inputCls}
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Hora de inicio</label>
          <input
            type="time"
            className={inputCls}
            value={form.horaInicio}
            onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Hora de fin</label>
          <input
            type="time"
            className={inputCls}
            value={form.horaFin}
            onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Aforo</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.aforo}
            onChange={(e) => setForm({ ...form, aforo: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) => setForm({ ...form, visible: e.target.checked })}
          />
          Charla visible
        </label>
        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {ocupado ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function FilaCharla({
  charla,
  onEditar,
  onCambios,
  onError,
}: {
  charla: Charla
  onEditar: () => void
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const [ocupado, setOcupado] = useState(false)

  async function alternarVisibilidad() {
    setOcupado(true)
    try {
      await api.cambiarVisibilidadCharla(charla.id, !charla.oculta)
      notificar('info', charla.oculta ? 'Charla visible.' : 'Charla oculta.')
      onCambios()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar la charla "${charla.nombre}"? Se borrarán sus inscripciones.`)) return
    setOcupado(true)
    try {
      await api.eliminarCharla(charla.id)
      notificar('exito', 'Charla eliminada.')
      onCambios()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 ${
        charla.oculta ? 'bg-slate-50' : ''
      }`}
    >
      <span className="shrink-0 text-sm font-medium text-slate-700">
        {formatoHora(charla.horaInicio)} - {formatoHora(charla.horaFin)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="font-medium text-slate-800">{charla.nombre}</span>
        <span className="ml-2 text-sm text-slate-500">Aforo: {charla.aforo}</span>
        {charla.oculta && (
          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
            Oculta
          </span>
        )}
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
          {charla.marca && <span>{charla.marca}</span>}
          {charla.capacitador && <span>{charla.capacitador}</span>}
          <span>{charla.registrados} inscritos</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onEditar}
          className="flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
        <button
          onClick={alternarVisibilidad}
          disabled={ocupado}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          {charla.oculta ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {charla.oculta ? 'Mostrar' : 'Ocultar'}
        </button>
        <button
          onClick={eliminar}
          disabled={ocupado}
          title="Eliminar charla"
          className="rounded-lg border border-red-300 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
