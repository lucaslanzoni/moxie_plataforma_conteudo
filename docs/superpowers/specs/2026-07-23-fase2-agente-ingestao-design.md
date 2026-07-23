# Design — Fase 2: Agente de Ingestão de Referências (Moxie)

- **Data:** 2026-07-23
- **Projeto (freela):** Moxie — plataforma de referências de conteúdo
- **Depende de:** Fase 1 (plataforma no ar, `dados.json`, schema). Spec Fase 1: `docs/superpowers/specs/2026-07-22-plataforma-referencias-moxie-design.md`
- **Status:** aprovado para virar plano de implementação

---

## 1. Objetivo

Automatizar o que na Fase 1 foi feito à mão: encontrar posts reais de contas-fonte, capturar o print, classificar (funil/objetivo/sensação/formato/rede + card de destino) e publicar como referência no `dados.json` — mantendo Lucas no loop de aprovação. Sem custo relevante (Apify free tier + skill do Claude na assinatura de Lucas).

**Validado antes deste doc:** conexão Apify OK (conta `agente_lucas`, plano FREE, US$5/mês) e uma varredura real de teste (@sometimes.online, 3 posts, ~US$0,01) retornou `url + legenda + displayUrl (imagem) + hashtags + tipo`. O caminho de sourcing está comprovado.

---

## 2. Arquitetura — duas peças

```
[launchd] Buscador (Python, sem IA, sem git)      Publicador (skill interativa do Claude)
  Apify scrape contas-fonte                          lê pendentes.json + imagens
  → dedup contra dados.json + vistos.json            → Claude classifica (visão + rubric)
  → baixa imagens novas p/ agente/pendentes/         → Lucas aprova/ajusta/rejeita
  → escreve agente/pendentes.json                    → grava em dados.json, move print
                                                      → valida, commit, push, redeploy
```

**Separação de responsabilidades (chave):**
- O **Buscador** roda desatendido (launchd), só precisa do `APIFY_TOKEN` (lê do `.env`, que funciona onde o keychain não funciona em background). Não toca git, não classifica, não publica. Puramente mecânico → robusto e barato.
- O **Publicador** é uma **skill interativa** que Lucas invoca. Aqui entram a visão/julgamento do Claude (classificação) e a aprovação humana, no mesmo passo. Usa a assinatura Claude de Lucas (sem custo de API) e a conta pessoal dele pro deploy.

---

## 3. Peça 1 — Buscador (`agente/buscar.py`)

**Entrada:** `agente/contas_fonte.json` (lista de perfis) + `agente/config.json` (limites).

**Fluxo:**
1. Carrega `APIFY_TOKEN` do `.env` (raiz do repo) via parse simples (sem depender de env vars do launchd).
2. Para cada conta-fonte, chama o actor `apify/instagram-scraper` via `run-sync-get-dataset-items` com input `{ "directUrls": ["https://www.instagram.com/<conta>/"], "resultsType": "posts", "resultsLimit": <N> }`. (Campos confirmados no teste real.)
3. **Dedup** — descarta posts já conhecidos, cruzando o `shortCode`/`url` do post contra:
   - todas as `referencias[].url` do `dados.json` (já publicados), e
   - `agente/vistos.json` (ledger local de shortcodes já estagiados — aprovados OU rejeitados; evita re-estagiar rejeitado).
4. Para cada post **novo**: baixa `displayUrl` para `agente/pendentes/<shortCode>.jpg` (otimiza p/ ~900px, como na Fase 1), e adiciona ao `agente/pendentes.json` um objeto:
   ```json
   { "shortCode": "DbEpVZBhHNa", "url": "https://www.instagram.com/p/DbEpVZBhHNa/",
     "handle": "@sometimes.online", "type": "Video", "caption": "...", "hashtags": ["..."],
     "image": "agente/pendentes/DbEpVZBhHNa.jpg", "scraped_at": "2026-07-23T.." }
   ```
5. Registra no log: nº de itens buscados, nº de novos estagiados, custo estimado (itens × US$2,70/1000).

**Controle de custo (crédito não acumula, US$5/mês):**
- `resultsLimit` pequeno por conta (default 5) e nº de contas moderado.
- **Filtro incremental:** o Buscador guarda `agente/last_run.txt` e, a partir da 2ª execução, restringe a busca a posts novos desde a última rodada (via o parâmetro de data do actor, se disponível — confirmar o nome exato do campo no plano; senão, o dedup já corta o reprocessamento, só não economiza o scrape).
- Log de custo acumulado no mês; se aproximar de US$5, o Buscador avisa e para (guard).

**Agendamento:** launchd `com.lucas.moxie-buscador.plist`, `StartInterval` diário (86400s) + `RunAtLoad`. Também roda à mão (`python3 agente/buscar.py`). Log em `~/Library/Logs/moxie-buscador.log` (padrão dos outros agentes de Lucas).

**O Buscador NÃO faz git.** Ele só escreve arquivos locais (todos gitignored — ver §6).

---

## 4. Peça 2 — Publicador (skill `.claude/skills/moxie-referencias/`)

Skill de projeto, invocada por Lucas (`/moxie-referencias`) numa sessão Claude Code dentro do repo.

**Fluxo que a skill instrui o Claude a seguir:**
1. Ler `agente/pendentes.json` e as imagens em `agente/pendentes/`. Se vazio, avisar e encerrar.
2. Carregar o **rubric de classificação** (§7 do spec da Fase 1) e a lista dos cards (títulos + mecanismos do `dados.json`).
3. Para cada pendente: o Claude **olha a imagem + lê legenda/hashtags** e propõe:
   - `card` de destino (um dos existentes, pelo mecanismo; ou sugere card novo se nenhum encaixa),
   - `funil` · `objetivo` · `sensacao[]` · `formato` · `rede`,
   - uma linha de racional (por que esse card/essas tags).
4. Apresenta a Lucas (um a um ou em lote). Lucas **aprova / ajusta / rejeita**.
5. Ao **aprovar**: adiciona a referência em `dados.json` no card escolhido —
   `{ handle, url, print: "prints/<shortCode>.jpg", rede }` — move a imagem de `agente/pendentes/` para `prints/`, registra o `shortCode` em `agente/vistos.json`, e remove o item de `agente/pendentes.json`.
6. Ao **rejeitar**: registra o `shortCode` em `vistos.json` (não re-estagia), remove de `pendentes.json`, apaga a imagem estagiada.
7. Ao fim do lote: valida (`node --test`), e faz o **deploy** — `gh auth switch --user lucaslanzoni` → `git add prints/ dados.json` → commit → push → `gh auth switch --user lucaslanzoni-taqtile` (restaura). Confirma propagação.

**Por que skill e não script com API:** a classificação exige visão + julgamento de marca, e a aprovação é humana. Fazer isso numa conversa Claude Code junta os dois de graça, sem construir UI de aprovação nem gastar API. O deploy (conta pessoal) já é operação que Lucas autoriza na sessão.

---

## 5. Contas-fonte (seed — editável em `agente/contas_fonte.json`)

Concorrentes do briefing + referências de fora. Lucas edita à vontade.
```json
["sometimes.online", "useasteric", "bolovo", "usebemtevi", "capsulaoficial",
 "onlineceramics", "aimeleondore", "stussy"]
```
(Nomes exatos das contas a confirmar no plano; algumas podem variar de handle.)

---

## 6. Estrutura de arquivos e git

```
moxie_plataforma_conteudo/
├── agente/
│   ├── buscar.py              # Buscador (committed)
│   ├── config.json            # resultsLimit, budget guard (committed)
│   ├── contas_fonte.json      # contas-fonte (committed)
│   ├── requirements.txt       # apify-client (ou requests) (committed)
│   ├── README.md              # como rodar/instalar/agendar (committed)
│   ├── pendentes/             # imagens estagiadas (GITIGNORED)
│   ├── pendentes.json         # candidatos estagiados (GITIGNORED)
│   ├── vistos.json            # ledger de dedup (GITIGNORED — estado local)
│   └── last_run.txt           # timestamp última rodada (GITIGNORED)
├── .claude/skills/moxie-referencias/SKILL.md   # Publicador (committed)
├── com.lucas.moxie-buscador.plist              # template launchd (committed)
├── .env                       # APIFY_TOKEN (GITIGNORED — já criado)
└── (Fase 1: index.html, assets/, dados.json, prints/, ...)
```

`.gitignore` ganha: `agente/pendentes/`, `agente/pendentes.json`, `agente/vistos.json`, `agente/last_run.txt`. (`.env` já está.)

**Estado local (pendentes/vistos/last_run) é gitignored** — é runtime do agente na máquina de Lucas, não parte do site. O dedup contra `dados.json` (que É versionado) garante que nada publicado se duplica mesmo num clone novo.

---

## 7. Segurança e custo

- **Segredo:** `APIFY_TOKEN` só no `.env` gitignored. Nunca commitado, nunca impresso, nunca servido pelo Pages (não é pushado). O repo é público — o `.gitignore` é a linha de defesa e é verificado no plano.
- **Custo:** desenhado pra ficar dentro dos US$5/mês grátis (resultsLimit pequeno + filtro incremental + guard). Sem custo de API (classificação é a skill interativa). Deploy é grátis (GitHub Pages).
- **ToS:** o scraping recai sobre a infra da Apify, não sobre a conta pessoal de Lucas. Uso de referência interna, sem republicação.

---

## 8. Não-objetivos (YAGNI)

- Sem classificação/publicação 100% automática (a aprovação humana é deliberada).
- Sem UI de aprovação no site (a skill interativa cobre isso).
- Sem TikTok/Pinterest na v1 do agente — só Instagram (o actor validado). TikTok/Pinterest ficam como extensão futura (outros actors, mesmo padrão).
- Sem custo pago — se um dia quiser hands-off total, aí sim avaliar plano Apify pago.

---

## 9. Critérios de sucesso

- `python3 agente/buscar.py` popula `pendentes.json` + imagens com posts novos reais das contas-fonte, deduplicando corretamente, dentro do orçamento.
- `/moxie-referencias` classifica os pendentes com card + tags coerentes (passa pelo julgamento de Lucas), publica os aprovados no `dados.json` e o site no ar mostra as novas referências.
- Zero segredo vazado no repo público. Zero custo além do free tier.
- O Buscador roda desatendido via launchd sem precisar de git nem de intervenção.

---

## 10. Pendências pro plano/implementação

- Confirmar o nome exato do campo de filtro incremental por data do actor `apify/instagram-scraper` (economia de scrape).
- Confirmar os handles exatos das contas-fonte (algumas podem diferir).
- Definir o cliente Apify: `apify-client` (pip) vs `requests` puro no endpoint REST (o teste usou REST via curl — `requests` evita dependência extra; decidir no plano).
- Definir cadência do launchd (default diário) e o guard de orçamento (limite de itens/mês).
