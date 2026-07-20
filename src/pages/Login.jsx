import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Supabase auth error:', error)
        setError(error.message === 'Email not confirmed'
          ? 'Tu correo no está confirmado. Revisa la configuración del usuario en Supabase.'
          : 'Credenciales incorrectas. Verifica tu correo y contraseña.')
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      console.error('Error de conexión con Supabase:', err)
      setError('No se pudo conectar con el servidor. Revisa tu archivo .env y que hayas reiniciado "npm run dev".')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🥭</div>
          <h1 className="text-2xl font-bold text-mango-600">Mango Adictos</h1>
          <p className="text-sm text-gray-500">Contabilidad y ventas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mango-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mango-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mango-500 hover:bg-mango-600 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Los usuarios son creados por el administrador desde Supabase.
          Al registrarse, todo usuario nuevo entra como "empleado" por defecto.
        </p>
      </div>
    </div>
  )
}
