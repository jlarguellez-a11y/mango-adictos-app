# 🥭 Mango Adictos - App de contabilidad y ventas

App web (React + Supabase) para llevar la contabilidad del emprendimiento
de granizados **Mango Adictos**: ventas tipo POS, ingresos/egresos,
turnos de empleados y control de insumos.

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo (gratis).
2. Entra a **SQL Editor > New query**, pega TODO el contenido de
   `supabase/schema.sql` y ejecútalo. Esto crea las tablas, triggers,
   datos por defecto (categorías de ingresos/egresos e insumos) y
   las políticas de seguridad (RLS).
3. En **Project Settings > API** copia:
   - `Project URL`
   - `anon public key`

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Edita `.env` y pega tu URL y anon key de Supabase.

```bash
npm run dev
```

## 3. Crear tu primer usuario administrador

1. En Supabase ve a **Authentication > Users > Add user** y crea tu
   usuario (correo + contraseña). Al crearse, el trigger automático
   le asigna el rol `empleado` en la tabla `profiles`.
2. Ve a **Table Editor > profiles**, busca ese usuario y cambia la
   columna `role` de `empleado` a `admin`.
3. Ahora puedes iniciar sesión en la app con ese usuario y verás el
   panel de administrador.

Para crear empleados, repite el paso 1 (o deja que ellos se registren
si activas el registro público) y déjalos con rol `empleado`.

## 4. Desplegar (Vercel)

```bash
npm run build
```

Sube el repo a GitHub y conéctalo en [vercel.com](https://vercel.com).
Agrega las variables de entorno `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` en la configuración del proyecto en Vercel.

## Estructura

```
supabase/schema.sql     -> Todo el modelo de base de datos + seguridad
src/lib/supabaseClient.js
src/context/AuthContext.jsx   -> Sesión y perfil (rol) del usuario
src/components/Layout.jsx     -> Navegación según rol
src/pages/Login.jsx
src/pages/employee/
  POS.jsx        -> Registrar ventas (estilo punto de venta)
  Turno.jsx      -> Iniciar/cerrar turno, ver pago pendiente
  Insumos.jsx    -> Notificar insumo agotado
src/pages/admin/
  Dashboard.jsx  -> Gráficas de ventas (día/semana/mes) + balance
  Productos.jsx  -> CRUD de categorías y productos
  Finanzas.jsx   -> Registrar ingresos/egresos + balance
  Empleados.jsx  -> Turnos trabajados y pagos pendientes por empleado
  InsumosAdmin.jsx -> Alertas de insumos agotados
```

## Lógica de negocio ya implementada

- Cada venta POS genera automáticamente un **ingreso** en la
  categoría "VENTAS DEL DIA" (trigger en la base de datos).
- El pago de turno se calcula así: turno de referencia 2pm-7pm
  (5 horas) = $50.000. La tarifa por hora ($10.000) se aplica a las
  horas reales trabajadas en cada turno. Puedes ajustar la tarifa o
  el horario de referencia en la tabla `shift_settings`.
- Al marcar un turno como pagado desde el panel de admin, se crea
  automáticamente un **egreso** en la categoría "PAGO EMPLEADO".
- Las políticas de seguridad (RLS) impiden que un empleado vea
  finanzas, edite productos o vea turnos de otros compañeros.
