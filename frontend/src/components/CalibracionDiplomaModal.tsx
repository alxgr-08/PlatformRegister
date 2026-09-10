import { useEffect, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Move,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import {
  api,
  ApiError,
  type AlineacionTexto,
  type CalibracionDiploma,
  type CampoDiploma,
  type CampoDiplomaId,
  type Diploma,
} from '../api'
import { CALIBRACION_SUGERIDA, CAMPOS, PX_POR_MM, estiloCampo, textoDelCampo } from '../lib/diploma'
import {
  comprimirImagen,
  guardarFondoGuia,
  leerFondoGuia,
  olvidarFondoGuia,
} from '../lib/fondoDiploma'
import AreaImpresion from './AreaImpresion'
import DiplomaHoja from './DiplomaHoja'
import { useToast } from './Toast'
import { useAdmin } from './admin'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const labelCls = 'mb-1 block text-xs font-medium text-slate-500'

const HOJAS: Record<string, { ancho: number; alto: number }> = {
  A4: { ancho: 297, alto: 210 },
  CARTA: { ancho: 279.4, alto: 215.9 },
}

/** Diploma de muestra cuando todavia no se busco a nadie. */
const EJEMPLO: Diploma = {
  registroId: 0,
  charlaId: 0,
  dni: '00000000',
  nombreCompleto: 'Nombre Apellido de Ejemplo',
  charla: 'Nombre de la charla',
  sala: 'Sala 1',
  marca: 'Marca',
  capacitador: 'Nombre del capacitador',
  horaInicio: new Date().toISOString(),
  horaFin: new Date().toISOString(),
  estado: 'PENDIENTE',
  impresiones: 0,
  reimpreso: false,
  impresoEn: null,
}

interface Props {
  calibracion: CalibracionDiploma
  ejemplo?: Diploma | null
  onGuardado: (c: CalibracionDiploma) => void
  onCerrar: () => void
}

/**
 * Calibracion de impresion del diploma.
 *
 * Se ajusta UNA sola vez: se mueven los textos sobre la hoja hasta que calzan
 * con el arte preimpreso y se guarda. A partir de ahi todas las hojas se
 * imprimen con la misma configuracion, en cualquier dispositivo.
 */
export default function CalibracionDiplomaModal({
  calibracion,
  ejemplo,
  onGuardado,
  onCerrar,
}: Props) {
  const { notificar } = useToast()
  const { salir } = useAdmin()
  const [cal, setCal] = useState<CalibracionDiploma>(calibracion)
  const [campoActivo, setCampoActivo] = useState<CampoDiplomaId>('nombre')
  const [guardando, setGuardando] = useState(false)
  const [imprimiendoPrueba, setImprimiendoPrueba] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [anchoDisponible, setAnchoDisponible] = useState(560)
  const [fondo, setFondo] = useState<string | null>(() => leerFondoGuia())

  const muestra = ejemplo ?? EJEMPLO
  const escala = Math.min(1, anchoDisponible / (cal.anchoHoja * PX_POR_MM))
  const campo = cal[campoActivo]

  useEffect(() => {
    const el = contenedorRef.current
    if (!el) return
    const medir = () => setAnchoDisponible(el.clientWidth)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function actualizarCampo(id: CampoDiplomaId, cambios: Partial<CampoDiploma>) {
    setCal((c) => ({ ...c, [id]: { ...c[id], ...cambios } }))
  }

  function cambiarHoja(tamano: string, orientacion: 'horizontal' | 'vertical') {
    const base = HOJAS[tamano]
    if (!base) {
      setCal((c) => ({ ...c, tamanoHoja: tamano, orientacion }))
      return
    }
    const ancho = orientacion === 'horizontal' ? base.ancho : base.alto
    const alto = orientacion === 'horizontal' ? base.alto : base.ancho
    setCal((c) => ({ ...c, tamanoHoja: tamano, orientacion, anchoHoja: ancho, altoHoja: alto }))
  }

  /** Arrastra un texto sobre la hoja: convierte el movimiento del mouse a milimetros. */
  function iniciarArrastre(e: React.PointerEvent, id: CampoDiplomaId) {
    e.preventDefault()
    setCampoActivo(id)
    const inicial = cal[id]
    const xInicial = e.clientX
    const yInicial = e.clientY
    const factor = PX_POR_MM * escala

    const mover = (ev: PointerEvent) => {
      const dx = (ev.clientX - xInicial) / factor
      const dy = (ev.clientY - yInicial) / factor
      actualizarCampo(id, {
        x: redondear(inicial.x + dx),
        y: redondear(inicial.y + dy),
      })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  function centrar() {
    actualizarCampo(campoActivo, {
      x: redondear((cal.anchoHoja - campo.ancho) / 2),
    })
  }

  /** Vuelve a las posiciones pensadas para el arte del diploma. */
  function restaurarSugeridas() {
    if (!confirm('Se volveran a las posiciones sugeridas para el arte del diploma. Continuar?')) {
      return
    }
    setCal(CALIBRACION_SUGERIDA)
  }

  /** Carga el arte del diploma como fondo de referencia (no se imprime). */
  async function cargarFondo(archivo: File) {
    try {
      const dataUrl = await comprimirImagen(archivo)
      guardarFondoGuia(dataUrl)
      setFondo(dataUrl)
      notificar('exito', 'Guia cargada. Solo se ve aqui: nunca se imprime.')
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'No se pudo cargar la imagen.')
    }
  }

  function quitarFondo() {
    olvidarFondoGuia()
    setFondo(null)
  }

  /** Imprime una hoja de prueba con los datos de ejemplo, sin marcar nada. */
  function imprimirPrueba() {
    setImprimiendoPrueba(true)
    setTimeout(() => {
      window.print()
      setImprimiendoPrueba(false)
    }, 100)
  }

  async function guardar() {
    setGuardando(true)
    try {
      const guardada = await api.guardarCalibracionDiploma(cal)
      notificar('exito', 'Calibración guardada. Se usará en todas las hojas.')
      onGuardado(guardada)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        salir()
        notificar('error', 'Sesión de administrador expirada. Ingresa la clave de nuevo.')
      } else {
        notificar('error', e instanceof Error ? e.message : 'Error al guardar la calibración')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-4">
      <div className="my-6 w-full max-w-5xl rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Calibrar diploma</h2>
            <p className="text-xs text-slate-500">
              Se ajusta una sola vez y vale para todas las hojas.
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_20rem]">
          {/* --------------------------------------------------- Vista previa */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Move className="h-3.5 w-3.5" />
                Arrastra cada texto para moverlo. Solo se imprimen los textos.
              </p>
              <div className="flex items-center gap-1.5">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {fondo ? 'Cambiar guía' : 'Subir imagen de guía'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const archivo = e.target.files?.[0]
                      if (archivo) cargarFondo(archivo)
                      e.target.value = ''
                    }}
                  />
                </label>
                {fondo && (
                  <button
                    onClick={quitarFondo}
                    title="Quitar la imagen de guía"
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div ref={contenedorRef} className="overflow-hidden rounded-lg bg-slate-100 p-2">
              <div className="relative" style={{ width: cal.anchoHoja * PX_POR_MM * escala }}>
                <DiplomaHoja
                  diploma={muestra}
                  calibracion={{
                    ...cal,
                    // Los textos reales se dibujan encima como cajas arrastrables.
                    nombre: { ...cal.nombre, visible: false },
                    charla: { ...cal.charla, visible: false },
                    marca: { ...cal.marca, visible: false },
                    capacitador: { ...cal.capacitador, visible: false },
                    fecha: { ...cal.fecha, visible: false },
                  }}
                  escala={escala}
                  conGuias
                  fondo={fondo}
                />
                {/* Capa de textos arrastrables, a la misma escala que la hoja. */}
                <div
                  className="absolute left-0 top-0"
                  style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: `${cal.anchoHoja}mm`,
                      height: `${cal.altoHoja}mm`,
                    }}
                  >
                    {CAMPOS.map(({ id }) => {
                      const c = cal[id]
                      if (!c.visible) return null
                      const activo = id === campoActivo
                      return (
                        <div
                          key={id}
                          onPointerDown={(e) => iniciarArrastre(e, id)}
                          style={{
                            ...estiloCampo(c, cal),
                            cursor: 'move',
                            outline: activo ? '1.5px solid #2563eb' : '1px dashed #94a3b8',
                            outlineOffset: 2,
                            background: activo ? 'rgba(37,99,235,0.06)' : 'transparent',
                            touchAction: 'none',
                          }}
                        >
                          {textoDelCampo(id, muestra) || '—'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {CAMPOS.map(({ id, etiqueta }) => (
                <button
                  key={id}
                  onClick={() => setCampoActivo(id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    id === campoActivo
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {fondo
                ? 'La imagen de guía se ve solo en esta pantalla y solo en este dispositivo: nunca se imprime.'
                : 'Sube el arte del diploma como guía para calzar los textos exactos. No se imprime.'}
            </p>
          </div>

          {/* ------------------------------------------------------ Controles */}
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Hoja</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Tamaño</label>
                  <select
                    className={inputCls}
                    value={cal.tamanoHoja}
                    onChange={(e) => cambiarHoja(e.target.value, cal.orientacion)}
                  >
                    <option value="A4">A4</option>
                    <option value="CARTA">Carta</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Orientación</label>
                  <select
                    className={inputCls}
                    value={cal.orientacion}
                    onChange={(e) =>
                      cambiarHoja(cal.tamanoHoja, e.target.value as 'horizontal' | 'vertical')
                    }
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Ancho (mm)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={cal.anchoHoja}
                    onChange={(e) =>
                      setCal({ ...cal, anchoHoja: Number(e.target.value), tamanoHoja: 'PERSONALIZADO' })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Alto (mm)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={cal.altoHoja}
                    onChange={(e) =>
                      setCal({ ...cal, altoHoja: Number(e.target.value), tamanoHoja: 'PERSONALIZADO' })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Ajuste X (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    value={cal.desplazamientoX}
                    onChange={(e) => setCal({ ...cal, desplazamientoX: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ajuste Y (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    value={cal.desplazamientoY}
                    onChange={(e) => setCal({ ...cal, desplazamientoY: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Los ajustes X e Y corren todos los textos a la vez, para compensar el margen de
                la impresora.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                {CAMPOS.find((c) => c.id === campoActivo)?.etiqueta}
              </h3>

              <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={campo.visible}
                  onChange={(e) => actualizarCampo(campoActivo, { visible: e.target.checked })}
                />
                Imprimir este texto
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Desde la izquierda (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    value={campo.x}
                    onChange={(e) =>
                      actualizarCampo(campoActivo, { x: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Desde arriba (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    value={campo.y}
                    onChange={(e) =>
                      actualizarCampo(campoActivo, { y: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Ancho (mm)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={campo.ancho}
                    onChange={(e) =>
                      actualizarCampo(campoActivo, { ancho: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Tamaño (pt)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={campo.tamano}
                    onChange={(e) =>
                      actualizarCampo(campoActivo, { tamano: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ['izquierda', AlignLeft],
                    ['centro', AlignCenter],
                    ['derecha', AlignRight],
                  ] as [AlineacionTexto, typeof AlignLeft][]
                ).map(([valor, Icono]) => (
                  <button
                    key={valor}
                    onClick={() => actualizarCampo(campoActivo, { alineacion: valor })}
                    title={`Alinear a la ${valor}`}
                    className={`rounded-lg border p-1.5 ${
                      campo.alineacion === valor
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icono className="h-4 w-4" />
                  </button>
                ))}
                <button
                  onClick={() => actualizarCampo(campoActivo, { negrita: !campo.negrita })}
                  title="Negrita"
                  className={`rounded-lg border p-1.5 ${
                    campo.negrita
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={() => actualizarCampo(campoActivo, { mayusculas: !campo.mayusculas })}
                  title="Mayúsculas"
                  className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                    campo.mayusculas
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  AA
                </button>
                <button
                  onClick={centrar}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Centrar en la hoja
                </button>
              </div>
            </section>

            <div className="flex flex-col gap-2">
              <button
                onClick={restaurarSugeridas}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar posiciones sugeridas
              </button>
              <button
                onClick={imprimirPrueba}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                Imprimir hoja de prueba
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {guardando ? 'Guardando...' : 'Guardar calibración'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {imprimiendoPrueba && <AreaImpresion diplomas={[muestra]} calibracion={cal} />}
    </div>
  )
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10
}
