import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Pencil,
  Presentation,
  Repeat,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react'
import { api, type Asistente, type Sala } from '../api'
import EditarPersonaModal from '../components/EditarPersonaModal'
import PageHeader from '../components/PageHeader'
import RegistroCharlas from '../components/RegistroCharlas'
import SelectorSala from '../components/SelectorSala'
import { useToast } from '../components/Toast'
import { useAdmin } from '../components/admin'
import {
  guardarSalaSeleccionada,
  leerSalaSeleccionada,
  olvidarSalaSeleccionada,
} from '../lib/sala'

interface MensajePersona {
  tipo: 'error' | 'warn'
  texto: string
}

/**
 * Pantalla de sala. Cada dispositivo elige una vez en que sala esta (sin
 * usuario ni contrasena) y desde ahi registra a los asistentes en las charlas
 * de esa sala. La eleccion se recuerda al recargar.
 */
export default function Salas() {
  const { notificar } = useToast()
  const { esAdmin } = useAdmin()
  const [salas, setSalas] = useState<Sala[]>([])
  const [cargandoSalas, setCargandoSalas] = useState(true)
  const [salaId, setSalaId] = useState<number | null>(() => leerSalaSeleccionada())
  const [dni, setDni] = useState('')
  const [persona, setPersona] = useState<Asistente | null>(null)
  const [mensajePersona, setMensajePersona] = useState<MensajePersona | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [editandoPersona, setEditandoPersona] = useState(false)
  const dniRef = useRef<HTMLInputElement>(null)

  const cargarSalas = useCallback(async () => {
    try {
      const lista = await api.listarSalas()
      setSalas(lista)
      // Si la sala guardada en este dispositivo ya no existe (la borraron o la
      // desactivaron), se vuelve a preguntar en que sala esta.
      setSalaId((actual) => {
        if (actual != null && !lista.some((s) => s.id === actual)) {
          olvidarSalaSeleccionada()
          return null
        }
        return actual
      })
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al cargar las salas')
    } finally {
      setCargandoSalas(false)
    }
  }, [notificar])

  useEffect(() => {
    cargarSalas()
  }, [cargarSalas])

  const salaActual = salas.find((s) => s.id === salaId) ?? null

  function elegirSala(sala: Sala) {
    guardarSalaSeleccionada(sala.id)
    setSalaId(sala.id)
  }

  /** Vuelve a la eleccion de sala SIN perder la persona que se esta atendiendo. */
  function cambiarDeSala() {
    olvidarSalaSeleccionada()
    setSalaId(null)
    cargarSalas()
  }

  async function buscar() {
    const d = dni.trim()
    if (!d) {
      notificar('info', 'Ingresa un DNI.')
      return
    }
    setBuscando(true)
    setPersona(null)
    setMensajePersona(null)
    try {
      const r = await api.buscarAsistente(d)
      if (!r.encontrado || !r.asistente) {
        setMensajePersona({ tipo: 'error', texto: `No se encontro el DNI ${d}.` })
      } else if (!r.asistente.ingresadoAlEvento) {
        setMensajePersona({
          tipo: 'warn',
          texto:
            'Esta persona no esta registrada al evento. Registrala primero en la pantalla de Asistentes.',
        })
      } else {
        setPersona(r.asistente)
      }
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error al buscar')
    } finally {
      setBuscando(false)
    }
  }

  /**
   * Tras guardar una charla, deja el DNI seleccionado arriba: escribir el del
   * siguiente lo reemplaza sin tener que borrarlo, y la persona actual sigue
   * cargada por si hay que agregarle otra charla.
   */
  function prepararSiguienteDni() {
    dniRef.current?.focus()
    dniRef.current?.select()
  }

  /** Deja la pantalla lista para el siguiente asistente. */
  function siguienteAsistente() {
    setPersona(null)
    setDni('')
    setMensajePersona(null)
    dniRef.current?.focus()
  }

  const botonConfigurar = esAdmin ? (
    <Link
      to="/configuracion"
      className="flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
    >
      <Settings className="h-4 w-4" />
      <span className="hidden sm:inline">Editar salas y aforos</span>
      <span className="sm:hidden">Configurar</span>
    </Link>
  ) : undefined

  // ------------------------------------------------- Todavia no eligio sala
  if (salaId == null) {
    return (
      <>
        <PageHeader
          icono={<Presentation className="h-6 w-6" />}
          titulo="Salas / Charlas"
          subtitulo="Selecciona tu sala para registrar asistentes"
          accion={botonConfigurar}
        />
        {persona && (
          <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Sigues atendiendo a <b>{persona.nombreCompleto}</b>. Elige la otra sala para
              agregarle más charlas.
            </p>
          </div>
        )}
        <SelectorSala salas={salas} cargando={cargandoSalas} onElegir={elegirSala} />
      </>
    )
  }

  // ------------------------------------------------------- Sala ya elegida
  return (
    <>
      <PageHeader
        icono={<Presentation className="h-6 w-6" />}
        titulo="Salas / Charlas"
        subtitulo="Registra asistentes en las charlas de esta sala"
        accion={botonConfigurar}
      />

      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        {/* Sala elegida en este dispositivo */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Presentation className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{salaActual?.nombre ?? 'Sala'}</h2>
              <p className="text-xs text-slate-500">Este dispositivo recordará tu sala.</p>
            </div>
          </div>
          <button
            onClick={cambiarDeSala}
            className="flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Repeat className="h-4 w-4" />
            Cambiar de sala
          </button>
        </section>

        {/* Buscar asistente */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-3 font-semibold text-slate-800">Buscar asistente</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <div className="relative flex-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={dniRef}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ingresa DNI"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
            </div>
            <button
              onClick={buscar}
              disabled={buscando}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          <p className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <Info className="h-4 w-4 shrink-0" />
            Solo asistentes registrados al evento.
          </p>

          {persona && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-green-300 bg-green-50/60 p-4">
              <div className="flex items-center gap-2 font-semibold text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Registrada al evento
              </div>
              <span className="text-sm text-slate-600">
                DNI: <b className="text-slate-800">{persona.dni}</b>
              </span>
              <span className="text-sm text-slate-600">
                Nombre: <b className="text-slate-800">{persona.nombreCompleto}</b>
              </span>
              <span className="text-sm text-slate-600">
                Especialidad: <b className="text-slate-800">{persona.especialidad ?? '—'}</b>
              </span>
              <div className="flex items-center gap-2 sm:ml-auto">
                <button
                  onClick={() => setEditandoPersona(true)}
                  title="Editar datos del asistente"
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  onClick={siguienteAsistente}
                  title="Limpiar y atender al siguiente"
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {mensajePersona && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl border p-4 text-sm ${
                mensajePersona.tipo === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{mensajePersona.texto}</span>
            </div>
          )}
        </section>

        <RegistroCharlas
          persona={persona}
          salaId={salaId}
          salaNombre={salaActual?.nombre ?? 'esta sala'}
          onGuardado={prepararSiguienteDni}
        />
      </div>

      {editandoPersona && persona && (
        <EditarPersonaModal
          asistente={persona}
          onCerrar={() => setEditandoPersona(false)}
          onGuardado={(a) => {
            setPersona(a)
            setEditandoPersona(false)
          }}
        />
      )}
    </>
  )
}
