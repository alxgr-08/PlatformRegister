import { ArrowRight, DoorOpen, Presentation, Users } from 'lucide-react'
import type { Sala } from '../api'

interface Props {
  salas: Sala[]
  cargando: boolean
  onElegir: (sala: Sala) => void
}

/**
 * Pantalla "¿En que sala estas?".
 *
 * Se muestra una tarjeta por sala configurada. Las tarjetas se acomodan solas:
 * 1 por fila en celulares angostos, 2 en celulares normales y hasta 4 en
 * pantallas grandes. No pide usuario ni contrasena.
 */
export default function SelectorSala({ salas, cargando, onElegir }: Props) {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 w-fit rounded-2xl bg-blue-100 p-3 text-blue-600">
          <DoorOpen className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">¿En qué sala estás?</h2>
        <p className="mt-1 text-sm text-slate-500">
          Elige tu sala para ver solo sus charlas. Queda guardada en este dispositivo.
        </p>
      </div>

      {cargando ? (
        <p className="py-10 text-center text-sm text-slate-400">Cargando salas...</p>
      ) : salas.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-800">
          Todavía no hay salas configuradas. Un administrador debe crearlas en
          la pantalla <span className="font-semibold">Configuración</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {salas.map((s) => (
            <button
              key={s.id}
              onClick={() => onElegir(s)}
              className="flex flex-col gap-3 rounded-xl border-2 border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100"
            >
              <div className="flex items-center gap-2 text-blue-600">
                <Presentation className="h-6 w-6" />
                <span className="text-lg font-bold text-slate-800">{s.nombre}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  {s.charlasVisibles} charla{s.charlasVisibles === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {s.registradosTotal} / {s.aforoTotal}
                </span>
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                Ingresar
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
