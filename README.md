# Moxie — Plataforma de Referências de Conteúdo

Banco de inspiração de conteúdo de marca da Moxie. Catálogo de ideias/formatos
de conteúdo, filtrável por funil, objetivo, sensação, formato e rede, com
referências reais de posts publicados. Serve para achar a ideia certa para o
momento da marca na hora de produzir.

## Rodar localmente

O `fetch` do `dados.json` não roda via `file://`, então é preciso um servidor estático:

    python3 -m http.server 8000
    # abrir http://localhost:8000

## Rodar os testes

    node --test

(Requer Node 18+. `node --test tests/` com o diretório como argumento falha em
algumas versões — usar `node --test`, que descobre os arquivos de teste sozinho.)

## Estrutura

- `index.html` · `assets/estilo.css` · `assets/app.js` — a plataforma (HTML/CSS/JS
  vanilla, sem framework, sem build, sem dependência de runtime).
- `assets/filtros.js` · `assets/validar.js` — lógica pura testada (`tests/`).
- `dados.json` — a fonte única: `meta`, `taxonomia` e `cards`.
- `prints/` — os prints das referências (nunca hotlink).

## Adicionar / editar referências

Tudo vive em `dados.json`. Cada card de ideia tem tags (funil / objetivo / sensação /
formato / rede) e um array `referencias` — cada referência é
`{ handle, url, print, rede }`, com o print salvo em `prints/`. Rode `node --test`
para validar o schema antes de commitar.

Na Fase 2, um agente vai popular as referências automaticamente (semi-automático,
com aprovação de Lucas). Ver `docs/superpowers/specs/`.

## Deploy

GitHub Pages a partir do branch `main`, raiz do repo.
