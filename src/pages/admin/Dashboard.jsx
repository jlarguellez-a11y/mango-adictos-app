import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const RANGE_OPTIONS = [
  { key: 'day', label: 'Por día (14 días)' },
  { key: 'week', label: 'Por semana (12 semanas)' },
  { key: 'month', label: 'Por mes (12 meses)' },
]

export default function Dashboard() {
  const [sales, setSales] = useState([])
  const [movements, setMovements] = useState([])
  const [range, setRange] = useState('day')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const since = new Date()
    since.setMonth(since.getMonth() - 12)

    const { data: salesData } = await supabase
      .from('sales')
      .select('*')
      .gte('sold_at', since.toISOString())
      .order('sold_at')

    const { data: movementsData } = await supabase
      .from('movements')
      .select('*, movement_categories(name)')
      .gte('movement_date', since.toISOString().slice(0, 10))

    setSales(salesData || [])
    setMovements(movementsData || [])
  }

  const chartData = useMemo(() => groupSales(sales, range), [sales, range])

  const totals = useMemo(() => {
    const ingresos = movements.filter((m) => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0)
    const egresos = movements.filter((m) => m.type === 'egreso').reduce((s, m) => s + Number(m.amount), 0)
    return { ingresos, egresos, balance: ingresos - egresos }
  }, [movements])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Ingresos totales" value={totals.ingresos} color="text-green-600" />
        <SummaryCard label="Egresos totales" value={totals.egresos} color="text-red-600" />
        <SummaryCard label="Balance" value={totals.balance} color={totals.balance >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Ventas</h2>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `$${Number(v).toLocaleString('es-CO')}`} />
            <Bar dataKey="total" fill="#ff7f0d" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>${value.toLocaleString('es-CO')}</p>
    </div>
  )
}

function groupSales(sales, range) {
  const buckets = {}

  for (const s of sales) {
    const d = new Date(s.sold_at)
    let key, label

    if (range === 'day') {
      key = d.toISOString().slice(0, 10)
      label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    } else if (range === 'week') {
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      key = weekStart.toISOString().slice(0, 10)
      label = 'Sem ' + weekStart.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`
      label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    }

    if (!buckets[key]) buckets[key] = { key, label, total: 0 }
    buckets[key].total += Number(s.total)
  }

  const limit = range === 'day' ? 14 : 12
  return Object.values(buckets)
    .sort((a, b) => (a.key > b.key ? 1 : -1))
    .slice(-limit)
}
