import { useEffect, useState, type ReactNode } from 'react'
import { Clock } from 'lucide-react'

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fecha = ahora.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = ahora.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    // En celular se oculta: la pantalla es angosta y el boton de accion manda.
    <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
      <Clock className="h-4 w-4" />
      <span className="font-medium text-slate-700">{fecha}</span>
      <span>{hora}</span>
    </div>
  )
}

interface Props {
  icono: ReactNode
  titulo: string
  subtitulo: string
  accion?: ReactNode
}

export default function PageHeader({ icono, titulo, subtitulo, accion }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">{icono}</div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
          <p className="text-sm text-slate-500">{subtitulo}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Reloj />
        {accion}
      </div>
    </div>
  )
}
