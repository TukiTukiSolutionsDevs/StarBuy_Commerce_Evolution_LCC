# Mejora Admin — Plan de Auditoria y Mejora por Pagina

> Cada pagina se audita contra el admin real de Shopify.
> Se verifica: campos, formularios, listados, acciones, UX.
> Se mejora: formularios dinamicos, layout profesional, campos faltantes.

---

## Estado General

| #   | Pagina         | Auditada | Mejorada | Notas                                                                                                                       |
| --- | -------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dashboard      | SI       | SI       | Headings fix, KPIs, charts, alerts — completo                                                                               |
| 2   | Products       | SI       | SI       | Modal 2-col, tags chips, compare-at-price, preview desc, image auth fix                                                     |
| 3   | Inventory      | SI       | SI       | SKU/barcode cols, tracked indicator, adjustment modal w/reason+note, bulk update, CSV export, location filter, incoming qty |
| 4   | Collections    | SI       | SI       | Search, sort, type badges (Manual/Smart), SEO fields, 2-col modal, smart rules editor, sort order, published dot            |
| 5   | Orders         | SI       | SI       | +Paid tab, sort, items col, tags, notes icon, risk badge, CSV export                                                        |
| 6   | Orders/[id]    | SI       | SI       | +9 GQL fields, billing, SKU/price cols, tracking, timeline, print, modals mejorados                                         |
| 7   | Customers      | SI       | SI       | Create modal, filter pills, marketing col, note indicator, +acceptsMarketing/note GQL                                       |
| 8   | Customers/[id] | SI       | SI       | Notes editor, marketing toggle, full addresses (7 new fields), address dedup                                                |
| 9   | Discounts      | SI       | SI       | Status filters, search, copy code, edit modal, onePerCustomer, fixed amount fix, stats                                      |
| 10  | Activity Log   | SI       | SI       | Search w/highlight, date range filter, event count stats, smart empty state                                                 |
| 11  | Automations    | SI       | SI       | Search bar (name, desc, trigger), search empty state                                                                        |
| 12  | Market Intel   | SI       | SI       | Progress bar, scores, color fix, search modes                                                                               |
| 13  | Settings       | SI       | SI       | iOS toggles, API keys, search modes, guides                                                                                 |
| 14  | Login          | SI       | SI       | Show/hide password toggle, accessibility label                                                                              |

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

- [x] Lista de productos con niveles de stock por location
- [x] Busqueda por producto, variante, SKU
- [x] Filtro por estado (in stock, low stock, out of stock)
- [x] Edicion de cantidades (modal profesional con preview en vivo)
- [ ] Historial de ajustes de inventario (API limited — Shopify no expone history via GraphQL)
- [x] Bulk update de cantidades (checkboxes + floating action bar)
- [x] Alertas de bajo stock (collapsible section, out + low)
- [x] Export CSV (descarga filtered data)

### Que se reviso

- [x] Campos: SKU (columna en tabla), barcode (tooltip en SKU), tracked (badge "Not tracked"), quantity, location
- [x] Formulario de ajuste: reason dropdown (10 opciones), quantity set/adjust con preview, note textarea
- [x] Vista: tabla con sorting por 7 columnas (product, SKU, variant, available, on_hand, committed, incoming)
- [x] Location filter dropdown (se muestra cuando hay >1 location)
- [x] Incoming quantity column (purple highlight para >0)

### Archivos modificados

- `src/lib/shopify/admin/tools/inventory.ts` — GraphQL query + InventoryAdjustmentReason type + reason param
- `src/app/api/admin/inventory/route.ts` — SKU/barcode/tracked in response + reason/note in PATCH
- `src/app/admin/inventory/page.tsx` — Full rewrite (1045 → 1559 lines)

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
