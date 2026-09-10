import { useCallback, useEffect, useState } from 'react'
import {
  Award,
  CheckCircle2,
  Info,
  Printer,
  RotateCcw,
  Save,
  Search,
  Settings2,
} from 'lucide-react'
import {
  api,
  type BusquedaDiplomas,
  type CalibracionDiploma,
  type Diploma,
  type ResumenDiplomas,
} from '../api'
import AreaImpresion from '../components/AreaImpresion'
import CalibracionDiplomaModal from '../components/CalibracionDiplomaModal'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAdmin } from '../components/admin'
import { formatoFecha, formatoFechaHora } from '../lib/formato'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

/**
 * Espera a que el navegador pinte las hojas antes de abrir el dialogo de
 * impresion. El tiempo limite es una red de seguridad: si la pestana esta en
 * segundo plano no se dibuja nada y requestAnimationFrame no llega a correr.
 */
function esperarPintado(): Promise<void> {
  return new Promise((resolve) => {
    let resuelto = false
    const listo = () => {
      if (!resuelto) {
        resuelto = true
        resolve()
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(listo))
    setTimeout(listo, 300)
  })
}

/**
 * Diplomas por DNI.
 *
 * Se busca a la persona, se corrige su nombre si hace falta y se eligen los
 * diplomas a imprimir: uno, varios o todos los pendientes. Cada diploma
 * seleccionado sale en su propia hoja, con la calibracion ya guardada.
 */
export default function Diplomas() {
  const { notificar } = useToast()
  const { esAdmin } = useAdmin()
  const [dni, setDni] = useState('')
  const [busqueda, setBusqueda] = useState<BusquedaDiplomas | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [calibracion, setCalibracion] = useState<CalibracionDiploma | null>(null)
  const [mostrarCalibracion, setMostrarCalibracion] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const [resumen, setResumen] = useState<ResumenDiplomas | null>(null)

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await api.resumenDiplomas())
    } catch {
      /* silencioso: el resumen no es critico */
    }
  }, [])

  useEffect(() => {
    api
      .calibracionDiploma()
      .then(setCalibracion)
      .catch((e) =>
        notificar('error', e instanceof Error ? e.message : 'Error al cargar la calibración'),
      )
    cargarResumen()
  }, [cargarResumen, notificar])

  async function buscar() {
    const d = dni.trim()
    if (!d) {
      notificar('info', 'Ingresa un DNI para buscar.')
      return
    }
    setBuscando(true)
    setBusqueda(null)
    setError(null)
    setSeleccion(new Set())
    try {
      const r = await api.buscarDiplomas(d)
      setBusqueda(r)
      setNombre(r.asistente.nombreCompleto)
      // Vienen preseleccionados los pendientes: es lo que se imprime casi siempre.
      setSeleccion(
        new Set(r.diplomas.filter((x) => x.estado === 'PENDIENTE').map((x) => x.registroId)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar')
    } finally {
      setBuscando(false)
    }
  }

  async function recargar() {
    if (!busqueda) return
    try {
      const r = await api.buscarDiplomas(busqueda.asistente.dni)
      setBusqueda(r)
      setNombre(r.asistente.nombreCompleto)
    } catch {
      /* silencioso */
    }
    cargarResumen()
  }

  /** Corrige el nombre completo con el que sale impreso el diploma. */
  async function guardarNombre() {
    if (!busqueda || !nombre.trim()) {
      notificar('info', 'El nombre no puede quedar vacío.')
      return
    }
    setGuardandoNombre(true)
    try {
      const a = busqueda.asistente
      await api.actualizarAsistente(a.dni, {
        nombreCompleto: nombre.trim(),
        celular: a.celular ?? undefined,
        correo: a.correo ?? undefined,
        especialidad: a.especialidad ?? undefined,
      })
      notificar('exito', 'Nombre corregido. Así saldrá impreso en el diploma.')
      await recargar()
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al guardar el nombre')
    } finally {
      setGuardandoNombre(false)
    }
  }

  function alternar(registroId: number) {
    setSeleccion((prev) => {
      const s = new Set(prev)
      if (s.has(registroId)) s.delete(registroId)
      else s.add(registroId)
      return s
    })
  }

  function seleccionarPendientes() {
    if (!busqueda) return
    setSeleccion(
      new Set(busqueda.diplomas.filter((d) => d.estado === 'PENDIENTE').map((d) => d.registroId)),
    )
  }

  function seleccionarTodos() {
    if (!busqueda) return
    setSeleccion(new Set(busqueda.diplomas.map((d) => d.registroId)))
  }

  const diplomasSeleccionados: Diploma[] =
    busqueda?.diplomas.filter((d) => seleccion.has(d.registroId)) ?? []

  /**
   * Manda a imprimir una hoja por diploma seleccionado y luego pregunta si
   * salieron bien, para marcarlos como impresos.
   */
  async function imprimir() {
    if (!calibracion || diplomasSeleccionados.length === 0) return
    const cantidad = diplomasSeleccionados.length
    setImprimiendo(true)
    await esperarPintado()
    window.print()
    setImprimiendo(false)

    const yaImpresos = diplomasSeleccionados.filter((d) => d.estado === 'IMPRESO').length
    const aviso =
      yaImpresos > 0
        ? `\n(${yaImpresos} de ellos quedarán marcados como reimpresos.)`
        : ''
    if (!confirm(`¿Salieron bien las ${cantidad} hoja(s)? Se marcarán como impresas.${aviso}`)) {
      return
    }
    try {
      await api.marcarDiplomasImpresos(diplomasSeleccionados.map((d) => d.registroId))
      notificar('exito', `${cantidad} diploma(s) marcados como impresos.`)
      setSeleccion(new Set())
      await recargar()
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al marcar los diplomas')
    }
  }

  async function volverAPendiente(d: Diploma) {
    if (!confirm(`¿Marcar "${d.charla}" como pendiente otra vez?`)) return
    try {
      await api.marcarDiplomaPendiente(d.registroId)
      notificar('info', 'Diploma marcado como pendiente.')
      await recargar()
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <>
      <PageHeader
        icono={<Award className="h-6 w-6" />}
        titulo="Diplomas"
        subtitulo="Buscar por DNI e imprimir"
        accion={
          esAdmin ? (
            <button
              onClick={() => setMostrarCalibracion(true)}
              disabled={!calibracion}
              className="flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <Settings2 className="h-4 w-4" />
              Calibrar
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        {resumen && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Contador etiqueta="TOTAL" valor={resumen.total} />
            <Contador etiqueta="PENDIENTES" valor={resumen.pendientes} color="text-amber-600" />
            <Contador etiqueta="IMPRESOS" valor={resumen.impresos} color="text-green-600" />
            <Contador etiqueta="REIMPRESOS" valor={resumen.reimpresos} color="text-violet-600" />
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-blue-700">1. Buscar por DNI</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              className={inputCls}
              placeholder="Ingrese DNI"
              inputMode="numeric"
              autoFocus
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

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {busqueda && (
            <div className="mt-4 rounded-xl border border-green-300 bg-green-50/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                {busqueda.asistente.dni} — {busqueda.diplomas.length} diploma(s)
              </div>
              <p className="mt-3 mb-1 text-sm font-medium text-slate-700">
                Nombre completo (así saldrá impreso)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputCls}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
                <button
                  onClick={guardarNombre}
                  disabled={
                    guardandoNombre || nombre.trim() === busqueda.asistente.nombreCompleto
                  }
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardandoNombre ? 'Guardando...' : 'Corregir nombre'}
                </button>
              </div>
            </div>
          )}
        </section>

        {busqueda && (
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-blue-700">2. Elegir qué imprimir</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={seleccionarPendientes}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Solo pendientes ({busqueda.pendientes})
                </button>
                <button
                  onClick={seleccionarTodos}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Todos ({busqueda.diplomas.length})
                </button>
                <button
                  onClick={() => setSeleccion(new Set())}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ninguno
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {busqueda.diplomas.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  Esta persona no está inscrita en ninguna charla, así que no tiene diplomas.
                </p>
              )}
              {busqueda.diplomas.map((d) => (
                <FilaDiploma
                  key={d.registroId}
                  diploma={d}
                  seleccionado={seleccion.has(d.registroId)}
                  onAlternar={() => alternar(d.registroId)}
                  onVolverAPendiente={() => volverAPendiente(d)}
                />
              ))}
            </div>

            {busqueda.diplomas.length > 0 && (
              <div className="border-t border-slate-200 p-3 sm:p-4">
                <button
                  onClick={imprimir}
                  disabled={diplomasSeleccionados.length === 0 || !calibracion}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Printer className="h-4 w-4" />
                  {diplomasSeleccionados.length === 0
                    ? 'Selecciona los diplomas a imprimir'
                    : `Imprimir ${diplomasSeleccionados.length} hoja(s)`}
                </button>
                <p className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Se imprime una hoja por diploma, solo con los textos. Coloca en la bandeja el
                  papel con el arte del diploma ya preimpreso.
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      {imprimiendo && calibracion && (
        <AreaImpresion diplomas={diplomasSeleccionados} calibracion={calibracion} />
      )}

      {mostrarCalibracion && calibracion && (
        <CalibracionDiplomaModal
          calibracion={calibracion}
          ejemplo={busqueda?.diplomas[0] ?? null}
          onGuardado={(c) => {
            setCalibracion(c)
            setMostrarCalibracion(false)
          }}
          onCerrar={() => setMostrarCalibracion(false)}
        />
      )}
    </>
  )
}

function Contador({
  etiqueta,
  valor,
  color = 'text-slate-800',
}: {
  etiqueta: string
  valor: number
  color?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500">{etiqueta}</p>
      <p className={`mt-0.5 text-2xl font-bold ${color}`}>{valor.toLocaleString('es-PE')}</p>
    </div>
  )
}

function FilaDiploma({
  diploma,
  seleccionado,
  onAlternar,
  onVolverAPendiente,
}: {
  diploma: Diploma
  seleccionado: boolean
  onAlternar: () => void
  onVolverAPendiente: () => void
}) {
  const pendiente = diploma.estado === 'PENDIENTE'

  return (
    <label
      className={`flex cursor-pointer flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
        seleccionado ? 'bg-green-50' : 'hover:bg-slate-50'
      }`}
    >
      <input
        type="checkbox"
        checked={seleccionado}
        onChange={onAlternar}
        className="h-4 w-4 shrink-0 accent-green-600"
      />

      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-800">{diploma.charla}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{diploma.sala}</span>
          <span>{formatoFecha(diploma.horaInicio)}</span>
          {diploma.marca && <span>Marca: {diploma.marca}</span>}
          {diploma.capacitador && <span>Capacitador: {diploma.capacitador}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {pendiente ? (
          <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Pendiente
          </span>
        ) : (
          <>
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                diploma.reimpreso
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-green-100 text-green-700'
              }`}
              title={
                diploma.impresoEn ? `Última impresión: ${formatoFechaHora(diploma.impresoEn)}` : ''
              }
            >
              {diploma.reimpreso ? `Reimpreso x${diploma.impresiones}` : 'Impreso'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onVolverAPendiente()
              }}
              title="Volver a marcarlo como pendiente"
              className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </label>
  )
}
