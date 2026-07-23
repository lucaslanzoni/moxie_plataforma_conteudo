# Fase 2 — Agente de Ingestão de Referências: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar a ingestão de referências da plataforma Moxie — um Buscador (Python/launchd, Apify) que estagia posts novos de contas-fonte, e uma skill interativa (`/moxie-referencias`) onde o Claude classifica e Lucas aprova/publica.

**Architecture:** Duas peças desacopladas. O **Buscador** (`agente/buscar.py`, stdlib puro) roda desatendido, lê `APIFY_TOKEN` do `.env`, chama o actor `apify/instagram-scraper`, deduplica e estagia candidatos em `agente/pendentes/` + `pendentes.json`. Não toca git. A **skill Publicadora** (`.claude/skills/moxie-referencias/SKILL.md`) é invocada por Lucas: o Claude olha imagem+legenda de cada pendente, propõe card+tags via rubric, Lucas aprova, e a skill grava no `dados.json`, move o print e faz deploy (troca de conta gh → push → restaura).

**Tech Stack:** Python 3.14 (stdlib apenas: `urllib`, `json`, `subprocess`, `pathlib`, `unittest`), `sips` (macOS) pra otimizar imagem, Apify REST API (`run-sync-get-dataset-items`), launchd, GitHub Pages. Sem pip install.

## Global Constraints

- **Segredo:** `APIFY_TOKEN` só no `.env` (raiz do repo, gitignored). NUNCA impresso, NUNCA commitado. O repo é **público** — verificar `git check-ignore` antes de qualquer commit que toque secrets.
- **Buscador = stdlib puro + `sips`.** Zero pip install. Lê o `.env` por parse de arquivo (não depende de env vars — funciona no launchd).
- **Apify:** actor `apify~instagram-scraper`, endpoint `POST https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items`, auth `Authorization: Bearer <token>`. Input confirmado: `{ "directUrls": ["https://www.instagram.com/<conta>/"], "resultsType": "posts", "resultsLimit": <int>, "onlyPostsNewerThan": "<YYYY-MM-DD ou vazio>" }`. Output por item inclui: `shortCode`, `url`, `caption`, `displayUrl`, `type`, `hashtags`, `ownerUsername`.
- **Dedup:** um post é "novo" se seu `shortCode` não está em `agente/vistos.json` NEM em `agente/pendentes.json`, E sua `url` (normalizada, sem query/barra) não está em nenhuma `referencias[].url` do `dados.json`.
- **Custo:** `resultsLimit` default 5; `onlyPostsNewerThan` = data da última rodada; guard de orçamento mensal (`custo_mes.json`, default US$4,50) que impede rodar se estourar. Custo estimado = itens × US$2,70/1000. Free tier = US$5/mês.
- **Buscador NÃO faz git.** Só escreve arquivos locais gitignored. O deploy (commit/push) é só da skill Publicadora.
- **Deploy (na skill):** `gh auth switch --user lucaslanzoni` → `git add prints/ dados.json` → commit (com trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`) → `git push origin main` → `gh auth switch --user lucaslanzoni-taqtile`.
- **Schema da referência publicada** (deve casar com a Fase 1): `{ "handle": "@<ownerUsername>", "url": "<url>", "print": "prints/<shortCode>.jpg", "rede": "Instagram" }`. Print otimizado ~900px jpg.
- **Gitignore acrescenta:** `agente/pendentes/`, `agente/pendentes.json`, `agente/vistos.json`, `agente/last_run.txt`, `agente/custo_mes.json`. (`.env` já está.)
- **v1 só Instagram.**
- **Python canônico:** `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`.

**Fonte da verdade:** spec `docs/superpowers/specs/2026-07-23-fase2-agente-ingestao-design.md` e o rubric das sensações no spec da Fase 1 (§7).

---

## File Structure

```
moxie_plataforma_conteudo/
├── agente/
│   ├── buscar.py                 # Buscador (Task 1 pure + Task 2 I/O)
│   ├── test_buscar.py            # unittest das funções puras (Task 1)
│   ├── config.json               # resultsLimit, budget_usd (Task 1)
│   ├── contas_fonte.json         # lista de contas (Task 1)
│   ├── README.md                 # uso/instalação/agendamento (Task 3)
│   ├── pendentes/                # (gitignored) imagens estagiadas
│   ├── pendentes.json            # (gitignored) candidatos
│   ├── vistos.json               # (gitignored) ledger de dedup
│   ├── last_run.txt              # (gitignored) data última rodada
│   └── custo_mes.json            # (gitignored) acumulador de custo
├── .claude/skills/moxie-referencias/SKILL.md   # Publicadora (Task 4)
├── com.lucas.moxie-buscador.plist              # launchd (Task 3)
└── .gitignore                    # +entradas do agente (Task 1)
```

---

## Task 1: Config + funções puras do Buscador (TDD)

**Files:**
- Create: `agente/buscar.py` (só constantes + funções puras nesta task)
- Create: `agente/test_buscar.py`
- Create: `agente/config.json`, `agente/contas_fonte.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `normaliza_url(u) -> str`; `urls_publicadas(dados: dict) -> set[str]`; `filtrar_novos(posts: list[dict], vistos: set[str], publicadas: set[str]) -> list[dict]`; `montar_pendente(post: dict, image_rel: str) -> dict`. Módulo `buscar` importável.

- [ ] **Step 1: Atualizar `.gitignore`**

Acrescentar ao fim de `.gitignore` (o arquivo já existe da setup do `.env`):
```
# estado local do agente da Fase 2
agente/pendentes/
agente/pendentes.json
agente/vistos.json
agente/last_run.txt
agente/custo_mes.json
```

- [ ] **Step 2: Criar config e contas**

`agente/config.json`:
```json
{
  "resultsLimit": 5,
  "budget_usd": 4.5,
  "custo_por_1000": 2.70
}
```

`agente/contas_fonte.json`:
```json
["sometimes.online", "useasteric", "bolovo", "usebemtevi", "capsulaoficial", "onlineceramics", "aimeleondore", "stussy"]
```

- [ ] **Step 3: Escrever os testes (falhando) — `agente/test_buscar.py`**

```python
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import buscar

def post(sc, url, **kw):
    base = {"shortCode": sc, "url": url, "ownerUsername": "marca",
            "type": "Image", "caption": "legenda", "hashtags": [], "displayUrl": "http://img"}
    base.update(kw); return base

class TestNormaliza(unittest.TestCase):
    def test_remove_query_e_barra(self):
        self.assertEqual(buscar.normaliza_url("https://www.instagram.com/p/ABC/?igsh=x"),
                         "https://www.instagram.com/p/ABC")
        self.assertEqual(buscar.normaliza_url("https://www.instagram.com/p/ABC/"),
                         "https://www.instagram.com/p/ABC")

class TestUrlsPublicadas(unittest.TestCase):
    def test_coleta_urls_das_referencias(self):
        dados = {"cards": [
            {"referencias": [{"url": "https://www.instagram.com/p/AAA/"}]},
            {"referencias": []},
            {"referencias": [{"url": "https://www.instagram.com/reel/BBB/?x=1"}]},
        ]}
        self.assertEqual(buscar.urls_publicadas(dados),
                         {"https://www.instagram.com/p/AAA", "https://www.instagram.com/reel/BBB"})

class TestFiltrarNovos(unittest.TestCase):
    def test_descarta_vistos_publicados_e_sem_shortcode(self):
        posts = [
            post("AAA", "https://www.instagram.com/p/AAA/"),   # publicado
            post("BBB", "https://www.instagram.com/p/BBB/"),   # visto
            post("CCC", "https://www.instagram.com/p/CCC/"),   # novo
            post(None, "https://www.instagram.com/p/DDD/"),    # sem shortcode
        ]
        publicadas = {"https://www.instagram.com/p/AAA"}
        vistos = {"BBB"}
        novos = buscar.filtrar_novos(posts, vistos, publicadas)
        self.assertEqual([p["shortCode"] for p in novos], ["CCC"])

class TestMontarPendente(unittest.TestCase):
    def test_shape_e_handle(self):
        p = buscar.montar_pendente(post("CCC", "https://www.instagram.com/p/CCC/?igsh=z"),
                                   "agente/pendentes/CCC.jpg")
        self.assertEqual(p["shortCode"], "CCC")
        self.assertEqual(p["url"], "https://www.instagram.com/p/CCC")
        self.assertEqual(p["handle"], "@marca")
        self.assertEqual(p["image"], "agente/pendentes/CCC.jpg")
        self.assertIn("scraped_at", p)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: Rodar e confirmar que falha**

Run: `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/test_buscar.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'buscar'` (ainda não existe).

- [ ] **Step 5: Implementar as funções puras em `agente/buscar.py`**

```python
#!/usr/bin/env python3
"""Buscador da Fase 2 (Moxie) — Apify scrape -> estagia pendentes. stdlib puro, sem git."""
import json, subprocess, urllib.request, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
AGENTE = RAIZ / "agente"
PENDENTES_DIR = AGENTE / "pendentes"
PENDENTES_JSON = AGENTE / "pendentes.json"
VISTOS_JSON = AGENTE / "vistos.json"
LAST_RUN = AGENTE / "last_run.txt"
CUSTO_MES = AGENTE / "custo_mes.json"
DADOS = RAIZ / "dados.json"
ACTOR = "apify~instagram-scraper"
ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"


def normaliza_url(u):
    return (u or "").split("?")[0].rstrip("/")


def carregar_json(p, default):
    p = Path(p)
    return json.loads(p.read_text()) if p.exists() else default


def urls_publicadas(dados):
    urls = set()
    for card in dados.get("cards", []):
        for ref in card.get("referencias", []):
            if ref.get("url"):
                urls.add(normaliza_url(ref["url"]))
    return urls


def filtrar_novos(posts, vistos, publicadas):
    novos = []
    for p in posts:
        sc = p.get("shortCode")
        url = normaliza_url(p.get("url", ""))
        if not sc or not url:
            continue
        if sc in vistos or url in publicadas:
            continue
        novos.append(p)
    return novos


def montar_pendente(post, image_rel):
    return {
        "shortCode": post.get("shortCode"),
        "url": normaliza_url(post.get("url", "")),
        "handle": "@" + (post.get("ownerUsername") or ""),
        "type": post.get("type"),
        "caption": post.get("caption") or "",
        "hashtags": post.get("hashtags") or [],
        "image": image_rel,
        "scraped_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    }
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/test_buscar.py -v`
Expected: PASS — 4 testes ok.

- [ ] **Step 7: Commit**

```bash
git add agente/buscar.py agente/test_buscar.py agente/config.json agente/contas_fonte.json .gitignore
git commit -m "feat(agente): config, contas-fonte e funções puras do buscador (TDD)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: I/O do Buscador + main + rodada real

**Files:**
- Modify: `agente/buscar.py` (acrescentar I/O + main)

**Interfaces:**
- Consumes: funções puras da Task 1.
- Produces: `carregar_token()`; `chamar_apify(token, conta, limite, newer_than)`; `baixar_imagem(url, dest)`; `main()`. Escreve `agente/pendentes.json` + imagens.

- [ ] **Step 1: Acrescentar I/O + main a `agente/buscar.py`**

Adicionar ao fim do arquivo:
```python
def carregar_token():
    for linha in (RAIZ / ".env").read_text().splitlines():
        linha = linha.strip()
        if linha.startswith("APIFY_TOKEN=") and not linha.startswith("#"):
            return linha.split("=", 1)[1].strip()
    raise SystemExit("APIFY_TOKEN não encontrado no .env")


def chamar_apify(token, conta, limite, newer_than=""):
    payload = {
        "directUrls": [f"https://www.instagram.com/{conta}/"],
        "resultsType": "posts",
        "resultsLimit": limite,
    }
    if newer_than:
        payload["onlyPostsNewerThan"] = newer_than
    req = urllib.request.Request(
        ENDPOINT, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def baixar_imagem(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    tmp = dest.with_suffix(".orig")
    tmp.write_bytes(data)
    subprocess.run(["sips", "-Z", "900", "-s", "format", "jpeg", str(tmp), "--out", str(dest)],
                   check=True, capture_output=True)
    tmp.unlink()


def _custo_mes_atual():
    est = carregar_json(CUSTO_MES, {"mes": "", "usd": 0.0})
    mes = datetime.date.today().strftime("%Y-%m")
    if est.get("mes") != mes:
        est = {"mes": mes, "usd": 0.0}
    return est


def main():
    token = carregar_token()
    config = carregar_json(AGENTE / "config.json", {"resultsLimit": 5, "budget_usd": 4.5, "custo_por_1000": 2.70})
    contas = carregar_json(AGENTE / "contas_fonte.json", [])
    vistos = set(carregar_json(VISTOS_JSON, []))
    dados = carregar_json(DADOS, {})
    publicadas = urls_publicadas(dados)
    pendentes = carregar_json(PENDENTES_JSON, [])
    ja_pendentes = {p["shortCode"] for p in pendentes}
    newer = LAST_RUN.read_text().strip() if LAST_RUN.exists() else ""

    est = _custo_mes_atual()
    if est["usd"] >= config.get("budget_usd", 4.5):
        print(f"[guard] orçamento do mês atingido (US${est['usd']:.2f}) — não vou rodar.")
        return

    total_itens, novos_estagiados = 0, 0
    for conta in contas:
        try:
            posts = chamar_apify(token, conta, config.get("resultsLimit", 5), newer)
        except Exception as e:
            print(f"[erro] {conta}: {e}"); continue
        total_itens += len(posts)
        for post in filtrar_novos(posts, vistos | ja_pendentes, publicadas):
            sc = post["shortCode"]
            dest = PENDENTES_DIR / f"{sc}.jpg"
            try:
                baixar_imagem(post.get("displayUrl", ""), dest)
            except Exception as e:
                print(f"[erro img] {sc}: {e}"); continue
            pendentes.append(montar_pendente(post, f"agente/pendentes/{sc}.jpg"))
            ja_pendentes.add(sc)
            novos_estagiados += 1

    PENDENTES_JSON.write_text(json.dumps(pendentes, ensure_ascii=False, indent=2))
    LAST_RUN.write_text(datetime.date.today().isoformat())
    custo = total_itens * config.get("custo_por_1000", 2.70) / 1000
    est["usd"] = round(est["usd"] + custo, 4)
    CUSTO_MES.write_text(json.dumps(est))
    print(f"buscados: {total_itens} | novos estagiados: {novos_estagiados} | custo rodada: US${custo:.3f} | mês: US${est['usd']:.3f}")
    print(f"pendentes aguardando aprovação: {len(pendentes)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodada real de validação (custo ~US$0,01–0,05)**

Reduzir temporariamente pra 2 contas e limite 3, rodar, e restaurar. Ou rodar com um `contas_fonte.json` de teste. Comando (usa o `.env`):
```bash
/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/buscar.py
```
Expected: imprime `buscados: N | novos estagiados: M | custo rodada: US$0.0xx`; cria `agente/pendentes.json` e imagens em `agente/pendentes/`.

- [ ] **Step 3: Verificar o estágio**

```bash
/Library/Frameworks/Python.framework/Versions/3.14/bin/python3 -c "import json; d=json.load(open('agente/pendentes.json')); print('pendentes:', len(d)); [print(' -', p['shortCode'], p['handle'], p['type'], '| img existe:', __import__('pathlib').Path(p['image']).exists()) for p in d[:5]]"
```
Expected: pendentes listados, cada `image` existe. Rodar de novo → `novos estagiados: 0` (dedup funcionando).

- [ ] **Step 4: Commit** (o código; estado local é gitignored)

```bash
git add agente/buscar.py
git commit -m "feat(agente): chamada Apify, download de imagem e main do buscador

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: launchd plist + README do agente

**Files:**
- Create: `com.lucas.moxie-buscador.plist`
- Create: `agente/README.md`

- [ ] **Step 1: Criar `com.lucas.moxie-buscador.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.lucas.moxie-buscador</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Library/Frameworks/Python.framework/Versions/3.14/bin/python3</string>
    <string>/Users/Lucas/Code/freelas/moxie_plataforma_conteudo/agente/buscar.py</string>
  </array>
  <key>StartInterval</key><integer>86400</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>/Users/Lucas/Library/Logs/moxie-buscador.log</string>
  <key>StandardErrorPath</key><string>/Users/Lucas/Library/Logs/moxie-buscador.log</string>
</dict>
</plist>
```

- [ ] **Step 2: Criar `agente/README.md`**

```markdown
# Agente da Fase 2 — Buscador de referências (Moxie)

Duas peças: o **Buscador** (este) estagia posts novos; a skill `/moxie-referencias` classifica e publica.

## Rodar à mão
    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/buscar.py

Lê `APIFY_TOKEN` do `.env` na raiz. Escreve candidatos em `agente/pendentes.json` + imagens em `agente/pendentes/`. Não faz git.

## Agendar (launchd, 1x/dia)
    cp com.lucas.moxie-buscador.plist ~/Library/LaunchAgents/
    launchctl load ~/Library/LaunchAgents/com.lucas.moxie-buscador.plist
    launchctl list | grep moxie-buscador   # conferir
Log: `~/Library/Logs/moxie-buscador.log`.

## Custo
Apify free tier = US$5/mês. `resultsLimit` e `budget_usd` em `agente/config.json`. O buscador acumula custo estimado em `custo_mes.json` e para se atingir o orçamento. `onlyPostsNewerThan` (data da última rodada) reduz o scrape após a 1ª vez.

## Contas-fonte
Edite `agente/contas_fonte.json` (só o @ sem o "@"). v1 é só Instagram.

## Testes
    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/test_buscar.py -v
```

- [ ] **Step 3: Verificar plist válido**

```bash
plutil -lint com.lucas.moxie-buscador.plist
```
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add com.lucas.moxie-buscador.plist agente/README.md
git commit -m "feat(agente): plist do launchd e README do buscador

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Skill Publicadora (`/moxie-referencias`)

**Files:**
- Create: `.claude/skills/moxie-referencias/SKILL.md`

- [ ] **Step 1: Escrever `.claude/skills/moxie-referencias/SKILL.md`**

````markdown
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
````

- [ ] **Step 2: Verificar a skill (dry-run de classificação)**

Com pendentes estagiados na Task 2, invocar o fluxo da skill em modo leitura: ler `agente/pendentes.json`, e para 1–2 pendentes, produzir a classificação proposta (card + tags + racional) SEM publicar. Confirmar que a proposta é coerente e que os caminhos de imagem abrem.
Expected: classificação plausível por pendente; nenhum arquivo alterado.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/moxie-referencias/SKILL.md
git commit -m "feat: skill publicadora /moxie-referencias (classifica + aprova + publica)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Push da Fase 2 para o repo

**Files:** nenhum (deploy).

- [ ] **Step 1: Confirmar que nenhum segredo/estado local vai junto**

```bash
git status --short
git check-ignore .env agente/pendentes.json agente/vistos.json agente/last_run.txt agente/custo_mes.json
```
Expected: `git status` NÃO mostra `.env` nem os arquivos de estado; `check-ignore` lista todos eles.

- [ ] **Step 2: Push via conta pessoal e restaurar**

```bash
gh auth switch --user lucaslanzoni
git push origin main
gh auth switch --user lucaslanzoni-taqtile
```
Expected: push OK dos commits da Fase 2 (buscador, plist, skill, docs). `.env` e estado local ficam de fora.

---

## Self-Review (preenchido)

**1. Cobertura do spec:**
- §3 Buscador (Apify, dedup, download, staging, custo, launchd) → Tasks 1, 2, 3.
- §4 Publicadora (skill interativa, classificar+aprovar+publicar+deploy) → Task 4.
- §5 contas-fonte → Task 1 (config file).
- §6 estrutura + gitignore → Tasks 1–4, gitignore na Task 1.
- §7 segurança (.env, estado gitignored) + custo (guard) → Global Constraints, Task 1 gitignore, Task 2 guard, Task 5 verificação.
- Dedup contra dados.json + vistos → Task 1 `filtrar_novos` + `urls_publicadas`.

**2. Placeholder scan:** código completo em buscar.py, testes, config, plist, SKILL.md. A Task 2 Step 2 pede reduzir contas/limite pra rodada de teste — é instrução concreta, não placeholder. Nenhum "TBD".

**3. Consistência de tipos/nomes:** `filtrar_novos(posts, vistos, publicadas)`, `montar_pendente(post, image_rel)`, `urls_publicadas(dados)`, `normaliza_url` batem entre definição (Task 1), testes (Task 1) e uso no `main` (Task 2). Schema da referência publicada (`handle/url/print/rede`) casa com o `dados.json` da Fase 1. `onlyPostsNewerThan`, `resultsLimit`, `directUrls`, `resultsType` conferidos contra o input-schema real do actor. Caminho do Python canônico consistente entre plist e comandos de teste.
