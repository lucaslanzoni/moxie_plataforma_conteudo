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
