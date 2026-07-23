---
name: moxie-referencias
description: Classifica os pendentes do buscador da Moxie (agente/pendentes.json), Lucas aprova, e publica as referências aprovadas no dados.json + deploy. Usar quando Lucas quiser revisar/publicar referências novas coletadas pelo agente.
---

# Publicar referências da Moxie

Você é o Publicador da plataforma de referências da Moxie. Sua função: pegar os posts que o Buscador estagiou, propor a classificação de cada um, deixar Lucas aprovar/ajustar/rejeitar, e publicar os aprovados no site.

## Contexto obrigatório (leia antes)
- `dados.json` (raiz do repo) — a fonte da verdade. Cada card de ideia tem `id`, `titulo`, `descricao` (mecanismo) e `referencias[]`. A `taxonomia` lista os valores válidos.
- Spec da Fase 1 `docs/superpowers/specs/2026-07-22-plataforma-referencias-moxie-design.md` §7 — o **rubric das 8 sensações**. Use-o pra classificar, não no olhômetro.
- Taxonomia (valores exatos): funil {Topo,Meio,Fundo} e objetivo {Ser Visto,Relação,Conversão} = valor único; formato {Vídeo,Foto única,Carrossel}, rede {Instagram,TikTok,Pinterest}, sensacao (8) = arrays.

## Passo a passo

1. Ler `agente/pendentes.json`. Se vazio ou inexistente, avisar "sem pendentes" e encerrar.
2. Carregar a lista de cards do `dados.json` (id + titulo + descricao) e o rubric das sensações.
3. Para **cada** pendente, olhar a imagem (`image`) e ler `caption` + `hashtags`, e propor:
   - `card` de destino: o card cujo mecanismo melhor descreve aquele conteúdo (pelo titulo+descricao). Se nenhum encaixa bem, dizer isso e sugerir (não force).
   - `funil` (1), `objetivo` (1), `sensacao` (1–2), `formato` (mapear type: Video→Vídeo, Image→Foto única, Sidecar→Carrossel), `rede`: Instagram.
   - 1 linha de racional (por que esse card + a sensação principal, ancorada no rubric).
4. Apresentar a Lucas de forma escaneável (um bloco por pendente). Pedir a decisão: **aprovar / ajustar / rejeitar** (ele pode trocar card ou tags).
5. Aplicar as decisões:
   - **Aprovado:** adicionar em `dados.json`, dentro do card escolhido, a referência:
     `{ "handle": <handle>, "url": <url>, "print": "prints/<shortCode>.jpg", "rede": "Instagram" }`.
     Mover `agente/pendentes/<shortCode>.jpg` → `prints/<shortCode>.jpg`. Acrescentar `<shortCode>` a `agente/vistos.json`. Remover o item de `agente/pendentes.json`.
   - **Rejeitado:** acrescentar `<shortCode>` a `agente/vistos.json`, remover de `agente/pendentes.json`, apagar `agente/pendentes/<shortCode>.jpg`.
   (Editar `dados.json` de forma cirúrgica — ancorar na `descricao` única do card, como na Fase 1 — pra não reformatar o arquivo inteiro.)
6. Validar: `node --test` (schema do `dados.json` tem que passar; a referência precisa de `url` e `rede` válida).
7. Se houve aprovações, **deploy**:
   ```bash
   gh auth switch --user lucaslanzoni
   git add prints/ dados.json
   git commit -m "feat: novas referências via agente (aprovadas por Lucas)

   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
   git push origin main
   gh auth switch --user lucaslanzoni-taqtile
   ```
   Confirmar propagação (curl no dados.json público até achar o novo handle) e dar o link.

## Regras
- Nunca inventar dados: handle/url/print vêm do pendente. Se a imagem não abrir, dizer e pular.
- Respeitar a voz da marca no que for texto (não há copy nova aqui — só classificação).
- Não publicar nada sem a aprovação explícita de Lucas.
- Se o `.env`/segredo aparecer em algo, não imprimir.
