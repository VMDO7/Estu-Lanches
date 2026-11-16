import { Prisma } from '../generated/prisma/client.js';

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

/** Converte Decimal do banco em número com 2 casas para respostas JSON. */
export function toMoney(value: Prisma.Decimal | number | string): number {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toNumber();
}

/** Soma valores monetários com precisão decimal (nunca com float). */
export function sumMoney(values: Array<Prisma.Decimal>): Prisma.Decimal {
  return values.reduce((acc, value) => acc.plus(value), new Prisma.Decimal(0));
}
