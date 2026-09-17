// assets/app.js — orquestra fetch, validação, render e filtros no DOM.
import { validarDados } from './validar.js';
import { filtrarCards, contarResultado, agruparPorCategoria } from './filtros.js';
import { shortCodeOf, getEstado, alternar, resumo, exportarPayload, limparTudo } from './feedback.js';

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

function atualizarEstadoFiltros(soComRef) {
  let algum = !soComRef;
  const busca = el('busca');
  const buscaAtiva = busca.value.trim() !== '';
  busca.classList.toggle('ativo', buscaAtiva);
  if (buscaAtiva) algum = true;
  for (const dim of DIMS) {
    const sel = el('filtro-' + dim);
    const ativo = sel.value !== 'Todos';
    sel.classList.toggle('ativo', ativo);
    if (ativo) algum = true;
  }
  el('limpar-filtros').classList.toggle('oculto', !algum);
}

function slugFunil(funil) {
  return { 'Topo': 'topo', 'Meio': 'meio', 'Fundo': 'fundo' }[funil] || '';
}

function pilula(texto, classe = '') {
  const s = document.createElement('span');
  s.className = 'pilula ' + classe; s.textContent = texto; return s;
}

function botaoFb(wrap, sc, ref, estado, cls, glifo, rotulo) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'fb-btn fb-' + cls;
  b.textContent = glifo; b.setAttribute('aria-label', rotulo); b.title = rotulo;
  b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const novo = alternar(sc, { handle: ref.handle, url: ref.url }, estado);
    wrap.classList.remove('fb-aprovado', 'fb-rejeitado');
    if (novo) wrap.classList.add('fb-' + novo);
    atualizarBotaoExport();
    atualizarBotaoArquivo();
  });
  return b;
}

function montarRef(ref) {
  const wrap = document.createElement('div');
  wrap.className = 'ref-wrap';
  const sc = shortCodeOf(ref.url);
  wrap.dataset.sc = sc;
  // já aprovada em rodada anterior (dados.json) = travada: só o anel, sem botão — mudar isso
  // exige pedido direto ao Claude, não é mais avaliável pelo painel.
  // sem isso, estado local (localStorage) = avaliação em andamento, ainda não enviada.
  const jaFixada = !!ref.aprovado_gabriela;
  const est0 = getEstado(sc);
  if (jaFixada) wrap.classList.add('aprovado-fixo');
  else if (est0) wrap.classList.add('fb-' + est0);

  const a = document.createElement('a');
  a.className = 'ref'; a.href = ref.url; a.target = '_blank'; a.rel = 'noopener';
  if (ref.print) { const img = document.createElement('img'); img.src = ref.print; img.alt = ref.handle || 'referência'; img.loading = 'lazy'; a.appendChild(img); }
  const ver = document.createElement('span'); ver.className = 'ver'; ver.textContent = 'ver ↗'; a.appendChild(ver);
  if (ref.handle) { const h = document.createElement('span'); h.className = 'handle'; h.textContent = ref.handle; a.appendChild(h); }
  wrap.appendChild(a);

  if (!jaFixada) {
    const fb = document.createElement('div'); fb.className = 'ref-fb';
    fb.appendChild(botaoFb(wrap, sc, ref, 'aprovado', 'aprovar', '\u{1F44D}', 'Aprovar referência'));
    fb.appendChild(botaoFb(wrap, sc, ref, 'rejeitado', 'rejeitar', '✕', 'Rejeitar referência'));
    wrap.appendChild(fb);
  }
  return wrap;
}

function montarCard(card) {
  const art = document.createElement('article');
  art.className = 'card';
  if ((card.referencias || []).length === 0) art.classList.add('sem-ref');

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
    for (const ref of card.referencias) refs.appendChild(montarRef(ref));
    art.appendChild(refs);
  }
  return art;
}

function render() {
  const filtros = lerFiltros();
  let filtrados = filtrarCards(DADOS.cards, filtros);
  const soComRef = el('toggle-refs').getAttribute('aria-pressed') === 'true';
  if (soComRef) filtrados = filtrados.filter((c) => (c.referencias || []).length > 0);
  const soAprovados = el('toggle-aprovados').getAttribute('aria-pressed') === 'true';
  if (soAprovados) filtrados = filtrados.filter((c) => (c.referencias || []).some((r) => r.aprovado_gabriela));
  const { filtrados: n, total } = contarResultado(filtrados, DADOS.cards.length);
  el('contador').innerHTML = `<strong>${n}</strong> de ${total} ideias`;
  atualizarEstadoFiltros(soComRef);

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
  el('toggle-refs').setAttribute('aria-pressed', 'true');
  render();
}

function atualizarBotaoExport() {
  const btn = el('exportar-fb'); if (!btn) return;
  const { total } = resumo();
  btn.textContent = total ? `Enviar avaliações (${total})` : 'Enviar avaliações';
  btn.classList.toggle('tem', total > 0);
}

function atualizarBotaoArquivo() {
  const btn = el('toggle-arquivo'); if (!btn) return;
  const { rejeitadas } = resumo();
  btn.textContent = rejeitadas ? `Arquivadas (${rejeitadas})` : 'Arquivadas';
}

function atualizarBotaoAprovados() {
  const btn = el('toggle-aprovados'); if (!btn) return;
  const n = DADOS.cards.filter((c) => (c.referencias || []).some((r) => r.aprovado_gabriela)).length;
  btn.textContent = n ? `Aprovados (${n})` : 'Aprovados';
}

function abrirExport() {
  const dados = exportarPayload();
  const json = JSON.stringify(dados, null, 2);
  const ov = document.createElement('div'); ov.className = 'export-ov';
  const box = document.createElement('div'); box.className = 'export-box';
  const h = document.createElement('h3'); h.textContent = 'Suas avaliações';
  const sub = document.createElement('p'); sub.className = 'export-sub';
  sub.textContent = dados.resumo.total
    ? `${dados.resumo.aprovadas} aprovadas · ${dados.resumo.rejeitadas} rejeitadas — copia ou baixa e manda pra Moxie.`
    : 'Você ainda não avaliou nenhuma referência. Passa o cursor num print e usa o 👍 ou o ✕.';
  const ta = document.createElement('textarea'); ta.className = 'export-ta'; ta.readOnly = true; ta.value = json;
  const acoes = document.createElement('div'); acoes.className = 'export-acoes';
  const bCopiar = document.createElement('button'); bCopiar.type = 'button'; bCopiar.className = 'export-b primario'; bCopiar.textContent = 'Copiar';
  const bBaixar = document.createElement('button'); bBaixar.type = 'button'; bBaixar.className = 'export-b'; bBaixar.textContent = 'Baixar .json';
  const bLimpar = document.createElement('button'); bLimpar.type = 'button'; bLimpar.className = 'export-b perigo'; bLimpar.textContent = 'Limpar avaliações';
  const bFechar = document.createElement('button'); bFechar.type = 'button'; bFechar.className = 'export-b'; bFechar.textContent = 'Fechar';
  bCopiar.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(json); }
    catch { ta.focus(); ta.select(); try { document.execCommand('copy'); } catch { /* nada */ } }
    bCopiar.textContent = 'Copiado!'; setTimeout(() => { bCopiar.textContent = 'Copiar'; }, 1500);
  });
  bBaixar.addEventListener('click', () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `moxie-avaliacoes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  const fechar = () => ov.remove();
  bFechar.addEventListener('click', fechar);
  bLimpar.addEventListener('click', () => {
    if (!confirm('Limpar todas as suas avaliações locais (aprovado/rejeitado)? As referências já processadas em rodadas anteriores não são afetadas.')) return;
    limparTudo();
    atualizarBotaoExport();
    atualizarBotaoArquivo();
    render();
    fechar();
  });
  ov.addEventListener('click', (e) => { if (e.target === ov) fechar(); });
  if (dados.resumo.total) acoes.append(bCopiar, bBaixar, bLimpar, bFechar);
  else acoes.append(bFechar);
  box.append(h, sub, ta, acoes);
  ov.appendChild(box);
  document.body.appendChild(ov);
  if (dados.resumo.total) { ta.focus(); ta.select(); }
}

export async function iniciar() {
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
  el('toggle-refs').addEventListener('click', () => {
    const btn = el('toggle-refs');
    btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    render();
  });
  el('toggle-aprovados').addEventListener('click', () => {
    const btn = el('toggle-aprovados');
    btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    render();
  });
  atualizarBotaoAprovados();
  const toggle = el('toggle-filtros');
  toggle.addEventListener('click', () => {
    const aberto = el('filtros').classList.toggle('aberto');
    toggle.setAttribute('aria-expanded', String(aberto));
  });
  el('exportar-fb').addEventListener('click', abrirExport);
  atualizarBotaoExport();
  const btnArq = el('toggle-arquivo');
  btnArq.addEventListener('click', () => {
    const ativo = document.body.classList.toggle('ver-arquivo');
    btnArq.setAttribute('aria-pressed', String(ativo));
  });
  atualizarBotaoArquivo();
  render();
}

