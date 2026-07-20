import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const employeeLinks = [
  { to: '/pos', label: '🍧 Vender' },
  { to: '/turno', label: '🕒 Mi turno' },
  { to: '/insumos', label: '📦 Insumos' },
]

const adminLinks = [
  { to: '/admin/dashboard', label: '📊 Dashboard' },
  { to: '/admin/productos', label: '🥤 Productos' },
  { to: '/admin/finanzas', label: '💰 Finanzas' },
  { to: '/admin/empleados', label: '👥 Empleados' },
  { to: '/admin/insumos', label: '📦 Insumos' },
]

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const links = isAdmin ? adminLinks : employeeLinks

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-mango-500 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="font-bold">🥭 Mango Adictos</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{profile?.full_name} · {profile?.role}</span>
          <button onClick={signOut} className="bg-mango-700 px-3 py-1 rounded-lg hover:bg-mango-600">
            Salir
          </button>
        </div>
      </header>

      <nav className="bg-white border-b flex gap-1 px-2 overflow-x-auto">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 ${
                isActive ? 'border-mango-500 text-mango-600' : 'border-transparent text-gray-500 hover:text-mango-500'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
