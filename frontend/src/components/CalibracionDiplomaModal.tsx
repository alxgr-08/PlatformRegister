import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Minus,
  Plus,
  Printer,
  Save,
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
import { CAMPOS, PX_POR_MM, estiloCampo, textoDelCampo } from '../lib/diploma'
import AreaImpresion from './AreaImpresion'
import DiplomaHoja from './DiplomaHoja'
import { useToast } from './Toast'
import { useAdmin } from './admin'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const labelCls = 'mb-1 block text-xs font-medium text-slate-500'

const HOJAS: Record<string, { ancho: number; alto: number }> = {
  A4: { ancho: 297, alto: 210 },
  CARTA: { ancho: 279.4, alto: 215.9 },
}

/** Cuantos milimetros mueve cada clic de las flechas. */
const PASO_MM = 1

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
 * Diseno e impresion del diploma.
 *
 * Los cinco textos -charla, marca, capacitador, nombre y fecha- son
 * independientes: cada uno se coloca, se mueve y se dimensiona por separado.
 * Se ajusta UNA sola vez y a partir de ahi todas las hojas se imprimen igual,
 * en cualquier dispositivo. Solo se imprimen los textos: el arte del diploma
 * ya viene preimpreso en el papel.
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

  /**
   * Mueve el texto seleccionado con las flechas, milimetro a milimetro.
   * El calculo va dentro del actualizador para que varios clics seguidos
   * sumen: si se leyera el valor de fuera, tres clics moverian solo uno.
   */
  function mover(dx: number, dy: number) {
    setCal((c) => {
      const actual = c[campoActivo]
      return {
        ...c,
        [campoActivo]: {
          ...actual,
          x: redondear(actual.x + dx * PASO_MM),
          y: redondear(actual.y + dy * PASO_MM),
        },
      }
    })
  }

  function cambiarTamano(delta: number) {
    setCal((c) => {
      const actual = c[campoActivo]
      return {
        ...c,
        [campoActivo]: { ...actual, tamano: Math.max(6, redondear(actual.tamano + delta)) },
      }
    })
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

    const arrastrar = (ev: PointerEvent) => {
      actualizarCampo(id, {
        x: redondear(inicial.x + (ev.clientX - xInicial) / factor),
        y: redondear(inicial.y + (ev.clientY - yInicial) / factor),
      })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', arrastrar)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', arrastrar)
    window.addEventListener('pointerup', soltar)
  }

  function centrar() {
    actualizarCampo(campoActivo, { x: redondear((cal.anchoHoja - campo.ancho) / 2) })
  }

  /** Imprime una hoja de prueba con los datos de ejemplo, sin marcar nada. */
  function imprimirPrueba() {
    setImprimiendoPrueba(true)
    setTimeout(() => {
      window.print()
      setImprimiendoPrueba(false)
    }, 150)
  }

  async function guardar() {
    setGuardando(true)
    try {
      const guardada = await api.guardarCalibracionDiploma(cal)
      notificar('exito', 'Calibración guardada. Se aplica a todos los diplomas.')
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

  // En la vista previa los textos se dibujan como cajas arrastrables encima de
  // la hoja, por eso la hoja de abajo va con todos los campos ocultos.
  const hojaVacia: CalibracionDiploma = {
    ...cal,
    nombre: { ...cal.nombre, visible: false },
    charla: { ...cal.charla, visible: false },
    marca: { ...cal.marca, visible: false },
    capacitador: { ...cal.capacitador, visible: false },
    fecha: { ...cal.fecha, visible: false },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-4">
      <div className="my-6 w-full max-w-5xl rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Diseño e impresión del diploma</h2>
              <p className="text-xs text-slate-500">
                Ajusta los textos una vez y aplica la configuración a todas las hojas.
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_23rem]">
          {/* --------------------------------------------------- Vista previa */}
          {/* min-w-0 evita que la hoja, que va en pixeles, ensanche la columna. */}
          <div className="min-w-0">
            <h3 className="mb-2 font-semibold text-slate-800">Vista previa</h3>
            <div className="rounded-lg bg-slate-100 p-3">
              <span className="mb-2 inline-block rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                Solo textos
              </span>
              {/* La referencia va aqui, sin relleno, para medir el ancho real. */}
              <div ref={contenedorRef}>
              <div
                className="relative"
                style={{ width: cal.anchoHoja * PX_POR_MM * escala }}
              >
                <DiplomaHoja
                  diploma={muestra}
                  calibracion={hojaVacia}
                  escala={escala}
                  conGuias
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
                            outline: activo ? '1.5px dashed #2563eb' : '1px dashed #cbd5e1',
                            outlineOffset: 3,
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
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Las guías no se imprimen. Arrastra un texto o usa las flechas de la derecha.
            </p>
          </div>

          {/* ------------------------------------------------- Ajustar campo */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Ajustar campo</h3>

            <div>
              <label className={labelCls}>Campo</label>
              <select
                className={inputCls}
                value={campoActivo}
                onChange={(e) => setCampoActivo(e.target.value as CampoDiplomaId)}
              >
                {CAMPOS.map(({ id, etiqueta }) => (
                  <option key={id} value={id}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={campo.visible}
                onChange={(e) => actualizarCampo(campoActivo, { visible: e.target.checked })}
              />
              Imprimir este texto
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Posición X (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  className={inputCls}
                  value={campo.x}
                  onChange={(e) => actualizarCampo(campoActivo, { x: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelCls}>Posición Y (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  className={inputCls}
                  value={campo.y}
                  onChange={(e) => actualizarCampo(campoActivo, { y: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Mover texto</label>
                <div className="flex flex-col items-center gap-1">
                  <Flecha onClick={() => mover(0, -1)} titulo="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </Flecha>
                  <div className="flex gap-1">
                    <Flecha onClick={() => mover(-1, 0)} titulo="Izquierda">
                      <ArrowLeft className="h-4 w-4" />
                    </Flecha>
                    <Flecha onClick={() => mover(0, 1)} titulo="Bajar">
                      <ArrowDown className="h-4 w-4" />
                    </Flecha>
                    <Flecha onClick={() => mover(1, 0)} titulo="Derecha">
                      <ArrowRight className="h-4 w-4" />
                    </Flecha>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Alineación</label>
                <div className="flex overflow-hidden rounded-lg border border-slate-300">
                  {(['izquierda', 'centro', 'derecha'] as AlineacionTexto[]).map((valor) => (
                    <button
                      key={valor}
                      onClick={() => actualizarCampo(campoActivo, { alineacion: valor })}
                      className={`flex-1 px-1 py-1.5 text-xs font-medium capitalize ${
                        campo.alineacion === valor
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {valor === 'izquierda' ? 'Izq.' : valor === 'derecha' ? 'Der.' : 'Centro'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={centrar}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Centrar en la hoja
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 items-end gap-3">
              <div>
                <label className={labelCls}>Tamaño de letra</label>
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
                  <button
                    onClick={() => cambiarTamano(-1)}
                    className="px-2 py-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center text-sm font-medium text-slate-800">
                    {campo.tamano} pt
                  </span>
                  <button
                    onClick={() => cambiarTamano(1)}
                    className="px-2 py-2 text-slate-600 hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={campo.negrita}
                    onChange={(e) => actualizarCampo(campoActivo, { negrita: e.target.checked })}
                  />
                  Negrita
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={campo.mayusculas}
                    onChange={(e) =>
                      actualizarCampo(campoActivo, { mayusculas: e.target.checked })
                    }
                  />
                  Mayúsculas
                </label>
              </div>
            </div>

            <div>
              <label className={labelCls}>Ancho del texto (mm)</label>
              <input
                type="number"
                className={inputCls}
                value={campo.ancho}
                onChange={(e) => actualizarCampo(campoActivo, { ancho: Number(e.target.value) })}
              />
            </div>

            <div className="border-t border-slate-200 pt-3">
              <label className={labelCls}>Papel</label>
              <select
                className={inputCls}
                value={cal.tamanoHoja}
                onChange={(e) => cambiarHoja(e.target.value, cal.orientacion)}
              >
                <option value="A4">A4 (según diploma preimpreso)</option>
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Ancho de hoja (mm)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={cal.anchoHoja}
                  onChange={(e) =>
                    setCal({
                      ...cal,
                      anchoHoja: Number(e.target.value),
                      tamanoHoja: 'PERSONALIZADO',
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Alto de hoja (mm)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={cal.altoHoja}
                  onChange={(e) =>
                    setCal({
                      ...cal,
                      altoHoja: Number(e.target.value),
                      tamanoHoja: 'PERSONALIZADO',
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
            <p className="text-xs text-slate-400">
              Los ajustes X e Y corren todos los textos a la vez, para compensar el margen de la
              impresora.
            </p>
          </div>
        </div>

        {/* --------------------------------------------------- Barra inferior */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded bg-blue-600 p-0.5 text-white">
              <Printer className="h-3 w-3" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Se imprimen solo los textos</p>
              <p className="text-xs text-slate-500">El arte del diploma ya está preimpreso.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={imprimirPrueba}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir prueba
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {guardando ? 'Guardando...' : 'Guardar calibración'}
            </button>
          </div>
        </div>
      </div>

      {imprimiendoPrueba && <AreaImpresion diplomas={[muestra]} calibracion={cal} />}
    </div>
  )
}

function Flecha({
  onClick,
  titulo,
  children,
}: {
  onClick: () => void
  titulo: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
    >
      {children}
    </button>
  )
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10
}
