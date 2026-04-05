# StarBuy Commerce Evolution LLC — App Review 2026

## Estado actual: EN PRODUCCION

- **Storefront**: https://starbuyevolucion.com (200 OK)
- **Admin Panel**: https://ai-agent.starbuyevolucion.com/admin
- **Admin Password**: `starbuy-admin-2026`
- **Servidor**: VPS 149.34.48.16 (2GB RAM, 4GB swap)

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 16.2.2 (App Router, RSC) |
| Runtime | Node.js 22 Alpine |
| Ecommerce | Shopify Storefront API + Admin API |
| Auth Admin | Cookie-based (base64 token) |
| Reverse Proxy | Nginx (compartido con JuliaCafe) |
| SSL | Let's Encrypt (auto-renew via Certbot) |
| Contenedores | Docker Compose |
| DNS | Cloudflare (DNS only, sin proxy) |

---

## Arquitectura de Deploy

```
Internet
  |
  +-- starbuyevolucion.com --------+
  +-- www.starbuyevolucion.com ----+     (redirect -> apex)
  |                                v
  |         +----------------------------------+
  |         |  toroloco-gateway (nginx:alpine)  |
  |         |  Puertos 80/443                   |
  |         |  SSL: Let's Encrypt               |
  |         |  Shared with JuliaCafe            |
  |         +---------------+------------------+
  |                         |
  |                +--------v--------+
  |                |  starbuy-app    |
  |                |  Next.js :3000  |
  |                |  standalone     |
  |                +-----------------+
  |
  +-- ai-agent.starbuyevolucion.com
                    |
                    v
              Todo pasa a Next.js
              Auth por middleware (cookie)
```

StarBuy comparte el gateway nginx con JuliaCafe (juliacafe.com.pe).
Ambas apps corren en la misma VPS sin conflictos de puertos.

---

## Shopify API — Autenticacion

Desde Enero 2026, Shopify usa OAuth `client_credentials` exclusivamente.
Ya no existen tokens estaticos.

### Flujo:
1. POST `https://{store}/admin/oauth/access_token`
2. Body: `client_id`, `client_secret`, `grant_type=client_credentials`
3. Respuesta: `access_token` + `expires_in` (24h)
4. Token se auto-renueva 5 min antes de expirar (singleton en `token.ts`)

### Credenciales configuradas:
| Variable | Origen |
|----------|--------|
| `SHOPIFY_STORE_DOMAIN` | starbuy-78634.myshopify.com |
| `SHOPIFY_CLIENT_ID` | Dev Dashboard (5d37188f...) |
| `SHOPIFY_CLIENT_SECRET` | Dev Dashboard (shpss_...) |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Storefront API public token |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` | Mismo token, expuesto al client |

### Scopes necesarios en la app de Shopify:
`read_products`, `write_products`, `read_customers`, `write_customers`,
`read_orders`, `write_orders`, `read_inventory`, `read_content`,
`read_themes`, `read_fulfillments`

---

## Estructura de la App

### Storefront (publico)
- `/` — Homepage con hero, featured products, newsletter
- `/collections/[handle]` — Paginas de coleccion
- `/products/[handle]` — Detalle de producto
- `/policies/[handle]` — Politicas (privacy, terms, refund, shipping)
- `/about` — Acerca de
- `/contact` — Contacto
- `/account` — Cuenta de usuario

### Admin Panel (protegido)
- `/admin` — Dashboard (productos, colecciones, inventario)
- `/admin/products` — CRUD de productos
- `/admin/collections` — Gestion de colecciones
- `/admin/orders` — Ordenes
- `/admin/customers` — Clientes
- `/admin/settings` — Configuracion y estado de APIs
- AI Chatbot — Widget flotante en sidebar

### API Routes
- `/api/admin/auth` — Login/logout admin
- `/api/admin/products` — CRUD productos via Admin API
- `/api/admin/collections` — Colecciones
- `/api/admin/orders` — Ordenes (futuro)
- `/api/admin/customers` — Clientes (futuro)
- `/api/admin/stats` — Stats del dashboard
- `/api/admin/chat` — AI chatbot endpoint
- `/api/admin/settings` — Config del sistema
- `/api/admin/inventory` — Gestion de inventario

---

## Cambios realizados en este deploy

### 1. Configuracion de dominio y SSL
- DNS configurado en Cloudflare (3 registros A)
- Certificados SSL obtenidos via Let's Encrypt
- Dominios: starbuyevolucion.com, www, ai-agent

### 2. Integracion con gateway existente
- StarBuy integrado al nginx gateway de JuliaCafe (toroloco-gateway)
- starbuy-app conectado a red `juliacafe_toroloco-net`
- Eliminados contenedores redundantes (starbuy-nginx, starbuy-certbot)
- Puertos 80/443 compartidos sin conflictos

### 3. Shopify Auth — OAuth client_credentials
- `token.ts` implementa flujo OAuth completo
- Singleton con auto-refresh y mutex para requests concurrentes
- Eliminada dependencia de tokens estaticos (shpat_)

### 4. Mapeo correcto de credenciales
- `shpss_` = Client Secret (NO Storefront Private Token)
- `f5a45ad...` = Storefront API public token
- `5d37188f...` = Client ID del Dev Dashboard

### 5. Fix: Dashboard no cargaba datos
- Dashboard era Server Component pre-renderizado en build time
- Agregado `export const dynamic = 'force-dynamic'` para render en runtime

### 6. Fix: 404 errors en admin por prefetch del storefront
- Root layout renderizaba Header/Footer con links del storefront
- Next.js prefetcheaba esas rutas aunque el admin las tapaba con z-50
- Creado `StorefrontShell.tsx` — componente client que oculta Header/Footer en rutas /admin

### 7. Storefront API fallback
- `client.ts` ahora usa `X-Shopify-Storefront-Access-Token` (public) como fallback cuando no hay private token

---

## Archivos clave modificados

| Archivo | Cambio |
|---------|--------|
| `src/lib/shopify/admin/token.ts` | OAuth client_credentials flow |
| `src/lib/shopify/admin/client.ts` | Admin GraphQL client |
| `src/lib/shopify/client.ts` | Storefront API con fallback de auth header |
| `src/lib/ai/config.ts` | Tipos actualizados para OAuth |
| `src/app/layout.tsx` | Usa StorefrontShell en vez de Header/Footer directo |
| `src/components/layout/StorefrontShell.tsx` | NUEVO — condiciona Header/Footer por ruta |
| `src/app/admin/page.tsx` | force-dynamic para dashboard |
| `src/app/admin/settings/page.tsx` | UI actualizada para OAuth |
| `docker-compose.yml` | Puertos 80:80/443:443, sin CLIENT_ID/SECRET en build args (van en runtime) |
| `Dockerfile` | Build args actualizados |
| `nginx/conf.d/default.conf` | Config original (no se usa, gateway maneja todo) |
| `scripts/init-ssl.sh` | Script de obtencion de SSL (no se uso, se obtuvo via gateway) |
| `pasos_despues_deploy.md` | Guia de deploy |

---

## Contenedores en produccion

```
starbuy-app         — Next.js standalone (healthy)
toroloco-gateway    — Nginx reverse proxy (shared)
```

Los contenedores `starbuy-nginx` y `starbuy-certbot` fueron eliminados
porque el gateway de JuliaCafe maneja SSL y reverse proxy para ambos sitios.

---

## Importante: reconexion de red

Cada vez que `starbuy-app` se reinicia, hay que reconectarlo a la red de Julia:
```bash
docker network connect juliacafe_toroloco-net starbuy-app
```

---

## Proximos pasos

- [ ] Crear policies en Shopify (Privacy, Terms, Refund, Shipping)
- [ ] Crear colecciones: deals, trending, new-arrivals
- [ ] Publicar productos al canal Headless (publishablePublish)
- [ ] Configurar Shopify MCP para gestion desde Claude Code
- [ ] Considerar Cloudflare Proxy para DDoS protection
- [ ] Automatizar reconexion de red post-restart
