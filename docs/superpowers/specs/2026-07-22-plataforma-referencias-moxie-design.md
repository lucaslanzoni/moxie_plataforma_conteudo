# Design — Plataforma de Referências de Conteúdo (Moxie)

- **Data:** 2026-07-22
- **Projeto (freela):** Moxie
- **Autor:** Lucas + Claude (brainstorming Superpowers)
- **Status:** aprovado para virar plano de implementação (Fase 1)

---

## 1. Contexto e objetivo

A Moxie precisa de um **banco de inspiração de conteúdo** — uma plataforma web onde a pessoa que decide o que postar navega por **ideias/formatos de conteúdo** filtráveis por etapa de funil, objetivo, sensação, formato e rede, e abre **referências reais** (posts publicados de outras marcas) para se inspirar na hora de produzir.

O projeto é inspirado numa plataforma de terceiro (autor `joaomarcosandrades` no Instagram) que faz isso de forma genérica. Aqui o objetivo é **clonar a estrutura e adaptar ao universo de moda/vestuário e à marca Moxie**, com identidade visual própria.

**Usuária primária:** Gabriela (fundadora da Moxie) — *consumidora*: navega e se inspira. Não cadastra conteúdo.
**Mantenedor do acervo:** um **agente automatizado** (Fase 2), com Lucas no loop de aprovação. Não é a Gabriela nem edição manual recorrente.

**Job-to-be-done:** "Estou no momento X da marca (ex: topo de funil, quero gerar curiosidade). Me mostra ideias de conteúdo que funcionam pra isso, com exemplos reais que eu possa abrir."

---

## 2. Referência-fonte e o que clonamos

Prints da plataforma-fonte (fornecidos por Lucas) revelam a estrutura real. **Não é uma galeria plana de prints soltos.** É um **catálogo de dois níveis**:

```
Categoria  →  Card de ideia de conteúdo  →  Referências[]
```

**Anatomia do card de ideia** (unidade principal da interface):

- Número + Título (ex: "Visual Hook – Cenário", "Histórias do Fundador", "ASMR")
- Sensação(ões) como subtítulo em itálico (ex: *Curiosidade*, *Desejo inconsciente – Curiosidade*)
- Pílulas de tag: `OBJ [objetivo]` · `FUNIL [topo/meio/fundo]` (colorida) · `formato(s)` · `rede(s)`
- Box de descrição do **mecanismo** (o *porquê* aquilo funciona) — borda lateral colorida
- `REFERÊNCIAS (n)`: os posts reais — thumbnail (print) + `@handle` + `VER POST ↗` (link pro original)

**Chrome da interface:** barra de instrução no topo, barra de filtros (busca + Categoria · Objetivo · Funil · Formato · Sensação · Rede + "Todos"), contador ("23 de 40 filtradas"), legenda de funil por cor. Cards em masonry de 2 colunas.

O que **não** clonamos: a paleta creme/laranja da fonte. A Moxie usa a própria identidade (seção 8).

---

## 3. Escopo — fronteira Fase 1 / Fase 2

### Fase 1 (este design — o que se constrói agora)

- Site estático que renderiza o catálogo de dois níveis, com filtros, busca, contador e legenda.
- Identidade visual Moxie, responsivo (desktop + mobile).
- Lê um único `dados.json`; prints servidos de `/prints`.
- **Seed curado** de ideias de conteúdo adaptadas pra moda/Moxie, cada uma com mecanismo e (quando houver) 1–3 referências reais.
- Só navegação/leitura. **Sem** tela de cadastro, login ou backend.
- Deploy em hosting estático grátis (GitHub Pages). Custo zero.

### Fase 2 (design separado, depois — só o contrato aqui)

- **Skill de classificação:** recebe um post (URL + metadados) e devolve as tags (funil, objetivo, sensação[], formato, rede) aplicando o *rubric* da seção 7. Lógica reutilizável.
- **Agente agendado:** a partir de contas/hashtags-fonte curadas, encontra posts candidatos, captura o print pelo **embed público** (não exige login), invoca a skill de classificação e **anexa a referência ao card de ideia certo** (ou propõe card novo). Semi-automático: Lucas aprova antes de publicar. Padrão dos agentes existentes de Lucas (Python + launchd, custo zero marginal).
- **Interface de escrita:** o agente escreve no mesmo `dados.json` + `/prints` e dá `git push` → redeploy automático.

**Contrato que a Fase 1 garante para a Fase 2:** o schema da seção 5 é estável e append-friendly. O agente adiciona itens em `cards[].referencias[]` ou novos objetos em `cards[]` sem refatorar a plataforma.

---

## 4. Não-objetivos (YAGNI)

- Sem autenticação, multiusuário ou controle de acesso por usuário.
- Sem tela de cadastro/admin no v1 (o agente é quem alimenta).
- Sem backend, banco de dados ou API — o "banco" é o `dados.json` versionado em git.
- Sem scraping no v1.
- Sem analytics/telemetria.
- Sem custo (nada de serviço pago em nenhuma etapa da Fase 1).

---

## 5. Modelo de dados (`dados.json`)

Fonte única da verdade. Lida pela plataforma, escrita por Lucas (seed) e pelo agente (Fase 2).

```json
{
  "meta": {
    "marca": "Moxie",
    "atualizado_em": "2026-07-22",
    "versao_schema": 1
  },
  "taxonomia": {
    "categoria": ["Visual Hook", "Bastidores", "Histórias & Manifesto", "Produto & Craft", "Cultura & Curadoria", "Carlos", "Comunidade/UGC", "Drop/Lançamento"],
    "funil": ["Topo", "Meio", "Fundo"],
    "objetivo": ["Ser Visto", "Relação", "Conversão"],
    "formato": ["Vídeo", "Foto única", "Carrossel"],
    "rede": ["Instagram", "TikTok", "Pinterest"],
    "sensacao": ["Curiosidade", "Desejo consciente", "Desejo inconsciente", "Identificação", "Oportunidade", "Segurança", "Senso de apreendimento", "Transparência"]
  },
  "cards": [
    {
      "id": "visual-hook-cenario",
      "numero": 4,
      "categoria": "Visual Hook",
      "titulo": "Visual Hook – Cenário",
      "sensacao": ["Curiosidade", "Identificação"],
      "objetivo": "Ser Visto",
      "funil": "Topo",
      "formato": ["Vídeo", "Foto única", "Carrossel"],
      "rede": ["Instagram", "TikTok", "Pinterest"],
      "descricao": "O que prende é o ambiente, a atmosfera, o \"mundo\" criado. O cenário desperta curiosidade imediata e, quando conversa com o lifestyle do público, cria identificação — \"essa é a minha vibe\".",
      "referencias": [
        {
          "handle": "@houseoferros",
          "url": "https://www.instagram.com/p/EXEMPLO/",
          "print": "prints/visual-hook-cenario-01.jpg",
          "rede": "Instagram"
        }
      ]
    }
  ]
}
```

**Regras de schema:**

- `id`: kebab-case único e estável (chave para o agente evitar duplicar).
- `sensacao`, `formato`, `rede`: arrays (múltiplos valores). `objetivo` e `funil`: valor único.
- Todos os valores de tag devem existir em `taxonomia.*` (validação simples no build/seed).
- `referencias[].print`: caminho relativo pra imagem local em `/prints` (nunca hotlink — evita imagem quebrada quando o post sai do ar).
- `referencias[]` pode estar vazio (card sem exemplo ainda é válido e aparece).

---

## 6. Taxonomia (valores fechados)

| Dimensão | Valores | Filtro? |
|---|---|---|
| **Categoria** | Visual Hook · Bastidores · Histórias & Manifesto · Produto & Craft · Cultura & Curadoria · Carlos · Comunidade/UGC · Drop/Lançamento | sim |
| **Funil** | Topo · Meio · Fundo (com legenda de cor) | sim |
| **Objetivo** | Ser Visto · Relação · Conversão | sim |
| **Formato** | Vídeo · Foto única · Carrossel | sim |
| **Rede** | Instagram · TikTok · Pinterest | sim |
| **Sensação** | Curiosidade · Desejo consciente · Desejo inconsciente · Identificação · Oportunidade · Segurança · Senso de apreendimento · Transparência | sim |

Categoria é rascunho de Lucas — editável. As demais estão fechadas.

---

## 7. Rubric de classificação das sensações

Critérios objetivos para seed consistente e para a skill da Fase 2 (não classificar "no olhômetro"):

- **Curiosidade** — cria lacuna de informação. Algo inesperado/estranho que o cérebro quer resolver ("o que é isso?"). Hook visual.
- **Desejo consciente** — o público já sabe que quer. Mostra produto/benefício de forma direta e cobiçável.
- **Desejo inconsciente** — desperta vontade sem racionalizar. Aspiração, status, pertencimento implícito.
- **Identificação** — "isso sou eu / é a minha vibe". Espelha comportamento, lugar e repertório do público.
- **Oportunidade** — urgência/escassez/novidade. Drop, edição limitada, "agora ou nunca".
- **Segurança** — reduz risco percebido. Prova social, bastidor de qualidade, processo que tranquiliza.
- **Senso de apreendimento** — *(= aprendizado, confirmado por Lucas)* o público aprende algo (dica, contexto cultural, "não sabia disso"). Conteúdo educativo — alinhado ao objetivo-mãe da plataforma: ajudar a Gabi a aprender e desenvolver o conteúdo de marca da Moxie.
- **Transparência** — a marca mostra o que costuma ficar escondido (processo, preço, erro, honestidade). Confiança pela abertura.

---

## 8. Identidade visual (Moxie)

Paleta (moodboard vol. 01):

- Fundo/base: creme `#EBE3D8` **ou** petróleo escuro `#1E303C` (definir no protótipo qual domina — provável: base clara creme com dark accents, para leitura de acervo).
- Acento primário: vermelho `#C53B39`.
- Acento secundário: âmbar `#E5A14C`.
- Terciário/frio: azul `#8FB8CC`.
- Texto: petróleo `#1E303C` sobre claro.

**Legenda de funil por cor** (proposta): Topo = âmbar `#E5A14C` · Meio = azul `#8FB8CC` · Fundo = vermelho `#C53B39`. Pílula `FUNIL` do card usa a cor da etapa.

Tipografia: título com personalidade (grotesca condensada/pesada, no espírito retrô 70 da marca); corpo sans-serif limpa. Wordmark `moxie.` (ponto vermelho) presente no cabeçalho.

Teste de marca: "se tirar o logo, ainda parece Moxie?" Se não, ajustar.

---

## 9. UI/UX

**Layout (desktop):**

- Topo fixo: barra de instrução (copy Moxie) + wordmark.
- Barra de filtros sticky: campo de busca textual + 6 dropdowns (Categoria, Objetivo, Funil, Formato, Sensação, Rede), cada um com "Todos" como default. Botão "limpar filtros".
- Cabeçalho de resultado: contador dinâmico ("X de N filtradas") + legenda de funil.
- Grid masonry de 2 colunas de cards de ideia, agrupados/ordenados por categoria (com divisor de categoria).

**Card de ideia:** conforme anatomia da seção 2. Thumbnails das referências em mini-grid dentro do card; clicar abre a URL original em nova aba.

**Comportamento de filtro:** client-side, instantâneo. Filtros combinam (AND entre dimensões; dentro de uma dimensão multivalorada, match se qualquer valor bate). Busca textual varre título + descrição + tags.

**Mobile:** 1 coluna; filtros colapsam em um drawer/acordeão; cards empilhados. (Referência de Lucas mostra mock mobile funcionando.)

**Estados:** vazio ("nenhuma ideia com esses filtros — afrouxa um filtro"), card sem referência ainda (mostra mecanismo, "referências em breve").

---

## 10. Arquitetura técnica

- **Stack:** HTML + CSS + JavaScript vanilla (sem framework, sem build step obrigatório). Um `index.html`, um `estilo.css`, um `app.js`, um `dados.json`, pasta `/prints`.
- **Sem dependências externas em runtime** (sem CDN) — carrega offline e no GitHub Pages sem gargalo. Fontes: system stack ou fontes auto-hospedadas na pasta.
- **Dados:** `app.js` faz `fetch('dados.json')` e renderiza. Sem servidor.
- **Repo:** `lucaslanzoni/moxie_plataforma_conteudo` (GitHub, criado por Lucas). Clone local em `~/Code/freelas/moxie_plataforma_conteudo` (código em `~/Code/`, separado dos deliverables em `~/Documents/Freelas/moxie/`).
- **Deploy:** GitHub Pages a partir desse repo (branch `main`, pasta raiz ou `/docs`), grátis, push publica. Link compartilhável pra Gabriela acessar online.
- **Custo:** zero em toda a Fase 1.

---

## 11. Seed de conteúdo (Fase 1)

~20 cards de ideia adaptados pra moda/Moxie, distribuídos nas categorias e cobrindo todo o funil e as sensações. Tabela-guia (título → funil/objetivo/sensação → mecanismo). Referências reais são **buscadas na implementação** a partir de contas-fonte reais — **não inventar URLs**; onde não houver print capturado, o card entra com `referencias: []`.

| # | Categoria | Título | Funil | Objetivo | Sensação | Mecanismo (resumo) |
|---|---|---|---|---|---|---|
| 1 | Visual Hook | Proporção de objetos | Topo | Ser Visto | Curiosidade | Peça/objeto em escala surreal — o cérebro para pra entender. |
| 2 | Visual Hook | Produto de impacto | Topo | Ser Visto | Desejo inconsciente, Curiosidade | Produto apresentado de forma impactante logo de cara. |
| 3 | Visual Hook | Cenário | Topo | Ser Visto | Curiosidade, Identificação | Ambiente/atmosfera que cria "essa é a minha vibe". |
| 4 | Visual Hook | Estampa em macro | Topo | Ser Visto | Curiosidade | Close extremo da estampa que sai revelando o todo. |
| 5 | Visual Hook | ASMR de tecido | Topo | Ser Visto | Curiosidade, Desejo consciente | Som/textura do algodão e da costura. |
| 6 | Histórias & Manifesto | A história da estampa | Meio | Relação | Senso de apreendimento, Identificação | Assinatura Moxie: narra a referência cultural por trás do design. |
| 7 | Histórias & Manifesto | Manifesto de marca | Meio | Relação | Desejo inconsciente, Identificação | "Roupa pra quem entende a piada" em peça editorial. |
| 8 | Produto & Craft | Detalhe de acabamento | Meio | Relação | Segurança, Desejo consciente | Close em gola, costura, gramatura — justifica preço sem citar preço. |
| 9 | Produto & Craft | Caimento / provador | Fundo | Conversão | Desejo consciente, Segurança | Como veste de verdade. |
| 10 | Produto & Craft | O que R$39 não tem | Meio | Relação | Transparência, Segurança | Comparativo honesto de qualidade. |
| 11 | Cultura & Curadoria | Curadoria de SP | Meio | Relação | Identificação, Senso de apreendimento | Bares, discos, lugares com a vibe da marca. |
| 12 | Cultura & Curadoria | Trilha / referência musical | Topo | Ser Visto | Identificação, Desejo inconsciente | MPB/soul/disco 70 que conecta à estampa. |
| 13 | Cultura & Curadoria | Moodboard visual | Topo | Ser Visto | Curiosidade, Identificação | Carrossel/Pinterest de referências. |
| 14 | Carlos | Carlos aprova o produto | Meio | Relação | Identificação, Curiosidade | Personagem testa a peça, voz seca. |
| 15 | Carlos | Carlos comenta a semana | Meio | Relação | Identificação | Recorrência editorial do mascote. |
| 16 | Bastidores | BTS – processo criativo | Meio | Relação | Identificação, Segurança | Do rascunho à estampa. |
| 17 | Bastidores | BTS – campanha/ensaio | Meio | Relação | Desejo inconsciente | Bastidor do editorial. |
| 18 | Bastidores | BTS – produção/impressão | Meio | Relação | Transparência, Segurança | Como a peça é feita. |
| 19 | Comunidade/UGC | Look real do cliente | Fundo | Conversão | Identificação, Segurança | Prova social, repost. |
| 20 | Comunidade/UGC | Quem entendeu a referência | Meio | Relação | Identificação | Engajamento por repertório. |
| 21 | Drop/Lançamento | Teaser de drop | Topo | Ser Visto | Curiosidade, Oportunidade | Pessoa de costas, vira e revela (do briefing). |
| 22 | Drop/Lançamento | Abertura de carrinho | Fundo | Conversão | Oportunidade, Desejo consciente | Lançamento, "tá no ar". |
| 23 | Drop/Lançamento | Última peça / esgotando | Fundo | Conversão | Oportunidade | Escassez real. |

**Pools de referência-fonte reais** (para captura na implementação/Fase 2, não fabricar): Bolovo, Sometimes, Strip Me Clothing, El Cabriton, Chico Rei (nacionais); Online Ceramics, Praying, Awake NY, Aimé Leon Dore, Stüssy (internacionais de humor/streetwear/craft); mais contas de content-craft que os prints da fonte já citam (ex: `@houseoferros`).

---

## 12. Riscos e mitigações

- **Captura de prints (login-gated):** Fase 1 preenche prints manualmente; Fase 2 usa screenshot do embed público. Mitigação: armazenar print local em `/prints`, nunca hotlink.
- **ToS das redes:** uso interno de inspiração, screenshots de posts públicos, sem republicação/monetização. Risco baixo. Documentado.
- **Visibilidade pública do GitHub Pages:** free tier serve publicamente — expõe o playbook de conteúdo da Moxie. Risco baixo pra marca pequena pré-lançamento. Opções se incomodar: URL não divulgada (obscuridade), gate client-side simples, ou migrar pra deploy privado depois. Default: público não divulgado, revisita se preciso.
- **Staleness do acervo:** resolvido pela Fase 2. Até lá, atualização manual por Lucas.

---

## 13. Critérios de sucesso (Fase 1)

- Gabriela abre o link, filtra por um "momento de marca" (ex: Topo + Curiosidade) e encontra ideias com exemplos em menos de 30s.
- Passa no teste de marca ("tirou o logo, ainda parece Moxie").
- `dados.json` pronto para o agente da Fase 2 escrever sem refatorar a plataforma.
- Zero custo, rodando em GitHub Pages.
- Responsivo real no mobile.

---

## 14. Pendências antes/durante a implementação

- ~~Sentido de "senso de apreendimento"~~ — **resolvido: = aprendizado** (Lucas).
- ~~Lista de categorias~~ — **resolvida: mantida como está** (Lucas).
- ~~Repo/hospedagem~~ — **resolvido: `lucaslanzoni/moxie_plataforma_conteudo` + GitHub Pages** (Lucas criou).
- Definir no protótipo se a base visual é **creme** ou **petróleo** (decisão de layout, resolvida no protótipo).
