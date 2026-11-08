'use client'

import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'dev-aposentado-save'
const PLAYER_ID_KEY = 'dev-aposentado-player-id'

const CLASSES = {
  especialista: {
    name: 'Desenvolvedor Especialista',
    joke: 'Sabe exatamente por que o código quebrou. Só não sabe explicar para o PM.',
    base: { logica: 10, carisma: 2, resiliencia: 4, gestao: 1 }
  },
  pm: {
    name: 'Product Manager',
    joke: 'Alinha expectativas. Principalmente as que ninguém pediu.',
    base: { logica: 3, carisma: 9, resiliencia: 5, gestao: 7 }
  },
  devops: {
    name: 'DevOps / SRE',
    joke: 'O sistema está no ar. Você não está.',
    base: { logica: 8, carisma: 3, resiliencia: 9, gestao: 4 }
  },
  qa: {
    name: 'QA / Testador',
    joke: 'Encontra o bug que o especialista jurou que não existia.',
    base: { logica: 7, carisma: 4, resiliencia: 6, gestao: 2 }
  },
  gerente: {
    name: 'Gerente de TI',
    joke: '1% de chance de ser bom em tudo. Os outros 99% são reuniões.',
    base: { logica: 4, carisma: 6, resiliencia: 3, gestao: 8 },
    special: true
  }
}

const COMPANIES = {
  bigtech: {
    name: 'Big Tech',
    money: 180000,
    stress: 98,
    attrBonus: 2,
    desc: 'Mais dinheiro e atributos melhores. Estresse no teto. Pode infartar no primeiro dia.'
  },
  grande: {
    name: 'Empresa Grande',
    money: 70000,
    stress: 75,
    attrBonus: 0,
    desc: 'Atributos medianos. Estresse alto, mas não insano.'
  },
  local: {
    name: 'Empresa Local',
    money: 35000,
    stress: 50,
    attrBonus: -1,
    desc: 'Atributos mais baixos. Estresse inicial bem menor.'
  }
}

const ANIMAL_TYPES = {
  galinha: { cost: 200, stress: -3, produce: 30, name: 'galinha' },
  vaca: { cost: 2000, stress: 5, produce: 200, name: 'vaca' },
  porco: { cost: 800, stress: 2, produce: 80, name: 'porco' },
}

function rollAttributes(classKey, companyKey) {
  const cls = CLASSES[classKey]
  const comp = COMPANIES[companyKey]
  let attrs = { ...cls.base }

  if (cls.special && Math.random() < 0.01) {
    attrs = { logica: 10, carisma: 10, resiliencia: 10, gestao: 10 }
  } else {
    Object.keys(attrs).forEach(k => {
      attrs[k] = Math.max(1, Math.min(10, attrs[k] + (comp.attrBonus || 0)))
    })
  }
  return attrs
}

export default function Home() {
  const [state, setState] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState(null)
  const [phase, setPhase] = useState('class') // class | company | playing
  const [selectedClass, setSelectedClass] = useState(null)
  const logRef = useRef(null)
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
        if (data.state && data.state.classKey) {
          const parsed = data.state
          const now = Date.now()
          const elapsed = now - (parsed.lastUpdate || now)
          parsed.lastUpdate = now
          if (parsed.stress > 70) {
            parsed.highStressTime = (parsed.highStressTime || 0) + elapsed
          }
          setState(parsed)
          setPhase('playing')
        } else {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              if (parsed.classKey) {
                const now = Date.now()
                const elapsed = now - (parsed.lastUpdate || now)
                parsed.lastUpdate = now
                if (parsed.stress > 70) {
                  parsed.highStressTime = (parsed.highStressTime || 0) + elapsed
                }
                setState(parsed)
                setPhase('playing')
                return
              }
            } catch (e) {}
          }
          setPhase('class')
        }
      })
      .catch(() => setPhase('class'))
  }, [])

  useEffect(() => {
    if (!state) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    if (playerId && state.alive && phase === 'playing') {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, state })
        }).catch(() => {})
      }, 1500)
    }
  }, [state, playerId, phase])

  const addLog = (msg) => {
    setState(s => s ? { ...s, logs: [...s.logs.slice(-40), msg] } : s)
  }

  const updateState = (updates) => {
    setState(s => {
      if (!s) return s
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

  const startGame = (classKey, companyKey) => {
    const cls = CLASSES[classKey]
    const comp = COMPANIES[companyKey]
    const attrs = rollAttributes(classKey, companyKey)
    const isGod = attrs.logica === 10 && attrs.carisma === 10 && attrs.resiliencia === 10 && attrs.gestao === 10

    const newState = {
      stress: comp.stress,
      money: comp.money,
      land: 5,
      plants: [],
      animals: [],
      lastUpdate: Date.now(),
      highStressTime: 0,
      location: null,
      logs: [
        `Você se aposentou de ${comp.name} como ${cls.name}.`,
        cls.joke,
        isGod ? 'MILAGRE: Você é o 1% que é bom em tudo. Os outros gerentes choram.' : '',
        `Atributos — Lógica: ${attrs.logica} | Carisma: ${attrs.carisma} | Resiliência: ${attrs.resiliencia} | Gestão: ${attrs.gestao}`,
        `Dinheiro inicial: R$${comp.money} | Estresse inicial: ${comp.stress}/100`,
        'Comprou uma pequena propriedade rural perto de uma cidade pequena. As contas vão chegar. Não há objetivos bonitinhos.'
      ].filter(Boolean),
      alive: true,
      billsInterval: 7 * 24 * 60 * 60 * 1000,
      lastBill: Date.now(),
      classKey,
      className: cls.name,
      companyKey,
      companyName: comp.name,
      attributes: attrs
    }
    setState(newState)
    setPhase('playing')
  }

  const handleCommand = async (cmd) => {
    if (phase === 'class') {
      const key = cmd.toLowerCase().trim()
      if (CLASSES[key]) {
        setSelectedClass(key)
        setPhase('company')
        setInput('')
        return
      }
      setInput('')
      return
    }
    if (phase === 'company') {
      const key = cmd.toLowerCase().trim()
      if (COMPANIES[key] && selectedClass) {
        startGame(selectedClass, key)
        setInput('')
        return
      }
      setInput('')
      return
    }

    if (!state || !state.alive) {
      addLog('Você está morto. Digite "reset".')
      return
    }
    const [action, ...args] = cmd.toLowerCase().trim().split(/\s+/)
    const arg = args.join(' ')

    switch (action) {
      case 'status':
      case 's':
        addLog(`Estresse: ${state.stress}/100 | Dinheiro: R$${state.money.toFixed(0)} | Terra: ${state.land} ha | Plantas: ${state.plants.length} | Animais: ${state.animals.length}`)
        addLog(`Classe: ${state.className} | Empresa: ${state.companyName}`)
        addLog(`Lógica: ${state.attributes.logica} | Carisma: ${state.attributes.carisma} | Resiliência: ${state.attributes.resiliencia} | Gestão: ${state.attributes.gestao}`)
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
          plants: [...state.plants, { type: arg || 'milho', plantedAt: Date.now(), growthDays: 3 }]
        })
        addLog(`Plantou ${arg || 'milho'}. Plantar acalma, mas gestão de volume grande estressa.${newPlantCount > 15 ? ' (volume alto!)' : ''}`)
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
          animals: [...state.animals, { type: tipo, boughtAt: Date.now() }]
        })
        addLog(`Criou ${info.name}. ${info.stress < 0 ? 'Acalma um pouco.' : 'A gestão pode estressar.'}`)
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
        setState(null)
        setSelectedClass(null)
        setPhase('class')
        addLog('Jogo resetado. Escolha sua classe.')
        break
      case 'help':
      case '?':
        addLog('Comandos: status, fish/pescar, plant/plantar [tipo], harvest/colher, animal/criar [galinha|vaca|porco], coletar, expand/expandir, weather/clima, local <cidade>, reset, help')
        break
      default:
        addLog('Comando desconhecido. Digite help.')
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      if (phase === 'playing' && state) {
        addLog(`> ${input}`)
      }
      handleCommand(input)
      setInput('')
    }
  }

  const classPrompt = `Escolha sua carreira de origem:\n\n` +
    Object.entries(CLASSES).map(([k, v]) => `${k} — ${v.name}\n   ${v.joke}`).join('\n') +
    `\n\nDigite o nome da classe (especialista, pm, devops, qa, gerente):`

  const companyPrompt = selectedClass
    ? `Você escolheu: ${CLASSES[selectedClass].name}\n\nEscolha a empresa de origem:\n\n` +
      Object.entries(COMPANIES).map(([k, v]) => `${k} — ${v.name}\n   ${v.desc}\n   Dinheiro: R$${v.money} | Estresse inicial: ${v.stress}`).join('\n\n') +
      `\n\nDigite: bigtech, grande ou local`
    : ''

  return (
    <div className="terminal">
      <pre className="log" ref={logRef}>
        {phase === 'class' && classPrompt}
        {phase === 'company' && companyPrompt}
        {phase === 'playing' && state && state.logs.join('\n')}
        {loading && '\nCarregando...'}
        {phase === 'playing' && state && !state.alive && '\n=== GAME OVER ==='}
      </pre>
      <form onSubmit={onSubmit} className="input-line">
        <span>> </span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={phase === 'class' ? 'especialista / pm / devops / qa / gerente' : phase === 'company' ? 'bigtech / grande / local' : 'comando (help)'}
          disabled={phase === 'playing' && state && !state.alive && input !== 'reset'}
          autoFocus
        />
      </form>
    </div>
  )
}
