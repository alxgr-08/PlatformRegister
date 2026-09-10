import { createPortal } from 'react-dom'
import type { CalibracionDiploma, Diploma } from '../api'
import DiplomaHoja from './DiplomaHoja'

interface Props {
  diplomas: Diploma[]
  calibracion: CalibracionDiploma
}

/**
 * Hojas que se mandan a la impresora: una por diploma seleccionado.
 * Si la persona tiene 3 diplomas, salen 3 hojas.
 *
 * Se monta fuera de #root (portal al <body>) y esta oculta en pantalla; al
 * imprimir, el CSS oculta la aplicacion y deja visibles solo estas hojas.
 */
export default function AreaImpresion({ diplomas, calibracion }: Props) {
  const reglaPagina = `@page { size: ${calibracion.anchoHoja}mm ${calibracion.altoHoja}mm; margin: 0; }`

  return createPortal(
    <div id="area-impresion">
      <style>{reglaPagina}</style>
      {diplomas.map((d, i) => (
        <DiplomaHoja
          key={d.registroId}
          diploma={d}
          calibracion={calibracion}
          ultima={i === diplomas.length - 1}
        />
      ))}
    </div>,
    document.body,
  )
}
