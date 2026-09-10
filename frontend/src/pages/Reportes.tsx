import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import {
  api,
  exportarReporteEspecialidad,
  type FilaEspecialidad,
  type ReporteEspecialidad,
} from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'

/**
 * Reporte de asistencia por especialidad: cuantos estaban en la base contra
 * cuantos realmente ingresaron al evento, con faltantes y porcentaje. Cada DNI
 * se cuenta una sola vez.
 */
export default function Reportes() {
  const { notificar } = useToast()
  const [reporte, setReporte] = useState<ReporteEspecialidad | null>(null)
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setReporte(await api.reporteEspecialidad())
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al cargar el reporte')
    } finally {
      setCargando(false)
    }
  }, [notificar])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function exportar() {
    setExportando(true)
    try {
      await exportarReporteEspecialidad()
      notificar('exito', 'Descarga del Excel iniciada.')
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <PageHeader
        icono={<BarChart3 className="h-6 w-6" />}
        titulo="Reportes"
        subtitulo="Asistencia por especialidad"
        accion={
          <button
            onClick={cargar}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        }
      />

      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div>
              <h2 className="font-semibold text-blue-700">Por especialidad</h2>
              <p className="text-sm text-slate-500">
                Se cuentan DNI únicos: nadie aparece dos veces.
              </p>
            </div>
            <button
              onClick={exportar}
              disabled={exportando}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exportando ? 'Generando...' : 'Exportar a Excel'}
            </button>
          </div>

          {cargando ? (
            <p className="py-10 text-center text-sm text-slate-400">Cargando reporte...</p>
          ) : !reporte || reporte.filas.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Todavía no hay datos para el reporte.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Especialidad</th>
                    <th className="px-4 py-2.5 text-right">En la base</th>
                    <th className="px-4 py-2.5 text-right">Ingresaron</th>
                    <th className="px-4 py-2.5 text-right">Faltantes</th>
                    <th className="px-4 py-2.5 text-right">% asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reporte.filas.map((f) => (
                    <Fila key={f.especialidad} fila={f} />
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <Fila fila={reporte.total} total />
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function Fila({ fila, total }: { fila: FilaEspecialidad; total?: boolean }) {
  const color =
    fila.porcentajeAsistencia >= 70
      ? 'text-green-600'
      : fila.porcentajeAsistencia >= 40
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <tr className={total ? 'text-slate-800' : ''}>
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
