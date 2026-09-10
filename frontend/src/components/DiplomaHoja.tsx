import type { ReactNode } from 'react'
import type { CalibracionDiploma, Diploma } from '../api'
import { CAMPOS, PX_POR_MM, estiloCampo, textoDelCampo } from '../lib/diploma'

interface Props {
  diploma: Diploma
  calibracion: CalibracionDiploma
  /** 1 = tamano real. Se usa un valor menor para la vista previa en pantalla. */
  escala?: number
  /** Muestra el borde de la hoja (solo en pantalla, nunca al imprimir). */
  conGuias?: boolean
  /** Ultima hoja del lote: no fuerza salto de pagina despues. */
  ultima?: boolean
  children?: ReactNode
}

/**
 * Una hoja de diploma.
 *
 * Solo se imprimen los textos: el arte del diploma ya viene preimpreso en el
 * papel, por eso la hoja no lleva fondo ni bordes al imprimir.
 */
export default function DiplomaHoja({
  diploma,
  calibracion,
  escala = 1,
  conGuias = false,
  ultima = false,
  children,
}: Props) {
  const anchoPx = calibracion.anchoHoja * PX_POR_MM
  const altoPx = calibracion.altoHoja * PX_POR_MM

  const hoja = (
    <div
      className="diploma-hoja"
      style={{
        position: 'relative',
        width: `${calibracion.anchoHoja}mm`,
        height: `${calibracion.altoHoja}mm`,
        overflow: 'hidden',
        background: '#fff',
        breakAfter: ultima ? 'auto' : 'page',
        pageBreakAfter: ultima ? 'auto' : 'always',
        border: conGuias ? '1px solid #cbd5e1' : 'none',
        boxSizing: 'border-box',
      }}
    >
      {CAMPOS.map(({ id }) => {
        const campo = calibracion[id]
        if (!campo?.visible) return null
        return (
          <div key={id} style={estiloCampo(campo, calibracion)}>
            {textoDelCampo(id, diploma)}
          </div>
        )
      })}
      {children}
    </div>
  )

  if (escala === 1) return hoja

  return (
    <div style={{ width: anchoPx * escala, height: altoPx * escala, position: 'relative' }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}>{hoja}</div>
    </div>
  )
}
