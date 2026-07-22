# Plataforma de Referências de Conteúdo (Moxie) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um site estático que apresenta um catálogo de dois níveis (Categoria → Card de ideia → Referências) de conteúdo de marca para moda, filtrável por funil/objetivo/sensação/formato/rede, na identidade visual da Moxie, hospedado grátis no GitHub Pages.

**Architecture:** HTML + CSS + JavaScript vanilla, sem framework e sem build step. A lógica pura (filtro, busca, contagem, agrupamento, validação de schema) vive em módulos ES testados com o runner nativo `node:test` (dev-only, não vai pro site). A renderização no DOM é fina e verificada no navegador. Os dados vivem num único `dados.json` versionado no git — que é também o "banco" que o agente da Fase 2 vai alimentar.

**Tech Stack:** HTML5, CSS3 (custom properties, CSS grid/columns), JavaScript ES modules (vanilla), `node:test` para testes de unidade (dev), GitHub Pages para deploy. Nenhuma dependência de runtime, nenhum pacote npm instalado.

## Global Constraints

- **Custo zero** em toda a Fase 1 — nenhum serviço pago, nenhuma dependência instalada em runtime.
- **Sem build step e sem CDN** — o site carrega abrindo `index.html` via servidor estático simples. Fontes: system stack ou auto-hospedadas na pasta.
- **Repo:** `lucaslanzoni/moxie_plataforma_conteudo` (GitHub, já criado por Lucas). Clone local em `~/Code/freelas/moxie_plataforma_conteudo`.
- **Deploy:** GitHub Pages a partir do branch `main`, raiz do repo.
- **Taxonomia (valores exatos, fechados):**
  - `categoria`: `Visual Hook`, `Bastidores`, `Histórias & Manifesto`, `Produto & Craft`, `Cultura & Curadoria`, `Carlos`, `Comunidade/UGC`, `Drop/Lançamento`
  - `funil`: `Topo`, `Meio`, `Fundo` (valor único por card)
  - `objetivo`: `Ser Visto`, `Relação`, `Conversão` (valor único por card)
  - `formato`: `Vídeo`, `Foto única`, `Carrossel` (array)
  - `rede`: `Instagram`, `TikTok`, `Pinterest` (array)
  - `sensacao`: `Curiosidade`, `Desejo consciente`, `Desejo inconsciente`, `Identificação`, `Oportunidade`, `Segurança`, `Senso de apreendimento`, `Transparência` (array)
- **Paleta Moxie (hex exatos):** petróleo `#1E303C`, vermelho `#C53B39`, âmbar `#E5A14C`, azul `#8FB8CC`, creme `#EBE3D8`.
- **Legenda de funil por cor:** Topo = âmbar `#E5A14C` · Meio = azul `#8FB8CC` · Fundo = vermelho `#C53B39`.
- **Base visual:** creme `#EBE3D8` como fundo de página, petróleo `#1E303C` como texto (decisão de layout; Lucas pode inverter pra base petróleo depois).
- **Copy em português, na voz Moxie** — frases curtas, sem jargão de venda, sem superlativo vazio. Teste: "se tirar o logo, ainda parece Moxie?".
- **Prints sempre locais** em `/prints` — nunca hotlink de URL externa.
- **Wordmark** `moxie.` (ponto vermelho) no cabeçalho.

**Fonte da verdade do conteúdo:** o design doc `docs/superpowers/specs/2026-07-22-plataforma-referencias-moxie-design.md`, seção 11 (tabela-seed de 23 cards) e seção 7 (rubric das sensações).

---

## File Structure

```
moxie_plataforma_conteudo/
├── index.html                 # esqueleto: barra de instrução, header, filtros, grid
├── assets/
│   ├── estilo.css             # identidade Moxie, cards, masonry, responsivo
│   ├── app.js                 # entry: fetch + validar + render + interatividade (DOM)
│   ├── filtros.js             # PURO: filtrarCards, contarResultado, agruparPorCategoria
│   └── validar.js             # PURO: validarDados (schema x taxonomia)
├── dados.json                 # seed: meta + taxonomia + 23 cards
├── prints/
│   └── .gitkeep               # prints entram aqui (vazio no v1)
├── tests/
│   ├── filtros.test.js        # node:test
│   └── validar.test.js        # node:test
├── docs/
│   └── superpowers/
│       ├── specs/2026-07-22-plataforma-referencias-moxie-design.md
│       └── plans/2026-07-22-plataforma-referencias-moxie.md
├── .nojekyll                  # GitHub Pages: não processar com Jekyll
└── README.md                  # como rodar local, como adicionar referências, nota Fase 2
```

Responsabilidades: `filtros.js` e `validar.js` são funções puras sem DOM (testáveis isoladas). `app.js` só orquestra DOM + eventos, consumindo essas funções. `estilo.css` carrega toda a identidade. `dados.json` é o único estado.

---

## Task 1: Setup do repo + schema, seed e validação (TDD)

**Files:**
- Create: `assets/validar.js`
- Create: `tests/validar.test.js`
- Create: `dados.json`
- Create: `.nojekyll`, `prints/.gitkeep`
- Move into repo: `docs/superpowers/specs/2026-07-22-plataforma-referencias-moxie-design.md`, `docs/superpowers/plans/2026-07-22-plataforma-referencias-moxie.md`

**Interfaces:**
- Produces: `validarDados(dados) -> { ok: boolean, erros: string[] }` (ESM export em `assets/validar.js`). `dados` tem shape `{ meta, taxonomia, cards }`.
- Produces: `dados.json` válido com `taxonomia` (valores da Global Constraints) e `cards[]` (23 cards da seção 11 do spec).

- [ ] **Step 1: Preparar o repo local**

```bash
mkdir -p ~/Code/freelas
git clone https://github.com/lucaslanzoni/moxie_plataforma_conteudo.git ~/Code/freelas/moxie_plataforma_conteudo
cd ~/Code/freelas/moxie_plataforma_conteudo
mkdir -p assets tests prints docs/superpowers/specs docs/superpowers/plans
touch prints/.gitkeep .nojekyll
node --version   # confirmar Node disponível (>= 18) para rodar os testes
```
Expected: clone OK; `node --version` imprime v18+ (se faltar Node: `brew install node`).

- [ ] **Step 2: Mover os docs (spec + plan) para o repo**

```bash
cp ~/Documents/Freelas/moxie/docs/superpowers/specs/2026-07-22-plataforma-referencias-moxie-design.md docs/superpowers/specs/
cp ~/Documents/Freelas/moxie/docs/superpowers/plans/2026-07-22-plataforma-referencias-moxie.md docs/superpowers/plans/
# após confirmar cópia, remover os originais da pasta de marca (uma casa canônica só)
rm ~/Documents/Freelas/moxie/docs/superpowers/specs/2026-07-22-plataforma-referencias-moxie-design.md
rm ~/Documents/Freelas/moxie/docs/superpowers/plans/2026-07-22-plataforma-referencias-moxie.md
```

- [ ] **Step 3: Escrever o teste de validação (falhando)**

`tests/validar.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarDados } from '../assets/validar.js';

const taxonomia = {
  categoria: ['Visual Hook'],
  funil: ['Topo', 'Meio', 'Fundo'],
  objetivo: ['Ser Visto', 'Relação', 'Conversão'],
  formato: ['Vídeo', 'Foto única', 'Carrossel'],
  rede: ['Instagram', 'TikTok', 'Pinterest'],
  sensacao: ['Curiosidade', 'Identificação'],
};

function cardValido(over = {}) {
  return {
    id: 'x', numero: 1, categoria: 'Visual Hook', titulo: 'T', descricao: 'D',
    funil: 'Topo', objetivo: 'Ser Visto', formato: ['Vídeo'],
    rede: ['Instagram'], sensacao: ['Curiosidade'], referencias: [], ...over,
  };
}

test('dados válidos passam', () => {
  const r = validarDados({ taxonomia, cards: [cardValido()] });
  assert.equal(r.ok, true, r.erros.join('; '));
});
test('tag fora da taxonomia falha', () => {
  const r = validarDados({ taxonomia, cards: [cardValido({ funil: 'Lateral' })] });
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => e.includes('funil')));
});
test('id duplicado falha', () => {
  const r = validarDados({ taxonomia, cards: [cardValido(), cardValido()] });
  assert.equal(r.ok, false);
  assert.ok(r.erros.some((e) => e.includes('duplicad')));
});
test('dim única como array falha', () => {
  const r = validarDados({ taxonomia, cards: [cardValido({ funil: ['Topo'] })] });
  assert.equal(r.ok, false);
});
test('dim multi como string falha', () => {
  const r = validarDados({ taxonomia, cards: [cardValido({ rede: 'Instagram' })] });
  assert.equal(r.ok, false);
});
test('descricao vazia falha', () => {
  const r = validarDados({ taxonomia, cards: [cardValido({ descricao: '' })] });
  assert.equal(r.ok, false);
});
test('referencia sem url falha', () => {
  const r = validarDados({ taxonomia, cards: [cardValido({ referencias: [{ handle: '@x', rede: 'Instagram' }] })] });
  assert.equal(r.ok, false);
});
```

- [ ] **Step 4: Rodar o teste e confirmar que falha**

Run: `node --test tests/validar.test.js`
Expected: FAIL — `Cannot find module '../assets/validar.js'` (ainda não existe).

- [ ] **Step 5: Implementar `assets/validar.js`**

```js
// assets/validar.js — validação pura de dados.json contra a taxonomia. Sem DOM.
const DIMS_UNICA = ['categoria', 'funil', 'objetivo'];
const DIMS_MULTI = ['formato', 'rede', 'sensacao'];

export function validarDados(dados) {
  const erros = [];
  if (!dados || typeof dados !== 'object') return { ok: false, erros: ['dados ausente ou não é objeto'] };

  const tax = dados.taxonomia || {};
  const cards = Array.isArray(dados.cards) ? dados.cards : null;
  if (!cards) return { ok: false, erros: ['dados.cards ausente ou não é array'] };

  const idsVistos = new Set();
  cards.forEach((card, i) => {
    const rotulo = `card[${i}] (${card && card.id ? card.id : 'sem id'})`;

    if (!card.id) erros.push(`${rotulo}: id ausente`);
    else if (idsVistos.has(card.id)) erros.push(`${rotulo}: id duplicado`);
    else idsVistos.add(card.id);

    if (!card.titulo) erros.push(`${rotulo}: titulo ausente`);
    if (!card.descricao) erros.push(`${rotulo}: descricao vazia`);

    DIMS_UNICA.forEach((dim) => {
      const val = card[dim];
      if (val == null || val === '') erros.push(`${rotulo}: ${dim} ausente`);
      else if (Array.isArray(val)) erros.push(`${rotulo}: ${dim} deve ser valor único, veio array`);
      else if (tax[dim] && !tax[dim].includes(val)) erros.push(`${rotulo}: ${dim}="${val}" fora da taxonomia`);
    });

    DIMS_MULTI.forEach((dim) => {
      const val = card[dim];
      if (!Array.isArray(val)) { erros.push(`${rotulo}: ${dim} deve ser array`); return; }
      if (val.length === 0) erros.push(`${rotulo}: ${dim} vazio`);
      val.forEach((v) => {
        if (tax[dim] && !tax[dim].includes(v)) erros.push(`${rotulo}: ${dim} contém "${v}" fora da taxonomia`);
      });
    });

    if (!Array.isArray(card.referencias)) {
      erros.push(`${rotulo}: referencias deve ser array (pode ser vazio)`);
    } else {
      card.referencias.forEach((ref, j) => {
        if (!ref || !ref.url) erros.push(`${rotulo}.ref[${j}]: url ausente`);
        if (ref && ref.rede && tax.rede && !tax.rede.includes(ref.rede)) {
          erros.push(`${rotulo}.ref[${j}]: rede="${ref.rede}" fora da taxonomia`);
        }
      });
    }
  });

  return { ok: erros.length === 0, erros };
}
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `node --test tests/validar.test.js`
Expected: PASS — 7 testes ok.

- [ ] **Step 7: Escrever o `dados.json` (seed real)**

Cabeçalho fixo (copiar exato):
```json
{
  "meta": { "marca": "Moxie", "atualizado_em": "2026-07-22", "versao_schema": 1 },
  "taxonomia": {
    "categoria": ["Visual Hook", "Bastidores", "Histórias & Manifesto", "Produto & Craft", "Cultura & Curadoria", "Carlos", "Comunidade/UGC", "Drop/Lançamento"],
    "funil": ["Topo", "Meio", "Fundo"],
    "objetivo": ["Ser Visto", "Relação", "Conversão"],
    "formato": ["Vídeo", "Foto única", "Carrossel"],
    "rede": ["Instagram", "TikTok", "Pinterest"],
    "sensacao": ["Curiosidade", "Desejo consciente", "Desejo inconsciente", "Identificação", "Oportunidade", "Segurança", "Senso de apreendimento", "Transparência"]
  },
  "cards": [ ... ]
}
```

Dois cards de exemplo, escritos por extenso (usar como molde exato de shape e voz):
```json
{
  "id": "visual-hook-cenario",
  "numero": 3,
  "categoria": "Visual Hook",
  "titulo": "Visual Hook – Cenário",
  "sensacao": ["Curiosidade", "Identificação"],
  "objetivo": "Ser Visto",
  "funil": "Topo",
  "formato": ["Vídeo", "Foto única", "Carrossel"],
  "rede": ["Instagram", "TikTok", "Pinterest"],
  "descricao": "O que prende é o ambiente. A atmosfera, o mundo criado no enquadramento. O cenário desperta curiosidade na hora e, quando conversa com o lugar onde o público já se vê, vira identificação — essa é a minha vibe.",
  "referencias": []
},
{
  "id": "produto-craft-acabamento",
  "numero": 8,
  "categoria": "Produto & Craft",
  "titulo": "Detalhe de acabamento",
  "sensacao": ["Segurança", "Desejo consciente"],
  "objetivo": "Relação",
  "funil": "Meio",
  "formato": ["Carrossel", "Vídeo"],
  "rede": ["Instagram", "TikTok"],
  "descricao": "Close na gola, na costura, na gramatura. O acabamento fala pelo preço — sem que o preço precise ser dito. Quem entende de roupa reconhece o que a camiseta de banca não tem.",
  "referencias": []
}
```

Autorar os **23 cards** da tabela-seed (spec §11), um objeto por linha, seguindo o shape acima: `id` em kebab-case único; `numero` sequencial 1–23; `categoria`/`funil`/`objetivo` exatos da tabela; `sensacao`/`formato`/`rede` como arrays (formato/rede coerentes com o mecanismo — na dúvida, `formato: ["Vídeo","Foto única","Carrossel"]` e `rede: ["Instagram","TikTok","Pinterest"]`); `descricao` de 1–3 frases na voz Moxie expandindo a coluna "mecanismo"; `referencias: []`. **Não inventar URLs de referência.**

- [ ] **Step 8: Escrever o teste do seed real (falhando) e o script de validação**

Adicionar ao fim de `tests/validar.test.js`:
```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

test('dados.json real é válido e completo', () => {
  const dados = JSON.parse(readFileSync(join(__dir, '..', 'dados.json'), 'utf8'));
  const r = validarDados(dados);
  assert.equal(r.ok, true, r.erros.join('\n'));
  assert.ok(dados.cards.length >= 23, `esperado >= 23 cards, veio ${dados.cards.length}`);
  const ids = new Set(dados.cards.map((c) => c.id));
  assert.equal(ids.size, dados.cards.length, 'ids devem ser únicos');
});
```

- [ ] **Step 9: Rodar todos os testes e confirmar que passam**

Run: `node --test tests/`
Expected: PASS — validação unitária + `dados.json` real válido, >= 23 cards.

- [ ] **Step 10: Commit**

```bash
git add assets/validar.js tests/validar.test.js dados.json .nojekyll prints/.gitkeep docs/
git commit -m "feat: schema, validação e seed de 23 cards de conteúdo"
```

---

## Task 2: Lógica de filtro, busca, contagem e agrupamento (TDD)

**Files:**
- Create: `assets/filtros.js`
- Create: `tests/filtros.test.js`

**Interfaces:**
- Consumes: nada (funções puras sobre `cards[]` do formato definido na Task 1).
- Produces:
  - `filtrarCards(cards, filtros) -> cards[]` — `filtros` = `{ categoria?, objetivo?, funil?, formato?, rede?, sensacao?, busca? }`; valor `'Todos'`, `''` ou ausente não filtra a dimensão; dims multivaloradas casam se o card contém o valor; `busca` varre titulo/descricao/tags (case-insensitive).
  - `contarResultado(cardsFiltrados, totalCards) -> { filtrados, total }`.
  - `agruparPorCategoria(cards, ordemCategorias) -> [{ categoria, cards[] }]` na ordem de `ordemCategorias`.

- [ ] **Step 1: Escrever os testes (falhando)**

`tests/filtros.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarCards, contarResultado, agruparPorCategoria } from '../assets/filtros.js';

const cards = [
  { id: 'a', categoria: 'Visual Hook', titulo: 'Cenário', descricao: 'atmosfera', funil: 'Topo', objetivo: 'Ser Visto', formato: ['Vídeo'], rede: ['Instagram', 'TikTok'], sensacao: ['Curiosidade'] },
  { id: 'b', categoria: 'Carlos', titulo: 'Carlos aprova', descricao: 'mascote seco', funil: 'Meio', objetivo: 'Relação', formato: ['Carrossel'], rede: ['Instagram'], sensacao: ['Identificação'] },
  { id: 'c', categoria: 'Visual Hook', titulo: 'Produto', descricao: 'impacto', funil: 'Topo', objetivo: 'Ser Visto', formato: ['Foto única'], rede: ['Pinterest'], sensacao: ['Desejo inconsciente', 'Curiosidade'] },
];

test('sem filtros retorna tudo', () => {
  assert.equal(filtrarCards(cards, {}).length, 3);
});
test('"Todos" não filtra', () => {
  assert.equal(filtrarCards(cards, { funil: 'Todos' }).length, 3);
});
test('filtro de dim única (funil)', () => {
  assert.deepEqual(filtrarCards(cards, { funil: 'Topo' }).map((c) => c.id), ['a', 'c']);
});
test('filtro de dim multi (rede) casa se qualquer valor bate', () => {
  assert.deepEqual(filtrarCards(cards, { rede: 'TikTok' }).map((c) => c.id), ['a']);
});
test('filtros combinam com AND entre dimensões', () => {
  assert.deepEqual(filtrarCards(cards, { funil: 'Topo', sensacao: 'Curiosidade' }).map((c) => c.id), ['a', 'c']);
});
test('busca textual varre titulo e descricao, case-insensitive', () => {
  assert.deepEqual(filtrarCards(cards, { busca: 'mascote' }).map((c) => c.id), ['b']);
  assert.deepEqual(filtrarCards(cards, { busca: 'CENÁRIO' }).map((c) => c.id), ['a']);
});
test('contarResultado devolve filtrados e total', () => {
  const f = filtrarCards(cards, { funil: 'Topo' });
  assert.deepEqual(contarResultado(f, cards.length), { filtrados: 2, total: 3 });
});
test('agruparPorCategoria respeita a ordem informada', () => {
  const g = agruparPorCategoria(cards, ['Visual Hook', 'Carlos']);
  assert.deepEqual(g.map((x) => x.categoria), ['Visual Hook', 'Carlos']);
  assert.equal(g[0].cards.length, 2);
});
test('agruparPorCategoria joga categoria fora da ordem pro fim', () => {
  const g = agruparPorCategoria(cards, ['Carlos']);
  assert.deepEqual(g.map((x) => x.categoria), ['Carlos', 'Visual Hook']);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/filtros.test.js`
Expected: FAIL — `Cannot find module '../assets/filtros.js'`.

- [ ] **Step 3: Implementar `assets/filtros.js`**

```js
// assets/filtros.js — lógica pura de filtro/busca/contagem/agrupamento. Sem DOM.
const DIMS_UNICA = ['categoria', 'objetivo', 'funil'];
const DIMS_MULTI = ['formato', 'rede', 'sensacao'];

function selecionado(sel) {
  return sel != null && sel !== '' && sel !== 'Todos';
}

export function filtrarCards(cards, filtros = {}) {
  return cards.filter((card) => {
    for (const dim of DIMS_UNICA) {
      if (selecionado(filtros[dim]) && card[dim] !== filtros[dim]) return false;
    }
    for (const dim of DIMS_MULTI) {
      if (selecionado(filtros[dim])) {
        const vals = Array.isArray(card[dim]) ? card[dim] : [];
        if (!vals.includes(filtros[dim])) return false;
      }
    }
    const busca = (filtros.busca || '').trim().toLowerCase();
    if (busca) {
      const alvo = [
        card.titulo, card.descricao, card.categoria, card.objetivo, card.funil,
        ...(card.formato || []), ...(card.rede || []), ...(card.sensacao || []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

export function contarResultado(cardsFiltrados, totalCards) {
  return { filtrados: cardsFiltrados.length, total: totalCards };
}

export function agruparPorCategoria(cards, ordemCategorias = []) {
  const mapa = new Map();
  for (const card of cards) {
    if (!mapa.has(card.categoria)) mapa.set(card.categoria, []);
    mapa.get(card.categoria).push(card);
  }
  const ordenadas = ordemCategorias.filter((c) => mapa.has(c));
  for (const c of mapa.keys()) if (!ordenadas.includes(c)) ordenadas.push(c);
  return ordenadas.map((categoria) => ({ categoria, cards: mapa.get(categoria) }));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/filtros.test.js`
Expected: PASS — 9 testes ok.

- [ ] **Step 5: Commit**

```bash
git add assets/filtros.js tests/filtros.test.js
git commit -m "feat: lógica de filtro, busca, contagem e agrupamento"
```

---

## Task 3: Esqueleto HTML + CSS na identidade Moxie

> **Durante esta task, invocar a skill `frontend-design:frontend-design`** para calibrar tipografia, ritmo e acabamento visual — a peça precisa passar no teste "se tirar o logo, ainda parece Moxie".

**Files:**
- Create: `index.html`
- Create: `assets/estilo.css`

**Interfaces:**
- Produces: estrutura DOM estável que a Task 4 popula. IDs/classes que `app.js` vai referenciar (definidos abaixo, verbatim): `#busca`, `#filtro-categoria`, `#filtro-objetivo`, `#filtro-funil`, `#filtro-formato`, `#filtro-sensacao`, `#filtro-rede`, `#limpar-filtros`, `#contador`, `#grid`, `#toggle-filtros` (mobile).

- [ ] **Step 1: Escrever `index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Moxie — Referências de Conteúdo</title>
  <link rel="stylesheet" href="assets/estilo.css" />
</head>
<body>
  <header class="topo">
    <p class="instrucao">Usa os filtros pra achar a ideia certa pro momento da marca. Depois abre o card e vê o conteúdo original.</p>
    <div class="marca"><span class="wordmark">moxie<span class="ponto">.</span></span> <span class="sub">referências de conteúdo</span></div>
  </header>

  <div class="barra-filtros">
    <button id="toggle-filtros" class="toggle-filtros" aria-expanded="false" aria-controls="filtros">Filtros</button>
    <div id="filtros" class="filtros">
      <input id="busca" class="busca" type="search" placeholder="Buscar por categoria, ideia…" aria-label="Buscar" />
      <label>Categoria <select id="filtro-categoria" data-dim="categoria"></select></label>
      <label>Objetivo <select id="filtro-objetivo" data-dim="objetivo"></select></label>
      <label>Funil <select id="filtro-funil" data-dim="funil"></select></label>
      <label>Formato <select id="filtro-formato" data-dim="formato"></select></label>
      <label>Sensação <select id="filtro-sensacao" data-dim="sensacao"></select></label>
      <label>Rede <select id="filtro-rede" data-dim="rede"></select></label>
      <button id="limpar-filtros" class="limpar">Limpar</button>
    </div>
  </div>

  <div class="cabecalho-resultado">
    <p id="contador" class="contador">carregando…</p>
    <ul class="legenda-funil">
      <li><span class="bolinha topo"></span>Topo</li>
      <li><span class="bolinha meio"></span>Meio</li>
      <li><span class="bolinha fundo"></span>Fundo</li>
    </ul>
  </div>

  <main id="grid" class="grid" aria-live="polite"></main>

  <script type="module" src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Escrever `assets/estilo.css`**

```css
/* assets/estilo.css — identidade Moxie */
:root {
  --petroleo: #1E303C;
  --vermelho: #C53B39;
  --ambar: #E5A14C;
  --azul: #8FB8CC;
  --creme: #EBE3D8;
  --branco-cartao: #F5F0E8;
  --topo: var(--ambar);
  --meio: var(--azul);
  --fundo: var(--vermelho);
  --fonte-titulo: "Arial Narrow", "Helvetica Neue", system-ui, sans-serif;
  --fonte-corpo: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--creme); color: var(--petroleo);
  font-family: var(--fonte-corpo); line-height: 1.5;
}

.topo { background: var(--vermelho); color: var(--creme); padding: .6rem 1.2rem; }
.instrucao { margin: 0; font-size: .8rem; letter-spacing: .04em; text-transform: uppercase; font-weight: 700; }
.marca { display: flex; align-items: baseline; gap: .6rem; margin-top: .3rem; }
.wordmark { font-family: var(--fonte-titulo); font-weight: 800; font-size: 1.5rem; letter-spacing: -.02em; }
.ponto { color: var(--petroleo); }
.sub { font-size: .75rem; text-transform: uppercase; letter-spacing: .1em; opacity: .85; }

.barra-filtros { position: sticky; top: 0; z-index: 10; background: var(--creme); border-bottom: 2px solid var(--petroleo); padding: .8rem 1.2rem; }
.toggle-filtros { display: none; }
.filtros { display: flex; flex-wrap: wrap; gap: .8rem 1rem; align-items: end; }
.filtros label { display: flex; flex-direction: column; gap: .2rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
.filtros select, .busca { font-family: inherit; font-size: .9rem; padding: .4rem .5rem; border: 1.5px solid var(--petroleo); background: var(--branco-cartao); color: var(--petroleo); border-radius: 2px; }
.busca { min-width: 220px; }
.limpar { align-self: end; background: none; border: 1.5px solid var(--petroleo); color: var(--petroleo); font: inherit; font-size: .8rem; padding: .45rem .8rem; cursor: pointer; border-radius: 2px; }
.limpar:hover { background: var(--petroleo); color: var(--creme); }

.cabecalho-resultado { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 1.2rem .4rem; flex-wrap: wrap; }
.contador { margin: 0; font-family: var(--fonte-titulo); font-weight: 800; font-size: 1.4rem; }
.contador strong { color: var(--vermelho); }
.legenda-funil { display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0; font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; }
.legenda-funil li { display: flex; align-items: center; gap: .35rem; }
.bolinha { width: .7rem; height: .7rem; border-radius: 50%; display: inline-block; }
.bolinha.topo { background: var(--topo); } .bolinha.meio { background: var(--meio); } .bolinha.fundo { background: var(--fundo); }

.grid { columns: 2; column-gap: 1rem; padding: 1rem 1.2rem 3rem; }
.grupo-categoria { break-inside: avoid; margin-bottom: 1rem; }
.grupo-categoria > h2 { font-family: var(--fonte-titulo); font-weight: 800; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid var(--petroleo); padding-bottom: .2rem; margin: .5rem 0; }

.card { break-inside: avoid; background: var(--branco-cartao); border: 1.5px solid var(--petroleo); border-radius: 3px; padding: 1rem; margin-bottom: 1rem; }
.card-num { float: right; font-family: var(--fonte-titulo); font-weight: 800; color: var(--azul); }
.card h3 { font-family: var(--fonte-titulo); font-weight: 800; font-size: 1.25rem; text-transform: uppercase; margin: 0 0 .1rem; letter-spacing: -.01em; }
.card .sensacoes { font-style: italic; font-size: .85rem; opacity: .8; margin: 0 0 .6rem; }
.pilulas { display: flex; flex-wrap: wrap; gap: .3rem; margin-bottom: .7rem; }
.pilula { font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; padding: .18rem .5rem; border: 1.2px solid var(--petroleo); border-radius: 20px; }
.pilula.funil { color: var(--creme); border: none; }
.pilula.funil.topo { background: var(--topo); color: var(--petroleo); }
.pilula.funil.meio { background: var(--meio); color: var(--petroleo); }
.pilula.funil.fundo { background: var(--fundo); }
.mecanismo { border-left: 3px solid var(--ambar); background: var(--creme); padding: .5rem .7rem; font-size: .9rem; margin: 0 0 .8rem; }
.ref-titulo { font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; opacity: .7; margin: 0 0 .4rem; }
.refs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .4rem; }
.ref { position: relative; display: block; aspect-ratio: 3/4; overflow: hidden; border-radius: 2px; background: var(--petroleo); text-decoration: none; }
.ref img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ref .handle { position: absolute; bottom: 0; left: 0; right: 0; font-size: .62rem; color: var(--creme); background: linear-gradient(transparent, rgba(0,0,0,.75)); padding: .8rem .3rem .2rem; }
.ref .ver { position: absolute; top: .3rem; right: .3rem; font-size: .6rem; color: var(--ambar); text-transform: uppercase; letter-spacing: .05em; }
.refs-vazio { font-size: .8rem; font-style: italic; opacity: .6; }

.vazio { text-align: center; padding: 3rem 1rem; font-size: 1rem; opacity: .7; column-span: all; }

@media (max-width: 720px) {
  .grid { columns: 1; }
  .toggle-filtros { display: inline-block; background: var(--petroleo); color: var(--creme); border: none; font: inherit; font-weight: 700; padding: .5rem 1rem; border-radius: 2px; cursor: pointer; }
  .filtros { display: none; margin-top: .8rem; flex-direction: column; align-items: stretch; }
  .filtros.aberto { display: flex; }
  .busca, .filtros select { width: 100%; }
  .cabecalho-resultado { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 3: Verificar visualmente (sem dados ainda)**

Run: `python3 -m http.server 8000` (na raiz do repo), abrir `http://localhost:8000` no navegador e tirar screenshot.
Expected: header vermelho com wordmark `moxie.`, barra de filtros com 6 selects vazios + busca + Limpar, legenda de funil colorida (âmbar/azul/vermelho), grid vazio. Sem erro de console além de `app.js` ainda não existir.

- [ ] **Step 4: Commit**

```bash
git add index.html assets/estilo.css
git commit -m "feat: esqueleto HTML e CSS na identidade Moxie"
```

---

## Task 4: Integração — render e interatividade (`app.js`)

**Files:**
- Create: `assets/app.js`

**Interfaces:**
- Consumes: `validarDados` (Task 1), `filtrarCards`/`contarResultado`/`agruparPorCategoria` (Task 2), `dados.json` (Task 1), IDs do DOM (Task 3).
- Produces: comportamento completo da página (nada consumido por tasks posteriores além do deploy).

- [ ] **Step 1: Implementar `assets/app.js`**

```js
// assets/app.js — orquestra fetch, validação, render e filtros no DOM.
import { validarDados } from './validar.js';
import { filtrarCards, contarResultado, agruparPorCategoria } from './filtros.js';

const DIMS = ['categoria', 'objetivo', 'funil', 'formato', 'sensacao', 'rede'];
const el = (id) => document.getElementById(id);
const grid = el('grid');
let DADOS = null;

function opcao(valor, texto) {
  const o = document.createElement('option');
  o.value = valor; o.textContent = texto ?? valor; return o;
}

function popularFiltros(tax) {
  for (const dim of DIMS) {
    const sel = el('filtro-' + dim);
    sel.appendChild(opcao('Todos'));
    for (const v of tax[dim] || []) sel.appendChild(opcao(v));
  }
}

function lerFiltros() {
  const f = { busca: el('busca').value };
  for (const dim of DIMS) f[dim] = el('filtro-' + dim).value;
  return f;
}

function slugFunil(funil) {
  return { 'Topo': 'topo', 'Meio': 'meio', 'Fundo': 'fundo' }[funil] || '';
}

function pilula(texto, classe = '') {
  const s = document.createElement('span');
  s.className = 'pilula ' + classe; s.textContent = texto; return s;
}

function montarCard(card) {
  const art = document.createElement('article');
  art.className = 'card';

  const num = document.createElement('span');
  num.className = 'card-num'; num.textContent = String(card.numero ?? '').padStart(2, '0');
  art.appendChild(num);

  const h3 = document.createElement('h3'); h3.textContent = card.titulo; art.appendChild(h3);
  const sens = document.createElement('p'); sens.className = 'sensacoes';
  sens.textContent = (card.sensacao || []).join(' · '); art.appendChild(sens);

  const pils = document.createElement('div'); pils.className = 'pilulas';
  pils.appendChild(pilula('OBJ ' + card.objetivo));
  pils.appendChild(pilula('FUNIL ' + card.funil, 'funil ' + slugFunil(card.funil)));
  for (const fmt of card.formato || []) pils.appendChild(pilula(fmt));
  for (const rede of card.rede || []) pils.appendChild(pilula(rede));
  art.appendChild(pils);

  const mec = document.createElement('p'); mec.className = 'mecanismo'; mec.textContent = card.descricao;
  art.appendChild(mec);

  const refTit = document.createElement('p'); refTit.className = 'ref-titulo';
  refTit.textContent = `Referências (${(card.referencias || []).length})`; art.appendChild(refTit);

  if ((card.referencias || []).length === 0) {
    const vaz = document.createElement('p'); vaz.className = 'refs-vazio';
    vaz.textContent = 'Referências em breve.'; art.appendChild(vaz);
  } else {
    const refs = document.createElement('div'); refs.className = 'refs';
    for (const ref of card.referencias) {
      const a = document.createElement('a');
      a.className = 'ref'; a.href = ref.url; a.target = '_blank'; a.rel = 'noopener';
      if (ref.print) { const img = document.createElement('img'); img.src = ref.print; img.alt = ref.handle || 'referência'; img.loading = 'lazy'; a.appendChild(img); }
      const ver = document.createElement('span'); ver.className = 'ver'; ver.textContent = 'ver ↗'; a.appendChild(ver);
      if (ref.handle) { const h = document.createElement('span'); h.className = 'handle'; h.textContent = ref.handle; a.appendChild(h); }
      refs.appendChild(a);
    }
    art.appendChild(refs);
  }
  return art;
}

function render() {
  const filtros = lerFiltros();
  const filtrados = filtrarCards(DADOS.cards, filtros);
  const { filtrados: n, total } = contarResultado(filtrados, DADOS.cards.length);
  el('contador').innerHTML = `<strong>${n}</strong> de ${total} ideias`;

  grid.innerHTML = '';
  if (n === 0) {
    const p = document.createElement('p'); p.className = 'vazio';
    p.textContent = 'Nenhuma ideia com esses filtros. Afrouxa um filtro.'; grid.appendChild(p);
    return;
  }
  for (const grupo of agruparPorCategoria(filtrados, DADOS.taxonomia.categoria)) {
    const sec = document.createElement('section'); sec.className = 'grupo-categoria';
    const h2 = document.createElement('h2'); h2.textContent = grupo.categoria; sec.appendChild(h2);
    for (const card of grupo.cards) sec.appendChild(montarCard(card));
    grid.appendChild(sec);
  }
}

function limpar() {
  el('busca').value = '';
  for (const dim of DIMS) el('filtro-' + dim).value = 'Todos';
  render();
}

async function iniciar() {
  try {
    const resp = await fetch('dados.json');
    DADOS = await resp.json();
  } catch (e) {
    el('contador').textContent = 'Erro ao carregar dados.json'; return;
  }
  const val = validarDados(DADOS);
  if (!val.ok) { console.error('dados.json inválido:', val.erros); }

  popularFiltros(DADOS.taxonomia);
  el('busca').addEventListener('input', render);
  for (const dim of DIMS) el('filtro-' + dim).addEventListener('change', render);
  el('limpar-filtros').addEventListener('click', limpar);
  const toggle = el('toggle-filtros');
  toggle.addEventListener('click', () => {
    const aberto = el('filtros').classList.toggle('aberto');
    toggle.setAttribute('aria-expanded', String(aberto));
  });
  render();
}

iniciar();
```

- [ ] **Step 2: Verificar no navegador (desktop)**

Run: `python3 -m http.server 8000`, abrir `http://localhost:8000`, tirar screenshot.
Expected: contador "**23** de 23 ideias"; cards agrupados por categoria; pílulas OBJ/FUNIL(colorida)/formato/rede; box de mecanismo; "Referências em breve" nos cards sem print. Console sem erros.

- [ ] **Step 3: Verificar filtros e mobile**

Testar manualmente: selecionar Funil=Topo → contador e grid reduzem; digitar na busca → filtra; Limpar → volta a 23. Reduzir a janela pra < 720px → botão "Filtros" aparece, selects viram 1 coluna, grid vira 1 coluna. Tirar screenshot mobile.
Expected: todos os comportamentos ok.

- [ ] **Step 4: Commit**

```bash
git add assets/app.js
git commit -m "feat: render, filtros e interatividade da plataforma"
```

---

## Task 5: README + deploy no GitHub Pages + verificação final

**Files:**
- Create: `README.md`

- [ ] **Step 1: Escrever `README.md`**

```markdown
# Moxie — Plataforma de Referências de Conteúdo

Banco de inspiração de conteúdo de marca da Moxie. Catálogo de ideias/formatos
filtrável por funil, objetivo, sensação, formato e rede, com referências reais.

## Rodar localmente
Precisa de um servidor estático (o `fetch` do `dados.json` não roda via `file://`):
```
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Rodar os testes
```
node --test tests/
```

## Adicionar / editar referências
Tudo vive em `dados.json`. Cada card de ideia tem tags (funil/objetivo/sensação/
formato/rede) e um array `referencias` — cada referência é `{ handle, url, print, rede }`,
com o print salvo em `prints/` (nunca hotlink). Rode `node --test tests/` para validar
o schema antes de commitar.

Na Fase 2, um agente vai popular as referências automaticamente (semi-automático,
com aprovação). Ver `docs/superpowers/specs/`.

## Deploy
GitHub Pages a partir do branch `main`, raiz do repo.
```

- [ ] **Step 2: Commit e push**

```bash
git add README.md
git commit -m "docs: README com uso, testes e deploy"
git push origin main
```
Expected: push OK para `lucaslanzoni/moxie_plataforma_conteudo`.

- [ ] **Step 3: Habilitar GitHub Pages**

```bash
gh api -X POST repos/lucaslanzoni/moxie_plataforma_conteudo/pages \
  -f 'source[branch]=main' -f 'source[path]=/' 2>/dev/null \
  || echo "Se falhar, habilitar manualmente em Settings > Pages > Branch: main / root"
```
Expected: Pages criado, ou instrução de fallback para o painel web.

- [ ] **Step 4: Verificar o site no ar**

Aguardar ~1 min o build do Pages. Abrir `https://lucaslanzoni.github.io/moxie_plataforma_conteudo/` e tirar screenshot.
Expected: site carrega, contador "23 de 23", filtros funcionam, mobile responsivo. Este é o link pra Gabi.

- [ ] **Step 5: Confirmar critérios de sucesso**

Checklist (spec §13): link online abre; filtro por "momento de marca" (ex: Topo + Curiosidade) devolve ideias em segundos; passa no teste "tirou o logo, ainda parece Moxie"; `dados.json` válido e pronto pra Fase 2; zero custo; responsivo no mobile.

---

## Self-Review (preenchido)

**1. Cobertura do spec:**
- §2/§9 estrutura de dois níveis + anatomia do card + chrome → Tasks 3 e 4.
- §5 schema `dados.json` → Task 1 (validar.js + seed).
- §6 taxonomia (valores fechados, Pinterest incluído) → Global Constraints + Task 1.
- §7 rubric das sensações → insumo pra autoria das `descricao` na Task 1 (Step 7).
- §8 identidade visual Moxie → Task 3 (CSS + frontend-design).
- §9 filtros/busca/contador/legenda/vazios/responsivo → Tasks 2 (lógica) e 4 (DOM) e 3 (legenda/mobile).
- §10 arquitetura vanilla + repo + GitHub Pages + custo zero → Global Constraints, Tasks 1 e 5.
- §11 seed de 23 cards → Task 1 (Step 7), com teste de completude (Step 8).
- §3 contrato Fase 1↔Fase 2 (schema append-friendly) → schema da Task 1 + README (Task 5).

**2. Placeholder scan:** as funções puras, testes, HTML, CSS e app.js estão completos. O único ponto "de autoria" é o corpo dos 23 cards (Task 1, Step 7), enumerados na tabela §11 do spec, com 2 exemplos por extenso, shape fixo e teste de completude (>= 23, schema válido, ids únicos) como gate — não é placeholder, é conteúdo com fonte concreta e verificação.

**3. Consistência de tipos:** `filtrarCards`/`contarResultado`/`agruparPorCategoria` e `validarDados` têm a mesma assinatura na definição (Tasks 1/2) e no consumo (`app.js`, Task 4). IDs do DOM da Task 3 batem com os referenciados em `app.js`. Slugs de funil (`topo/meio/fundo`) consistentes entre CSS (Task 3) e `slugFunil` (Task 4).
