import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function Finanzas() {
  const { profile } = useAuth()
  const [categories, setCategories] = useState([])
  const [movements, setMovements] = useState([])
  const [saleDetails, setSaleDetails] = useState({}) // sale_id -> "2x Producto, 1x Otro"
  const [todaySalesTotal, setTodaySalesTotal] = useState(0)
  const [form, setForm] = useState({ type: 'egreso', category_id: '', amount: '', description: '', movement_date: today() })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)

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
      .order('created_at', { ascending: false })
      .limit(100)
    setCategories(cats || [])
    setMovements(movs || [])
    const egresoCats = (cats || []).filter((c) => c.type === 'egreso')
    if (egresoCats.length) setForm((f) => ({ ...f, category_id: f.category_id || egresoCats[0].id }))

    // Detalle de productos para movimientos generados por una venta POS
    const saleIds = [...new Set((movs || []).map((m) => m.related_sale_id).filter(Boolean))]
    if (saleIds.length) {
      const { data: items } = await supabase
        .from('sale_items')
        .select('sale_id, quantity, products(name)')
        .in('sale_id', saleIds)
      const details = {}
      for (const it of items || []) {
        const line = `${it.quantity}x ${it.products?.name || 'Producto'}`
        details[it.sale_id] = details[it.sale_id] ? `${details[it.sale_id]}, ${line}` : line
      }
      setSaleDetails(details)
    } else {
      setSaleDetails({})
    }

    // Total de ventas de hoy (todas las ventas, todos los empleados)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: todaySales } = await supabase
      .from('sales')
      .select('total')
      .gte('sold_at', startOfDay.toISOString())
    setTodaySalesTotal((todaySales || []).reduce((s, r) => s + Number(r.total), 0))
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

  function startEdit(m) {
    setEditingId(m.id)
    setEditForm({
      type: m.type,
      category_id: m.category_id,
      amount: m.amount,
      description: m.description || '',
      movement_date: m.movement_date,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function saveEdit(id) {
    await supabase
      .from('movements')
      .update({
        type: editForm.type,
        category_id: editForm.category_id,
        amount: Number(editForm.amount),
        description: editForm.description,
        movement_date: editForm.movement_date,
      })
      .eq('id', id)
    cancelEdit()
    loadData()
  }

  async function deleteMovement(id) {
    if (!window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return
    await supabase.from('movements').delete().eq('id', id)
    loadData()
  }

  const ingresos = movements.filter((m) => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0)
  const egresos = movements.filter((m) => m.type === 'egreso').reduce((s, m) => s + Number(m.amount), 0)
  const balance = ingresos - egresos

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Ventas de hoy" value={todaySalesTotal} color="text-mango-600" />
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
        <div className="space-y-2 text-sm max-h-[32rem] overflow-y-auto">
          {movements.map((m) => (
            <div key={m.id} className="border-b pb-2">
              {editingId === m.id ? (
                <div className="bg-mango-50 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: 'ingreso', category_id: '' })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${editForm.type === 'ingreso' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
                    >
                      Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: 'egreso', category_id: '' })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${editForm.type === 'egreso' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
                    >
                      Egreso
                    </button>
                  </div>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.filter((c) => c.type === editForm.type).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      type="date"
                      value={editForm.movement_date}
                      onChange={(e) => setEditForm({ ...editForm, movement_date: e.target.value })}
                      className="border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descripción"
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(m.id)}
                      className="flex-1 bg-mango-500 text-white py-1.5 rounded-lg text-xs font-medium"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-200 py-1.5 rounded-lg text-xs font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <div className="font-medium">
                      {m.related_sale_id
                        ? (saleDetails[m.related_sale_id] || 'Venta POS')
                        : (m.movement_categories?.name || 'Sin categoría')}
                    </div>
                    <div className="text-gray-400">
                      {formatDateTime(m.movement_date, m.created_at)}
                      {m.description ? ' · ' + m.description : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={m.type === 'ingreso' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {m.type === 'ingreso' ? '+' : '-'}${Number(m.amount).toLocaleString('es-CO')}
                    </div>
                    <button onClick={() => startEdit(m)} className="text-xs text-gray-400 hover:text-mango-600">✏️</button>
                    <button onClick={() => deleteMovement(m.id)} className="text-xs text-gray-400 hover:text-red-600">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!movements.length && <p className="text-gray-400">Aún no hay movimientos registrados.</p>}
        </div>
      </div>
    </div>
  )
}

function formatDateTime(movementDate, createdAt) {
  const datePart = new Date(movementDate + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  if (!createdAt) return datePart
  const timePart = new Date(createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>${value.toLocaleString('es-CO')}</p>
    </div>
  )
}
