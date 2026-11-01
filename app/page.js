'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'dev-aposentado-save'
const PLAYER_ID_KEY = 'dev-aposentado-player-id'

const MAP_COLS = 12
const MAP_ROWS = 8

const INITIAL_STATE = {
  stress: 95,
  money: 50000,
  land: 5,
  plants: [],
  animals: [],
  lastUpdate: Date.now(),
  highStressTime: 0,
  location: null,
  logs: ['Você deu rage quit na big tech. Comprou uma pequena propriedade rural perto de uma cidade pequena. O estresse está nas alturas. As contas vão chegar. Não há objetivos bonitinhos.'],
  alive: true,
  billsInterval: 7 * 24 * 60 * 60 * 1000,
  lastBill: Date.now(),
  playerX: 2,
  playerY: 3,
}

const ANIMAL_TYPES = {
  galinha: { cost: 200, stress: -3, produce: 30, name: 'galinha', emoji: '🐔' },
  vaca: { cost: 2000, stress: 5, produce: 200, name: 'vaca', emoji: '🐄' },
  porco: { cost: 800, stress: 2, produce: 80, name: 'porco', emoji: '🐷' },
}

const PLANT_EMOJIS = { milho: '🌽', trigo: '🌾', feijao: '🌱', default: '🌱' }

export default function Home() {
  const [state, setState] = useState(INITIAL_STATE)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState(null)
  const dialogueRef = useRef(null)
  const saveTimeout = useRef(null)
  const farmRef = useRef(null)

  useEffect(() => {
    let pid = localStorage.getItem(PLAYER_ID_KEY)
    if (!pid) {
      pid = crypto.randomUUID()
      localStorage.setItem(PLAYER_ID_KEY, pid)
    }
    setPlayerId(pid)

    fetch(`/api/game?playerId=${pid}`)
      .then(r => r.json())
      .then(data => {
        if (data.state) {
          const parsed = data.state
          const now = Date.now()
          const elapsed = now - (parsed.lastUpdate || now)
          parsed.lastUpdate = now
          if (parsed.stress > 70) {
            parsed.highStressTime = (parsed.highStressTime || 0) + elapsed
          }
          if (parsed.playerX == null) parsed.playerX = 2
          if (parsed.playerY == null) parsed.playerY = 3
          setState(parsed)
          addLog('Progresso carregado do banco de dados (Neon).')
        } else {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              const now = Date.now()
              const elapsed = now - (parsed.lastUpdate || now)
              parsed.lastUpdate = now
              if (parsed.stress > 70) {
                parsed.highStressTime = (parsed.highStressTime || 0) + elapsed
              }
              if (parsed.playerX == null) parsed.playerX = 2
              if (parsed.playerY == null) parsed.playerY = 3
              setState(parsed)
              addLog('Jogo carregado do localStorage (sem Neon configurado).')
            } catch (e) {}
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.playerX == null) parsed.playerX = 2
            if (parsed.playerY == null) parsed.playerY = 3
            setState(parsed)
            addLog('Carregado localmente (API offline).')
          } catch (e) {}
        }
      })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    if (dialogueRef.current) {
      dialogueRef.current.scrollTop = dialogueRef.current.scrollHeight
    }
    if (playerId && state.alive) {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, state })
        }).catch(() => {})
      }, 1500)
    }
  }, [state, playerId])

  const addLog = (msg) => {
    setState(s => ({ ...s, logs: [...s.logs.slice(-40), msg] }))
  }

  const updateState = (updates) => {
    setState(s => {
      const next = { ...s, ...updates, lastUpdate: Date.now() }
      const plantStress = next.plants.length > 15 ? Math.floor((next.plants.length - 15) / 5) * 2 : 0
      const animalStress = next.animals.length > 8 ? Math.floor((next.animals.length - 8) / 3) * 3 : 0
      if (plantStress || animalStress) {
        next.stress = Math.min(100, next.stress + plantStress + animalStress)
      }

      if (next.stress > 70) {
        next.highStressTime = (s.highStressTime || 0) + (Date.now() - s.lastUpdate)
      } else {
        next.highStressTime = Math.max(0, (s.highStressTime || 0) - 1000 * 60 * 60)
      }
      if (next.highStressTime > 1000 * 60 * 60 * 24 * 3 && next.alive) {
        const chance = Math.random()
        if (chance < 0.3) {
          next.alive = false
          next.logs = [...next.logs, 'INFARTO! O estresse alto por muito tempo te pegou. Game over.']
        } else {
          next.logs = [...next.logs, 'Você quase infartou, mas sobreviveu. O estresse ainda está alto.']
          next.highStressTime = 0
        }
      }
      if (Date.now() - next.lastBill > next.billsInterval) {
        const bill = 2000 + next.land * 100 + next.animals.length * 50
        next.money -= bill
        next.lastBill = Date.now()
        next.logs = [...next.logs, `Conta chegou: -R$${bill}. Patrimônio corroído se você não produzir.`]
        if (next.money < 0) {
          next.logs = [...next.logs, 'Você ficou sem dinheiro. A propriedade está em risco.']
        }
      }
      return next
    })
  }

  const movePlayer = useCallback((dx, dy) => {
    if (!state.alive) return
    setState(s => {
      const nx = Math.max(0, Math.min(MAP_COLS - 1, s.playerX + dx))
      const ny = Math.max(0, Math.min(MAP_ROWS - 1, s.playerY + dy))
      if (nx === s.playerX && ny === s.playerY) return s
      return { ...s, playerX: nx, playerY: ny }
    })
  }, [state.alive])

  useEffect(() => {
    const onKey = (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); movePlayer(0, -1) }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); movePlayer(0, 1) }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); movePlayer(-1, 0) }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); movePlayer(1, 0) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [movePlayer])

  const handleCommand = async (cmd) => {
    if (!state.alive) {
      addLog('Você está morto. Recarregue para recomeçar ou digite "reset".')
      return
    }
    const [action, ...args] = cmd.toLowerCase().trim().split(/\s+/)
    const arg = args.join(' ')

    switch (action) {
      case 'status':
      case 's':
        addLog(`Estresse: ${state.stress}/100 | Dinheiro: R$${state.money.toFixed(0)} | Terra: ${state.land} ha | Plantas: ${state.plants.length} | Animais: ${state.animals.length}`)
        if (state.location) addLog(`Local: ${state.location.name}`)
        if (state.plants.length > 15) addLog('Grande volume de plantação está te estressando.')
        if (state.animals.length > 8) addLog('Muitos animais para cuidar. Gestão estressante.')
        break
      case 'fish':
      case 'pescar':
        updateState({ stress: Math.max(0, state.stress - 15), money: state.money + 50 })
        addLog('Você pescou no lago. Acalmou um pouco. +R$50 de peixe.')
        break
      case 'plant':
      case 'plantar':
        if (state.money < 100) {
          addLog('Sem dinheiro para sementes.')
          break
        }
        const newPlantCount = state.plants.length + 1
        let plantStressChange = -8
        if (newPlantCount > 15) plantStressChange += 12
        updateState({
          money: state.money - 100,
          stress: Math.max(0, Math.min(100, state.stress + plantStressChange)),
          plants: [...state.plants, { type: arg || 'milho', plantedAt: Date.now(), growthDays: 3, x: state.playerX, y: state.playerY }]
        })
        addLog(`Plantou ${arg || 'milho'} na sua posição. Plantar acalma, mas gestão de volume grande estressa.${newPlantCount > 15 ? ' (volume alto!)' : ''}`)
        break
      case 'harvest':
      case 'colher':
        if (state.plants.length === 0) {
          addLog('Nada para colher.')
          break
        }
        const ready = state.plants.filter(p => (Date.now() - p.plantedAt) > p.growthDays * 24 * 60 * 60 * 1000 / 10)
        if (ready.length === 0) {
          addLog('Plantas ainda crescendo. Elas crescem em uma fração do tempo real.')
          break
        }
        updateState({
          money: state.money + ready.length * 300,
          stress: Math.max(0, state.stress - 5),
          plants: state.plants.filter(p => !ready.includes(p))
        })
        addLog(`Colheu ${ready.length} plantas. +R$${ready.length * 300}. Um pouco menos de estresse.`)
        break
      case 'animal':
      case 'criar':
        const tipo = arg || 'galinha'
        const info = ANIMAL_TYPES[tipo]
        if (!info) {
          addLog('Tipos: galinha, vaca, porco')
          break
        }
        if (state.money < info.cost) {
          addLog(`Sem dinheiro para ${info.name} (custa R$${info.cost}).`)
          break
        }
        updateState({
          money: state.money - info.cost,
          stress: Math.max(0, Math.min(100, state.stress + info.stress)),
          animals: [...state.animals, { type: tipo, boughtAt: Date.now(), x: state.playerX, y: state.playerY }]
        })
        addLog(`Criou ${info.name} na sua posição. ${info.stress < 0 ? 'Acalma um pouco.' : 'A gestão pode estressar.'}`)
        break
      case 'coletar':
      case 'produzir':
        if (state.animals.length === 0) {
          addLog('Nenhum animal.')
          break
        }
        let total = 0
        state.animals.forEach(a => {
          const info = ANIMAL_TYPES[a.type]
          if (info) total += info.produce
        })
        updateState({ money: state.money + total, stress: Math.max(0, state.stress - 3) })
        addLog(`Coletou produção dos animais: +R$${total}.`)
        break
      case 'expand':
      case 'expandir':
        if (state.money < 10000) {
          addLog('Precisa de mais dinheiro para expandir e virar latifundiário.')
          break
        }
        updateState({
          money: state.money - 10000,
          land: state.land + 5,
          stress: state.stress + 25
        })
        addLog('Expandiu a propriedade. Atividades estressantes para virar latifundiário. Estresse aumentou.')
        break
      case 'weather':
      case 'clima':
        if (!state.location) {
          addLog('Defina uma localização primeiro com "local <cidade>"')
          break
        }
        setLoading(true)
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.location.lat}&longitude=${state.location.lon}&current=temperature_2m,precipitation,weather_code&timezone=auto`
          const res = await fetch(url)
          const data = await res.json()
          const cur = data.current
          addLog(`Clima atual em ${state.location.name}: ${cur.temperature_2m}°C, precipitação ${cur.precipitation}mm, código ${cur.weather_code}`)
          if (cur.precipitation > 5) {
            updateState({ stress: state.stress + 5 })
            addLog('Chuva forte. Mais estresse para cuidar das coisas.')
          } else if (cur.temperature_2m > 30) {
            updateState({ stress: state.stress + 3 })
            addLog('Calor. Estressante.')
          } else {
            updateState({ stress: Math.max(0, state.stress - 2) })
            addLog('Clima bom. Um pouco mais calmo.')
          }
        } catch (e) {
          addLog('Erro ao buscar clima.')
        }
        setLoading(false)
        break
      case 'local':
      case 'location':
        if (!arg) {
          addLog('Uso: local <nome da cidade>')
          break
        }
        setLoading(true)
        try {
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(arg)}&count=1&language=pt`
          const res = await fetch(geoUrl)
          const data = await res.json()
          if (data.results && data.results[0]) {
            const loc = data.results[0]
            updateState({
              location: { name: loc.name, lat: loc.latitude, lon: loc.longitude, timezone: loc.timezone }
            })
            addLog(`Localização definida: ${loc.name}, ${loc.country}. Lat ${loc.latitude}, Lon ${loc.longitude}`)
          } else {
            addLog('Cidade não encontrada.')
          }
        } catch (e) {
          addLog('Erro na geocodificação.')
        }
        setLoading(false)
        break
      case 'reset':
        localStorage.removeItem(STORAGE_KEY)
        setState(INITIAL_STATE)
        addLog('Jogo resetado.')
        break
      case 'help':
      case '?':
        addLog('Comandos: status, fish/pescar, plant/plantar [tipo], harvest/colher, animal/criar [galinha|vaca|porco], coletar, expand/expandir, weather/clima, local <cidade>, reset, help')
        addLog('Movimente com setas ou WASD.')
        break
      default:
        addLog('Comando desconhecido. Digite help.')
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      addLog(`> ${input}`)
      handleCommand(input)
      setInput('')
    }
  }

  const hour = new Date().getHours()
  const isNight = hour < 6 || hour > 18

  const stressClass = state.stress < 40 ? 'low' : state.stress < 70 ? 'medium' : 'high'

  // Build map grid
  const tiles = []
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const isPlayer = x === state.playerX && y === state.playerY
      const plantHere = state.plants.find(p => p.x === x && p.y === y)
      const animalHere = state.animals.find(a => a.x === x && a.y === y)
      let emoji = ''
      let title = ''
      if (isPlayer) {
        emoji = '👨‍🌾'
        title = 'Você'
      } else if (plantHere) {
        emoji = PLANT_EMOJIS[plantHere.type] || PLANT_EMOJIS.default
        title = plantHere.type
      } else if (animalHere) {
        emoji = ANIMAL_TYPES[animalHere.type]?.emoji || '🐔'
        title = animalHere.type
      }
      tiles.push(
        <div
          key={`${x}-${y}`}
          className="farm-item"
          title={title}
          style={{
            background: isPlayer ? '#3d6b35' : 'rgba(0,0,0,0.05)',
            gridColumn: x + 1,
            gridRow: y + 1,
          }}
        >
          {emoji}
        </div>
      )
    }
  }

  return (
    <div className="game-container">
      <div className="game-screen">
        {isNight && <div className="night-overlay" />}

        <div className="status-panel">
          <div className="status-row">
            <span>DEV APOSENTADO</span>
            <span>R${state.money.toFixed(0)}</span>
          </div>
          <div className="status-row">
            <span>Terra: {state.land} ha</span>
            <span>Plantas: {state.plants.length}</span>
          </div>
          <div className="status-row">
            <span>Animais: {state.animals.length}</span>
            <span>{state.location?.name || 'Sem local'}</span>
          </div>
          <div>ESTRESSE</div>
          <div className="stress-bar-container">
            <div
              className={`stress-bar ${stressClass}`}
              style={{ width: `${state.stress}%` }}
            />
          </div>
          <div style={{ textAlign: 'right', fontSize: '6px' }}>{state.stress}/100</div>
        </div>

        <div className="farm-view" ref={farmRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_COLS}, 1fr)`, gridTemplateRows: `repeat(${MAP_ROWS}, 1fr)`, height: '240px' }}>
          {tiles}
        </div>

        <div className="dialogue-box" ref={dialogueRef}>
          {state.logs.join('\n')}
          {loading && '\nCarregando...'}
          {!state.alive && '\n=== GAME OVER ==='}
        </div>

        {!state.alive && <div className="game-over">GAME OVER</div>}

        <div className="quick-actions">
          <button type="button" onClick={() => handleCommand('pescar')}>Pescar</button>
          <button type="button" onClick={() => handleCommand('plantar milho')}>Plantar</button>
          <button type="button" onClick={() => handleCommand('colher')}>Colher</button>
          <button type="button" onClick={() => handleCommand('criar galinha')}>Galinha</button>
          <button type="button" onClick={() => handleCommand('criar vaca')}>Vaca</button>
          <button type="button" onClick={() => handleCommand('coletar')}>Coletar</button>
          <button type="button" onClick={() => handleCommand('status')}>Status</button>
          <button type="button" onClick={() => handleCommand('clima')}>Clima</button>
        </div>

        <form onSubmit={onSubmit} className="command-area">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Comando..."
            disabled={!state.alive && input !== 'reset'}
          />
          <button type="submit">OK</button>
        </form>
      </div>
      <div style={{ color: '#aaa', fontSize: '10px', padding: '10px' }}>
        <p>Dev Aposentado - Hobby project</p>
        <p style={{ marginTop: '10px' }}>Tela widescreen. Gráficos no estilo de jogos portáteis clássicos.</p>
        <p style={{ marginTop: '10px' }}>Movimente o personagem com setas ou WASD.</p>
        <p style={{ marginTop: '8px' }}>Use os botões ou digite comandos.</p>
      </div>
    </div>
  )
}
