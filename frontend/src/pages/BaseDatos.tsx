import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Lock,
  Upload,
} from 'lucide-react'
import {
  api,
  ApiError,
  exportarExcel,
  exportarExcelDeCharla,
  importarExcel,
  type Charla,
  type ResultadoCarga,
} from '../api'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAdmin } from '../components/admin'

export default function BaseDatos() {
  const { notificar } = useToast()
  const { esAdmin, salir } = useAdmin()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)
  const [charlas, setCharlas] = useState<Charla[]>([])
  const [charlaSelId, setCharlaSelId] = useState<string>('')
  const [exportandoCharla, setExportandoCharla] = useState(false)

  useEffect(() => {
    if (!esAdmin) return
    api
      .listarCharlas(true, true)
      .then(setCharlas)
      .catch(() => {
        /* silencioso */
      })
  }, [esAdmin])

  function manejar401(e: unknown): boolean {
    if (e instanceof ApiError && e.status === 401) {
      salir()
      notificar('error', 'Sesión de administrador expirada. Ingresa la clave de nuevo.')
      return true
    }
    return false
  }

  async function importar() {
    if (!archivo) {
      notificar('info', 'Selecciona un archivo Excel (.xlsx).')
      return
    }
    const ok = confirm(
      '¿Reemplazar TODA la base actual con este archivo?\n\n' +
        'Se borrarán los ingresos al evento y las inscripciones a charlas del archivo anterior.',
    )
    if (!ok) return
    setImportando(true)
    setResultado(null)
    try {
      const r = await importarExcel(archivo)
      setResultado(r)
      notificar('exito', `Importacion completada: ${r.filasProcesadas} registros procesados.`)
    } catch (e) {
      if (!manejar401(e)) notificar('error', e instanceof Error ? e.message : 'Error al importar')
    } finally {
      setImportando(false)
    }
  }

  async function exportar() {
    setExportando(true)
    try {
      await exportarExcel()
      notificar('exito', 'Descarga del Excel iniciada.')
    } catch (e) {
      if (!manejar401(e)) notificar('error', e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  async function exportarCharla() {
    if (!charlaSelId) {
      notificar('info', 'Elige una charla para descargar sus asistentes.')
      return
    }
    const id = Number(charlaSelId)
    const charla = charlas.find((c) => c.id === id)
    setExportandoCharla(true)
    try {
      await exportarExcelDeCharla(id, charla?.nombre)
      notificar('exito', 'Descarga de la charla iniciada.')
    } catch (e) {
      if (!manejar401(e)) notificar('error', e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExportandoCharla(false)
    }
  }

  // Si no es admin, muestra pantalla de acceso denegado
  if (!esAdmin) {
    return (
      <>
        <PageHeader
          icono={<Database className="h-6 w-6" />}
          titulo="Base de Datos"
          subtitulo="Importar y exportar la base de asistentes"
        />
        <div className="mx-auto max-w-md p-4 sm:p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
            <Lock className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-3 font-semibold text-red-900">Acceso Denegado</h2>
            <p className="mt-2 text-sm text-red-700">
              Esta sección solo es accesible para administradores. Usa el botón "Ingresar como Admin" en la barra superior para acceder.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        icono={<Database className="h-6 w-6" />}
        titulo="Base de Datos"
        subtitulo="Importar y exportar la base de asistentes"
      />

      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        {/* Importar */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-blue-700">
            <Upload className="h-5 w-5" />
            Importar base de datos
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Sube el archivo Excel (.xlsx). Sin limite de filas. <b>Reemplaza toda la base actual</b>
            {' '}(los ingresos al evento y las inscripciones a charlas del archivo anterior se pierden).
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50/40">
            <FileSpreadsheet className="h-8 w-8 text-slate-400" />
            {archivo ? (
              <span className="text-sm font-medium text-slate-700">{archivo.name}</span>
            ) : (
              <span className="text-sm text-slate-500">
                Haz clic para seleccionar un archivo .xlsx
              </span>
            )}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                setArchivo(e.target.files?.[0] ?? null)
                setResultado(null)
              }}
            />
          </label>
          <div className="mt-4 flex justify-end">
            <button
              onClick={importar}
              disabled={importando || !archivo}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {importando ? 'Importando...' : 'Importar'}
            </button>
          </div>

          {resultado && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Importacion completada
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <Dato etiqueta="Leidas" valor={resultado.filasLeidas} />
                <Dato etiqueta="Procesadas" valor={resultado.filasProcesadas} />
                <Dato etiqueta="Omitidas" valor={resultado.filasOmitidas} />
              </div>
              {resultado.errores.length > 0 && (
                <details className="mt-2 text-sm text-amber-700">
                  <summary className="cursor-pointer font-medium">
                    {resultado.errores.length} aviso(s)
                  </summary>
                  <ul className="mt-1 list-inside list-disc">
                    {resultado.errores.map((er, i) => (
                      <li key={i}>{er}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>

        {/* Exportar */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-blue-700">
            <Download className="h-5 w-5" />
            Descargar base de datos
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Descarga la base completa o solo los asistentes de una charla en particular.
          </p>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Toda la base
              </p>
              <button
                onClick={exportar}
                disabled={exportando}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {exportando ? 'Generando...' : 'Descargar Excel completo'}
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Por charla
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <select
                  value={charlaSelId}
                  onChange={(e) => setCharlaSelId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:flex-1"
                >
                  <option value="">Selecciona una charla...</option>
                  {charlas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.sala}) — {c.registrados} inscritos
                    </option>
                  ))}
                </select>
                <button
                  onClick={exportarCharla}
                  disabled={exportandoCharla || !charlaSelId}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {exportandoCharla ? 'Generando...' : 'Descargar de la charla'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            El archivo Excel debe tener las columnas: SubscriberKey, EmailAddress, TIPO_DOCUMENTO,
            NUMERO_DOCUMENTO, CELULAR, TERMINOS_CMR, FECHA_REGISTRO, NOMBRE, APELLIDOS,
            TERMINOS_CONDICIONES.
          </p>
        </div>
      </div>
    </>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-lg bg-white p-2 text-center">
      <div className="text-lg font-bold text-slate-800">{valor.toLocaleString('es-PE')}</div>
      <div className="text-xs text-slate-500">{etiqueta}</div>
    </div>
  )
}
