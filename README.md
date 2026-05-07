# CABALLEROS TROCA 🗂⚽

App para cruzar figuritas del Mundial 2026 entre amigos.

## Setup

### 1. Supabase — correr el SQL

Ir a [Supabase](https://supabase.com) → tu proyecto → **SQL Editor** y correr el contenido de `supabase-setup.sql`.

### 2. Variables de entorno en Vercel

En el dashboard de Vercel, ir a tu proyecto → **Settings → Environment Variables** y agregar:

```
NEXT_PUBLIC_SUPABASE_URL=https://larqxmgyutqiktsforgz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Deploy

```bash
git init
git add .
git commit -m "init caballeros troca"
# conectar repo a Vercel
```

## Uso

- **`/`** — Vista pública: todos ven los matches automáticos
- **`/admin`** — Panel admin con contraseña `Sacade2006`

## Formato de carga

```
ARG 🇦🇷: 1, 2, 5
BRA 🇧🇷: 10
MAR 🇲🇦: 3, 7
```

Una línea por país. Los números se separan por coma.
