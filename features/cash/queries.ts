import { prisma } from "@/lib/prisma";
import { cashMovementSignedAmounts, decimalToNumber } from "@/features/cash/utils";

export async function getOpenCashSessionSummary(businessId: string, branchId?: string) {
  const session = await prisma.cashSession.findFirst({
    where: { businessId, status: "OPEN", ...(branchId ? { branchId } : {}) },
    include: {
      openedBy: { select: { fullName: true, email: true } },
      movements: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!session) return null;

  const expected = session.movements.reduce(
    (totals, movement) => {
      const signed = cashMovementSignedAmounts(
        movement.type,
        decimalToNumber(movement.amountUsd),
        decimalToNumber(movement.amountBs),
      );
      return {
        usd: totals.usd + signed.usd,
        bs: totals.bs + signed.bs,
      };
    },
    { usd: 0, bs: 0 },
  );

  const expenses = session.movements.reduce(
    (totals, movement) => ({
      usd: totals.usd + (movement.type === "EXPENSE" ? decimalToNumber(movement.amountUsd) : 0),
      bs: totals.bs + (movement.type === "EXPENSE" ? decimalToNumber(movement.amountBs) : 0),
    }),
    { usd: 0, bs: 0 },
  );

  const incomes = session.movements.reduce(
    (totals, movement) => ({
      usd: totals.usd + (movement.type === "INCOME" ? decimalToNumber(movement.amountUsd) : 0),
      bs: totals.bs + (movement.type === "INCOME" ? decimalToNumber(movement.amountBs) : 0),
    }),
    { usd: 0, bs: 0 },
  );

  return {
    id: session.id,
    openedAt: session.openedAt.toISOString(),
    openedBy: session.openedBy.fullName ?? session.openedBy.email,
    openingAmountUsd: decimalToNumber(session.openingAmountUsd),
    openingAmountBs: decimalToNumber(session.openingAmountBs),
    expectedUsd: expected.usd,
    expectedBs: expected.bs,
    expensesUsd: expenses.usd,
    expensesBs: expenses.bs,
    incomesUsd: incomes.usd,
    incomesBs: incomes.bs,
    movementCount: session.movements.length,
  };
}
