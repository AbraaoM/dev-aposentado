# Dev Aposentado

Hobby project: simulação text-based de um dev que se aposenta de big tech, dá rage quit e compra uma pequena propriedade rural perto de uma cidade pequena.

## Características

- Barra de estresse inicia altíssima.
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
- Interface apenas de texto por enquanto (gráfica fica para depois).
- Feito em Next.js.

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

## Comandos

- `status` / `s`: ver estresse, dinheiro, terra, plantas, animais
- `fish` / `pescar`: pescar (reduz estresse)
- `plant` / `plantar [tipo]`: plantar (acalma; volume grande estressa)
- `harvest` / `colher`: colher
- `animal` / `criar [galinha|vaca|porco]`: criar animal
- `coletar`: coletar produção dos animais
- `expand` / `expandir`: expandir terra (vira latifundiário, aumenta estresse)
- `weather` / `clima`: buscar clima atual do local
- `local <cidade>`: definir localização (ex: local Pindamonhangaba)
- `reset`: recomeçar
- `help`: ajuda

## Notas

- Progresso salvo no Neon (JSONB) ou localStorage.
- Clima e geocoding via APIs gratuitas do Open-Meteo (não comercial).
- Não há objetivos "bonitinhos".

---

Projeto de hobby. Feito para ser subido no GitHub.
