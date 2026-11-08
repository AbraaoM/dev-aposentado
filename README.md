# Dev Aposentado

Hobby project: simulação de um dev que se aposenta de big tech, dá rage quit e compra uma pequena propriedade rural perto de uma cidade pequena.

## Interface

**Somente texto** (terminal).

## Criação de personagem

### Classes (carreira de origem)

| Classe | Descrição |
|--------|----------|
| `especialista` | Desenvolvedor Especialista — Lógica no máximo. "Sabe exatamente por que o código quebrou. Só não sabe explicar para o PM." |
| `pm` | Product Manager — Carisma alto, lógica baixa. "Alinha expectativas. Principalmente as que ninguém pediu." |
| `devops` | DevOps / SRE — Resiliência alta. "O sistema está no ar. Você não está." |
| `qa` | QA / Testador — "Encontra o bug que o especialista jurou que não existia." |
| `gerente` | Gerente de TI — 1% de chance de ser bom em tudo. "Os outros 99% são reuniões." |

### Empresa de origem

| Empresa | Dinheiro | Estresse | Atributos |
|---------|----------|----------|-----------|
| `bigtech` | R$180.000 | 98 | +2 (melhor) |
| `grande` | R$70.000 | 75 | base |
| `local` | R$35.000 | 50 | -1 (pior) |

Big Tech pode infartar até no primeiro dia.

### Atributos

- Lógica
- Carisma
- Resiliência
- Gestão

## Características

- Barra de estresse inicia de acordo com a empresa.
- Plantar acalma, mas gestão de grande volume de plantação estressa.
- Animais de fazenda: galinha (acalma), vaca e porco (gestão pode estressar).
- Atividades rurais podem acalmar ou estressar mais.
- Estresse alto por muito tempo → chance de infarto e game over.
- Pode virar latifundiário (atividades estressantes) ou apenas pescar (mais calmo).
- Contas chegam e corroem o patrimônio se não produzir.
- Tempo real: mesmo com o jogo fechado, o tempo passa.
- Plantas crescem em uma fração do tempo real.
- Dia do jogo = dia real.
- Sistema de dia/noite baseado no horário real.
- Clima conforme previsão do tempo do local escolhido (Open-Meteo, sem API key).
- Persistência via Neon Postgres (serverless) ou localStorage como fallback.
- Feito em Next.js (web).

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Configurar Neon (persistência)

1. Crie um projeto gratuito em https://console.neon.tech
2. Copie a connection string (com pooling).
3. Crie `.env.local` na raiz:
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
   ```
4. Reinicie o `npm run dev`. A tabela `game_saves` é criada automaticamente.

Sem `DATABASE_URL` o jogo funciona com localStorage.

## Comandos (após criação)

- `status` / `s`: ver estresse, dinheiro, terra, plantas, animais e atributos
- `fish` / `pescar`: pescar (reduz estresse)
- `plant` / `plantar [tipo]`: plantar (acalma; volume grande estressa)
- `harvest` / `colher`: colher
- `animal` / `criar [galinha|vaca|porco]`: criar animal
- `coletar`: coletar produção dos animais
- `expand` / `expandir`: expandir terra (vira latifundiário, aumenta estresse)
- `weather` / `clima`: buscar clima atual do local
- `local <cidade>`: definir localização (ex: local Pindamonhangaba)
- `reset`: recomeçar (escolhe classe de novo)
- `help`: ajuda

## Notas

- Progresso salvo no Neon (JSONB) ou localStorage.
- Clima e geocoding via APIs gratuitas do Open-Meteo (não comercial).
- Não há objetivos "bonitinhos".

---

Projeto de hobby. Feito para ser subido no GitHub.
