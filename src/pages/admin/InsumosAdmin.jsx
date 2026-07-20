import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function InsumosAdmin() {
  const { profile } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [resolved, setResolved] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: pending } = await supabase
      .from('supply_alerts')
      .select('*, supplies(name), reporter:reported_by(full_name)')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false })

    const { data: done } = await supabase
      .from('supply_alerts')
      .select('*, supplies(name)')
      .eq('status', 'atendido')
      .order('resolved_at', { ascending: false })
      .limit(15)

    setAlerts(pending || [])
    setResolved(done || [])
  }

  async function resolve(alert) {
    await supabase
      .from('supply_alerts')
      .update({ status: 'atendido', resolved_at: new Date().toISOString(), resolved_by: profile.id })
      .eq('id', alert.id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Insumos agotados (pendientes)</h2>
        {!alerts.length && <p className="text-gray-400 text-sm">No hay alertas pendientes 🎉</p>}
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex justify-between items-center border rounded-lg p-3 bg-red-50 border-red-200">
              <div>
                <div className="font-semibold text-red-600">{a.supplies?.name}</div>
                <div className="text-xs text-gray-500">
                  Reportado por {a.reporter?.full_name} · {new Date(a.created_at).toLocaleString('es-CO')}
                </div>
              </div>
              <button
                onClick={() => resolve(a)}
                className="text-xs bg-mango-500 text-white px-3 py-1.5 rounded-full font-medium"
              >
                Marcar repuesto
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Historial reciente</h2>
        <div className="space-y-1 text-sm">
          {resolved.map((a) => (
            <div key={a.id} className="text-gray-500">
              ✅ {a.supplies?.name} · repuesto el {new Date(a.resolved_at).toLocaleDateString('es-CO')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
