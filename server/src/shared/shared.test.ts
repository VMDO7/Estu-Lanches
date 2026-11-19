import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectImageType } from '../modules/uploads/image-signature.js';
import { Decimal, sumMoney, toMoney } from './money.js';
import { slugify } from './text.js';
import { startOfLocalDay } from './time.js';
import { cleanText } from './validation.js';

describe('dinheiro', () => {
  it('soma com precisão decimal (sem erro de ponto flutuante)', () => {
    const total = sumMoney([new Decimal('0.1'), new Decimal('0.2'), new Decimal('6.50')]);
    assert.equal(total.toString(), '6.8');
    assert.notEqual(0.1 + 0.2, 0.3); // o problema que o Decimal evita
  });

  it('arredonda para 2 casas na serialização', () => {
    assert.equal(toMoney(new Decimal('10.005')), 10.01);
    assert.equal(toMoney('7.5'), 7.5);
  });
});

describe('textos', () => {
  it('gera slugs ASCII estáveis', () => {
    assert.equal(slugify('Pão de Queijo'), 'pao-de-queijo');
    assert.equal(slugify('  Bebidas & Sucos!! '), 'bebidas-sucos');
  });

  it('remove caracteres de controle e espaços extras', () => {
    assert.equal(cleanText('  sem\u0000   cebola \n por favor '), 'sem cebola por favor');
  });
});

describe('fuso horário', () => {
  it('calcula a meia-noite de São Paulo em UTC (03:00Z)', () => {
    const now = new Date('2026-11-16T12:30:00Z'); // 09:30 em SP
    assert.equal(startOfLocalDay('America/Sao_Paulo', 0, now).toISOString(), '2026-11-16T03:00:00.000Z');
    assert.equal(startOfLocalDay('America/Sao_Paulo', 1, now).toISOString(), '2026-11-15T03:00:00.000Z');
  });

  it('usa a data local, não a data UTC, perto da meia-noite', () => {
    const now = new Date('2026-11-17T01:00:00Z'); // ainda 16/11 às 22:00 em SP
    assert.equal(startOfLocalDay('America/Sao_Paulo', 0, now).toISOString(), '2026-11-16T03:00:00.000Z');
  });
});

describe('assinatura de imagens', () => {
  const pad = (bytes: number[]) => Buffer.from([...bytes, ...new Array(16).fill(0)]);

  it('reconhece JPEG, PNG e WEBP pelos magic bytes', () => {
    assert.equal(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0])), 'jpg');
    assert.equal(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
    assert.equal(detectImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])), 'webp');
  });

  it('rejeita conteúdo disfarçado e SVG', () => {
    assert.equal(detectImageType(Buffer.from('<script>alert(1)</script>')), null);
    assert.equal(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
    assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null);
  });
});
