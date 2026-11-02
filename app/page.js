'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'dev-aposentado-save'
const PLAYER_ID_KEY = 'dev-aposentado-player-id'

const MAP_COLS = 12
const MAP_ROWS = 10

const INITIAL_STATE = {
  stress: 95,
  money: 50000,
  land: 5,
  plants: [],
  animals: [],
  lastUpdate: Date.now(),
  highStressTime: 0,
  location: null,
  alive: true,
  billsInterval: 7 * 24 * 60 * 60 * 1000,
  lastBill: Date.now(),
  playerX: 5,
  playerY: 5,
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
  const [message, setMessage] = useState('Use setas/WASD ou d-pad para mover. Digite comandos abaixo.')
  const saveTimeout = useRef(null)

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
          if (parsed.playerX == null) parsed.playerX = 5
          if (parsed.playerY == null) parsed.playerY = 5
          setState(parsed)
          setMessage('Progresso carregado.')
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
              if (parsed.playerX == null) parsed.playerX = 5
              if (parsed.playerY == null) parsed.playerY = 5
              setState(parsed)
              setMessage('Jogo carregado.')
            } catch (e) {}
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.playerX == null) parsed.playerX = 5
            if (parsed.playerY == null) parsed.playerY = 5
            setState(parsed)
            setMessage('Carregado localmente.')
          } catch (e) {}
        }
      })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
          setMessage('INFARTO! Game over.')
        } else {
          setMessage('Você quase infartou, mas sobreviveu.')
          next.highStressTime = 0
        }
      }
      if (Date.now() - next.lastBill > next.billsInterval) {
        const bill = 2000 + next.land * 100 + next.animals.length * 50
        next.money -= bill
        next.lastBill = Date.now()
        setMessage(`Conta chegou: -R$${bill}`)
        if (next.money < 0) {
          setMessage('Sem dinheiro. Propriedade em risco.')
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
      setMessage('Você está morto. Digite reset.')
      return
    }
    const [action, ...args] = cmd.toLowerCase().trim().split(/\s+/)
    const arg = args.join(' ')

    switch (action) {
      case 'status':
      case 's':
        setMessage(`Estresse: ${state.stress}/100 | R$${state.money.toFixed(0)} | Terra: ${state.land}ha | Plantas: ${state.plants.length} | Animais: ${state.animals.length}`)
        break
      case 'fish':
      case 'pescar':
        updateState({ stress: Math.max(0, state.stress - 15), money: state.money + 50 })
        setMessage('Pescou. +R$50. Estresse diminuiu.')
        break
      case 'plant':
      case 'plantar':
        if (state.money < 100) {
          setMessage('Sem dinheiro para sementes.')
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
        setMessage(`Plantou ${arg || 'milho'}.${newPlantCount > 15 ? ' Volume alto!' : ''}`)
        break
      case 'harvest':
      case 'colher':
        if (state.plants.length === 0) {
          setMessage('Nada para colher.')
          break
        }
        const ready = state.plants.filter(p => (Date.now() - p.plantedAt) > p.growthDays * 24 * 60 * 60 * 1000 / 10)
        if (ready.length === 0) {
          setMessage('Plantas ainda crescendo.')
          break
        }
        updateState({
          money: state.money + ready.length * 300,
          stress: Math.max(0, state.stress - 5),
          plants: state.plants.filter(p => !ready.includes(p))
        })
        setMessage(`Colheu ${ready.length}. +R$${ready.length * 300}`)
        break
      case 'animal':
      case 'criar':
        const tipo = arg || 'galinha'
        const info = ANIMAL_TYPES[tipo]
        if (!info) {
          setMessage('Tipos: galinha, vaca, porco')
          break
        }
        if (state.money < info.cost) {
          setMessage(`Sem dinheiro para ${info.name}.`)
          break
        }
        updateState({
          money: state.money - info.cost,
          stress: Math.max(0, Math.min(100, state.stress + info.stress)),
          animals: [...state.animals, { type: tipo, boughtAt: Date.now(), x: state.playerX, y: state.playerY }]
        })
        setMessage(`Criou ${info.name}.`)
        break
      case 'coletar':
      case 'produzir':
        if (state.animals.length === 0) {
          setMessage('Nenhum animal.')
          break
        }
        let total = 0
        state.animals.forEach(a => {
          const info = ANIMAL_TYPES[a.type]
          if (info) total += info.produce
        })
        updateState({ money: state.money + total, stress: Math.max(0, state.stress - 3) })
        setMessage(`Coletou +R$${total}`)
        break
      case 'expand':
      case 'expandir':
        if (state.money < 10000) {
          setMessage('Dinheiro insuficiente para expandir.')
          break
        }
        updateState({
          money: state.money - 10000,
          land: state.land + 5,
          stress: state.stress + 25
        })
        setMessage('Expandiu. Estresse aumentou.')
        break
      case 'weather':
      case 'clima':
        if (!state.location) {
          setMessage('Defina local com "local <cidade>"')
          break
        }
        setLoading(true)
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${state.location.lat}&longitude=${state.location.lon}&current=temperature_2m,precipitation,weather_code&timezone=auto`
          const res = await fetch(url)
          const data = await res.json()
          const cur = data.current
          setMessage(`${cur.temperature_2m}°C, precip ${cur.precipitation}mm`)
          if (cur.precipitation > 5) {
            updateState({ stress: state.stress + 5 })
          } else if (cur.temperature_2m > 30) {
            updateState({ stress: state.stress + 3 })
          } else {
            updateState({ stress: Math.max(0, state.stress - 2) })
          }
        } catch (e) {
          setMessage('Erro ao buscar clima.')
        }
        setLoading(false)
        break
      case 'local':
      case 'location':
        if (!arg) {
          setMessage('Uso: local <cidade>')
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
            setMessage(`Local: ${loc.name}`)
          } else {
            setMessage('Cidade não encontrada.')
          }
        } catch (e) {
          setMessage('Erro na geocodificação.')
        }
        setLoading(false)
        break
      case 'reset':
        localStorage.removeItem(STORAGE_KEY)
        setState(INITIAL_STATE)
        setMessage('Jogo resetado.')
        break
      case 'help':
      case '?':
        setMessage('Comandos: status, pescar, plantar, colher, criar, coletar, expandir, clima, local, reset')
        break
      default:
        setMessage('Comando desconhecido. help')
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      handleCommand(input)
      setInput('')
    }
  }

  const hour = new Date().getHours()
  const isNight = hour < 6 || hour > 18

  const stressClass = state.stress < 40 ? 'low' : state.stress < 70 ? 'medium' : 'high'

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
            background: isPlayer ? '#3d6b35' : 'rgba(0,0,0,0.04)',
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

        <div
          className="farm-view"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${MAP_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${MAP_ROWS}, 1fr)`,
          }}
        >
          {tiles}
        </div>

        <div className="message-box">
          {message}
          {loading && ' ...'}
          {!state.alive && ' === GAME OVER ==='}
        </div>

        {!state.alive && <div className="game-over">GAME OVER</div>}

        <div className="dpad">
          <button type="button" className="up" onClick={() => movePlayer(0, -1)}>↑</button>
          <button type="button" className="left" onClick={() => movePlayer(-1, 0)}>←</button>
          <button type="button" className="right" onClick={() => movePlayer(1, 0)}>→</button>
          <button type="button" className="down" onClick={() => movePlayer(0, 1)}>↓</button>
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
    </div>
  )
}
