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

function atualizarEstadoFiltros(soComRef) {
  let algum = !!soComRef;
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

function montarCard(card) {
  const art = document.createElement('article');
  art.className = 'card';
  if ((card.referencias || []).length === 0) art.classList.add('vazio');

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
  let filtrados = filtrarCards(DADOS.cards, filtros);
  const soComRef = el('toggle-refs').getAttribute('aria-pressed') === 'true';
  if (soComRef) filtrados = filtrados.filter((c) => (c.referencias || []).length > 0);
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
  el('toggle-refs').setAttribute('aria-pressed', 'false');
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
  el('toggle-refs').addEventListener('click', () => {
    const btn = el('toggle-refs');
    btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    render();
  });
  const toggle = el('toggle-filtros');
  toggle.addEventListener('click', () => {
    const aberto = el('filtros').classList.toggle('aberto');
    toggle.setAttribute('aria-expanded', String(aberto));
  });
  render();
}

iniciar();
