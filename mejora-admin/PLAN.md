# Mejora Admin — Plan de Auditoria y Mejora por Pagina

> Cada pagina se audita contra el admin real de Shopify.
> Se verifica: campos, formularios, listados, acciones, UX.
> Se mejora: formularios dinamicos, layout profesional, campos faltantes.

---

## Estado General

| #   | Pagina         | Auditada | Mejorada | Notas                                                                   |
| --- | -------------- | -------- | -------- | ----------------------------------------------------------------------- |
| 1   | Dashboard      | SI       | SI       | Headings fix, KPIs, charts, alerts — completo                           |
| 2   | Products       | SI       | SI       | Modal 2-col, tags chips, compare-at-price, preview desc, image auth fix |
| 3   | Inventory      | NO       | NO       | Pendiente                                                               |
| 4   | Collections    | NO       | NO       | Pendiente                                                               |
| 5   | Orders         | NO       | NO       | Pendiente                                                               |
| 6   | Orders/[id]    | NO       | NO       | Pendiente                                                               |
| 7   | Customers      | NO       | NO       | Pendiente                                                               |
| 8   | Customers/[id] | NO       | NO       | Pendiente                                                               |
| 9   | Discounts      | NO       | NO       | Pendiente                                                               |
| 10  | Activity Log   | NO       | NO       | Pendiente                                                               |
| 11  | Automations    | NO       | NO       | Pendiente                                                               |
| 12  | Market Intel   | SI       | SI       | Progress bar, scores, color fix, search modes                           |
| 13  | Settings       | SI       | SI       | iOS toggles, API keys, search modes, guides                             |
| 14  | Login          | NO       | NO       | Pendiente                                                               |

---

## Metodologia por Pagina

Para cada pagina:

1. **Screenshot** — capturar estado actual
2. **Snapshot** — listar todos los elementos de la UI
3. **Comparar con Shopify** — verificar campos faltantes vs Shopify Admin real
4. **Listar issues** — bugs, UX problemas, campos faltantes
5. **Implementar mejoras** — formularios dinamicos, layout, campos
6. **Verificar** — TypeScript check + visual check
7. **Commit** — push a GitHub

---

## 3. Inventory

### Que debe tener (segun Shopify)

- [ ] Lista de productos con niveles de stock por location
- [ ] Busqueda por producto
- [ ] Filtro por estado (in stock, low stock, out of stock)
- [ ] Edicion inline de cantidades
- [ ] Historial de ajustes de inventario
- [ ] Bulk update de cantidades
- [ ] Alertas de bajo stock configurables
- [ ] Export/import CSV

### Que revisar

- Campos: SKU, barcode, tracked, quantity, location
- Formulario de ajuste: reason, quantity delta, note
- Vista: tabla con sorting por columnas

---

## 4. Collections

### Que debe tener (segun Shopify)

- [ ] Lista de colecciones (manual + automaticas)
- [ ] Crear coleccion manual o por reglas (automated)
- [ ] Agregar/remover productos de coleccion
- [ ] Imagen de coleccion
- [ ] SEO fields (title, description, URL handle)
- [ ] Ordenar productos dentro de coleccion
- [ ] Condiciones para colecciones automaticas

### Que revisar

- Modal de creacion con todos los campos
- Drag & drop para reordenar productos
- Preview de la coleccion

---

## 5. Orders

### Que debe tener (segun Shopify)

- [ ] Lista de pedidos con filtros (unfulfilled, paid, refunded, etc.)
- [ ] Busqueda por numero, cliente, email
- [ ] Vista de detalle del pedido
- [ ] Fulfill order (marcar como enviado + tracking number)
- [ ] Refund (parcial o total)
- [ ] Cancel order
- [ ] Timeline de eventos del pedido
- [ ] Notas internas
- [ ] Shipping labels (info)
- [ ] Print packing slip

### Que revisar

- Detalle: line items, shipping address, billing, payment status
- Acciones: fulfill, refund, cancel con confirmacion
- Timeline del pedido

---

## 6. Orders/[id] — Detalle

### Que debe tener

- [ ] Header con # de orden, fecha, status badges
- [ ] Line items (producto, variante, cantidad, precio)
- [ ] Subtotal, descuentos, impuestos, shipping, total
- [ ] Informacion del cliente (nombre, email, telefono)
- [ ] Direccion de envio + billing
- [ ] Payment status + metodo de pago
- [ ] Fulfillment status + tracking
- [ ] Timeline de eventos
- [ ] Notas internas
- [ ] Acciones: Fulfill, Refund, Cancel, Print

### Formularios

- Fulfill modal: tracking number, carrier, notify customer
- Refund modal: line items seleccionables, cantidad, reason, restock toggle
- Cancel modal: reason, restock, notify, refund toggle

---

## 7. Customers

### Que debe tener (segun Shopify)

- [ ] Lista con nombre, email, orders, total spent
- [ ] Busqueda por nombre, email, telefono
- [ ] Filtros (new, returning, has orders, no orders)
- [ ] Crear cliente
- [ ] Tags de cliente
- [ ] Notas

### Que revisar

- Campos Shopify: firstName, lastName, email, phone, acceptsMarketing, tags, note, addresses
- Formulario de creacion/edicion completo

---

## 8. Customers/[id] — Detalle

### Que debe tener

- [ ] Info del cliente (nombre, email, phone, created, orders count, total spent)
- [ ] Lista de pedidos del cliente
- [ ] Direcciones (default + adicionales)
- [ ] Tags editables
- [ ] Notas
- [ ] Timeline de actividad
- [ ] Acciones: editar, eliminar

---

## 9. Discounts

### Que debe tener (segun Shopify)

- [ ] Lista de descuentos activos/expirados/programados
- [ ] Crear descuento por codigo
- [ ] Crear descuento automatico
- [ ] Tipos: percentage, fixed amount, free shipping, buy X get Y
- [ ] Condiciones: min purchase, min quantity, customer eligibility
- [ ] Limites: total uses, one per customer
- [ ] Fechas: start, end
- [ ] Productos/colecciones aplicables

### Formulario de creacion

- Tipo de descuento (4 tipos)
- Valor (% o $)
- Codigo o automatico
- Condiciones
- Limites
- Fechas
- Productos/colecciones aplicables
- Customer eligibility

---

## 10. Activity Log

### Que debe tener

- [ ] Lista de eventos recientes
- [ ] Filtros por tipo (order, product, customer, system)
- [ ] Detalle expandible de cada evento
- [ ] Auto-refresh
- [ ] Indicador de eventos nuevos

### Que revisar

- Conectado a webhooks reales
- Formateo de datos segun tipo de evento

---

## 11. Automations

### Que debe tener

- [ ] Lista de reglas con toggle enable/disable
- [ ] Crear regla con trigger, conditions, actions
- [ ] Prebuilt rules (templates)
- [ ] Historial de ejecucion por regla
- [ ] Logs de errores

### Que revisar

- Modal de creacion completo y intuitivo
- Preview de lo que la regla haria

---

## 14. Login

### Que debe tener

- [ ] Formulario limpio y profesional
- [ ] Logo de StarBuy
- [ ] Campo de password
- [ ] Boton de login
- [ ] Error handling (password incorrecto)
- [ ] Loading state
- [ ] Responsive

---

## Notas Generales

### Fix global aplicado

- Todos los headings h1-h6 usan `style={{ color: '#ffffff' }}` en vez de `text-white` clase
  (por CSS global override de `--color-text-primary`)

### Patron de formularios

Todos los modales deben seguir el patron de Products:

- Layout 2 columnas en desktop (grid lg:grid-cols-3)
- Cards por seccion con header uppercase
- Inputs: bg-[#0a0f1e] border-[#1f2d4e] rounded-xl
- Tags como chips
- Preview para HTML
- Confirmacion antes de acciones destructivas

### Design tokens

- Background: #0a0f1e (page), #111827 (cards), #0d1526 (sidebar)
- Borders: #1f2d4e
- Text: #ffffff (headings), #e5e7eb (body), #9ca3af (labels), #6b7280 (secondary), #374151 (muted)
- Accent: #d4a843 (gold), #10b981 (green), #ef4444 (red), #6366f1 (purple)
- Rounded: rounded-2xl (cards), rounded-xl (inputs/buttons)
