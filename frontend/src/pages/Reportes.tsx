import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  PieChart,
  Presentation,
  RefreshCw,
  Users,
} from 'lucide-react'
import {
  api,
  exportarReporteAforoDia,
  exportarReporteDetalle,
  exportarReporteEspecialidad,
  exportarReportePorPersona,
  exportarReportePorSalaCharla,
  type FilaAforoSala,
  type FilaEspecialidad,
  type ReporteAforoHorario,
  type ReporteEspecialidad,
} from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { formatoFecha } from '../lib/formato'

const selectCls =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

/**
 * Reportes y aforos por horario.
 *
 *  - Personas por especialidad: cuantas estaban en la base contra cuantas
 *    ingresaron, con faltantes y porcentaje. Cuenta DNI unicos.
 *  - Aforo por sala y horario: como va la ocupacion de cada sala en la franja
 *    que se consulte, para saber en el momento que sala esta llena.
 *  - Otros reportes para descargar en Excel.
 */
export default function Reportes() {
  const { notificar } = useToast()
  const [especialidad, setEspecialidad] = useState<ReporteEspecialidad | null>(null)
  const [aforo, setAforo] = useState<ReporteAforoHorario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [descargando, setDescargando] = useState<string | null>(null)

  const cargar = useCallback(
    async (fecha?: string, inicio?: string) => {
      setCargando(true)
      try {
        const [esp, af] = await Promise.all([
          api.reporteEspecialidad(),
          api.reporteAforoHorario(fecha, inicio),
        ])
        setEspecialidad(esp)
        setAforo(af)
      } catch (e) {
        notificar('error', e instanceof Error ? e.message : 'Error al cargar los reportes')
      } finally {
        setCargando(false)
      }
    },
    [notificar],
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  async function descargar(clave: string, accion: () => Promise<void>) {
    setDescargando(clave)
    try {
      await accion()
      notificar('exito', 'Descarga iniciada.')
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setDescargando(null)
    }
  }

  const indiceFranja =
    aforo?.franjas.findIndex((f) => f.inicio === aforo?.franja?.inicio) ?? -1
  const franjaAnterior = indiceFranja > 0 ? aforo?.franjas[indiceFranja - 1] : undefined
  const franjaSiguiente =
    aforo && indiceFranja >= 0 && indiceFranja < aforo.franjas.length - 1
      ? aforo.franjas[indiceFranja + 1]
      : undefined

  return (
    <>
      <PageHeader
        icono={<BarChart3 className="h-6 w-6" />}
        titulo="Reportes y aforos por horario"
        subtitulo="Asistencia, ocupación de salas y descargas"
        accion={
          <button
            onClick={() => cargar(aforo?.fecha, aforo?.franja?.inicio)}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ------------------------------------------- Por especialidad */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-blue-700">
                  <PieChart className="h-5 w-5" />
                  Personas por especialidad
                </h2>
                <p className="text-sm text-slate-500">Asistentes al evento · DNI únicos</p>
              </div>
              <BotonExcel
                cargando={descargando === 'especialidad'}
                onClick={() => descargar('especialidad', exportarReporteEspecialidad)}
              />
            </div>

            {cargando && !especialidad ? (
              <p className="py-10 text-center text-sm text-slate-400">Cargando...</p>
            ) : !especialidad || especialidad.filas.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Todavía no hay datos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Especialidad</th>
                      <th className="px-4 py-2.5 text-right">En la base</th>
                      <th className="px-4 py-2.5 text-right">Ingresaron</th>
                      <th className="px-4 py-2.5 text-right">Faltantes</th>
                      <th className="px-4 py-2.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {especialidad.filas.map((f) => (
                      <FilaEsp key={f.especialidad} fila={f} />
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <FilaEsp fila={especialidad.total} />
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* ------------------------------------ Aforo por sala y horario */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <h2 className="flex items-center gap-2 font-semibold text-blue-700">
                <Presentation className="h-5 w-5" />
                Aforo por sala y horario
              </h2>
              <BotonExcel
                cargando={descargando === 'aforo'}
                onClick={() => descargar('aforo', () => exportarReporteAforoDia(aforo?.fecha))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Fecha
                <select
                  className={selectCls}
                  value={aforo?.fecha ?? ''}
                  onChange={(e) => cargar(e.target.value)}
                  disabled={!aforo || aforo.fechasDisponibles.length === 0}
                >
                  {aforo?.fechasDisponibles.map((f) => (
                    <option key={f} value={f}>
                      {formatoFecha(`${f}T00:00:00`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Horario
                <select
                  className={selectCls}
                  value={aforo?.franja?.inicio ?? ''}
                  onChange={(e) => cargar(aforo?.fecha, e.target.value)}
                  disabled={!aforo || aforo.franjas.length === 0}
                >
                  {aforo?.franjas.map((f) => (
                    <option key={f.inicio} value={f.inicio}>
                      {f.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!aforo || !aforo.franja ? (
              <p className="py-10 text-center text-sm text-slate-400">
                No hay charlas programadas para esta fecha.
              </p>
            ) : (
              <>
                <div className="px-4 pt-3 sm:px-5">
                  <p className="text-lg font-bold text-slate-800">
                    {aforo.salasLlenas} de {aforo.salasConCharla} salas llenas
                  </p>
                  <p className="text-xs text-slate-500">
                    Franja consultada: {aforo.franja.etiqueta}
                  </p>
                </div>

                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Sala</th>
                        <th className="px-4 py-2.5 text-right">Inscritos</th>
                        <th className="px-4 py-2.5 text-right">Aforo</th>
                        <th className="px-4 py-2.5 text-right">Libres</th>
                        <th className="px-4 py-2.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aforo.filas.map((f) => (
                        <FilaAforo key={f.sala} fila={f} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-5">
                  <span className="text-sm font-medium text-slate-700">
                    Total: {aforo.totalInscritos.toLocaleString('es-PE')} inscritos /{' '}
                    {aforo.totalAforo.toLocaleString('es-PE')} cupos
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cargar(aforo.fecha, franjaAnterior?.inicio)}
                      disabled={!franjaAnterior}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Hora anterior
                    </button>
                    <button
                      onClick={() => cargar(aforo.fecha, franjaSiguiente?.inicio)}
                      disabled={!franjaSiguiente}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Hora siguiente
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="px-4 pb-3 text-right text-xs text-slate-400 sm:px-5">
                  Ocupación según las inscripciones de la charla programada en cada sala.
                </p>
              </>
            )}
          </section>
        </div>

        {/* ----------------------------------------- Otros reportes a Excel */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-blue-700">Otros reportes para descargar</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <FilaDescarga
              icono={<Users className="h-5 w-5 text-blue-600" />}
              titulo="Por persona"
              detalle="Quién es cada persona: DNI, nombre, especialidad y si ingresó o no"
              cargando={descargando === 'persona'}
              onClick={() => descargar('persona', exportarReportePorPersona)}
            />
            <FilaDescarga
              icono={<Presentation className="h-5 w-5 text-violet-600" />}
              titulo="Por sala y charla"
              detalle="Listado de asistentes de cada charla"
              cargando={descargando === 'salaCharla'}
              onClick={() => descargar('salaCharla', exportarReportePorSalaCharla)}
            />
            <FilaDescarga
              icono={<FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
              titulo="Detalle completo"
              detalle="Una fila por DNI y charla, con marca, capacitador y estado del diploma"
              cargando={descargando === 'detalle'}
              onClick={() => descargar('detalle', exportarReporteDetalle)}
            />
            <FilaDescarga
              icono={<BarChart3 className="h-5 w-5 text-amber-600" />}
              titulo="Aforos por horario"
              detalle="Todas las salas y franjas del día seleccionado"
              cargando={descargando === 'aforoDia'}
              onClick={() => descargar('aforoDia', () => exportarReporteAforoDia(aforo?.fecha))}
            />
          </div>
          <p className="flex items-start gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            El reporte de aforos usa la fecha elegida arriba e incluye todas sus franjas.
          </p>
        </section>
      </div>
    </>
  )
}

function BotonExcel({ cargando, onClick }: { cargando: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className="flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {cargando ? 'Generando...' : 'Descargar Excel'}
    </button>
  )
}

function FilaEsp({ fila }: { fila: FilaEspecialidad }) {
  const color =
    fila.porcentajeAsistencia >= 70
      ? 'text-green-600'
      : fila.porcentajeAsistencia >= 40
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <tr>
      <td className="px-4 py-2.5 text-slate-700">{fila.especialidad}</td>
      <td className="px-4 py-2.5 text-right text-slate-600">
        {fila.enBase.toLocaleString('es-PE')}
      </td>
      <td className="px-4 py-2.5 text-right text-slate-800">
        {fila.ingresaron.toLocaleString('es-PE')}
      </td>
      <td className="px-4 py-2.5 text-right text-slate-500">
        {fila.faltantes.toLocaleString('es-PE')}
      </td>
      <td className={`px-4 py-2.5 text-right font-semibold ${color}`}>
        {fila.porcentajeAsistencia}%
      </td>
    </tr>
  )
}

function FilaAforo({ fila }: { fila: FilaAforoSala }) {
  const estilo =
    fila.estado === 'LLENA'
      ? 'bg-red-100 text-red-700'
      : fila.estado === 'DISPONIBLE'
        ? 'bg-green-100 text-green-700'
        : 'bg-slate-100 text-slate-500'
  const etiqueta =
    fila.estado === 'LLENA' ? 'Llena' : fila.estado === 'DISPONIBLE' ? 'Disponible' : 'Sin charla'

  return (
    <tr>
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-800">{fila.sala}</div>
        {fila.charla && <div className="text-xs text-slate-500">{fila.charla}</div>}
      </td>
      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fila.inscritos}</td>
      <td className="px-4 py-2.5 text-right text-slate-600">{fila.aforo}</td>
      <td className="px-4 py-2.5 text-right text-slate-600">{fila.libres}</td>
      <td className="px-4 py-2.5">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${estilo}`}>{etiqueta}</span>
      </td>
    </tr>
  )
}

function FilaDescarga({
  icono,
  titulo,
  detalle,
  cargando,
  onClick,
}: {
  icono: React.ReactNode
  titulo: string
  detalle: string
  cargando: boolean
  onClick: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0">{icono}</div>
        <div className="min-w-0">
          <p className="font-medium text-slate-800">{titulo}</p>
          <p className="text-xs text-slate-500">{detalle}</p>
        </div>
      </div>
      <BotonExcel cargando={cargando} onClick={onClick} />
    </div>
  )
}
