import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateOrderCode } from './order-code.js';
import { ACTIVE_ORDER_STATUSES, FINAL_ORDER_STATUSES, canTransition } from './order-status.js';

describe('máquina de estados do pedido', () => {
  it('avança apenas pelo fluxo Recebido → Em preparação → Pronto → Entregue', () => {
    assert.equal(canTransition('RECEIVED', 'PREPARING'), true);
    assert.equal(canTransition('PREPARING', 'READY'), true);
    assert.equal(canTransition('READY', 'DELIVERED'), true);
  });

  it('não permite pular etapas nem voltar', () => {
    assert.equal(canTransition('RECEIVED', 'READY'), false);
    assert.equal(canTransition('RECEIVED', 'DELIVERED'), false);
    assert.equal(canTransition('PREPARING', 'DELIVERED'), false);
    assert.equal(canTransition('READY', 'PREPARING'), false);
  });

  it('permite cancelar qualquer pedido ainda ativo', () => {
    for (const status of ACTIVE_ORDER_STATUSES) {
      assert.equal(canTransition(status, 'CANCELLED'), true, status);
    }
  });

  it('trata Entregue e Cancelado como estados finais', () => {
    for (const from of FINAL_ORDER_STATUSES) {
      for (const to of [...ACTIVE_ORDER_STATUSES, ...FINAL_ORDER_STATUSES]) {
        assert.equal(canTransition(from, to), false, `${from} → ${to}`);
      }
    }
  });
});

describe('código do pedido', () => {
  it('tem 6 caracteres de um alfabeto sem ambiguidades (sem 0, O, 1, I)', () => {
    for (let i = 0; i < 500; i++) {
      assert.match(generateOrderCode(), /^[2-9A-HJ-NP-Z]{6}$/);
    }
  });

  it('é aleatório (não sequencial)', () => {
    const codes = new Set(Array.from({ length: 1000 }, generateOrderCode));
    assert.ok(codes.size > 990, `apenas ${codes.size} códigos distintos em 1000`);
  });
});
