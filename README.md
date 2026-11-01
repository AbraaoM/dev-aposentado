# Dev Aposentado

Hobby project: simulação text-based de um dev que se aposenta de big tech, dá rage quit e compra uma pequena propriedade rural perto de uma cidade pequena.

## Características

- Barra de estresse inicia altíssima.
- Atividades rurais podem acalmar ou estressar mais.
- Estresse alto por muito tempo → chance de infarto e game over.
- Pode virar latifundiário (atividades estressantes) ou apenas pescar (mais calmo).
- Contas chegam e corroem o patrimônio se não produzir.
- Tempo real: mesmo com o jogo fechado, o tempo passa (localStorage + timestamps).
- Plantas crescem em uma fração do tempo real.
- Dia do jogo = dia real.
- Sistema de dia/noite baseado no horário real.
- Clima conforme previsão do tempo do local escolhido (Open-Meteo, sem API key).
- Interface apenas de texto por enquanto (gráfica fica para depois).
- Feito em Next.js.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Comandos

- `status` / `s`: ver estresse, dinheiro, terra, plantas
- `fish` / `pescar`: pescar (reduz estresse)
- `plant` / `plantar [tipo]`: plantar
- `harvest` / `colher`: colher
- `expand` / `expandir`: expandir terra (vira latifundiário, aumenta estresse)
- `weather` / `clima`: buscar clima atual do local
- `local <cidade>`: definir localização (ex: local Pindamonhangaba)
- `reset`: recomeçar
- `help`: ajuda

## Notas

- Progresso salvo no localStorage do browser.
- Clima e geocoding via APIs gratuitas do Open-Meteo (não comercial).
- Não há objetivos "bonitinhos".

---

Projeto de hobby. Feito para ser subido no GitHub.
