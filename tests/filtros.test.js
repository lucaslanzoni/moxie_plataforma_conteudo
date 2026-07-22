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
