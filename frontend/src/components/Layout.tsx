import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Award,
  BarChart3,
  CalendarDays,
  Database,
  Lock,
  LogOut,
  Menu,
  Presentation,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useAdmin } from './admin'
import AdminKeyModal from './AdminKeyModal'

function claseNav({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`
}

export default function Layout() {
  const { esAdmin, ingresar, salir } = useAdmin()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [mostrarModalAdmin, setMostrarModalAdmin] = useState(false)
  const cerrar = () => setMenuAbierto(false)

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Fondo oscuro al abrir el menu en movil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={cerrar} />
      )}

      {/* Menu lateral (cajon deslizable en movil, fijo en escritorio) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-[#0b1c3f] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600 p-1.5">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="text-lg font-bold leading-tight">EVENTO 2026</div>
          </div>
          <button onClick={cerrar} className="text-slate-300 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <NavLink to="/asistentes" className={claseNav} onClick={cerrar}>
            <Users className="h-5 w-5" />
            Asistentes
          </NavLink>
          <NavLink to="/salas" className={claseNav} onClick={cerrar}>
            <Presentation className="h-5 w-5" />
            Salas / Charlas
          </NavLink>
          <NavLink to="/diplomas" className={claseNav} onClick={cerrar}>
            <Award className="h-5 w-5" />
            Diplomas
          </NavLink>
          <NavLink to="/reportes" className={claseNav} onClick={cerrar}>
            <BarChart3 className="h-5 w-5" />
            Reportes
          </NavLink>
          {/* Configuracion y Base de Datos solo visibles para admin */}
          {esAdmin && (
            <>
              <NavLink to="/configuracion" className={claseNav} onClick={cerrar}>
                <Settings className="h-5 w-5" />
                Configuración
              </NavLink>
              <NavLink to="/base-datos" className={claseNav} onClick={cerrar}>
                <Database className="h-5 w-5" />
                Base de Datos
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior con opciones de admin */}
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Boton menu mobile + titulo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setMenuAbierto(true)} aria-label="Abrir menu">
                <Menu className="h-6 w-6 text-slate-700" />
              </button>
              <span className="font-bold text-slate-800">EVENTO 2026</span>
            </div>
            {/* Titulo en desktop */}
            <div className="hidden text-sm font-semibold text-slate-700 lg:block">
              Gestión de Evento 2026
            </div>
            {/* Botones de admin a la derecha */}
            <div className="flex items-center gap-2">
              {!esAdmin ? (
                <button
                  onClick={() => setMostrarModalAdmin(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Lock className="h-4 w-4" />
                  <span className="hidden sm:inline">Ingresar como Admin</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                    <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                    Modo Admin
                  </div>
                  <button
                    onClick={() => salir()}
                    className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
                    title="Cerrar sesión de admin"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Modal para ingresar contraseña de admin */}
      {mostrarModalAdmin && (
        <AdminKeyModal
          onConfirmar={async (clave) => {
            try {
              await ingresar(clave)
              setMostrarModalAdmin(false)
            } catch (e) {
              // El error es manejado por el componente AdminKeyModal
              throw e
            }
          }}
          onCerrar={() => setMostrarModalAdmin(false)}
        />
      )}
    </div>
  )
}
