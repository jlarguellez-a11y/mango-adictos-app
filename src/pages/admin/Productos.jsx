import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Productos() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newProduct, setNewProduct] = useState({ name: '', price: '', cost: '', category_id: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: cats } = await supabase.from('categories').select('*').order('name')
    const { data: prods } = await supabase.from('products').select('*, categories(name)').order('name')
    setCategories(cats || [])
    setProducts(prods || [])
    if (cats?.length && !newProduct.category_id) {
      setNewProduct((p) => ({ ...p, category_id: cats[0].id }))
    }
  }

  async function addCategory(e) {
    e.preventDefault()
    if (!newCategory.trim()) return
    const { error } = await supabase.from('categories').insert({ name: newCategory.trim() })
    if (error) setMessage('Error: ' + error.message)
    else {
      setNewCategory('')
      loadData()
    }
  }

  async function addProduct(e) {
    e.preventDefault()
    if (!newProduct.name || !newProduct.price || !newProduct.category_id) return
    const { error } = await supabase.from('products').insert({
      name: newProduct.name,
      price: Number(newProduct.price),
      cost: Number(newProduct.cost || 0),
      category_id: newProduct.category_id,
    })
    if (error) setMessage('Error: ' + error.message)
    else {
      setNewProduct({ name: '', price: '', cost: '', category_id: newProduct.category_id })
      loadData()
    }
  }

  async function toggleActive(product) {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    loadData()
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-bold mb-3">Nueva categoría</h2>
          <form onSubmit={addCategory} className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ej: Granizados"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button className="bg-mango-500 text-white px-4 rounded-lg font-medium">Agregar</button>
          </form>
          <ul className="mt-3 text-sm space-y-1">
            {categories.map((c) => (
              <li key={c.id} className="text-gray-600">• {c.name}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-bold mb-3">Nuevo producto</h2>
          <form onSubmit={addProduct} className="space-y-2">
            <input
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Nombre del producto"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                placeholder="Precio venta"
                type="number"
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={newProduct.cost}
                onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                placeholder="Costo (opcional)"
                type="number"
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <select
              value={newProduct.category_id}
              onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="w-full bg-mango-500 text-white py-2 rounded-lg font-medium">
              Agregar producto
            </button>
          </form>
          {message && <p className="text-sm text-red-500 mt-2">{message}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-bold mb-3">Productos existentes</h2>
        <div className="space-y-2 text-sm">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-gray-400">{p.categories?.name} · ${Number(p.price).toLocaleString('es-CO')}</div>
              </div>
              <button
                onClick={() => toggleActive(p)}
                className={`text-xs px-3 py-1 rounded-full ${
                  p.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {p.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
