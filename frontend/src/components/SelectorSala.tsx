import { ArrowRight, Info, Presentation, Users } from 'lucide-react'
import type { Sala } from '../api'

interface Props {
  salas: Sala[]
  cargando: boolean
  onElegir: (sala: Sala) => void
}

/**
 * Pantalla "¿En que sala estas?".
 *
 * Una tarjeta por sala configurada. Las tarjetas se acomodan solas y pasan a
 * la siguiente fila: 2 por fila en celular y hasta 4 en pantallas grandes. No
 * pide usuario ni contrasena.
 */
export default function SelectorSala({ salas, cargando, onElegir }: Props) {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">¿En qué sala estás?</h2>
          <p className="mt-1 text-sm text-slate-500">
            <span className="sm:hidden">Selecciona tu sala.</span>
            <span className="hidden sm:inline">
              Selecciona la sala en la que vas a trabajar.
            </span>
          </p>
        </div>

        {cargando ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando salas...</p>
        ) : salas.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-800">
            Todavía no hay salas configuradas. Un administrador debe crearlas en la pantalla{' '}
            <span className="font-semibold">Configuración</span>.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {salas.map((s) => (
              <button
                key={s.id}
                onClick={() => onElegir(s)}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 sm:p-6"
              >
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <Presentation className="h-6 w-6" />
                </div>
                <span className="text-base font-bold text-slate-800 sm:text-lg">{s.nombre}</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                  Ingresar
                  <span className="hidden sm:inline">a sala</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  {s.registradosTotal} / {s.aforoTotal}
                  <span className="hidden sm:inline">
                    · {s.charlasVisibles} charla{s.charlasVisibles === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {salas.length > 0 && (
          <p className="mt-5 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <Info className="h-4 w-4 shrink-0" />
            Al elegir una sala, verás únicamente sus charlas.
          </p>
        )}
      </div>
    </div>
  )
}
