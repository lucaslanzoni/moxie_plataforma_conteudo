// assets/filtros.js — lógica pura de filtro/busca/contagem/agrupamento. Sem DOM.
const DIMS_UNICA = ['categoria', 'objetivo', 'funil'];
const DIMS_MULTI = ['formato', 'rede', 'sensacao'];

function selecionado(sel) {
  return sel != null && sel !== '' && sel !== 'Todos';
}

// Normaliza para busca: remove acentos e caixa, para "cenario" achar "Cenário".
function normalizar(s) {
  return String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
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
    const busca = normalizar((filtros.busca || '').trim());
    if (busca) {
      const alvo = normalizar([
        card.titulo, card.descricao, card.categoria, card.objetivo, card.funil,
        ...(card.formato || []), ...(card.rede || []), ...(card.sensacao || []),
      ].filter(Boolean).join(' '));
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
