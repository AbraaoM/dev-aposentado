'use client'

import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'dev-aposentado-save'

const INITIAL_STATE = {
  stress: 95, // starts very high
  money: 50000, // from big tech exit / savings
  land: 5, // hectares
  plants: [], // {type, plantedAt, growthDays}
  lastUpdate: Date.now(),
  highStressTime: 0, // ms spent with stress > 70
  location: null, // {name, lat, lon, timezone}
  logs: ['Você deu rage quit na big tech. Comprou uma pequena propriedade rural perto de uma cidade pequena. O estresse está nas alturas. As contas vão chegar. Não há objetivos bonitinhos.'],
  alive: true,
  billsInterval: 7 * 24 * 60 * 60 * 1000, // 7 real days
  lastBill: Date.now(),
}

export default function Home() {
  const [state, setState] = useState(INITIAL_STATE)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const terminalRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // catch up on real time
        const now = Date.now()
        const elapsed = now - (parsed.lastUpdate || now)
        parsed.lastUpdate = now
        // simple stress decay or increase based on time? for now just update highStressTime
        if (parsed.stress > 70) {
          parsed.highStressTime = (parsed.highStressTime || 0) + elapsed
        }
        // plant growth: fraction of real time, say 1 real day = 1 growth day but accelerated? user said fraction of real time
        // for simplicity, plants grow based on real hours * factor
        setState(parsed)
        addLog('Jogo carregado. O tempo passou enquanto você estava fora.')
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [state])

  const addLog = (msg) => {
    setState(s => ({ ...s, logs: [...s.logs.slice(-50), msg] })) // keep last 50
  }

  const updateState = (updates) => {
    setState(s => {
      const next = { ...s, ...updates, lastUpdate: Date.now() }
      // check heart attack
      if (next.stress > 70) {
        next.highStressTime = (s.highStressTime || 0) + (Date.now() - s.lastUpdate)
      } else {
        next.highStressTime = Math.max(0, (s.highStressTime || 0) - 1000 * 60 * 60) // recover slowly
      }
      if (next.highStressTime > 1000 * 60 * 60 * 24 * 3 && next.alive) { // 3 real days high stress
        const chance = Math.random()
        if (chance < 0.3) {
          next.alive = false
          next.logs = [...next.logs, 'INFARTO! O estresse alto por muito tempo te pegou. Game over.']
        } else {
          next.logs = [...next.logs, 'Você quase infartou, mas sobreviveu. O estresse ainda está alto.']
          next.highStressTime = 0
        }
      }
      // bills
      if (Date.now() - next.lastBill > next.billsInterval) {
        const bill = 2000 + next.land * 100
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
        addLog(`Estresse: ${state.stress}/100 | Dinheiro: R$${state.money.toFixed(0)} | Terra: ${state.land} ha | Plantas: ${state.plants.length}`)
        if (state.location) addLog(`Local: ${state.location.name}`)
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
        updateState({
          money: state.money - 100,
          stress: state.stress + 5,
          plants: [...state.plants, { type: arg || 'milho', plantedAt: Date.now(), growthDays: 3 }]
        })
        addLog(`Plantou ${arg || 'milho'}. Pode ser calmo ou estressante dependendo do clima.`)
        break
      case 'harvest':
      case 'colher':
        if (state.plants.length === 0) {
          addLog('Nada para colher.')
          break
        }
        const ready = state.plants.filter(p => (Date.now() - p.plantedAt) > p.growthDays * 24 * 60 * 60 * 1000 / 10) // 10x faster than real
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
          // affect stress based on weather
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
        addLog('Comandos: status, fish/pescar, plant/plantar [tipo], harvest/colher, expand/expandir, weather/clima, local <cidade>, reset, help')
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

  // day/night simple based on local time
  const hour = new Date().getHours()
  const isNight = hour < 6 || hour > 18

  return (
    <div>
      <h1>Dev Aposentado</h1>
      <p>Interface de texto. Dia real = dia do jogo. Plantas crescem em fração do tempo real. Clima via Open-Meteo.</p>
      <div className="terminal" ref={terminalRef}>
        {state.logs.join('\n')}
        {isNight && '\n[É noite no mundo real]'}
        {loading && '\nCarregando...'}
        {!state.alive && '\n=== GAME OVER ==='}
      </div>
      <form onSubmit={onSubmit} className="input-line">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Digite um comando (help para ajuda)..."
          disabled={!state.alive && input !== 'reset'}
          autoFocus
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  )
}
