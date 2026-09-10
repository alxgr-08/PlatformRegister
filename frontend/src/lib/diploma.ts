import type { CSSProperties } from 'react'
import type { CalibracionDiploma, CampoDiploma, CampoDiplomaId, Diploma } from '../api'
import { formatoFechaLarga } from './formato'

/** Pixeles por milimetro a 96 dpi: es la referencia que usa el navegador. */
export const PX_POR_MM = 96 / 25.4

const ALINEACION: Record<string, CSSProperties['textAlign']> = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
}

/** Campos que se imprimen en el diploma, en el orden en que se listan en pantalla. */
export const CAMPOS: { id: CampoDiplomaId; etiqueta: string }[] = [
  { id: 'charla', etiqueta: 'Nombre de la charla' },
  { id: 'marca', etiqueta: 'Marca' },
  { id: 'capacitador', etiqueta: 'Capacitador' },
  { id: 'nombre', etiqueta: 'Nombre del asistente' },
  { id: 'fecha', etiqueta: 'Fecha' },
]

/** Texto que corresponde a cada campo del diploma. */
export function textoDelCampo(campo: CampoDiplomaId, diploma: Diploma): string {
  switch (campo) {
    case 'nombre':
      return diploma.nombreCompleto
    case 'charla':
      return diploma.charla
    case 'marca':
      return diploma.marca ?? ''
    case 'capacitador':
      return diploma.capacitador ?? ''
    case 'fecha':
      return formatoFechaLarga(diploma.horaInicio)
  }
}

/** Estilo absoluto de un campo dentro de la hoja, en milimetros. */
export function estiloCampo(
  campo: CampoDiploma,
  calibracion: CalibracionDiploma,
): CSSProperties {
  return {
    position: 'absolute',
    left: `${campo.x + calibracion.desplazamientoX}mm`,
    top: `${campo.y + calibracion.desplazamientoY}mm`,
    width: `${campo.ancho}mm`,
    fontSize: `${campo.tamano}pt`,
    fontFamily: calibracion.fuente,
    fontWeight: campo.negrita ? 700 : 400,
    textAlign: ALINEACION[campo.alineacion] ?? 'center',
    textTransform: campo.mayusculas ? 'uppercase' : 'none',
    lineHeight: 1.15,
    color: '#000',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  }
}
