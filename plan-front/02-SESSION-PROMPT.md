# Prompt para iniciar la sesion de redesign

Copia y pega esto como primer mensaje en la nueva sesion:

---

```
Proyecto: /Users/soulkin/Documents/Ecommerce-Lucia/starbuy-store

Lee el plan en plan-front/ (3 archivos: 00-AUDIT.md, 01-MASTER-PLAN.md, 02-SESSION-PROMPT.md).

Vamos a hacer un REDISENO COMPLETO del admin panel (/admin/*).
El plan tiene 7 fases (Phase 0-6). Empezamos por Phase 0: Design Tokens & Theme System.

CONTEXTO:
- Next.js 16.2.2 + Tailwind CSS 4 + TypeScript
- 29 paginas de admin, todas con colores hardcodeados
- NO hay design system, NO hay light mode, NO hay componentes compartidos
- La tienda publica (storefront) NO se toca — solo el admin

FASE 0 — Lo que hay que hacer:
1. Crear CSS custom properties en globals.css para dark/light themes (--admin-bg, --admin-text, --admin-brand, etc.)
2. Mapear los tokens a clases de Tailwind (bg-admin, text-admin, border-admin)
3. Crear ThemeProvider con toggle system/dark/light + localStorage
4. Crear clases de tipografia (.admin-h1, .admin-h2, .admin-h3, etc.)
5. Agregar ThemeToggle al top bar del layout

REGLAS:
- NO tocar ninguna pagina todavia — solo crear la infraestructura
- Los tokens dark DEBEN mapear a los colores actuales (que nada cambie visualmente)
- Los tokens light son nuevos — elegir una paleta profesional clara
- Todo queda en src/styles/admin-tokens.css y componentes en src/components/admin/
- Al terminar, el toggle debe funcionar pero las paginas siguen con colores hardcodeados (eso se migra en Phase 2+)

Cuando termines Phase 0, commiteamos y pasamos a Phase 1 (Shared UI Components).
```

---

## Notas para la proxima sesion

- El dev server ya corre en `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login` con password `starbuy-admin-2026`
- Repo: https://github.com/TukiTukiSolutionsDevs/StarBuy_Commerce_Evolution_LCC
- Tailwind v4 usa `@theme` en CSS, NO `tailwind.config.ts` para design tokens
- El layout admin esta en `src/app/admin/layout.tsx` (372 lineas)
- Los colores actuales estan documentados en `plan-front/00-AUDIT.md`
