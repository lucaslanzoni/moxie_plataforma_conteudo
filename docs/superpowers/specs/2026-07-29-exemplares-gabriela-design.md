# Exemplares-ouro da Gabriela — calibração de taste do curador

Data: 2026-07-29
Status: design aprovado por Lucas

## Objetivo

Usar as fotos do ensaio da Moxie **aprovadas pela fundadora (Gabriela)** como âncora
de calibração do curador de conteúdo (`/moxie-referencias`). Elas ensinam **duas coisas**:

- **Bar de taste** — o critério estético/de humor que a Gabriela considera "bom o bastante".
- **Rótulo de card** — que tipo de imagem representa cada ideia do catálogo.

É um sinal da **fundadora**, distinto do loop operacional de aprovação do Lucas.

## Escopo

- **Só treino do curador.** NÃO entram no painel — `dados.json` fica intocado.
- **Trilha própria.** NÃO usa `decisoes.json` / `concordancia.json` — não polui a
  métrica de concordância (que mede proposta-do-Claude vs. decisão-do-Lucas).

## Componentes

1. `agente/curador/exemplares/*.jpg` — imagens **deduplicadas** (~15-18 das 30),
   downscaled (~1200px), versionadas no git para o curador conseguir abrir e ver.
   As full-res (até 20 MB) seguem no Drive da Gabriela.
2. `agente/curador/exemplares_gabriela.json` — conjunto rotulado. Por imagem:
   `{arquivo, origem, card, funil, objetivo, sensacao[], formato, o_que_e, por_que_funciona}`.
   Agrupável por card.
3. `agente/curador/criterios.md` — nova seção **"Taste da Gabriela"**: 3-5 princípios
   destilados dos 30 (destila de todos, mesmo os cortados no dedup visual).
4. `.claude/skills/moxie-referencias/SKILL.md` — `exemplares_gabriela.json` entra no
   "contexto obrigatório" como **âncora de calibração**, priorizada no few-shot junto
   das correções do Lucas.

## Fluxo

1. Claude lê + classifica as 30, deduplica.
2. Gera **board de validação** (card + taste por exemplar; mostra os cortes do dedup).
3. **Lucas (ou Gabriela) valida/ajusta.** ← gate humano
4. Grava o JSON, move as imagens, destila `criterios.md`, edita `SKILL.md`. Commit.

## Casos de borda

- Imagem sem card claro → vira âncora só de taste, ou proposta de card novo. Não força.
- Rótulo errado = treino errado → por isso o gate de validação humana antes de gravar.

## Fora de escopo

Painel / `dados.json`; alteração da métrica de concordância; publicação das imagens full-res.
