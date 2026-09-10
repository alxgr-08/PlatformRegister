/**
 * Sala elegida en ESTE dispositivo.
 *
 * No hay usuarios ni login por sala: cada celular o tablet elige una vez en
 * que sala esta y se recuerda al recargar la pagina, hasta que alguien use
 * "Cambiar de sala".
 */
const CLAVE = 'evento.salaSeleccionada'

export function leerSalaSeleccionada(): number | null {
  const valor = localStorage.getItem(CLAVE)
  if (!valor) return null
  const id = Number(valor)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function guardarSalaSeleccionada(id: number): void {
  localStorage.setItem(CLAVE, String(id))
}

export function olvidarSalaSeleccionada(): void {
  localStorage.removeItem(CLAVE)
}
