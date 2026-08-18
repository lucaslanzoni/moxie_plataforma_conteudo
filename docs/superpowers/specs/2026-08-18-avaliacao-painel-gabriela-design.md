# Avaliação de referências pela Gabriela (segundo input de aprendizado)

Data: 2026-08-18
Status: implementado

## Objetivo

Dar à fundadora (Gabriela) uma forma de aprovar/rejeitar as **referências** que estão
no painel — um **segundo input de aprendizado** (o primeiro foram os exemplares-ouro do
ensaio). Sinaliza o que ela usa / não usa / o que é bom / o que não serviu.

## Escopo

- Feedback **por referência** (cada print/post), não por card de ideia.
- **Zero backend** (o site é estático): persiste em `localStorage` + **export** manual.
- Não altera `dados.json` nem a coleta/curadoria.

## Comportamento (painel)

- **Hover no print** → aparecem 👍 verde (aprovar) e ✕ vermelho (rejeitar). No mobile
  (sem hover) os ícones ficam sempre visíveis.
- **Clicar em qualquer outra parte do print** → abre o post no Instagram (comportamento
  original preservado). Os ícones fazem `preventDefault`/`stopPropagation`.
- **Aprovada** → tag verde "aprovado" + anel verde; fica na visão.
- **Rejeitada** → **arquivada**: some da visão inicial pra não poluir. Cards que ficam
  só com rejeitadas também somem. Toggle **"Arquivadas (N)"** na barra revela as
  arquivadas (apagadas, com tag) e permite desarquivar.
- Clicar de novo no mesmo ícone desfaz (volta a neutro). Estados persistem entre sessões.

## Export (o input de aprendizado)

- Botão **"Enviar avaliações (N)"** em destaque (âmbar) na barra. Abre overlay com
  resumo + JSON, botões **Copiar** e **Baixar .json**. Ela manda pro Lucas.
- Payload: `{ marca, tipo:"avaliacoes-painel", email, gerado_em, resumo, avaliacoes[] }`,
  cada avaliação `{ shortCode, estado, handle, url, quando, email }`.
- Sem contato hardcoded (repo público).

## Arquivos

- `assets/feedback.js` (novo) — localStorage (`moxie_feedback_v1`) + payload de export.
- `assets/app.js` — render da referência com os botões, overlay de export, toggle arquivo.
- `index.html` — botões "Enviar avaliações" e "Arquivadas".
- `assets/estilo.css` — estados (aprovado/rejeitado), ícones, arquivo, overlay.

## Fora de escopo (Fase 2)

Ingestão do export no curador: aprovadas viram sinal de qualidade (tipo os exemplares),
rejeitadas viram sinal de cortar + a **limpeza** (remover do `dados.json`). Script/skill
do lado do curador, a construir depois.
