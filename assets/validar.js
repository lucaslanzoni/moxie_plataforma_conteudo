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
