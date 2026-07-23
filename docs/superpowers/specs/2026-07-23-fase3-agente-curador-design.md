# Design — Fase 3: Agente Curador de Conteúdo (Moxie)

- **Data:** 2026-07-23
- **Projeto (freela):** Moxie — plataforma de referências de conteúdo
- **Depende de:** Fase 1 (plataforma + `dados.json`) e Fase 2 (buscador Apify + skill `/moxie-referencias`).
- **Status:** aprovado para virar plano de implementação

---

## 1. Objetivo

Transformar a classificação de referências — hoje ad-hoc — num **curador de conteúdo da Moxie** que lê cada post estagiado pelo buscador, entende **o que é, o ângulo e a profundidade**, aloca no card certo com as tags certas, e **aprende com as decisões de Lucas ao longo do tempo** — sem fine-tuning, sem custo de API (roda como skill interativa na assinatura Claude), com humano sempre no loop na v1.

Fundamentação (pesquisa): rubric-locking corta inconsistência sem treinar; a autoconfiança de LLM é mal calibrada (não auto-aprovar no escuro); aprendizado sem fine-tuning = memória de decisões + few-shot dinâmico + destilação de regras; active learning prioriza os casos que mais ensinam; medir concordância é o sinal objetivo de evolução.

---

## 2. Persona do curador

O agente age como **curador de conteúdo e social media da Moxie — especialista em moda e em redes**, com anos de estrada. Características:

- **Pensa em gênero de conteúdo:** reconhece visual hook, bastidor (BTS), drop/lançamento, UGC, craft/produto, curadoria cultural, personagem/mascote.
- **Lê o ângulo estratégico:** o que o post está *fazendo* (parar o scroll? gerar desejo? provar qualidade? criar pertencimento? anunciar drop?), não só o que mostra.
- **Lê a profundidade — o teste da senha Moxie:** a referência tem camada (repertório, ironia, referência não óbvia) ou é enfeite/raso? Conteúdo raso pode ser rejeitado mesmo sendo "bonito".
- **É consistente:** a persona é a lente; o rubric + a memória de decisões garantem que o julgamento não varie ao sabor do humor.
- **É honesto sobre incerteza:** quando dois cards são plausíveis, expõe as alternativas; quando nada encaixa, diz e propõe card novo — não força.
- **Respeita a marca:** aplica o tom e os valores da Moxie (briefing + tom de voz) ao julgar relevância.

A persona completa vive na `SKILL.md` (system prompt do curador).

---

## 3. Arquitetura

A skill `/moxie-referencias` **evolui para o curador** (mesma porta de entrada, conteúdo novo). Nada de infra pesada: skill interativa + arquivos de dados versionados.

**Arquivos novos, em `agente/curador/` (versionados no git — não são segredo):**

- `criterios.md` — a **constituição de classificação** (o rubric-locking): rubric das 8 sensações (do spec Fase 1 §7), definições de funil e formato, o **teste de profundidade/senha**, e as **distinções de fronteira** entre cards vizinhos (ex: Produto de impacto vs. Abertura de carrinho; Cenário vs. Curadoria local). A lista e os mecanismos dos cards vêm ao vivo do `dados.json` (fonte única) — `criterios.md` é o guia de *como decidir*, não a lista.
- `decisoes.json` — o **log de decisões** (a memória). Uma entrada por post decidido (schema na §5).
- `regras_aprendidas.md` — **regras destiladas** das correções recorrentes, em linguagem legível.
- `concordancia.json` — **estatística de concordância** (proposta do agente vs. decisão final), global e por card (schema na §6).

---

## 4. O loop de curadoria (o que a SKILL.md instrui o Claude a fazer)

1. **Carregar contexto:** `criterios.md`, `regras_aprendidas.md`, a lista de cards do `dados.json`, e `agente/pendentes.json` + imagens.
2. **Para cada pendente, análise estruturada** (antes de decidir):
   - *o_que_é* — formato/mídia e o que aparece;
   - *ângulo* — o mecanismo dominante;
   - *profundidade* — raso vs. com camada (teste da senha);
   - *sinais* — legenda, hashtags, elementos visuais que ancoram.
3. **Few-shot dinâmico:** ler `decisoes.json` e selecionar as **decisões passadas mais relevantes** (mesmo card ou adjacente, correções, mesmo tipo de conteúdo) para condicionar a proposta. (Recuperação por leitura + julgamento do Claude; sem vetor/embedding enquanto o log couber no contexto.)
4. **Propor:** `card` + `funil`/`objetivo`/`sensacao`/`formato`/`rede` + **confiança** (alta/média/baixa) + **1–2 alternativas** com o porquê.
5. **Ordenar a apresentação por active learning:** primeiro os que mais ensinam — **novidade** (não encaixa em card), **fronteira** (dois cards plausíveis), **baixa confiança**; depois os de alta confiança. Apresentar de forma escaneável, **sempre com o link do post**.
6. **Lucas decide:** aprovar / ajustar (trocar card ou tags) / rejeitar.
7. **Registrar:** cada decisão vira entrada no `decisoes.json`; `concordancia.json` é atualizado.
8. **Publicar** os aprovados no `dados.json` + mover print + **deploy** (fluxo Fase 2: `gh auth switch` → push → restaura).
9. **Rejeitados/aprovados:** shortCode entra em `agente/vistos.json` (dedup) e sai de `pendentes.json` (igual Fase 2).

---

## 5. `decisoes.json` — schema

Array de entradas:
```json
{
  "shortCode": "DZGXjYwgYwO",
  "url": "https://www.instagram.com/p/DZGXjYwgYwO/",
  "handle": "@useasteric",
  "data": "2026-07-23",
  "analise": {
    "o_que_e": "carrossel flat-lay de jaqueta + contagem regressiva",
    "angulo": "teaser de lançamento (AW26)",
    "profundidade": "média — hook de antecipação, sem camada de repertório",
    "sinais": "legenda 'faltam 2 dias', 'AW26'"
  },
  "proposta": { "card": "drop-lancamento-teaser", "funil": "Topo", "objetivo": "Ser Visto",
                "sensacao": ["Curiosidade", "Oportunidade"], "formato": ["Carrossel"], "confianca": "alta" },
  "decisao": { "acao": "aprovado", "card_final": "drop-lancamento-teaser", "tags_final": null, "motivo": "" },
  "foi_correcao": false
}
```
- `acao`: `aprovado` | `ajustado` | `rejeitado`.
- `card_final`/`tags_final`: preenchidos quando `ajustado` (o que Lucas mudou). `null` quando aprovado sem ajuste.
- `foi_correcao`: true se `ajustado` ou `rejeitado` (sinal de aprendizado forte — priorizado no few-shot).

---

## 6. `concordancia.json` — schema

```json
{
  "total": 40,
  "aprovado_sem_ajuste": 31,
  "ajustado": 6,
  "rejeitado": 3,
  "taxa_concordancia_card": 0.90,
  "por_card": { "visual-hook-cenario": { "propostas": 5, "card_aceito": 5 }, "...": {} },
  "atualizado_em": "2026-07-23"
}
```
- **Métrica-chave:** `taxa_concordancia_card` = proporção de propostas em que Lucas manteve o **card** proposto (ajuste só de tag não conta como discordância de card). É o número que diz se o agente está aprendendo.
- `por_card` alimenta o futuro trust ramp: só cards com concordância alta e estável viram candidatos a auto-aprovação (Fase 3b, fora do escopo desta v1).

---

## 7. Destilação de regras

Passo periódico (rodado por Lucas quando quiser, ou sugerido pela skill a cada ~15 correções): o Claude lê as **correções** (`foi_correcao: true`) do `decisoes.json`, identifica **padrões recorrentes**, e propõe novas **regras explícitas** para o `regras_aprendidas.md` (ex: "post que anuncia 'disponível no site' + grid de coleção → Abertura de carrinho, não Produto de impacto"). **Lucas aprova cada regra** antes de entrar. As regras aprovadas passam a ser carregadas no passo 1 do loop — o aprendizado vira legível e permanente, não só latente no log.

---

## 8. Trust ramp (autonomia por mérito)

- **v1 (este spec): 100% humano no loop.** O agente propõe; Lucas decide tudo. A `concordancia.json` acumula.
- **Fase 3b (fora do escopo, futuro):** quando `por_card` mostrar concordância alta e estável (ex: ≥ 0.9 em ≥ 15 decisões daquele card), a skill pode oferecer auto-aprovar aquele tipo, mantendo fronteira/novidade sempre no humano. Não se constrói auto-aprovação agora — só a medição que a habilita.

---

## 9. Primeiro treino — os 53 pendentes

O buscador já estagiou 53 posts. O curador os processa como **primeiro lote de treino**, em **lotes curados no ritmo de Lucas** (não os 53 de uma vez): ordenados por active learning, apresentados em blocos, cada decisão semeando o `decisoes.json`. Ao fim do primeiro treino, a memória tem uma base real e a `concordancia.json` tem o baseline.

---

## 10. Não-objetivos (YAGNI)

- Sem fine-tuning / treino de modelo.
- Sem auto-aprovação/auto-publicação na v1 (só a medição que a habilita depois).
- Sem vetor/embedding pra recuperação enquanto o `decisoes.json` couber no contexto (revisitar se crescer pra centenas).
- Sem custo de API — é skill interativa (assinatura Claude). Sem mudar o buscador (Fase 2 intacta).

---

## 11. Critérios de sucesso

- O curador produz, por post, análise (o que é / ângulo / profundidade / sinais) + proposta com card, tags, confiança e alternativas — ancorado no `criterios.md`.
- Cada decisão de Lucas é registrada no `decisoes.json`; `concordancia.json` reflete a taxa de acerto.
- O few-shot usa decisões passadas (o agente cita quais influenciaram, quando relevante).
- A destilação transforma correções recorrentes em regras aprovadas no `regras_aprendidas.md`.
- Ao longo das rodadas, a `taxa_concordancia_card` sobe (evidência de aprendizado).
- Os 53 pendentes viram decisões reais; os aprovados publicam e propagam.

---

## 12. Pendências pro plano/implementação

- Nome da skill: manter `/moxie-referencias` (porta conhecida) evoluindo o conteúdo, vs. renomear pra `/moxie-curador`. Default: manter `moxie-referencias`.
- Definir o gatilho de destilação (manual vs. sugerido a cada N correções). Default: sugerido a cada ~15 correções + sob demanda.
- Semear `criterios.md` com as distinções de fronteira iniciais (as que já apareceram: Produto de impacto vs. Abertura de carrinho; Cenário vs. Curadoria local; Mascote vs. UGC).
