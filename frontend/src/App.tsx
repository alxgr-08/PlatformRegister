import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AdminProvider } from './components/admin'
import { ToastProvider } from './components/Toast'
import Asistentes from './pages/Asistentes'
import BaseDatos from './pages/BaseDatos'
import Configuracion from './pages/Configuracion'
import Diplomas from './pages/Diplomas'
import Reportes from './pages/Reportes'
import Salas from './pages/Salas'

export default function App() {
  return (
    <ToastProvider>
      <AdminProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/asistentes" replace />} />
            <Route path="/asistentes" element={<Asistentes />} />
            <Route path="/salas" element={<Salas />} />
            <Route path="/diplomas" element={<Diplomas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/base-datos" element={<BaseDatos />} />
            <Route path="*" element={<Navigate to="/asistentes" replace />} />
          </Route>
        </Routes>
      </AdminProvider>
    </ToastProvider>
  )
}
