# Mejora Storefront Público — Plan de Auditoría

> Cada página pública se audita visualmente y funcionalmente.
> Se compara contra tiendas Shopify profesionales.
> Se corrige: layout, imágenes, responsivo, UX, rendimiento.

---

## Bug Crítico Global Encontrado

**CSS `img { height: auto }` fuera de `@layer`** — sobreescribía Tailwind utilities.
El logo StarBuy.png (1536×1024, 2.1MB) se mostraba a tamaño nativo en el header,
cubriendo toda la página. FIXEADO: movido a `@layer base`.

---

## Estado General

| #   | Página               | Auditada | Mejorada | Notas                                                 |
| --- | -------------------- | -------- | -------- | ----------------------------------------------------- |
| 1   | Homepage             | NO       | NO       | Hero, categorías, productos, promo, trust, newsletter |
| 2   | Collections (index)  | NO       | NO       | Lista de colecciones                                  |
| 3   | Collections/[handle] | NO       | NO       | Grid de productos con filtros                         |
| 4   | Products/[handle]    | NO       | NO       | Product detail page                                   |
| 5   | Cart                 | NO       | NO       | Shopping cart                                         |
| 6   | Search               | NO       | NO       | Búsqueda de productos                                 |
| 7   | Account/Login        | NO       | NO       | Login de cuenta                                       |
| 8   | Account/Register     | NO       | NO       | Registro                                              |
| 9   | Account/Profile      | NO       | NO       | Perfil de usuario                                     |
| 10  | Account/Orders       | NO       | NO       | Historial de pedidos                                  |
| 11  | About                | NO       | NO       | Sobre nosotros                                        |
| 12  | Contact              | NO       | NO       | Formulario de contacto                                |
| 13  | Policies/[handle]    | NO       | NO       | Políticas legales                                     |
| 14  | Header + Nav         | NO       | NO       | Navegación principal                                  |
| 15  | Footer               | NO       | NO       | Pie de página                                         |

---

## Checklist por Página (vs Shopify profesional)

### Homepage

- [ ] Hero section claro y atractivo — CTA visible
- [ ] Product cards con imágenes reales de Shopify
- [ ] Categorías con imágenes o iconos bien presentados
- [ ] Promo banner legible
- [ ] Trust section profesional
- [ ] Newsletter funcional
- [ ] Responsive (mobile + desktop)
- [ ] Performance (<3s load)

### Product Detail

- [ ] Galería de imágenes funcional
- [ ] Precio + compare-at-price
- [ ] Selector de variantes (color, size)
- [ ] Add to cart funcional
- [ ] Descripción del producto
- [ ] Reviews section
- [ ] Related products

### Cart

- [ ] Lista de items con imágenes
- [ ] Actualizar cantidad / eliminar
- [ ] Subtotal + impuestos
- [ ] Checkout button funcional
- [ ] Cart vacío state

### Collections

- [ ] Grid de productos con filtros
- [ ] Sort (price, name, best selling)
- [ ] Responsive grid
- [ ] Breadcrumbs
