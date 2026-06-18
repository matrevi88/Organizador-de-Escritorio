# Melate Stats App — Documentación técnica

App web de estadísticas para los tres sorteos Melate (Melate clásico, Retro y Revanchita),
con base de datos Supabase self-hosted en VPS3 y scraper automático de resultados.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Fase 1 — Supabase self-hosted en VPS3](#3-fase-1--supabase-self-hosted-en-vps3)
4. [Fase 2 — Esquema de base de datos](#4-fase-2--esquema-de-base-de-datos)
5. [Fase 3 — Scraper de datos](#5-fase-3--scraper-de-datos)
6. [Fase 4 — Web App (frontend)](#6-fase-4--web-app-frontend)
7. [Fase 5 — Nginx (reverse proxy)](#7-fase-5--nginx-reverse-proxy)
8. [Dependencias](#8-dependencias)
9. [Orden de implementación](#9-orden-de-implementación)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Variantes de Melate](#11-variantes-de-melate)

---

## 1. Arquitectura general

```
VPS3
├── supabase/              ← Self-hosted via Docker Compose
│   ├── docker-compose.yml
│   ├── .env
│   └── volumes/           ← datos PostgreSQL persistentes
│
├── melate-scraper/        ← Script Node.js + cron
│   ├── src/scraper.ts     ← descarga resultados de pronosticos.gob.mx
│   ├── src/seed.ts        ← importa CSVs históricos (primera vez)
│   └── data/              ← CSVs históricos 5 años (3 variantes)
│
├── melate-app/            ← Web app (Vite + React + TS + Tailwind)
│   ├── src/
│   └── dist/              ← build estático servido por Nginx
│
└── nginx/
    └── melate.conf        ← reverse proxy → Supabase API + app estática
```

**Dominio sugerido:** `melate.sistemasymas.com`

| URL | Destino |
|-----|---------|
| `melate.sistemasymas.com` | App frontend (estática) |
| `melate.sistemasymas.com/api/` | Supabase Kong API Gateway |
| `melate.sistemasymas.com/studio/` | Supabase Studio (IP restringida) |

---

## 2. Estructura de carpetas

El proyecto vive en un monorepo propio, separado de DeskFlow:

```
melate-stats/
├── app/                   ← Frontend Vite + React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── scraper/               ← Actualización automática de datos
│   ├── src/
│   │   ├── scraper.ts
│   │   ├── seed.ts
│   │   └── supabase.ts
│   ├── data/
│   │   ├── melate.csv
│   │   ├── retro.csv
│   │   └── revanchita.csv
│   ├── cron.sh
│   └── package.json
│
├── supabase/              ← Config Docker + migraciones SQL
│   ├── docker-compose.yml
│   ├── .env.example
│   └── migrations/
│       ├── 001_schema.sql
│       ├── 002_views.sql
│       └── 003_seed_indexes.sql
│
├── nginx/
│   └── melate.conf
│
└── README.md
```

---

## 3. Fase 1 — Supabase self-hosted en VPS3

### Servicios Docker

| Servicio | Puerto interno | Función |
|----------|---------------|---------|
| PostgreSQL | 5432 | Base de datos |
| PostgREST | 3000 | API REST automática sobre PostgreSQL |
| GoTrue | 9999 | Autenticación JWT |
| Studio | 3001 | Panel de administración visual |
| Kong | 8000 | API Gateway (único punto de entrada externo) |
| Realtime | 4000 | WebSockets (opcional, para actualizaciones en vivo) |

### docker-compose.yml (esquema)

```yaml
version: '3.8'
services:
  db:
    image: supabase/postgres:15
    volumes:
      - ./volumes/db:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

  rest:
    image: postgrest/postgrest
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_JWT_SECRET: ${JWT_SECRET}

  auth:
    image: supabase/gotrue
    environment:
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_DB_DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/postgres

  studio:
    image: supabase/studio
    ports:
      - "3001:3000"

  kong:
    image: kong:2.8
    ports:
      - "8000:8000"
```

> Usar la configuración oficial completa de:
> https://github.com/supabase/supabase/tree/master/docker

### Pasos de instalación en VPS3

```bash
# 1. Clonar config oficial
git clone --depth 1 https://github.com/supabase/supabase

# 2. Copiar carpeta docker
cp -r supabase/docker /srv/supabase
cd /srv/supabase

# 3. Configurar variables
cp .env.example .env
# editar .env con contraseñas seguras

# 4. Levantar
docker compose up -d

# 5. Verificar
docker compose ps
```

---

## 4. Fase 2 — Esquema de base de datos

### Tabla principal: `sorteos`

```sql
CREATE TABLE sorteos (
  id             BIGSERIAL PRIMARY KEY,
  variante       TEXT NOT NULL CHECK (variante IN ('melate', 'retro', 'revanchita')),
  numero_sorteo  INTEGER NOT NULL,
  fecha          DATE NOT NULL,
  n1             SMALLINT NOT NULL,
  n2             SMALLINT NOT NULL,
  n3             SMALLINT NOT NULL,
  n4             SMALLINT NOT NULL,
  n5             SMALLINT NOT NULL,
  n6             SMALLINT NOT NULL,
  adicional      SMALLINT,          -- solo Melate clásico
  UNIQUE (variante, numero_sorteo)
);

CREATE INDEX idx_sorteos_variante ON sorteos(variante);
CREATE INDEX idx_sorteos_fecha    ON sorteos(fecha DESC);
```

### Vista materializada: `frecuencias`

Frecuencia de aparición de cada número por variante.

```sql
CREATE MATERIALIZED VIEW frecuencias AS
SELECT
  variante,
  num,
  COUNT(*)                                       AS apariciones,
  ROUND(
    COUNT(*)::numeric /
    (SELECT COUNT(*) FROM sorteos s2 WHERE s2.variante = s.variante) * 100,
    2
  )                                              AS porcentaje
FROM sorteos s,
  LATERAL (VALUES (n1),(n2),(n3),(n4),(n5),(n6)) AS t(num)
GROUP BY variante, num
ORDER BY variante, apariciones DESC;

CREATE UNIQUE INDEX ON frecuencias(variante, num);
```

### Vista materializada: `pares_frecuentes`

Los pares de números que más veces salieron juntos en el mismo sorteo.

```sql
CREATE MATERIALIZED VIEW pares_frecuentes AS
SELECT
  variante,
  a,
  b,
  COUNT(*) AS coincidencias
FROM sorteos s,
  LATERAL (
    SELECT v1.num AS a, v2.num AS b
    FROM (VALUES (n1),(n2),(n3),(n4),(n5),(n6)) v1(num),
         (VALUES (n1),(n2),(n3),(n4),(n5),(n6)) v2(num)
    WHERE v1.num < v2.num
  ) pares
GROUP BY variante, a, b
ORDER BY coincidencias DESC;

CREATE UNIQUE INDEX ON pares_frecuentes(variante, a, b);
```

### Vista materializada: `stats_generales`

Resumen estadístico global por variante.

```sql
CREATE MATERIALIZED VIEW stats_generales AS
SELECT
  variante,
  COUNT(*)                              AS total_sorteos,
  MIN(fecha)                            AS primer_sorteo,
  MAX(fecha)                            AS ultimo_sorteo,
  ROUND(AVG(n1+n2+n3+n4+n5+n6), 2)    AS suma_promedio,
  ROUND(STDDEV(n1+n2+n3+n4+n5+n6), 2) AS suma_desviacion,
  ROUND(AVG((n1+n2+n3+n4+n5+n6)/6.0), 2) AS media_numero
FROM sorteos
GROUP BY variante;
```

### Vista materializada: `rachas`

Cuántos sorteos consecutivos lleva sin salir cada número (por variante).

```sql
CREATE MATERIALIZED VIEW rachas AS
WITH ultimo AS (
  SELECT variante, MAX(numero_sorteo) AS ultimo_sorteo FROM sorteos GROUP BY variante
),
ultima_aparicion AS (
  SELECT
    s.variante,
    t.num,
    MAX(s.numero_sorteo) AS ultimo_en_que_salio
  FROM sorteos s,
    LATERAL (VALUES (n1),(n2),(n3),(n4),(n5),(n6)) AS t(num)
  GROUP BY s.variante, t.num
)
SELECT
  ua.variante,
  ua.num,
  u.ultimo_sorteo - ua.ultimo_en_que_salio AS sorteos_sin_salir
FROM ultima_aparicion ua
JOIN ultimo u ON u.variante = ua.variante
ORDER BY ua.variante, sorteos_sin_salir DESC;
```

### Refrescar vistas

Ejecutar después de cada importación de datos nuevos:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY frecuencias;
REFRESH MATERIALIZED VIEW CONCURRENTLY pares_frecuentes;
REFRESH MATERIALIZED VIEW CONCURRENTLY stats_generales;
REFRESH MATERIALIZED VIEW CONCURRENTLY rachas;
```

---

## 5. Fase 3 — Scraper de datos

### Fuente oficial

Pronósticos para la Asistencia Pública publica los resultados históricos en:

| Variante | URL de descarga |
|----------|----------------|
| Melate clásico | `https://pronosticos.gob.mx/Melate/...` |
| Melate Retro | `https://pronosticos.gob.mx/MelateRetro/...` |
| Melate Revanchita | `https://pronosticos.gob.mx/MelateRevanchita/...` |

> Verificar URLs actuales en el sitio oficial antes de implementar.

### `src/seed.ts` — Importación histórica (una sola vez)

```typescript
import { createClient } from '@supabase/supabase-js'
import { parse } from 'papaparse'
import { readFileSync } from 'fs'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

type Variante = 'melate' | 'retro' | 'revanchita'

async function seed(variante: Variante, file: string) {
  const csv = readFileSync(file, 'utf-8')
  const { data } = parse(csv, { header: true, skipEmptyLines: true })

  const rows = data.map((r: any) => ({
    variante,
    numero_sorteo: parseInt(r.CONCURSO),
    fecha:         r.FECHA,
    n1: parseInt(r.R1), n2: parseInt(r.R2), n3: parseInt(r.R3),
    n4: parseInt(r.R4), n5: parseInt(r.R5), n6: parseInt(r.R6),
    adicional: r.ADICIONAL ? parseInt(r.ADICIONAL) : null,
  }))

  const { error } = await supabase.from('sorteos').upsert(rows, {
    onConflict: 'variante,numero_sorteo',
  })
  if (error) throw error
  console.log(`✓ ${variante}: ${rows.length} registros importados`)
}

await seed('melate',      'data/melate.csv')
await seed('retro',       'data/retro.csv')
await seed('revanchita',  'data/revanchita.csv')
```

### `src/scraper.ts` — Actualización automática

```typescript
// Descarga solo los sorteos nuevos desde la última fecha registrada.
// Se ejecuta vía cron después de cada sorteo.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

const FUENTES = {
  melate:      'https://pronosticos.gob.mx/...',
  retro:       'https://pronosticos.gob.mx/...',
  revanchita:  'https://pronosticos.gob.mx/...',
}

async function actualizarVariante(variante: keyof typeof FUENTES) {
  // 1. Obtener el último sorteo registrado
  const { data: ultimo } = await supabase
    .from('sorteos')
    .select('numero_sorteo')
    .eq('variante', variante)
    .order('numero_sorteo', { ascending: false })
    .limit(1)
    .single()

  // 2. Descargar y parsear CSV oficial
  // 3. Filtrar solo sorteos más recientes que ultimo.numero_sorteo
  // 4. Insertar con upsert
  // 5. Refrescar vistas materializadas
}

for (const variante of Object.keys(FUENTES) as (keyof typeof FUENTES)[]) {
  await actualizarVariante(variante)
}
```

### `cron.sh` — Programación

```bash
#!/bin/bash
# Ejecutar después de cada sorteo:
# Melate y Revanchita: martes, jueves, domingo ~21:00
# Retro:               miércoles, sábado ~21:00

cd /srv/melate-scraper
node dist/scraper.js >> /var/log/melate-scraper.log 2>&1
```

```bash
# /etc/cron.d/melate
0 21 * * 2,4,0   root /srv/melate-scraper/cron.sh   # melate + revanchita
0 21 * * 3,6     root /srv/melate-scraper/cron.sh   # retro
```

---

## 6. Fase 4 — Web App (frontend)

### Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** — estilos
- **Recharts** — gráficas
- **@supabase/supabase-js** — cliente de datos
- **React Router v6** — navegación
- **date-fns** — formateo de fechas

### Pantallas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Dashboard | Resumen: último sorteo, top calientes/fríos, stats generales |
| `/frecuencias` | Frecuencias | Mapa de calor de todos los números + tabla ordenable |
| `/pares` | Pares frecuentes | Top 20 pares con más co-ocurrencias |
| `/tendencias` | Tendencias | Frecuencia mensual de números en los últimos 5 años |
| `/simulador` | Simulador | Genera combinaciones ponderadas por estadística histórica |
| `/mi-combinacion` | Mi Combinación | El usuario ingresa sus 6 números y ve su análisis |

**Selector de variante** siempre visible en el header:
```
[ Melate ]  [ Retro ]  [ Revanchita ]
```

### Estructura `src/`

```
src/
├── components/
│   ├── Header.tsx           ← navegación + selector de variante
│   ├── HeatMap.tsx          ← cuadrícula de números coloreada por frecuencia
│   ├── BarChart.tsx         ← top calientes / fríos (Recharts)
│   ├── PairMatrix.tsx       ← matriz visual de co-ocurrencia
│   ├── TrendLine.tsx        ← gráfica de línea temporal (Recharts)
│   ├── NumberPicker.tsx     ← selector de 6 números para "Mi Combinación"
│   └── StatCard.tsx         ← tarjeta de métrica simple
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Frecuencias.tsx
│   ├── Pares.tsx
│   ├── Tendencias.tsx
│   ├── Simulador.tsx
│   └── MiCombinacion.tsx
│
├── hooks/
│   ├── useVariante.ts       ← estado global de la variante seleccionada
│   ├── useFrecuencias.ts    ← query a vista `frecuencias`
│   ├── usePares.ts          ← query a vista `pares_frecuentes`
│   ├── useStats.ts          ← query a vista `stats_generales`
│   ├── useRachas.ts         ← query a vista `rachas`
│   └── useSorteos.ts        ← query a tabla `sorteos` (últimos N)
│
├── lib/
│   ├── supabase.ts          ← createClient con URL y anon key
│   └── simulador.ts         ← algoritmo de generación ponderada
│
├── types.ts                 ← tipos TypeScript compartidos
├── App.tsx
└── main.tsx
```

### Tipos TypeScript

```typescript
export type Variante = 'melate' | 'retro' | 'revanchita'

export interface Sorteo {
  id: number
  variante: Variante
  numero_sorteo: number
  fecha: string
  n1: number; n2: number; n3: number
  n4: number; n5: number; n6: number
  adicional: number | null
}

export interface Frecuencia {
  variante: Variante
  num: number
  apariciones: number
  porcentaje: number
}

export interface ParFrecuente {
  variante: Variante
  a: number
  b: number
  coincidencias: number
}

export interface StatsGenerales {
  variante: Variante
  total_sorteos: number
  primer_sorteo: string
  ultimo_sorteo: string
  suma_promedio: number
  suma_desviacion: number
  media_numero: number
}

export interface Racha {
  variante: Variante
  num: number
  sorteos_sin_salir: number
}
```

### Lógica del Simulador

```typescript
// lib/simulador.ts
// Genera una combinación de 6 números ponderada por frecuencia histórica.
// Los números más frecuentes tienen mayor probabilidad de ser seleccionados.

export function generarCombinacion(frecuencias: Frecuencia[]): number[] {
  const total = frecuencias.reduce((sum, f) => sum + f.apariciones, 0)
  const elegidos = new Set<number>()

  while (elegidos.size < 6) {
    let rand = Math.random() * total
    for (const f of frecuencias) {
      rand -= f.apariciones
      if (rand <= 0) {
        elegidos.add(f.num)
        break
      }
    }
  }

  return [...elegidos].sort((a, b) => a - b)
}
```

---

## 7. Fase 5 — Nginx (reverse proxy)

```nginx
# /etc/nginx/sites-available/melate.sistemasymas.com

server {
    listen 80;
    server_name melate.sistemasymas.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name melate.sistemasymas.com;

    ssl_certificate     /etc/letsencrypt/live/melate.sistemasymas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/melate.sistemasymas.com/privkey.pem;

    # App estática
    root /srv/melate-app/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Supabase API (Kong)
    location /api/ {
        proxy_pass         http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }

    # Supabase Studio — solo IPs autorizadas
    location /studio/ {
        allow TU.IP.FIJA;
        deny  all;
        proxy_pass http://localhost:3001/;
    }
}
```

**SSL con Let's Encrypt:**
```bash
certbot --nginx -d melate.sistemasymas.com
```

---

## 8. Dependencias

### Frontend (`app/package.json`)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "date-fns": "^3",
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "recharts": "^2"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5",
    "vite": "^5"
  }
}
```

### Scraper (`scraper/package.json`)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "papaparse": "^5"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/papaparse": "^5",
    "tsx": "^4",
    "typescript": "^5"
  }
}
```

---

## 9. Orden de implementación

### Semana 1 — Infraestructura

```
[ ] Instalar Docker + Docker Compose en VPS3
[ ] Levantar Supabase self-hosted (docker compose up)
[ ] Configurar dominio DNS → melate.sistemasymas.com
[ ] Instalar Nginx + SSL con certbot
[ ] Ejecutar migraciones SQL (001, 002, 003)
[ ] Correr seed.ts para importar CSVs históricos (5 años, 3 variantes)
[ ] Verificar datos en Supabase Studio
```

### Semana 2 — Datos y scraper

```
[ ] Implementar scraper.ts con URLs reales de pronosticos.gob.mx
[ ] Probar actualización incremental
[ ] Configurar cron en VPS3
[ ] Verificar refresco de vistas materializadas
```

### Semana 3 — Frontend (core)

```
[ ] Scaffold Vite + React + TS + Tailwind
[ ] Configurar cliente Supabase y tipos
[ ] Header con selector de variante
[ ] Dashboard (stats generales + top 5 calientes/fríos)
[ ] Página Frecuencias (HeatMap + tabla)
```

### Semana 4 — Frontend (avanzado) y deploy

```
[ ] Página Pares frecuentes
[ ] Página Tendencias (gráfica temporal)
[ ] Página Simulador
[ ] Página Mi Combinación
[ ] npm run build → copiar dist/ a /srv/melate-app/dist
[ ] Pruebas end-to-end
```

---

## 10. Variables de entorno

### Supabase (`.env` en `/srv/supabase/`)

```env
POSTGRES_PASSWORD=cambia_esto_por_algo_seguro
JWT_SECRET=cambia_esto_32_chars_minimo
ANON_KEY=generado_por_supabase
SERVICE_ROLE_KEY=generado_por_supabase
SITE_URL=https://melate.sistemasymas.com
```

### Scraper (`.env` en `/srv/melate-scraper/`)

```env
SUPABASE_URL=http://localhost:8000
SUPABASE_KEY=SERVICE_ROLE_KEY_aqui
```

### Frontend (`app/.env`)

```env
VITE_SUPABASE_URL=https://melate.sistemasymas.com/api
VITE_SUPABASE_ANON_KEY=ANON_KEY_aqui
```

---

## 11. Variantes de Melate

| Variante | Rango de números | Bola adicional | Días de sorteo |
|----------|-----------------|---------------|----------------|
| Melate clásico | 1 – 56 | Sí (1–56) | Martes, jueves, domingo |
| Melate Retro | 1 – 39 | No | Miércoles, sábado |
| Melate Revanchita | 1 – 56 | No | Martes, jueves, domingo |

> Fuente: Pronósticos para la Asistencia Pública (pronosticos.gob.mx)

---

*Documento generado para el proyecto Melate Stats — Sistemasymas*
