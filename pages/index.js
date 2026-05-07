import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import Link from 'next/link'

// Parsea "1, 2, 5" o "1" en array de strings normalizados
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

  // Qué puede recibir esta persona de cada otra
  // = mis faltantes ∩ las repetidas de la otra
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

  // Qué puede dar esta persona a cada otra
  // = mis repetidas ∩ los faltantes de la otra
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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>" />
      </Head>

      <div style={s.page}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <div>
              <h1 style={s.title}>CABALLEROS TROCA</h1>
              <p style={s.subtitle}>Figuritas Mundial 2026</p>
            </div>
            <div style={s.headerRight}>
              <button onClick={fetchData} style={s.refreshBtn} title="Actualizar">↻</button>
              {lastUpdate && (
                <span style={s.updateTime}>
                  {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </header>

        <main style={s.main}>
          {loading ? (
            <div style={s.center}>
              <span style={s.loadingDot} />
              <span style={s.gray}>Cargando matches...</span>
            </div>
          ) : personas.length === 0 ? (
            <div style={s.center}>
              <span style={{ fontSize: '2.5rem' }}>⚽</span>
              <p style={s.gray}>No hay datos todavía. El admin tiene que cargar las figuritas.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {personas.map(persona => {
                const recibo = getMatchesRecibo(persona)
                const doy = getMatchesDoy(persona)
                return (
                  <div key={persona.id} style={s.card}>
                    <div style={s.cardHeader}>
                      <span style={s.personaName}>{persona.nombre.toUpperCase()}</span>
                      <div style={s.badges}>
                        <span style={s.badgeGreen}>↓ {totalFigs(recibo)} recibe</span>
                        <span style={s.badgeGray}>↑ {totalFigs(doy)} da</span>
                      </div>
                    </div>

                    <div style={s.cols}>
                      {/* NECESITA (recibe de otros) */}
                      <div style={s.col}>
                        <p style={s.colTitle}>⬇ {persona.nombre.split(' ')[0].toUpperCase()} NECESITA</p>
                        {recibo.length === 0
                          ? <p style={s.noMatch}>Sin matches</p>
                          : recibo.map(m => (
                            <div key={m.persona.id} style={s.matchBlock}>
                              <span style={s.matchName}>{m.persona.nombre}</span>
                              <div style={s.chips}>
                                {m.figuritas.map(fig => (
                                  <span key={fig.pais_codigo} style={s.chip}>
                                    {fig.pais_bandera} {fig.pais_codigo} {fig.numeros.join(', ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        }
                      </div>

                      <div style={s.vDivider} />

                      {/* PUEDE DAR */}
                      <div style={s.col}>
                        <p style={s.colTitleGreen}>⬆ {persona.nombre.split(' ')[0].toUpperCase()} PUEDE DAR</p>
                        {doy.length === 0
                          ? <p style={s.noMatch}>Sin matches</p>
                          : doy.map(m => (
                            <div key={m.persona.id} style={s.matchBlock}>
                              <span style={s.matchName}>{m.persona.nombre}</span>
                              <div style={s.chips}>
                                {m.figuritas.map(fig => (
                                  <span key={fig.pais_codigo} style={s.chipGreen}>
                                    {fig.pais_bandera} {fig.pais_codigo} {fig.numeros.join(', ')}
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
          <Link href="/admin" style={s.adminLink}>· admin ·</Link>
        </footer>
      </div>
    </>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" },
  header: { borderBottom: '1px solid #1e1e1e', padding: '24px 32px', background: '#0d0d0d' },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.6rem', letterSpacing: '0.1em', color: '#f0f0f0', lineHeight: 1 },
  subtitle: { fontSize: '0.72rem', color: '#4b5563', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 4 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  refreshBtn: { background: 'none', border: '1px solid #222', color: '#555', fontSize: '1.1rem', width: 32, height: 32, borderRadius: 6, cursor: 'pointer' },
  updateTime: { fontFamily: "'DM Mono', monospace", fontSize: '0.68rem', color: '#374151' },
  main: { flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '36px 32px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 80, textAlign: 'center' },
  gray: { color: '#4b5563', fontSize: '0.9rem' },
  loadingDot: { width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' },
  grid: { display: 'flex', flexDirection: 'column', gap: 20 },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { padding: '14px 22px', borderBottom: '1px solid #1a1a1a', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  personaName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.12em', color: '#f0f0f0' },
  badges: { display: 'flex', gap: 8 },
  badgeGreen: { fontFamily: "'DM Mono', monospace", fontSize: '0.68rem', background: '#052e1640', color: '#4ade80', border: '1px solid #14532d', borderRadius: 4, padding: '2px 10px' },
  badgeGray: { fontFamily: "'DM Mono', monospace", fontSize: '0.68rem', background: '#1f293780', color: '#6b7280', border: '1px solid #374151', borderRadius: 4, padding: '2px 10px' },
  cols: { display: 'grid', gridTemplateColumns: '1fr 1px 1fr' },
  col: { padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 },
  vDivider: { background: '#1a1a1a', width: 1 },
  colTitle: { fontFamily: "'DM Mono', monospace", fontSize: '0.63rem', letterSpacing: '0.14em', color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  colTitleGreen: { fontFamily: "'DM Mono', monospace", fontSize: '0.63rem', letterSpacing: '0.14em', color: '#16a34a', textTransform: 'uppercase', marginBottom: 2 },
  noMatch: { fontSize: '0.8rem', color: '#2d2d2d', fontStyle: 'italic' },
  matchBlock: { display: 'flex', flexDirection: 'column', gap: 5 },
  matchName: { fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, letterSpacing: '0.02em' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  chip: { fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', background: '#13132a', color: '#818cf8', border: '1px solid #1e1e4a', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' },
  chipGreen: { fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', background: '#05200f', color: '#86efac', border: '1px solid #14532d', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' },
  footer: { padding: '18px 32px', borderTop: '1px solid #141414', display: 'flex', justifyContent: 'flex-end' },
  adminLink: { fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', color: '#2d2d2d', letterSpacing: '0.08em', textDecoration: 'none' },
}
