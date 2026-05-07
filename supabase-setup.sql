-- CABALLEROS TROCA - Setup de tablas
-- Correr esto en Supabase → SQL Editor

-- Tabla de personas
CREATE TABLE IF NOT EXISTS personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de figuritas repetidas (las que tiene de más para dar)
CREATE TABLE IF NOT EXISTS repetidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  pais_codigo TEXT NOT NULL,
  pais_bandera TEXT NOT NULL,
  numeros INTEGER[] NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de faltantes (las que necesita)
CREATE TABLE IF NOT EXISTS faltantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  pais_codigo TEXT NOT NULL,
  pais_bandera TEXT NOT NULL,
  numeros INTEGER[] NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: permitir lectura pública y escritura con anon key
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE repetidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE faltantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read personas" ON personas FOR SELECT USING (true);
CREATE POLICY "anon write personas" ON personas FOR ALL USING (true);

CREATE POLICY "public read repetidas" ON repetidas FOR SELECT USING (true);
CREATE POLICY "anon write repetidas" ON repetidas FOR ALL USING (true);

CREATE POLICY "public read faltantes" ON faltantes FOR SELECT USING (true);
CREATE POLICY "anon write faltantes" ON faltantes FOR ALL USING (true);
