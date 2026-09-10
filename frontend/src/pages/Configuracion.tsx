import { useCallback, useEffect, useState } from 'react'
import {
  ChevronDown,
  DoorOpen,
  Lock,
  Plus,
  Save,
  Settings,
  Trash2,
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
import { isoAInputLocal } from '../lib/formato'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const labelCls = 'mb-1 block text-xs font-medium text-slate-500'

/**
 * Configuracion de salas y charlas (solo administrador).
 *
 * El administrador crea las salas que necesite (1, 2, 6, 8 o mas) y dentro de
 * cada una configura sus charlas con marca, capacitador, horario y aforo.
 */
export default function Configuracion() {
  const { notificar } = useToast()
  const { esAdmin, salir } = useAdmin()
  const [salas, setSalas] = useState<Sala[]>([])
  const [charlas, setCharlas] = useState<Charla[]>([])
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.listarSalas(true), api.listarCharlas(null, true, true)])
      setSalas(s)
      setCharlas(c)
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
          titulo="Configuración"
          subtitulo="Salas, charlas, horarios y aforos"
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

  return (
    <>
      <PageHeader
        icono={<Settings className="h-6 w-6" />}
        titulo="Configuración"
        subtitulo="Salas, charlas, horarios y aforos"
      />

      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <SeccionSalas salas={salas} onCambios={recargar} onError={manejarError} />

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-blue-700">Charlas por sala</h2>
            <p className="text-sm text-slate-500">
              Cada charla lleva marca, capacitador, horario y aforo. La marca y el capacitador
              salen impresos en el diploma.
            </p>
          </div>
          <div className="space-y-3 p-3 sm:p-4">
            {cargando ? (
              <p className="py-6 text-center text-sm text-slate-400">Cargando...</p>
            ) : salas.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Crea primero una sala para poder agregarle charlas.
              </p>
            ) : (
              salas.map((s) => (
                <BloqueSala
                  key={s.id}
                  sala={s}
                  salas={salas}
                  charlas={charlas.filter((c) => c.salaId === s.id)}
                  onCambios={recargar}
                  onError={manejarError}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </>
  )
}

// --------------------------------------------------------------------- Salas

function SeccionSalas({
  salas,
  onCambios,
  onError,
}: {
  salas: Sala[]
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
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
      onCambios()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 font-semibold text-blue-700">
          <DoorOpen className="h-5 w-5" />
          Salas del evento
        </h2>
        <p className="text-sm text-slate-500">
          Crea las salas que necesites. Cada dispositivo elegirá la suya al entrar.
        </p>
      </div>

      <div className="space-y-2 p-3 sm:p-4">
        {salas.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">Todavía no hay salas.</p>
        )}
        {salas.map((s) => (
          <FilaSala key={s.id} sala={s} onCambios={onCambios} onError={onError} />
        ))}

        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3 sm:flex-row sm:items-center">
          <input
            className={inputCls}
            placeholder="Nombre de la nueva sala (por ejemplo: Sala 3)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && crear()}
          />
          <button
            onClick={crear}
            disabled={ocupado}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Agregar sala
          </button>
        </div>
      </div>
    </section>
  )
}

function FilaSala({
  sala,
  onCambios,
  onError,
}: {
  sala: Sala
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
      notificar('exito', `Sala "${form.nombre}" actualizada.`)
      onCambios()
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
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-5">
        <label className={labelCls}>Nombre</label>
        <input
          className={inputCls}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Orden</label>
        <input
          type="number"
          className={inputCls}
          value={form.orden ?? 0}
          onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.activa ?? true}
            onChange={(e) => setForm({ ...form, activa: e.target.checked })}
          />
          Activa
        </label>
        <p className="mt-0.5 text-xs text-slate-400">{sala.totalCharlas} charla(s)</p>
      </div>
      <div className="flex gap-2 sm:col-span-3 sm:justify-end">
        <button
          onClick={eliminar}
          disabled={ocupado}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </button>
        <button
          onClick={guardar}
          disabled={ocupado}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> Guardar
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Charlas

function BloqueSala({
  sala,
  salas,
  charlas,
  onCambios,
  onError,
}: {
  sala: Sala
  salas: Sala[]
  charlas: Charla[]
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const [abierto, setAbierto] = useState(true)

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="font-semibold text-slate-800">
          {sala.nombre}
          <span className="ml-2 text-sm font-normal text-slate-500">
            {charlas.length} charla(s) · {sala.registradosTotal}/{sala.aforoTotal} inscritos
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="space-y-3 border-t border-slate-200 p-3">
          {charlas.map((c) => (
            <FilaCharla
              key={c.id}
              charla={c}
              salas={salas}
              onCambios={onCambios}
              onError={onError}
            />
          ))}
          <NuevaCharla sala={sala} onCreada={onCambios} onError={onError} />
        </div>
      )}
    </div>
  )
}

function CamposCharla({
  form,
  setForm,
  salas,
}: {
  form: CharlaInput
  setForm: (f: CharlaInput) => void
  salas: Sala[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-4">
        <label className={labelCls}>Charla</label>
        <input
          className={inputCls}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Sala</label>
        <select
          className={inputCls}
          value={form.salaId}
          onChange={(e) => setForm({ ...form, salaId: Number(e.target.value) })}
        >
          {salas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-3">
        <label className={labelCls}>Marca</label>
        <input
          className={inputCls}
          placeholder="Sale impresa en el diploma"
          value={form.marca ?? ''}
          onChange={(e) => setForm({ ...form, marca: e.target.value })}
        />
      </div>
      <div className="sm:col-span-3">
        <label className={labelCls}>Capacitador</label>
        <input
          className={inputCls}
          placeholder="Sale impreso en el diploma"
          value={form.capacitador ?? ''}
          onChange={(e) => setForm({ ...form, capacitador: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Fecha y hora de inicio</label>
        <input
          type="datetime-local"
          className={inputCls}
          value={form.horaInicio}
          onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Fecha y hora de fin</label>
        <input
          type="datetime-local"
          className={inputCls}
          value={form.horaFin}
          onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
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
  )
}

function FilaCharla({
  charla,
  salas,
  onCambios,
  onError,
}: {
  charla: Charla
  salas: Sala[]
  onCambios: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const [form, setForm] = useState<CharlaInput>({
    nombre: charla.nombre,
    salaId: charla.salaId ?? salas[0]?.id ?? 0,
    marca: charla.marca ?? '',
    capacitador: charla.capacitador ?? '',
    horaInicio: isoAInputLocal(charla.horaInicio),
    horaFin: isoAInputLocal(charla.horaFin),
    aforo: charla.aforo,
    oculta: charla.oculta,
  })
  const [ocupado, setOcupado] = useState(false)

  async function guardar() {
    setOcupado(true)
    try {
      await api.actualizarCharla(charla.id, form)
      notificar('exito', `Charla "${form.nombre}" actualizada.`)
      onCambios()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar la charla "${charla.nombre}"? Se borraran tambien sus inscripciones.`)) {
      return
    }
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
    <div className="rounded-lg border border-slate-200 p-3 sm:p-4">
      <CamposCharla form={form} setForm={setForm} salas={salas} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.oculta ?? false}
              onChange={(e) => setForm({ ...form, oculta: e.target.checked })}
            />
            Ocultar
          </label>
          <span className="text-xs text-slate-400">
            {charla.registrados} inscrito(s)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={eliminar}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
          <button
            onClick={guardar}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function NuevaCharla({
  sala,
  onCreada,
  onError,
}: {
  sala: Sala
  onCreada: () => void
  onError: (e: unknown) => void
}) {
  const { notificar } = useToast()
  const vacia = (): CharlaInput => ({
    nombre: '',
    salaId: sala.id,
    marca: '',
    capacitador: '',
    horaInicio: '',
    horaFin: '',
    aforo: 50,
    oculta: false,
  })
  const [form, setForm] = useState<CharlaInput>(vacia)
  const [ocupado, setOcupado] = useState(false)

  async function crear() {
    if (!form.nombre.trim() || !form.horaInicio || !form.horaFin) {
      notificar('info', 'Completa el nombre y el horario de la nueva charla.')
      return
    }
    setOcupado(true)
    try {
      await api.crearCharla(form)
      notificar('exito', `Charla "${form.nombre}" creada.`)
      setForm(vacia())
      onCreada()
    } catch (e) {
      onError(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3 sm:p-4">
      <h3 className="mb-3 text-sm font-semibold text-blue-700">Nueva charla en esta sala</h3>
      <CamposCharla form={form} setForm={setForm} salas={[sala]} />
      <div className="mt-3 flex justify-end">
        <button
          onClick={crear}
          disabled={ocupado}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Agregar charla
        </button>
      </div>
    </div>
  )
}
