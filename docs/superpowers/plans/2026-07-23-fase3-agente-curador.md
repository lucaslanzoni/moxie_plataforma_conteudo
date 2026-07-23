# Fase 3 — Agente Curador de Conteúdo: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir a skill `/moxie-referencias` para um **curador de conteúdo da Moxie** que classifica com rubric + memória de decisões + few-shot dinâmico, aprende com as decisões de Lucas e mede a própria concordância — humano no loop na v1.

**Architecture:** Uma skill interativa (SKILL.md) que orquestra o Claude + arquivos de dados versionados em `agente/curador/`. Um único helper Python testável (`registrar.py`, stdlib) grava as decisões e recomputa a concordância de forma determinística (evita o Claude editar JSON à mão). Sem API, sem custo, sem fine-tuning.

**Tech Stack:** Markdown (skill + critérios), JSON (memória/concordância), Python 3.14 stdlib (helper + unittest). Nada de pip.

## Global Constraints

- **Sem custo, sem API, sem fine-tuning.** O curador é skill interativa (assinatura Claude). O aprendizado é memória + few-shot + destilação de regras.
- **Arquivos do curador em `agente/curador/` são VERSIONADOS** (não são segredo, não são estado efêmero): `criterios.md`, `decisoes.json`, `regras_aprendidas.md`, `concordancia.json`, `registrar.py`, `test_registrar.py`. (NÃO adicionar ao `.gitignore`.)
- **A lista e os mecanismos dos cards vêm ao vivo do `dados.json`** (fonte única). `criterios.md` é o guia de *como decidir*, não a lista de cards.
- **Métrica de concordância = nível de CARD:** proposta de card mantida (aprovado, ou ajustado sem trocar o card). Ajuste só de tag não conta como discordância de card. Rejeição não entra no cálculo de concordância de card.
- **Formato → mapeamento do type do Apify:** Video→Vídeo, Image→Foto única, Sidecar→Carrossel.
- **v1 = 100% humano no loop.** Nada de auto-aprovação. Só a medição que a habilita no futuro.
- **Deploy** (quando publica aprovados): `gh auth switch --user lucaslanzoni` → `git add prints/ dados.json agente/curador/decisoes.json agente/curador/concordancia.json` → commit (trailer Co-Authored-By) → push → `gh auth switch --user lucaslanzoni-taqtile`.
- **Python canônico:** `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`.

**Fonte da verdade:** spec `docs/superpowers/specs/2026-07-23-fase3-agente-curador-design.md` e o rubric das sensações no spec Fase 1 §7.

---

## File Structure

```
moxie_plataforma_conteudo/
├── agente/curador/
│   ├── registrar.py            # helper: append decisões + recomputa concordância (Task 1)
│   ├── test_registrar.py       # unittest (Task 1)
│   ├── criterios.md            # constituição de classificação (Task 2)
│   ├── regras_aprendidas.md    # regras destiladas (seed vazio) (Task 2)
│   ├── decisoes.json           # [] (Task 2)
│   └── concordancia.json       # zeros iniciais (Task 2)
└── .claude/skills/moxie-referencias/SKILL.md   # reescrita → curador (Task 3)
```

---

## Task 1: `registrar.py` — log + concordância (TDD)

**Files:**
- Create: `agente/curador/registrar.py`
- Create: `agente/curador/test_registrar.py`

**Interfaces:**
- Produces: `recomputar_concordancia(decisoes: list) -> dict`; `registrar(novas: list) -> dict` (estende `decisoes.json`, reescreve `concordancia.json`). CLI: `python3 registrar.py <arquivo.json>` (arquivo = lista de decisões).

- [ ] **Step 1: Escrever os testes (falhando) — `agente/curador/test_registrar.py`**

```python
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import registrar

def dec(card, acao, card_final=None):
    return {"shortCode": card+acao, "proposta": {"card": card},
            "decisao": {"acao": acao, "card_final": card_final}}

class TestConcordancia(unittest.TestCase):
    def test_contagens_e_taxa(self):
        decisoes = [
            dec("a", "aprovado"),                 # card mantido
            dec("a", "ajustado", "a"),            # ajustou tag, card mantido -> conta acerto
            dec("a", "ajustado", "b"),            # trocou o card -> discordância
            dec("c", "rejeitado"),                # não entra no cálculo de card
        ]
        c = registrar.recomputar_concordancia(decisoes)
        self.assertEqual(c["total"], 4)
        self.assertEqual(c["aprovado_sem_ajuste"], 1)
        self.assertEqual(c["ajustado"], 2)
        self.assertEqual(c["rejeitado"], 1)
        # considerados = 3 (exclui rejeitado); acertos de card = 2 (aprovado + ajustado-mesmo-card)
        self.assertAlmostEqual(c["taxa_concordancia_card"], round(2/3, 3))
        self.assertEqual(c["por_card"]["a"], {"propostas": 3, "card_aceito": 2})

    def test_vazio(self):
        c = registrar.recomputar_concordancia([])
        self.assertEqual(c["total"], 0)
        self.assertEqual(c["taxa_concordancia_card"], 0.0)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/curador/test_registrar.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'registrar'`.

- [ ] **Step 3: Implementar `agente/curador/registrar.py`**

```python
#!/usr/bin/env python3
"""Registra decisões de curadoria no decisoes.json e recomputa concordancia.json. stdlib."""
import json, sys, datetime
from pathlib import Path

DIR = Path(__file__).resolve().parent
DECISOES = DIR / "decisoes.json"
CONCORD = DIR / "concordancia.json"


def carregar(p, default):
    p = Path(p)
    if p.exists() and p.read_text().strip():
        return json.loads(p.read_text())
    return default


def recomputar_concordancia(decisoes):
    total = len(decisoes)
    aprovado = sum(1 for d in decisoes if d["decisao"]["acao"] == "aprovado")
    ajustado = sum(1 for d in decisoes if d["decisao"]["acao"] == "ajustado")
    rejeitado = sum(1 for d in decisoes if d["decisao"]["acao"] == "rejeitado")
    considerados = card_ok = 0
    por_card = {}
    for d in decisoes:
        if d["decisao"]["acao"] == "rejeitado":
            continue
        prop = d["proposta"]["card"]
        final = d["decisao"].get("card_final") or prop
        aceito = final == prop
        considerados += 1
        card_ok += 1 if aceito else 0
        pc = por_card.setdefault(prop, {"propostas": 0, "card_aceito": 0})
        pc["propostas"] += 1
        pc["card_aceito"] += 1 if aceito else 0
    taxa = round(card_ok / considerados, 3) if considerados else 0.0
    return {
        "total": total,
        "aprovado_sem_ajuste": aprovado,
        "ajustado": ajustado,
        "rejeitado": rejeitado,
        "taxa_concordancia_card": taxa,
        "por_card": por_card,
        "atualizado_em": datetime.date.today().isoformat(),
    }


def registrar(novas):
    decisoes = carregar(DECISOES, [])
    decisoes.extend(novas)
    DECISOES.write_text(json.dumps(decisoes, ensure_ascii=False, indent=2) + "\n")
    conc = recomputar_concordancia(decisoes)
    CONCORD.write_text(json.dumps(conc, ensure_ascii=False, indent=2) + "\n")
    return conc


if __name__ == "__main__":
    entrada = json.loads(Path(sys.argv[1]).read_text())
    novas = entrada if isinstance(entrada, list) else [entrada]
    conc = registrar(novas)
    print(f"registradas {len(novas)} | total={conc['total']} | concordancia_card={conc['taxa_concordancia_card']}")
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/curador/test_registrar.py -v`
Expected: PASS — 2 testes ok.

- [ ] **Step 5: Commit**

```bash
git add agente/curador/registrar.py agente/curador/test_registrar.py
git commit -m "feat(curador): helper de registro de decisões + concordância (TDD)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `criterios.md` + arquivos-semente

**Files:**
- Create: `agente/curador/criterios.md`
- Create: `agente/curador/regras_aprendidas.md`
- Create: `agente/curador/decisoes.json`
- Create: `agente/curador/concordancia.json`

- [ ] **Step 1: Criar `agente/curador/criterios.md`**

```markdown
# Critérios de Curadoria — Moxie (constituição do curador)

Este é o rubric-locking do curador. A LISTA e os MECANISMOS dos cards vêm ao vivo do `dados.json` (campo `descricao` de cada card). Aqui está o *como decidir*.

## Teste de profundidade (a senha Moxie)
Antes de alocar, pergunte: a referência tem **camada** (repertório, ironia, referência não óbvia, ponto de vista) ou é **enfeite** (bonito porém raso)? Conteúdo raso pode ser rejeitado mesmo sendo esteticamente ok — a Moxie fala pra quem entende a piada.

## Funil
- **Topo** — descoberta/alcance; para o scroll de quem não conhece.
- **Meio** — relação/consideração; aprofunda com quem já parou.
- **Fundo** — conversão; move pra compra.

## Objetivo (curto, colado no funil)
- **Ser Visto** (topo) · **Relação** (meio) · **Conversão** (fundo).

## Formato (mapeando o `type` do Apify)
- Video → **Vídeo** · Image → **Foto única** · Sidecar → **Carrossel**.

## Sensações (rubric — escolha 1–2)
- **Curiosidade** — cria lacuna de informação, "o que é isso?".
- **Desejo consciente** — mostra o produto/benefício direto e cobiçável.
- **Desejo inconsciente** — desperta vontade sem racionalizar (status, aspiração, pertencimento implícito).
- **Identificação** — "isso sou eu / é a minha vibe".
- **Oportunidade** — urgência/escassez/novidade (drop, edição limitada).
- **Segurança** — reduz risco percebido (prova social, bastidor de qualidade).
- **Senso de apreendimento** (= aprendizado) — o público aprende algo, "não sabia disso".
- **Transparência** — mostra o que costuma ficar escondido (processo, preço, erro).

## Distinções de fronteira (onde cards vizinhos confundem)
- **Produto de impacto** (hook visual do produto, Topo) vs **Abertura de carrinho** (anúncio de que a coleção está no ar, Fundo): se a legenda diz "disponível no site / no ar / link", é Abertura de carrinho.
- **Teaser de drop** (antecipação, "faltam X dias", ainda não revela/vende, Topo) vs **Abertura de carrinho** (já está à venda, Fundo).
- **Cenário** (o que prende é a atmosfera/lugar no enquadramento, Topo) vs **Curadoria local / cena** (indica lugares/cena como recomendação, Meio).
- **Mascote apresenta / opina** (personagem/pet da marca com voz) vs **Look real do cliente** (pessoa real/UGC vestindo a peça): se é um personagem/mascote fazendo o papel, é Mascote; se é cliente/criador real, é UGC.
- **A referência por trás do design** (conta a referência cultural/história do produto, Meio) vs **Manifesto de marca** (POV/quem a marca é, sem contar história de peça específica).
- **Detalhe de acabamento** (close de costura/gramatura/construção da peça) vs **Macro que revela** (close extremo da arte/estampa que abre e revela — é hook de topo).

## Quando nada encaixa
Diga que não encaixa e proponha um card novo (nome do formato genérico + mecanismo). Não force.
```

- [ ] **Step 2: Criar os arquivos-semente**

`agente/curador/regras_aprendidas.md`:
```markdown
# Regras aprendidas — Moxie curador

Regras destiladas das correções de Lucas. Cada uma foi aprovada por ele. O curador carrega este arquivo junto do `criterios.md` a cada rodada.

(vazio — preenche com a destilação, a partir das correções reais)
```

`agente/curador/decisoes.json`:
```json
[]
```

`agente/curador/concordancia.json`:
```json
{
  "total": 0,
  "aprovado_sem_ajuste": 0,
  "ajustado": 0,
  "rejeitado": 0,
  "taxa_concordancia_card": 0.0,
  "por_card": {},
  "atualizado_em": "2026-07-23"
}
```

- [ ] **Step 3: Sanidade dos arquivos**

```bash
/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 -c "import json; json.load(open('agente/curador/decisoes.json')); json.load(open('agente/curador/concordancia.json')); print('json ok')"
test -s agente/curador/criterios.md && test -s agente/curador/regras_aprendidas.md && echo "md ok"
```
Expected: `json ok` e `md ok`.

- [ ] **Step 4: Commit**

```bash
git add agente/curador/criterios.md agente/curador/regras_aprendidas.md agente/curador/decisoes.json agente/curador/concordancia.json
git commit -m "feat(curador): critérios de classificação + arquivos-semente da memória

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Reescrever a SKILL.md → curador

**Files:**
- Modify (rewrite): `.claude/skills/moxie-referencias/SKILL.md`

- [ ] **Step 1: Reescrever `.claude/skills/moxie-referencias/SKILL.md`**

````markdown
---
name: moxie-referencias
description: Curador de conteúdo da Moxie. Classifica os posts estagiados pelo buscador (agente/pendentes.json) com rubric + memória de decisões, Lucas aprova/ajusta/rejeita, publica as referências no dados.json + deploy, e aprende com as decisões. Usar quando Lucas quiser curar/publicar referências novas.
---

# Curador de conteúdo da Moxie

Você é o **curador de conteúdo e social media da Moxie** — especialista em moda E em redes sociais, anos de estrada. Você não é um classificador burro: você lê cada post, entende o que é, o ângulo estratégico e a profundidade, e aloca no sistema. E você aprende com as decisões de Lucas.

## Como você pensa
- **Gênero:** reconhece visual hook, bastidor, drop, UGC, craft/produto, curadoria, personagem/mascote.
- **Ângulo:** lê o que o post está *fazendo* (parar scroll, gerar desejo, provar qualidade, criar pertencimento, anunciar drop), não só o que mostra.
- **Profundidade (senha Moxie):** referência com camada ou enfeite raso? Raso pode ser rejeitado mesmo sendo bonito.
- **Consistência:** decide pelo rubric + memória, não pelo humor. Honesto quando não encaixa (propõe card novo).

## Contexto obrigatório (carregue antes)
1. `agente/curador/criterios.md` — a constituição (rubric, funil/formato, teste de profundidade, distinções de fronteira).
2. `agente/curador/regras_aprendidas.md` — regras destiladas das correções de Lucas.
3. `dados.json` — a lista viva de cards (`id`, `titulo`, `descricao`=mecanismo) e a `taxonomia` (valores válidos).
4. `agente/curador/decisoes.json` — a memória (decisões passadas).
5. `agente/pendentes.json` + as imagens em `agente/pendentes/`.

## O loop
1. Se `pendentes.json` vazio, avise e encerre.
2. Para **cada** pendente, olhe a imagem + legenda + hashtags e produza a **análise estruturada**:
   - `o_que_e`, `angulo`, `profundidade`, `sinais`.
3. **Few-shot dinâmico:** consulte `decisoes.json` e traga as decisões passadas mais relevantes (mesmo card/adjacente, correções, mesmo tipo de conteúdo) para calibrar. Priorize correções (`foi_correcao: true`).
4. **Proponha:** `card` (id) + `funil` + `objetivo` + `sensacao` (1–2) + `formato` + `rede` + **confiança** (alta/média/baixa) + **1–2 alternativas** com o porquê. (Mapeie o type: Video→Vídeo, Image→Foto única, Sidecar→Carrossel.)
5. **Ordene a apresentação por active learning:** primeiro **novidade** (não encaixa), **fronteira** (2 cards plausíveis) e **baixa confiança**; depois alta confiança. Apresente escaneável, **sempre com o link (`url`) do post**.
6. **Lucas decide** cada um: aprovar / ajustar (trocar card ou tags) / rejeitar. Trabalhe no ritmo dele, em lotes.
7. **Registre as decisões:** monte a lista de decisões da rodada (schema abaixo), escreva num arquivo temporário e rode:
   `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/curador/registrar.py <tmp.json>`
   (isso estende `decisoes.json` e recomputa `concordancia.json` — não edite esses dois à mão).
8. **Publique os aprovados** no `dados.json` (edição cirúrgica, ancorando na `descricao` única do card; `{handle, url, print:"prints/<shortCode>.jpg", rede}`), mova `agente/pendentes/<shortCode>.jpg` → `prints/`, e para aprovados E rejeitados adicione o shortCode a `agente/vistos.json` e remova de `agente/pendentes.json`.
9. **Valide** (`node --test`) e **deploy** (gh auth switch → add prints/ dados.json agente/curador/decisoes.json agente/curador/concordancia.json → commit → push → restaura taqtile). Confirme propagação + link.
10. Ao fim, informe a `taxa_concordancia_card` atual (de `concordancia.json`).

### Schema de uma decisão (para o registrar.py)
```json
{ "shortCode": "...", "url": "...", "handle": "@...", "data": "AAAA-MM-DD",
  "analise": {"o_que_e":"...","angulo":"...","profundidade":"...","sinais":"..."},
  "proposta": {"card":"<id>","funil":"...","objetivo":"...","sensacao":["..."],"formato":["..."],"confianca":"alta|media|baixa"},
  "decisao": {"acao":"aprovado|ajustado|rejeitado","card_final":"<id ou null>","tags_final":null,"motivo":""},
  "foi_correcao": false }
```
(`card_final` = null quando aprovado sem ajuste; preenchido quando ajustado. `foi_correcao` = true se ajustado/rejeitado.)

## Destilação de regras (periódico — a cada ~15 correções, ou quando Lucas pedir)
Leia as correções (`foi_correcao: true`) do `decisoes.json`, ache padrões recorrentes, e **proponha regras novas** para o `regras_aprendidas.md` (ex: "'disponível no site' + grid de coleção → Abertura de carrinho"). **Lucas aprova cada regra** antes de você escrever no arquivo. Commit as regras aprovadas.

## Regras
- v1 é 100% humano no loop — **nunca publique sem a aprovação explícita de Lucas**.
- Nunca invente dados: handle/url/print vêm do pendente. Se a imagem não abrir, diga e pule.
- Se um segredo (.env) aparecer, não imprima.
````

- [ ] **Step 2: Verificar a skill (estrutura)**

```bash
head -4 .claude/skills/moxie-referencias/SKILL.md   # frontmatter name/description
grep -c "registrar.py" .claude/skills/moxie-referencias/SKILL.md   # >=1
grep -c "active learning" .claude/skills/moxie-referencias/SKILL.md  # >=1
```
Expected: frontmatter presente; referências ao registrar.py e active learning presentes.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/moxie-referencias/SKILL.md
git commit -m "feat(curador): reescreve a skill como curador que aprende (rubric + memória + few-shot + concordância)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Push da Fase 3

**Files:** nenhum.

- [ ] **Step 1: Gate de segurança + push**

```bash
git status --short
git check-ignore .env >/dev/null && echo ".env ok ignorado"
gh auth switch --user lucaslanzoni
git push origin main
gh auth switch --user lucaslanzoni-taqtile
```
Expected: push OK dos commits da Fase 3 (curador). `.env` fora.

- [ ] **Step 2: Verificar remoto**

```bash
gh api repos/lucaslanzoni/moxie_plataforma_conteudo/contents/agente/curador --jq '.[].name'
```
Expected: `criterios.md`, `concordancia.json`, `decisoes.json`, `regras_aprendidas.md`, `registrar.py`, `test_registrar.py`.

---

## Verificação viva (fora do plano)
O teste real do curador é o **primeiro treino**: rodar `/moxie-referencias` sobre os 53 pendentes já estagiados, com Lucas decidindo. Isso valida o loop, semeia a memória e gera o baseline de concordância. Feito com Lucas após o build.

---

## Self-Review (preenchido)

**1. Cobertura do spec:** persona §2 → SKILL.md (Task 3); arquitetura/arquivos §3 → Tasks 1–2; loop §4 → SKILL.md; `decisoes.json` §5 → schema na SKILL + registrar; `concordancia.json` §6 → registrar.py (Task 1); destilação §7 → SKILL.md; trust ramp §8 → v1 human-gated (sem auto-aprovação construída); primeiro treino §9 → Verificação viva.

**2. Placeholder scan:** registrar.py, testes, criterios.md, SKILL.md e sementes estão completos. `regras_aprendidas.md` começa vazio por design (preenche com correções reais) — não é placeholder, é estado inicial.

**3. Consistência:** `recomputar_concordancia`/`registrar` batem entre definição (Task 1), testes (Task 1) e uso na SKILL (Task 3). Métrica de card = ajustado-mesmo-card conta acerto, rejeitado fora — consistente entre spec §6, teste e implementação. Deploy inclui `decisoes.json`+`concordancia.json` (versionados) — consistente com Global Constraints. Mapeamento de formato consistente com Fase 1/2.
