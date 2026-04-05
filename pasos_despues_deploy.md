# Pasos para completar el deploy — StarBuy Commerce

## ESTADO: LISTO PARA DEPLOY

Todas las credenciales estan completas. Ya no se necesita Shopify Partners.
El Admin API usa el token directo (Custom App) `shpat_...` en vez de OAuth.

---

## Crear el archivo `.env.production` (en el servidor)

```bash
cat > .env.production << 'EOF'
SHOPIFY_STORE_DOMAIN=<your-store>.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=<storefront-public-token>
SHOPIFY_API_VERSION=2024-01
SHOPIFY_CLIENT_ID=<client-id-from-dev-dashboard>
SHOPIFY_CLIENT_SECRET=<client-secret-from-dev-dashboard>
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=<your-store>.myshopify.com
NEXT_PUBLIC_SHOPIFY_API_VERSION=2024-01
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=<storefront-public-token>
ADMIN_CHAT_PASSWORD=<your-admin-password>
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
```

---

## ORDEN DE EJECUCION (en el servidor 149.34.48.16)

### Paso 1: Clonar el repo y crear el .env.production
```bash
git clone <repo-url> /opt/starbuy
cd /opt/starbuy
# Crear .env.production (ver arriba)
```

### Paso 2: Obtener certificados SSL
```bash
./scripts/init-ssl.sh
```
Esto levanta un nginx temporal, pide los certificados a Let's Encrypt para:
- `starbuyevolucion.com`
- `www.starbuyevolucion.com`
- `ai-agent.starbuyevolucion.com`

### Paso 3: Levantar todo
```bash
docker compose up -d --build
```

### Paso 4: Verificar
```bash
# Ver que los 3 contenedores esten corriendo
docker compose ps

# Ver logs si algo falla
docker compose logs -f app
docker compose logs -f nginx

# Probar los endpoints
curl -I https://starbuyevolucion.com
curl -I https://ai-agent.starbuyevolucion.com/admin
```

---

## DNS (ya configurado en Cloudflare)

| Tipo | Nombre | Valor | Proxy |
|------|--------|-------|-------|
| A | starbuyevolucion.com | 149.34.48.16 | DNS only |
| A | www | 149.34.48.16 | DNS only |
| A | ai-agent | 149.34.48.16 | DNS only |

---

## ARQUITECTURA DEL DEPLOY

```
Internet
  |
  +-- starbuyevolucion.com --------+
  +-- www.starbuyevolucion.com ----+
  |                                v
  |                     +----------------+
  |                     |  Nginx :443    |---- SSL (Let's Encrypt)
  |                     |  Nginx :80     |---- Redirect -> HTTPS
  |                     +-------+--------+
  |                             |
  |                     +-------v--------+
  |                     |  Next.js       |
  |                     |  :3000         |
  |                     |  (storefront)  |
  |                     +----------------+
  |
  +-- ai-agent.starbuyevolucion.com
                        |
                        v
                  Solo rutas /admin
                  y /api/admin
```

---

## RENOVACION SSL (automatica)

El contenedor `certbot` renueva automaticamente cada 12 horas.
Los certificados de Let's Encrypt duran 90 dias.

---

## DESPUES DEL DEPLOY

- [ ] Verificar que la tienda carga productos desde Shopify
- [ ] Verificar login en `/admin` con password `starbuy-admin-2026`
- [ ] Verificar que el chatbot AI responde en el admin
- [ ] Considerar activar Cloudflare Proxy (icono naranja) para proteccion DDoS
- [ ] Configurar alertas de renovacion SSL por si certbot falla
