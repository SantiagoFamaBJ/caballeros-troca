import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import Link from 'next/link'

function parseNumeros(str) {
  if (!str) return []
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

export default function Home() {
  const [personas, setPersonas] = useState([])
  const [repetidas, setRepetidas] = useState([])
  const [faltantes, setFaltantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: p }, { data: r }, { data: f }] = await Promise.all([
      supabase.from('troca_personas').select('*').order('orden').order('nombre'),
      supabase.from('troca_repetidas').select('*'),
      supabase.from('troca_faltantes').select('*'),
    ])
    setPersonas(p || [])
    setRepetidas(r || [])
    setFaltantes(f || [])
    setLastUpdate(new Date())
    setLoading(false)
  }

  function getMatchesRecibo(persona) {
    const misFaltantes = faltantes.filter(f => f.persona_id === persona.id)
    return personas
      .filter(o => o.id !== persona.id)
      .map(otra => {
        const susRepetidas = repetidas.filter(r => r.persona_id === otra.id)
        const figuritas = misFaltantes
          .map(mf => {
            const susRep = susRepetidas.find(r => r.pais_codigo === mf.pais_codigo)
            if (!susRep) return null
            const nums = parseNumeros(mf.numeros).filter(n => parseNumeros(susRep.numeros).includes(n))
            if (!nums.length) return null
            return { pais_codigo: mf.pais_codigo, pais_bandera: mf.pais_bandera, numeros: nums }
          })
          .filter(Boolean)
        return figuritas.length ? { persona: otra, figuritas } : null
      })
      .filter(Boolean)
  }

  function getMatchesDoy(persona) {
    const misRepetidas = repetidas.filter(r => r.persona_id === persona.id)
    return personas
      .filter(o => o.id !== persona.id)
      .map(otra => {
        const susFaltantes = faltantes.filter(f => f.persona_id === otra.id)
        const figuritas = misRepetidas
          .map(mr => {
            const susFalt = susFaltantes.find(f => f.pais_codigo === mr.pais_codigo)
            if (!susFalt) return null
            const nums = parseNumeros(mr.numeros).filter(n => parseNumeros(susFalt.numeros).includes(n))
            if (!nums.length) return null
            return { pais_codigo: mr.pais_codigo, pais_bandera: mr.pais_bandera, numeros: nums }
          })
          .filter(Boolean)
        return figuritas.length ? { persona: otra, figuritas } : null
      })
      .filter(Boolean)
  }

  function totalFigs(matches) {
    return matches.reduce((s, m) => s + m.figuritas.reduce((ss, f) => ss + f.numeros.length, 0), 0)
  }

  return (
    <>
      <Head>
        <title>CABALLEROS TROCA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>" />
      </Head>

      <div style={s.page}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <div>
              <h1 style={s.title}>⚽ Caballeros Troca</h1>
              <p style={s.subtitle}>Mundial 2026 · Figuritas</p>
            </div>
            <div style={s.headerRight}>
              <button onClick={fetchData} style={s.refreshBtn} title="Actualizar">↻</button>
              {lastUpdate && (
                <span style={s.updateTime}>
                  Actualizado {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </header>

        <main style={s.main}>
          {loading ? (
            <div style={s.center}>
              <span style={s.spinner}>⚽</span>
              <span style={s.grayText}>Cargando matches...</span>
            </div>
          ) : personas.length === 0 ? (
            <div style={s.center}>
              <span style={{ fontSize: '3rem' }}>⚽</span>
              <p style={s.grayText}>No hay datos todavía.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {personas.map(persona => {
                const recibo = getMatchesRecibo(persona)
                const doy = getMatchesDoy(persona)
                return (
                  <div key={persona.id} style={s.card}>
                    <div style={s.cardHeader}>
                      <span style={s.personaName}>{persona.nombre}</span>
                      <div style={s.badges}>
                        <span style={s.badgeBlue}>⬇ {totalFigs(recibo)} recibe</span>
                        <span style={s.badgeGreen}>⬆ {totalFigs(doy)} da</span>
                      </div>
                    </div>

                    <div style={s.cols}>
                      <div style={s.col}>
                        <p style={s.colLabel}>
                          <span style={s.colDot} />
                          {persona.nombre.split(' ')[0]} necesita recibir
                        </p>
                        {recibo.length === 0
                          ? <p style={s.noMatch}>Sin matches por ahora</p>
                          : recibo.map(m => (
                            <div key={m.persona.id} style={s.matchBlock}>
                              <span style={s.matchName}>De {m.persona.nombre}</span>
                              <div style={s.chips}>
                                {m.figuritas.map(fig => (
                                  <span key={fig.pais_codigo} style={s.chipBlue}>
                                    {fig.pais_bandera} {fig.numeros.join(', ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        }
                      </div>

                      <div style={s.vDivider} />

                      <div style={s.col}>
                        <p style={s.colLabelGreen}>
                          <span style={s.colDotGreen} />
                          {persona.nombre.split(' ')[0]} puede dar
                        </p>
                        {doy.length === 0
                          ? <p style={s.noMatch}>Sin matches por ahora</p>
                          : doy.map(m => (
                            <div key={m.persona.id} style={s.matchBlock}>
                              <span style={s.matchName}>A {m.persona.nombre}</span>
                              <div style={s.chips}>
                                {m.figuritas.map(fig => (
                                  <span key={fig.pais_codigo} style={s.chipGreen}>
                                    {fig.pais_bandera} {fig.numeros.join(', ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        <footer style={s.footer}>
          <Link href="/admin" style={s.adminLink}>admin</Link>
        </footer>
      </div>
    </>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#18181b', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" },

  header: { borderBottom: '1px solid #27272a', padding: '20px 32px', background: '#1c1c1f' },
  headerInner: { maxWidth: 1140, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: '1.6rem', fontWeight: 700, color: '#fafafa', letterSpacing: '-0.01em', margin: 0 },
  subtitle: { fontSize: '0.8rem', color: '#71717a', marginTop: 2, fontWeight: 400 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  refreshBtn: { background: 'none', border: '1px solid #3f3f46', color: '#71717a', fontSize: '1rem', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' },
  updateTime: { fontSize: '0.75rem', color: '#52525b' },

  main: { flex: 1, maxWidth: 1140, margin: '0 auto', width: '100%', padding: '32px 32px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 100 },
  grayText: { color: '#52525b', fontSize: '0.95rem' },
  spinner: { fontSize: '2.5rem', display: 'block' },

  grid: { display: 'flex', flexDirection: 'column', gap: 16 },

  card: { background: '#1c1c1f', border: '1px solid #27272a', borderRadius: 14, overflow: 'hidden' },
  cardHeader: { padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#202023' },
  personaName: { fontSize: '1.25rem', fontWeight: 700, color: '#fafafa', letterSpacing: '-0.01em' },
  badges: { display: 'flex', gap: 8 },
  badgeBlue: { fontSize: '0.75rem', fontWeight: 500, background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: 20, padding: '3px 12px' },
  badgeGreen: { fontSize: '0.75rem', fontWeight: 500, background: '#14401f', color: '#86efac', border: '1px solid #166534', borderRadius: 20, padding: '3px 12px' },

  cols: { display: 'grid', gridTemplateColumns: '1fr 1px 1fr' },
  col: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  vDivider: { background: '#27272a' },

  colLabel: { fontSize: '0.72rem', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 7, margin: 0 },
  colLabelGreen: { fontSize: '0.72rem', fontWeight: 600, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 7, margin: 0 },
  colDot: { width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 },
  colDotGreen: { width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 },

  noMatch: { fontSize: '0.82rem', color: '#3f3f46', fontStyle: 'italic', margin: 0 },

  matchBlock: { display: 'flex', flexDirection: 'column', gap: 7 },
  matchName: { fontSize: '0.82rem', fontWeight: 600, color: '#a1a1aa' },

  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chipBlue: {
    fontSize: '0.88rem', fontWeight: 500,
    background: '#172554', color: '#bfdbfe',
    border: '1px solid #1e3a8a',
    borderRadius: 8, padding: '4px 12px',
    whiteSpace: 'nowrap', letterSpacing: '0.01em',
  },
  chipGreen: {
    fontSize: '0.88rem', fontWeight: 500,
    background: '#052e16', color: '#bbf7d0',
    border: '1px solid #14532d',
    borderRadius: 8, padding: '4px 12px',
    whiteSpace: 'nowrap', letterSpacing: '0.01em',
  },

  footer: { padding: '16px 32px', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end' },
  adminLink: { fontSize: '0.7rem', color: '#3f3f46', textDecoration: 'none', letterSpacing: '0.06em' },
}
