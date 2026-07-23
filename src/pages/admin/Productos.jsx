import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Productos() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newProduct, setNewProduct] = useState({ name: '', price: '', cost: '', category_id: '' })
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)

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

  function startEdit(p) {
    setEditingId(p.id)
    setEditForm({ name: p.name, price: p.price, cost: p.cost, category_id: p.category_id })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function saveEdit(id) {
    if (!editForm.name || !editForm.price || !editForm.category_id) return
    const { error } = await supabase
      .from('products')
      .update({
        name: editForm.name,
        price: Number(editForm.price),
        cost: Number(editForm.cost || 0),
        category_id: editForm.category_id,
      })
      .eq('id', id)
    if (error) setMessage('Error: ' + error.message)
    else {
      cancelEdit()
      loadData()
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      // probablemente tiene ventas asociadas (restricción de la base de datos)
      const confirmDeactivate = window.confirm(
        'No se puede eliminar porque ya tiene ventas registradas. ¿Quieres desactivarlo en su lugar (dejará de aparecer en el punto de venta)?'
      )
      if (confirmDeactivate) {
        await supabase.from('products').update({ active: false }).eq('id', product.id)
        loadData()
      }
    } else {
      loadData()
    }
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
        <div className="space-y-2 text-sm max-h-[36rem] overflow-y-auto">
          {products.map((p) => (
            <div key={p.id} className="border-b pb-2">
              {editingId === p.id ? (
                <div className="bg-mango-50 rounded-lg p-3 space-y-2">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="Nombre"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="border rounded-lg px-2 py-1.5 text-sm"
                      placeholder="Precio"
                    />
                    <input
                      type="number"
                      value={editForm.cost}
                      onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                      className="border rounded-lg px-2 py-1.5 text-sm"
                      placeholder="Costo"
                    />
                  </div>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(p.id)} className="flex-1 bg-mango-500 text-white py-1.5 rounded-lg text-xs font-medium">
                      Guardar
                    </button>
                    <button onClick={cancelEdit} className="flex-1 bg-gray-200 py-1.5 rounded-lg text-xs font-medium">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-gray-400">{p.categories?.name} · ${Number(p.price).toLocaleString('es-CO')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`text-xs px-3 py-1 rounded-full ${
                        p.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.active ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => startEdit(p)} className="text-xs text-gray-400 hover:text-mango-600">✏️</button>
                    <button onClick={() => deleteProduct(p)} className="text-xs text-gray-400 hover:text-red-600">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
