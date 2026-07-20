import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Empleados() {
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: emps } = await supabase.from('profiles').select('*').eq('role', 'empleado').order('full_name')
    const { data: shs } = await supabase
      .from('shifts')
      .select('*')
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
    setEmployees(emps || [])
    setShifts(shs || [])
  }

  async function markPaid(shift) {
    await supabase.from('shifts').update({ paid: true }).eq('id', shift.id)
    // registra el pago como egreso automáticamente
    const { data: cat } = await supabase
      .from('movement_categories')
      .select('id')
      .eq('type', 'egreso')
      .eq('name', 'PAGO EMPLEADO')
      .single()
    if (cat) {
      await supabase.from('movements').insert({
        type: 'egreso',
        category_id: cat.id,
        amount: shift.amount_to_pay,
        description: 'Pago turno',
        related_shift_id: shift.id,
        movement_date: new Date().toISOString().slice(0, 10),
      })
    }
    loadData()
  }

  function shiftsFor(empId) {
    return shifts.filter((s) => s.employee_id === empId)
  }

  function pendingTotal(empId) {
    return shiftsFor(empId)
      .filter((s) => !s.paid)
      .reduce((sum, s) => sum + Number(s.amount_to_pay || 0), 0)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Empleados</h2>
        <div className="space-y-2">
          {employees.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e.id)}
              className={`w-full text-left p-3 rounded-lg border flex justify-between items-center ${
                selected === e.id ? 'border-mango-400 bg-mango-50' : ''
              }`}
            >
              <span className="font-medium">{e.full_name}</span>
              <span className="text-sm text-orange-500 font-semibold">
                ${pendingTotal(e.id).toLocaleString('es-CO')} pendiente
              </span>
            </button>
          ))}
          {!employees.length && <p className="text-gray-400 text-sm">No hay empleados registrados aún.</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Turnos {selected ? '' : '(selecciona un empleado)'}</h2>
        <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
          {selected &&
            shiftsFor(selected).map((s) => (
              <div key={s.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{new Date(s.start_time).toLocaleDateString('es-CO')}</div>
                  <div className="text-gray-400">{s.hours_worked}h · ${Number(s.amount_to_pay).toLocaleString('es-CO')}</div>
                </div>
                {s.paid ? (
                  <span className="text-xs text-green-600 font-medium">Pagado</span>
                ) : (
                  <button
                    onClick={() => markPaid(s)}
                    className="text-xs bg-mango-500 text-white px-3 py-1 rounded-full"
                  >
                    Marcar pagado
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
