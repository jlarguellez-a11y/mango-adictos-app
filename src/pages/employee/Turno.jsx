import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function Turno() {
  const { profile } = useAuth()
  const [openShift, setOpenShift] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadShifts()
  }, [])

  async function loadShifts() {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('employee_id', profile.id)
      .order('start_time', { ascending: false })
      .limit(20)

    setHistory(data || [])
    setOpenShift((data || []).find((s) => !s.end_time) || null)
  }

  async function startShift() {
    setLoading(true)
    await supabase.from('shifts').insert({ employee_id: profile.id })
    await loadShifts()
    setLoading(false)
  }

  async function endShift() {
    if (!openShift) return
    setLoading(true)
    await supabase.from('shifts').update({ end_time: new Date().toISOString() }).eq('id', openShift.id)
    await loadShifts()
    setLoading(false)
  }

  const totalPending = history
    .filter((s) => s.end_time && !s.paid)
    .reduce((sum, s) => sum + Number(s.amount_to_pay || 0) + Number(s.bonus || 0), 0)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-6 text-center">
        {openShift ? (
          <>
            <p className="text-sm text-gray-500 mb-2">
              Turno iniciado a las {new Date(openShift.start_time).toLocaleTimeString('es-CO')}
            </p>
            <button
              onClick={endShift}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Finalizar turno
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">No tienes un turno activo</p>
            <button
              onClick={startShift}
              disabled={loading}
              className="bg-mango-500 hover:bg-mango-600 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Iniciar turno
            </button>
          </>
        )}
      </div>

      <div className="bg-mango-50 border border-mango-200 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">💰 Saldo a favor (lo que te deben pagar)</p>
        <p className="text-2xl font-bold text-mango-600">${totalPending.toLocaleString('es-CO')}</p>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Historial de turnos</h2>
        <div className="space-y-2 text-sm">
          {history.map((s) => (
            <div key={s.id} className="flex justify-between border-b pb-2">
              <div>
                <div className="font-medium">{new Date(s.start_time).toLocaleDateString('es-CO')}</div>
                <div className="text-gray-400">
                  {new Date(s.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {s.end_time
                    ? new Date(s.end_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    : 'en curso'}
                </div>
              </div>
              <div className="text-right">
                {s.amount_to_pay != null && (
                  <div className="font-semibold">
                    ${s.amount_to_pay.toLocaleString('es-CO')}
                    {Number(s.bonus) > 0 && (
                      <span className="text-mango-600"> + ${Number(s.bonus).toLocaleString('es-CO')} bono</span>
                    )}
                  </div>
                )}
                <div className={`text-xs ${s.paid ? 'text-green-600' : 'text-orange-500'}`}>
                  {s.end_time ? (s.paid ? 'Pagado' : 'Pendiente') : ''}
                </div>
              </div>
            </div>
          ))}
          {!history.length && <p className="text-gray-400">Aún no hay turnos registrados.</p>}
        </div>
      </div>
    </div>
  )
}
