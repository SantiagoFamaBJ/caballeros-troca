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
        <title>Caballeros Troca</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #f4f4f5; font-family: 'Outfit', sans-serif; }

          .page { min-height: 100vh; background: #f4f4f5; display: flex; flex-direction: column; }

          .header { background: #fff; border-bottom: 1px solid #e4e4e7; padding: 16px 20px; }
          .header-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          .site-title { font-size: 1.4rem; font-weight: 700; color: #18181b; margin: 0; }
          .site-sub { font-size: 0.72rem; color: #a1a1aa; margin-top: 2px; letter-spacing: 0.05em; }
          .header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
          .refresh-btn { background: none; border: 1px solid #e4e4e7; color: #71717a; font-size: 1rem; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; }
          .update-time { font-size: 0.7rem; color: #a1a1aa; white-space: nowrap; }

          .main { flex: 1; max-width: 1100px; margin: 0 auto; width: 100%; padding: 20px 16px 40px; }

          .center { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 80px; text-align: center; }
          .gray-text { color: #a1a1aa; font-size: 0.95rem; }

          .grid { display: flex; flex-direction: column; gap: 14px; }

          .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 14px; overflow: hidden; }
          .card-header { padding: 14px 18px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
          .persona-name { font-size: 1.2rem; font-weight: 700; color: #18181b; }
          .badges { display: flex; gap: 6px; flex-wrap: wrap; }
          .badge-recv { font-size: 0.72rem; font-weight: 500; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
          .badge-give { font-size: 0.72rem; font-weight: 500; background: #f0fdf4; color: #22c55e; border: 1px solid #bbf7d0; border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

          .cols { display: grid; grid-template-columns: 1fr 1fr; }
          .col { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
          .col:first-child { border-right: 1px solid #f0f0f0; }

          .col-label { font-size: 0.68rem; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 2px; }

          .no-match { font-size: 0.8rem; color: #d4d4d8; font-style: italic; margin: 0; }

          .match-block { display: flex; flex-direction: column; gap: 6px; }
          .match-name { font-size: 0.8rem; font-weight: 600; color: #71717a; margin: 0; }

          .chips { display: flex; flex-wrap: wrap; gap: 5px; }
          .chip-recv { font-size: 0.82rem; font-weight: 500; background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; border-radius: 7px; padding: 4px 10px; white-space: nowrap; }
          .chip-give { font-size: 0.82rem; font-weight: 500; background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; border-radius: 7px; padding: 4px 10px; white-space: nowrap; }

          .footer { padding: 16px 20px; border-top: 1px solid #e4e4e7; display: flex; justify-content: flex-end; background: #fff; }
          .admin-link { font-size: 0.68rem; color: #d4d4d8; text-decoration: none; letter-spacing: 0.06em; }

          @media (max-width: 600px) {
            .site-title { font-size: 1.15rem; }
            .update-time { display: none; }
            .cols { grid-template-columns: 1fr; }
            .col:first-child { border-right: none; border-bottom: 1px solid #f0f0f0; }
            .card-header { padding: 12px 14px; }
            .col { padding: 14px 14px; }
            .persona-name { font-size: 1.1rem; }
          }
        `}</style>
      </Head>

      <div className="page">
        <header className="header">
          <div className="header-inner">
            <div>
              <h1 className="site-title">⚽ Caballeros Troca</h1>
              <p className="site-sub">Mundial 2026 · Figuritas</p>
            </div>
            <div className="header-right">
              <button onClick={fetchData} className="refresh-btn" title="Actualizar">↻</button>
              {lastUpdate && (
                <span className="update-time">
                  {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="main">
          {loading ? (
            <div className="center">
              <span style={{ fontSize: '2.5rem' }}>⚽</span>
              <span className="gray-text">Cargando matches...</span>
            </div>
          ) : personas.length === 0 ? (
            <div className="center">
              <span style={{ fontSize: '3rem' }}>⚽</span>
              <p className="gray-text">No hay datos todavía.</p>
            </div>
          ) : (
            <div className="grid">
              {personas.map(persona => {
                const recibo = getMatchesRecibo(persona)
                const doy = getMatchesDoy(persona)
                return (
                  <div key={persona.id} className="card">
                    <div className="card-header">
                      <span className="persona-name">{persona.nombre}</span>
                      <div className="badges">
                        <span className="badge-recv">⬇ {totalFigs(recibo)} recibe</span>
                        <span className="badge-give">⬆ {totalFigs(doy)} da</span>
                      </div>
                    </div>

                    <div className="cols">
                      <div className="col">
                        <p className="col-label">⬇ {persona.nombre.split(' ')[0]} necesita</p>
                        {recibo.length === 0
                          ? <p className="no-match">Sin matches por ahora</p>
                          : recibo.map(m => (
                            <div key={m.persona.id} className="match-block">
                              <p className="match-name">De {m.persona.nombre}</p>
                              <div className="chips">
                                {m.figuritas.map(fig => (
                                  <span key={fig.pais_codigo} className="chip-recv">
                                    {fig.pais_bandera} {fig.numeros.join(', ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        }
                      </div>

                      <div className="col">
                        <p className="col-label">⬆ {persona.nombre.split(' ')[0]} puede dar</p>
                        {doy.length === 0
                          ? <p className="no-match">Sin matches por ahora</p>
                          : doy.map(m => (
                            <div key={m.persona.id} className="match-block">
                              <p className="match-name">A {m.persona.nombre}</p>
                              <div className="chips">
                                {m.figuritas.map(fig => (
                                  <span key={fig.pais_codigo} className="chip-give">
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

        <footer className="footer">
          <Link href="/admin" className="admin-link">admin</Link>
        </footer>
      </div>
    </>
  )
}
