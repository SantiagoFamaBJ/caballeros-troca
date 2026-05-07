import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import Link from 'next/link'

const ADMIN_PASSWORD = 'Sacade2006'

function parseInput(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result = []
  for (const line of lines) {
    const match = line.match(/^([A-Z]{2,4})\s+([\S]+)\s*:\s*(.+)$/)
    if (!match) continue
    const [, codigo, bandera, nums] = match
    const numeros = nums.split(',').map(n => n.trim()).filter(Boolean)
    if (numeros.length > 0) {
      result.push({ pais_codigo: codigo, pais_bandera: bandera, numeros: numeros.join(', ') })
    }
  }
  return result
}

function countFigs(input) {
  const parsed = parseInput(input)
  return parsed.reduce((s, i) => s + i.numeros.split(',').length, 0)
}

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(false)
  const [newPersona, setNewPersona] = useState('')
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [repInput, setRepInput] = useState('')
  const [faltInput, setFaltInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const ok = sessionStorage.getItem('troca_admin')
    if (ok === '1') setAuthed(true)
  }, [])

  useEffect(() => {
    if (authed) fetchPersonas()
  }, [authed])

  async function fetchPersonas() {
    setLoading(true)
    const { data } = await supabase.from('troca_personas').select('*').order('orden').order('nombre')
    setPersonas(data || [])
    setLoading(false)
  }

  function handleLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem('troca_admin', '1')
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  async function handleAddPersona() {
    const nombre = newPersona.trim()
    if (!nombre) return
    await supabase.from('troca_personas').insert({ nombre, orden: personas.length })
    setNewPersona('')
    fetchPersonas()
  }

  async function handleDeletePersona(id) {
    if (!confirm('¿Eliminar esta persona y todos sus datos?')) return
    await supabase.from('troca_personas').delete().eq('id', id)
    if (selectedPersona?.id === id) {
      setSelectedPersona(null)
      setRepInput('')
      setFaltInput('')
    }
    fetchPersonas()
  }

  async function handleSelectPersona(persona) {
    setSelectedPersona(persona)
    setSaved(false)
    const [{ data: r }, { data: f }] = await Promise.all([
      supabase.from('troca_repetidas').select('*').eq('persona_id', persona.id),
      supabase.from('troca_faltantes').select('*').eq('persona_id', persona.id),
    ])
    const toText = arr => (arr || []).map(item => `${item.pais_codigo} ${item.pais_bandera}: ${item.numeros}`).join('\n')
    setRepInput(toText(r))
    setFaltInput(toText(f))
  }

  async function handleSave() {
    if (!selectedPersona) return
    setSaving(true)
    const repData = parseInput(repInput).map(d => ({ ...d, persona_id: selectedPersona.id }))
    const faltData = parseInput(faltInput).map(d => ({ ...d, persona_id: selectedPersona.id }))
    await supabase.from('troca_repetidas').delete().eq('persona_id', selectedPersona.id)
    await supabase.from('troca_faltantes').delete().eq('persona_id', selectedPersona.id)
    if (repData.length > 0) await supabase.from('troca_repetidas').insert(repData)
    if (faltData.length > 0) await supabase.from('troca_faltantes').insert(faltData)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!authed) {
    return (
      <>
        <Head><title>Admin · CABALLEROS TROCA</title></Head>
        <div style={s.loginPage}>
          <div style={s.loginCard}>
            <p style={s.loginTitle}>ADMIN</p>
            <p style={s.loginSub}>Caballeros Troca</p>
            <input
              type="password"
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Contraseña"
              style={s.input}
              autoFocus
            />
            {pwError && <p style={s.errorText}>Contraseña incorrecta</p>}
            <button onClick={handleLogin} style={s.btnPrimary}>Entrar</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>Admin · CABALLEROS TROCA</title></Head>
      <div style={s.page}>
        <header style={s.header}>
          <div style={s.headerInner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={s.title}>CABALLEROS TROCA</span>
              <span style={s.adminBadge}>ADMIN</span>
            </div>
            <Link href="/" style={s.backLink}>← Ver matches</Link>
          </div>
        </header>

        <main style={s.main}>
          <div style={s.layout}>
            <aside style={s.sidebar}>
              <p style={s.sectionLabel}>PERSONAS</p>
              {loading ? (
                <p style={s.gray}>Cargando...</p>
              ) : (
                personas.map(p => (
                  <div
                    key={p.id}
                    style={{ ...s.personaItem, ...(selectedPersona?.id === p.id ? s.personaItemActive : {}) }}
                    onClick={() => handleSelectPersona(p)}
                  >
                    <span style={s.personaItemName}>{p.nombre}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeletePersona(p.id) }}
                      style={s.deleteBtn}
                    >✕</button>
                  </div>
                ))
              )}
              <div style={s.addPersonaRow}>
                <input
                  value={newPersona}
                  onChange={e => setNewPersona(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPersona()}
                  placeholder="Nombre..."
                  style={s.inputSmall}
                />
                <button onClick={handleAddPersona} style={s.btnAdd}>+</button>
              </div>
            </aside>

            <div style={s.panel}>
              {!selectedPersona ? (
                <div style={s.noSelection}>
                  <span style={{ fontSize: '2rem' }}>⚽</span>
                  <p style={s.gray}>Seleccioná una persona para cargar sus figuritas</p>
                </div>
              ) : (
                <>
                  <div style={s.panelHeader}>
                    <span style={s.panelTitle}>{selectedPersona.nombre.toUpperCase()}</span>
                    <div style={s.panelActions}>
                      {saved && <span style={s.savedMsg}>✓ Guardado</span>}
                      <button onClick={handleSave} disabled={saving} style={s.btnSave}>
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>

                  <p style={s.helpText}>
                    Formato por línea: <code style={s.code}>ARG 🇦🇷: 1, 2, 5</code>
                  </p>

                  <div style={s.textareaGrid}>
                    <div>
                      <p style={s.textareaLabel}>🔁 REPETIDAS — tiene de más</p>
                      <textarea
                        value={repInput}
                        onChange={e => setRepInput(e.target.value)}
                        placeholder={'ARG 🇦🇷: 1, 2\nBRA 🇧🇷: 5\nFRA 🇫🇷: 10, 11'}
                        style={s.textarea}
                        spellCheck={false}
                      />
                      <p style={s.countText}>{countFigs(repInput)} figuritas</p>
                    </div>
                    <div>
                      <p style={s.textareaLabel}>❓ FALTANTES — necesita</p>
                      <textarea
                        value={faltInput}
                        onChange={e => setFaltInput(e.target.value)}
                        placeholder={'MAR 🇲🇦: 1\nECU 🇪🇨: 3, 4, 7\nUSA 🇺🇸: 12'}
                        style={s.textarea}
                        spellCheck={false}
                      />
                      <p style={s.countText}>{countFigs(faltInput)} figuritas</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

const s = {
  loginPage: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" },
  loginCard: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 14, width: 300 },
  loginTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.12em', color: '#f0f0f0', textAlign: 'center' },
  loginSub: { fontSize: '0.7rem', color: '#4b5563', letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginTop: -8 },
  input: { background: '#0d0d0d', border: '1px solid #222', borderRadius: 6, padding: '10px 14px', color: '#f0f0f0', fontSize: '0.9rem', outline: 'none', fontFamily: "'DM Mono', monospace", width: '100%', boxSizing: 'border-box' },
  errorText: { color: '#f87171', fontSize: '0.76rem', textAlign: 'center' },
  btnPrimary: { background: '#4ade80', color: '#000', border: 'none', borderRadius: 6, padding: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  page: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" },
  header: { borderBottom: '1px solid #1a1a1a', padding: '16px 32px', background: '#0d0d0d' },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.7rem', letterSpacing: '0.1em', color: '#f0f0f0' },
  adminBadge: { fontFamily: "'DM Mono', monospace", fontSize: '0.58rem', background: '#4ade8015', color: '#4ade80', border: '1px solid #166534', borderRadius: 4, padding: '2px 8px' },
  backLink: { fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', color: '#4b5563', textDecoration: 'none' },
  main: { flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '28px 32px' },
  layout: { display: 'grid', gridTemplateColumns: '210px 1fr', gap: 22 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 5 },
  sectionLabel: { fontFamily: "'DM Mono', monospace", fontSize: '0.58rem', color: '#374151', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 },
  personaItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 6, background: '#0f0f0f', border: '1px solid #1a1a1a', cursor: 'pointer' },
  personaItemActive: { background: '#141414', border: '1px solid #222', borderLeft: '3px solid #4ade80' },
  personaItemName: { fontSize: '0.86rem', color: '#d1d5db' },
  deleteBtn: { background: 'none', border: 'none', color: '#2d2d2d', fontSize: '0.7rem', cursor: 'pointer', padding: 0 },
  addPersonaRow: { display: 'flex', gap: 6, marginTop: 6 },
  inputSmall: { flex: 1, background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 6, padding: '7px 10px', color: '#f0f0f0', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' },
  btnAdd: { background: '#4ade80', color: '#000', border: 'none', borderRadius: 6, width: 32, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' },
  gray: { color: '#4b5563', fontSize: '0.82rem' },
  panel: { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: '22px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 420 },
  noSelection: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, padding: '60px 0' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.1em', color: '#f0f0f0' },
  panelActions: { display: 'flex', alignItems: 'center', gap: 12 },
  savedMsg: { fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', color: '#4ade80' },
  btnSave: { background: '#4ade80', color: '#000', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  helpText: { fontSize: '0.76rem', color: '#4b5563' },
  code: { fontFamily: "'DM Mono', monospace", background: '#1a1a1a', padding: '1px 5px', borderRadius: 3, fontSize: '0.73rem', color: '#9ca3af' },
  textareaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
  textareaLabel: { fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 },
  textarea: { width: '100%', height: 320, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 7, padding: '12px 13px', color: '#d1d5db', fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.75 },
  countText: { fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: '#2d2d2d', marginTop: 5 },
}
