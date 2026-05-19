import type { Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | { toString(): string } | null | undefined) {
  return value ? Number(value.toString()) : 0;
}

export function cashMovementSignedAmounts(type: string, amountUsd: number, amountBs: number) {
  if (type === "EXPENSE") {
    return { usd: -amountUsd, bs: -amountBs };
  }

  return { usd: amountUsd, bs: amountBs };
}
