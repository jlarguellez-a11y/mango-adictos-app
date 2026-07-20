import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function InsumosEmpleado() {
  const { profile } = useAuth()
  const [supplies, setSupplies] = useState([])
  const [alerts, setAlerts] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: sup } = await supabase.from('supplies').select('*').eq('active', true).order('name')
    const { data: al } = await supabase
      .from('supply_alerts')
      .select('*, supplies(name)')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false })
    setSupplies(sup || [])
    setAlerts(al || [])
  }

  async function reportOut(supplyId) {
    setMessage('')
    const { error } = await supabase.from('supply_alerts').insert({
      supply_id: supplyId,
      reported_by: profile.id,
    })
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('✅ Notificación enviada al administrador')
      loadData()
    }
  }

  const pendingSupplyIds = new Set(alerts.map((a) => a.supply_id))

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Notificar insumo agotado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {supplies.map((s) => {
            const isPending = pendingSupplyIds.has(s.id)
            return (
              <button
                key={s.id}
                onClick={() => !isPending && reportOut(s.id)}
                disabled={isPending}
                className={`rounded-xl border p-4 text-left transition ${
                  isPending
                    ? 'bg-red-50 border-red-300 text-red-600'
                    : 'bg-white hover:border-mango-400 hover:shadow'
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-xs">{isPending ? 'Ya notificado' : 'Tocar para notificar'}</div>
              </button>
            )
          })}
        </div>
        {message && <p className="text-sm mt-3">{message}</p>}
      </div>
    </div>
  )
}
