import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, Eye, EyeOff, Plus, Save, UserMinus } from 'lucide-react'
import { api, type Asistente, type Charla, type NivelOcupacion } from '../api'
import { formatoHora } from '../lib/formato'
import { useToast } from './Toast'

const colorBarra: Record<NivelOcupacion, string> = {
  VERDE: 'bg-green-500',
  NARANJA: 'bg-amber-500',
  ROJO: 'bg-red-500',
}
const colorTexto: Record<NivelOcupacion, string> = {
  VERDE: 'text-green-600',
  NARANJA: 'text-amber-600',
  ROJO: 'text-red-600',
}

interface Props {
  persona: Asistente | null
  /** Sala elegida en este dispositivo: solo se muestran sus charlas. */
  salaId: number | null
  /** Nombre de la sala, para los mensajes en pantalla. */
  salaNombre: string
}

/**
 * Registro de un asistente en las charlas de la sala actual. Flujo:
 *  1. Se marcan las charlas con "Agregar" (seleccion local, no toca el servidor).
 *  2. "Guardar" confirma todas las seleccionadas de una sola vez.
 *
 * Al guardar la pantalla NO se reinicia: la persona sigue cargada para poder
 * cambiar de sala y seguir agregandole charlas.
 */
export default function RegistroCharlas({ persona, salaId, salaNombre }: Props) {
  const { notificar } = useToast()
  const [charlas, setCharlas] = useState<Charla[]>([])
  const [inscripciones, setInscripciones] = useState<Set<number>>(new Set())
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set())
  const [accionId, setAccionId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [ocultosAbierto, setOcultosAbierto] = useState(false)

  const cargarCharlas = useCallback(async () => {
    if (salaId == null) {
      setCharlas([])
      return
    }
    try {
      setCharlas(await api.listarCharlas(salaId, true, true))
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al cargar charlas')
    }
  }, [notificar, salaId])

  useEffect(() => {
    cargarCharlas()
    const id = setInterval(cargarCharlas, 8000)
    return () => clearInterval(id)
  }, [cargarCharlas])

  /** Trae las charlas en las que la persona ya esta inscrita (de cualquier sala). */
  const cargarInscripciones = useCallback(async () => {
    if (!persona) {
      setInscripciones(new Set())
      return
    }
    try {
      const chs = await api.charlasDelAsistente(persona.dni)
      setInscripciones(new Set(chs.map((c) => c.id)))
    } catch {
      /* silencioso: no es critico para poder seguir registrando */
    }
  }, [persona])

  useEffect(() => {
    setSeleccionadas(new Set())
    cargarInscripciones()
  }, [cargarInscripciones])

  function alternarSeleccion(id: number) {
    setSeleccionadas((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  async function quitar(charla: Charla) {
    if (!persona) return
    setAccionId(charla.id)
    try {
      await api.deshacerRegistroCharla(charla.id, persona.dni)
      setInscripciones((prev) => {
        const s = new Set(prev)
        s.delete(charla.id)
        return s
      })
      await cargarCharlas()
      notificar('info', `${persona.nombreCompleto} quitado de "${charla.nombre}".`)
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error')
    } finally {
      setAccionId(null)
    }
  }

  async function cambiarVisibilidad(charla: Charla, oculta: boolean) {
    setAccionId(charla.id)
    try {
      await api.cambiarVisibilidadCharla(charla.id, oculta)
      await cargarCharlas()
      notificar(
        'info',
        oculta
          ? `"${charla.nombre}" se movio a horarios ocultos.`
          : `"${charla.nombre}" vuelve a estar visible.`,
      )
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error')
    } finally {
      setAccionId(null)
    }
  }

  /**
   * Guarda todas las charlas marcadas. La pantalla se mantiene tal cual para
   * poder cambiar de sala y seguir agregando charlas a la misma persona.
   */
  async function guardar() {
    if (!persona || seleccionadas.size === 0) return
    setGuardando(true)
    try {
      const r = await api.registrarEnVariasCharlas(persona.dni, [...seleccionadas])
      if (r.registradas > 0) {
        notificar(
          'exito',
          `${persona.nombreCompleto}: ${r.registradas} charla(s) guardada(s). Puedes cambiar de sala y seguir agregando.`,
        )
      }
      if (r.errores.length > 0) {
        notificar('error', r.errores.join(' | '))
      }
      setSeleccionadas(new Set())
      await Promise.all([cargarCharlas(), cargarInscripciones()])
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const estaLlena = (c: Charla) => c.registrados >= c.aforo
  // Solo se ocultan las charlas que se marcaron manualmente (oculta=true).
  // El hecho de que el horario haya terminado NO las archiva automaticamente.
  const activas = charlas.filter((c) => !c.oculta)
  const ocultas = charlas.filter((c) => c.oculta)

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="font-semibold text-blue-700">2. Charlas de {salaNombre}</h2>
      </div>

      {!persona && (
        <p className="px-4 pt-3 text-sm text-slate-500 sm:px-5">
          Busca un asistente para poder agregarlo a las charlas.
        </p>
      )}

      <div className="space-y-2 p-3 sm:p-4">
        {activas.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            Esta sala no tiene charlas visibles.
          </p>
        )}
        {activas.map((c) => (
          <TarjetaCharla
            key={c.id}
            charla={c}
            habilitado={!!persona}
            yaInscrito={inscripciones.has(c.id)}
            seleccionada={seleccionadas.has(c.id)}
            llena={estaLlena(c)}
            cargando={accionId === c.id}
            onSeleccionar={() => alternarSeleccion(c.id)}
            onQuitar={() => quitar(c)}
            onOcultar={() => cambiarVisibilidad(c, true)}
          />
        ))}
      </div>

      {persona && (
        <div className="sticky bottom-0 border-t border-slate-200 bg-white p-3 sm:p-4">
          <button
            onClick={guardar}
            disabled={seleccionadas.size === 0 || guardando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" />
            {guardando
              ? 'Guardando...'
              : seleccionadas.size === 0
                ? 'Marca charlas con "Agregar" y presiona Guardar'
                : `Guardar ${seleccionadas.size} charla(s)`}
          </button>
        </div>
      )}

      {ocultas.length > 0 && (
        <div className="border-t border-slate-200">
          <button
            onClick={() => setOcultosAbierto((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:px-5"
          >
            <span className="flex items-center gap-2">
              {ocultosAbierto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Horarios ocultos / archivados ({ocultas.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${ocultosAbierto ? 'rotate-180' : ''}`}
            />
          </button>
          {ocultosAbierto && (
            <div className="divide-y divide-slate-100 border-t border-slate-200">
              {ocultas.map((c) => (
                <FilaOculta
                  key={c.id}
                  charla={c}
                  llena={estaLlena(c)}
                  cargando={accionId === c.id}
                  onMostrar={() => cambiarVisibilidad(c, false)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function TarjetaCharla({
  charla,
  habilitado,
  yaInscrito,
  seleccionada,
  llena,
  cargando,
  onSeleccionar,
  onQuitar,
  onOcultar,
}: {
  charla: Charla
  habilitado: boolean
  yaInscrito: boolean
  seleccionada: boolean
  llena: boolean
  cargando: boolean
  onSeleccionar: () => void
  onQuitar: () => void
  onOcultar: () => void
}) {
  const pct = Math.min(charla.porcentajeOcupacion, 100)

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
        seleccionada ? 'border-green-400 bg-green-50' : 'border-slate-200'
      }`}
    >
      <div className="shrink-0 sm:w-24">
        <div className="font-semibold text-slate-800">{formatoHora(charla.horaInicio)}</div>
        <div className="text-xs text-slate-500">{formatoHora(charla.horaFin)}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-800">{charla.nombre}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {charla.marca && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {charla.marca}
            </span>
          )}
          {charla.capacitador && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {charla.capacitador}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 sm:w-44">
        <div className="text-sm text-slate-600">
          <span className="font-bold text-slate-800">{charla.registrados}</span>
          <span className="text-slate-400"> / {charla.aforo}</span>
          <span className={`ml-1 text-xs font-semibold ${colorTexto[charla.nivelOcupacion]}`}>
            {charla.porcentajeOcupacion}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${colorBarra[charla.nivelOcupacion]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="shrink-0">
        {yaInscrito ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
              Registrado
            </span>
            <button
              onClick={onQuitar}
              disabled={cargando}
              className="flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <UserMinus className="h-4 w-4" />
              {cargando ? '...' : 'Quitar'}
            </button>
          </div>
        ) : llena ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              Llena
            </span>
            <button
              onClick={onOcultar}
              disabled={cargando}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <EyeOff className="h-4 w-4" />
              {cargando ? '...' : 'Ocultar'}
            </button>
          </div>
        ) : seleccionada ? (
          <button
            onClick={onSeleccionar}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            Agregada
          </button>
        ) : (
          <button
            onClick={onSeleccionar}
            disabled={!habilitado}
            title={!habilitado ? 'Busca primero un asistente' : ''}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-400 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        )}
      </div>
    </div>
  )
}

function FilaOculta({
  charla,
  llena,
  cargando,
  onMostrar,
}: {
  charla: Charla
  llena: boolean
  cargando: boolean
  onMostrar: () => void
}) {
  let condicion: string
  if (charla.finalizada && llena) condicion = 'Lleno y finalizado'
  else if (charla.finalizada) condicion = 'Finalizado'
  else if (llena) condicion = 'Lleno'
  else condicion = 'Oculta'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm text-slate-500 sm:px-5">
      <span className="whitespace-nowrap">
        {formatoHora(charla.horaInicio)} - {formatoHora(charla.horaFin)}
      </span>
      <span className="font-medium text-slate-700">{charla.nombre}</span>
      <span>
        {charla.registrados}/{charla.aforo}
      </span>
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        {condicion}
      </span>
      <button
        onClick={onMostrar}
        disabled={cargando}
        className="ml-auto flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        <Eye className="h-3.5 w-3.5" />
        {cargando ? '...' : 'Mostrar'}
      </button>
    </div>
  )
}
