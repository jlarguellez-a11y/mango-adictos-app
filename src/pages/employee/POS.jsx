import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function POS() {
  const { profile } = useAuth()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState([]) // {product_id, name, price, quantity}
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [todayTotal, setTodayTotal] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    const { data: prods } = await supabase.from('products').select('*').eq('active', true).order('name')
    setCategories(cats || [])
    setProducts(prods || [])
    if (cats?.length) setActiveCategory(cats[0].id)
    await loadTodayTotal()
  }

  async function loadTodayTotal() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('sales')
      .select('total')
      .eq('employee_id', profile.id)
      .gte('sold_at', startOfDay.toISOString())
    setTodayTotal((data || []).reduce((sum, r) => sum + Number(r.total), 0))
  }

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  async function confirmSale() {
    if (!cart.length) return
    setSaving(true)
    setMessage('')

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({ employee_id: profile.id, total, payment_method: paymentMethod })
      .select()
      .single()

    if (saleError) {
      setMessage('Error al registrar la venta: ' + saleError.message)
      setSaving(false)
      return
    }

    const items = cart.map((i) => ({
      sale_id: sale.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.price,
      subtotal: i.price * i.quantity,
    }))

    const { error: itemsError } = await supabase.from('sale_items').insert(items)

    if (itemsError) {
      setMessage('Venta creada pero hubo un error con los productos: ' + itemsError.message)
    } else {
      setMessage('✅ Venta registrada correctamente')
      setCart([])
      loadTodayTotal()
    }
    setSaving(false)
  }

  const visibleProducts = products.filter((p) => p.category_id === activeCategory)

  return (
    <div className="space-y-3">
      <div className="bg-mango-50 border border-mango-200 rounded-xl p-3 flex justify-between items-center">
        <span className="text-sm text-gray-600">🍧 Ventas de hoy</span>
        <span className="text-lg font-bold text-mango-600">${todayTotal.toLocaleString('es-CO')}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium ${
                activeCategory === c.id ? 'bg-mango-500 text-white' : 'bg-white border text-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visibleProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white rounded-xl border p-4 text-left hover:border-mango-400 hover:shadow transition"
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-mango-600 font-bold">${p.price.toLocaleString('es-CO')}</div>
            </button>
          ))}
          {!visibleProducts.length && (
            <p className="text-gray-400 col-span-full">No hay productos en esta categoría.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 h-fit sticky top-4">
        <h2 className="font-bold mb-3">Venta actual</h2>
        {!cart.length && <p className="text-sm text-gray-400">Agrega productos tocando las tarjetas.</p>}
        <div className="space-y-2 mb-3">
          {cart.map((i) => (
            <div key={i.product_id} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{i.name}</div>
                <div className="text-gray-400">${i.price.toLocaleString('es-CO')} c/u</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => changeQty(i.product_id, -1)} className="w-6 h-6 rounded bg-gray-100">−</button>
                <span>{i.quantity}</span>
                <button onClick={() => changeQty(i.product_id, 1)} className="w-6 h-6 rounded bg-gray-100">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <label className="text-xs text-gray-500">Método de pago</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        <div className="flex justify-between font-bold text-lg mb-3">
          <span>Total</span>
          <span>${total.toLocaleString('es-CO')}</span>
        </div>

        <button
          onClick={confirmSale}
          disabled={!cart.length || saving}
          className="w-full bg-mango-500 hover:bg-mango-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
        >
          {saving ? 'Guardando...' : 'Confirmar venta'}
        </button>
        {message && <p className="text-sm mt-2">{message}</p>}
      </div>
      </div>
    </div>
  )
}
