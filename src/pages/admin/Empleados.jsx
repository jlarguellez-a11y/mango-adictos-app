import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Empleados() {
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [selected, setSelected] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [hourlyRate, setHourlyRate] = useState('')
  const [rateSaved, setRateSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: emps } = await supabase.from('profiles').select('*').eq('role', 'empleado').order('full_name')
    const { data: shs } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time', { ascending: false })
    const { data: settings } = await supabase.from('shift_settings').select('hourly_rate').eq('id', 1).single()
    setEmployees(emps || [])
    setShifts(shs || [])
    setHourlyRate(settings?.hourly_rate ?? '')
  }

  async function saveHourlyRate(e) {
    e.preventDefault()
    if (!hourlyRate) return
    await supabase.from('shift_settings').update({ hourly_rate: Number(hourlyRate) }).eq('id', 1)
    setRateSaved(true)
    setTimeout(() => setRateSaved(false), 2000)
  }

  async function markPaid(shift) {
    const totalConBono = Number(shift.amount_to_pay || 0) + Number(shift.bonus || 0)
    await supabase.from('shifts').update({ paid: true }).eq('id', shift.id)
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
        amount: totalConBono,
        description: 'Pago turno' + (Number(shift.bonus) > 0 ? ' (incluye bonificación)' : ''),
        related_shift_id: shift.id,
        movement_date: new Date().toISOString().slice(0, 10),
      })
    }
    loadData()
  }

  function toLocalInput(dt) {
    if (!dt) return ''
    const d = new Date(dt)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function startEdit(s) {
    setEditingId(s.id)
    setEditForm({
      start_time: toLocalInput(s.start_time),
      end_time: toLocalInput(s.end_time),
      hours_worked: s.hours_worked ?? '',
      amount_to_pay: s.amount_to_pay ?? '',
      bonus: s.bonus ?? 0,
      paid: s.paid,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function saveEdit(id) {
    await supabase
      .from('shifts')
      .update({
        start_time: editForm.start_time ? new Date(editForm.start_time).toISOString() : null,
        end_time: editForm.end_time ? new Date(editForm.end_time).toISOString() : null,
        hours_worked: editForm.hours_worked === '' ? null : Number(editForm.hours_worked),
        amount_to_pay: editForm.amount_to_pay === '' ? null : Number(editForm.amount_to_pay),
        bonus: Number(editForm.bonus || 0),
        paid: editForm.paid,
      })
      .eq('id', id)
    cancelEdit()
    loadData()
  }

  async function deleteShift(id) {
    if (!window.confirm('¿Eliminar este turno? Esta acción no se puede deshacer.')) return
    await supabase.from('shifts').delete().eq('id', id)
    loadData()
  }

  function shiftsFor(empId) {
    return shifts.filter((s) => s.employee_id === empId)
  }

  function pendingTotal(empId) {
    return shiftsFor(empId)
      .filter((s) => s.end_time && !s.paid)
      .reduce((sum, s) => sum + Number(s.amount_to_pay || 0) + Number(s.bonus || 0), 0)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-1">💵 Tarifa por hora trabajada</h2>
        <p className="text-xs text-gray-400 mb-3">
          Este valor se multiplica automáticamente por las horas de cada turno para calcular el pago.
        </p>
        <form onSubmit={saveHourlyRate} className="flex gap-2 items-center">
          <span className="text-gray-500">$</span>
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-40"
          />
          <span className="text-sm text-gray-400">por hora</span>
          <button className="bg-mango-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Guardar
          </button>
          {rateSaved && <span className="text-green-600 text-sm">✅ Guardado</span>}
        </form>
      </div>

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
        <div className="space-y-2 text-sm max-h-[36rem] overflow-y-auto">
          {selected &&
            shiftsFor(selected).map((s) => (
              <div key={s.id} className="border-b pb-2">
                {editingId === s.id ? (
                  <div className="bg-mango-50 rounded-lg p-3 space-y-2">
                    <label className="text-xs text-gray-500">Inicio</label>
                    <input
                      type="datetime-local"
                      value={editForm.start_time}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <label className="text-xs text-gray-500">Fin</label>
                    <input
                      type="datetime-local"
                      value={editForm.end_time}
                      onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Horas</label>
                        <input
                          type="number"
                          step="0.25"
                          value={editForm.hours_worked}
                          onChange={(e) => setEditForm({ ...editForm, hours_worked: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Pago base</label>
                        <input
                          type="number"
                          value={editForm.amount_to_pay}
                          onChange={(e) => setEditForm({ ...editForm, amount_to_pay: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Bonificación</label>
                      <input
                        type="number"
                        value={editForm.bonus}
                        onChange={(e) => setEditForm({ ...editForm, bonus: e.target.value })}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={editForm.paid}
                        onChange={(e) => setEditForm({ ...editForm, paid: e.target.checked })}
                      />
                      Marcado como pagado
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(s.id)} className="flex-1 bg-mango-500 text-white py-1.5 rounded-lg text-xs font-medium">
                        Guardar
                      </button>
                      <button onClick={cancelEdit} className="flex-1 bg-gray-200 py-1.5 rounded-lg text-xs font-medium">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <div className="font-medium">{new Date(s.start_time).toLocaleDateString('es-CO')}</div>
                      <div className="text-gray-400">
                        {s.hours_worked != null ? `${s.hours_worked}h · ` : ''}
                        ${Number(s.amount_to_pay || 0).toLocaleString('es-CO')}
                        {Number(s.bonus) > 0 && ` + $${Number(s.bonus).toLocaleString('es-CO')} bono`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.end_time ? (
                        s.paid ? (
                          <span className="text-xs text-green-600 font-medium">Pagado</span>
                        ) : (
                          <button onClick={() => markPaid(s)} className="text-xs bg-mango-500 text-white px-3 py-1 rounded-full">
                            Marcar pagado
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-orange-500 font-medium">En curso</span>
                      )}
                      <button onClick={() => startEdit(s)} className="text-xs text-gray-400 hover:text-mango-600">✏️</button>
                      <button onClick={() => deleteShift(s.id)} className="text-xs text-gray-400 hover:text-red-600">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          {selected && !shiftsFor(selected).length && (
            <p className="text-gray-400">Este empleado no tiene turnos registrados.</p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
