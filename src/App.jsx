import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import POS from './pages/employee/POS'
import Turno from './pages/employee/Turno'
import InsumosEmpleado from './pages/employee/Insumos'
import Dashboard from './pages/admin/Dashboard'
import Productos from './pages/admin/Productos'
import Finanzas from './pages/admin/Finanzas'
import Empleados from './pages/admin/Empleados'
import InsumosAdmin from './pages/admin/InsumosAdmin'

function Private({ children, adminOnly = false }) {
  const { session, profile, loading, isAdmin } = useAuth()

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <div className="p-8 text-center text-gray-400">Cargando perfil...</div>
  if (adminOnly && !isAdmin) return <Navigate to="/pos" replace />
  if (!adminOnly && isAdmin) return <Navigate to="/admin/dashboard" replace />

  return children
}

function Root() {
  const { session, isAdmin } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/pos'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Root />} />

            {/* Rutas de empleado */}
            <Route path="/pos" element={<Private><POS /></Private>} />
            <Route path="/turno" element={<Private><Turno /></Private>} />
            <Route path="/insumos" element={<Private><InsumosEmpleado /></Private>} />

            {/* Rutas de administrador */}
            <Route path="/admin/dashboard" element={<Private adminOnly><Dashboard /></Private>} />
            <Route path="/admin/productos" element={<Private adminOnly><Productos /></Private>} />
            <Route path="/admin/finanzas" element={<Private adminOnly><Finanzas /></Private>} />
            <Route path="/admin/empleados" element={<Private adminOnly><Empleados /></Private>} />
            <Route path="/admin/insumos" element={<Private adminOnly><InsumosAdmin /></Private>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
