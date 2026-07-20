import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function Finanzas() {
  const { profile } = useAuth()
  const [categories, setCategories] = useState([])
  const [movements, setMovements] = useState([])
  const [form, setForm] = useState({ type: 'egreso', category_id: '', amount: '', description: '', movement_date: today() })

  useEffect(() => {
    loadData()
  }, [])

  function today() {
    return new Date().toISOString().slice(0, 10)
  }

  async function loadData() {
    const { data: cats } = await supabase.from('movement_categories').select('*').order('name')
    const { data: movs } = await supabase
      .from('movements')
      .select('*, movement_categories(name)')
      .order('movement_date', { ascending: false })
      .limit(100)
    setCategories(cats || [])
    setMovements(movs || [])
    const egresoCats = (cats || []).filter((c) => c.type === 'egreso')
    if (egresoCats.length) setForm((f) => ({ ...f, category_id: f.category_id || egresoCats[0].id }))
  }

  const filteredCategories = categories.filter((c) => c.type === form.type)

  async function addMovement(e) {
    e.preventDefault()
    if (!form.amount || !form.category_id) return
    await supabase.from('movements').insert({
      type: form.type,
      category_id: form.category_id,
      amount: Number(form.amount),
      description: form.description,
      movement_date: form.movement_date,
      created_by: profile.id,
    })
    setForm({ ...form, amount: '', description: '' })
    loadData()
  }

  const ingresos = movements.filter((m) => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0)
  const egresos = movements.filter((m) => m.type === 'egreso').reduce((s, m) => s + Number(m.amount), 0)
  const balance = ingresos - egresos

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Ingresos" value={ingresos} color="text-green-600" />
        <SummaryCard label="Egresos" value={egresos} color="text-red-600" />
        <SummaryCard label="Balance" value={balance} color={balance >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Registrar movimiento</h2>
        <form onSubmit={addMovement} className="grid sm:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'ingreso', category_id: '' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.type === 'ingreso' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'egreso', category_id: '' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.type === 'egreso' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
            >
              Egreso
            </button>
          </div>

          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Selecciona una categoría</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Valor"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={form.movement_date}
            onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />

          <input
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
          />

          <button className="sm:col-span-2 bg-mango-500 text-white py-2 rounded-lg font-medium">
            Registrar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Movimientos recientes</h2>
        <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
          {movements.map((m) => (
            <div key={m.id} className="flex justify-between border-b pb-2">
              <div>
                <div className="font-medium">{m.movement_categories?.name}</div>
                <div className="text-gray-400">{m.movement_date} {m.description ? '· ' + m.description : ''}</div>
              </div>
              <div className={m.type === 'ingreso' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {m.type === 'ingreso' ? '+' : '-'}${Number(m.amount).toLocaleString('es-CO')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>${value.toLocaleString('es-CO')}</p>
    </div>
  )
}
