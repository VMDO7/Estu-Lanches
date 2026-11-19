import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Croissant, Coffee, Sandwich, Salad, Citrus } from 'lucide-react';
import { passwordStrength } from '../features/auth/PasswordStrength';
import { homePathFor, safeRedirect } from '../features/auth/redirect';
import { productVisual } from '../features/products/product-visuals';
import { formatCurrency, formatCurrencyAxis, formatDayKey, initials, percentChange } from './format';

describe('redirecionamento seguro após login', () => {
  it('leva cada papel para a própria área', () => {
    assert.equal(homePathFor('ADMIN'), '/admin');
    assert.equal(homePathFor('STUDENT'), '/aluno');
  });

  it('aceita caminhos internos da área do usuário', () => {
    assert.equal(safeRedirect('/aluno/pedidos', 'STUDENT'), '/aluno/pedidos');
    assert.equal(safeRedirect('/admin/produtos?pagina=2', 'ADMIN'), '/admin/produtos?pagina=2');
  });

  it('bloqueia open redirect e áreas de outro papel', () => {
    for (const value of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '/admin', '/alunoX']) {
      assert.equal(safeRedirect(value, 'STUDENT'), '/aluno', value);
    }
    assert.equal(safeRedirect(null, 'ADMIN'), '/admin');
  });
});

describe('formatação', () => {
  const normalize = (value: string) => value.replace(/\s/g, ' ');

  it('formata reais no padrão brasileiro', () => {
    assert.equal(normalize(formatCurrency(1234.5)), 'R$ 1.234,50');
    assert.equal(normalize(formatCurrencyAxis(950)), 'R$ 950');
  });

  it('não desloca o dia de datas AAAA-MM-DD (fuso)', () => {
    assert.equal(formatDayKey('2026-11-16', { day: '2-digit', month: '2-digit' }), '16/11');
  });

  it('calcula variação percentual e trata base zero', () => {
    assert.equal(percentChange(150, 100), 50);
    assert.equal(percentChange(10, 0), null);
  });

  it('gera iniciais', () => {
    assert.equal(initials('Ana Clara Souza'), 'AS');
    assert.equal(initials('Bruno'), 'B');
  });
});

describe('ilustrações de produto', () => {
  it('escolhe o ícone por palavra inteira (salsicha não vira chá)', () => {
    assert.equal(productVisual('Enroladinho de salsicha', 'salgados').icon, Croissant);
    assert.equal(productVisual('Chá gelado de pêssego', 'bebidas').icon, Coffee);
  });

  it('prioriza lanche sobre salada em "X-salada"', () => {
    assert.equal(productVisual('X-salada', 'lanches').icon, Sandwich);
    assert.equal(productVisual('Salada de frutas (copo)', 'outros').icon, Salad);
    assert.equal(productVisual('Suco natural de laranja', 'bebidas').icon, Citrus);
  });
});

describe('força da senha', () => {
  it('pontua de 0 a 4', () => {
    assert.equal(passwordStrength('abc').score, 0);
    assert.equal(passwordStrength('abcdefgh1').score, 1);
    assert.equal(passwordStrength('Abcdefghij12!').score, 4);
  });
});
