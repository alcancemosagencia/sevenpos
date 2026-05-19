import { ExpensesClient } from "@/features/backoffice/expenses-client";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function ExpensesPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const expenses = await prisma.expense.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const total = expenses.reduce((sum, expense) => sum + decimalToNumber(expense.amount), 0);

  return (
    <ExpensesClient
      total={total}
      expenses={expenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: decimalToNumber(expense.amount),
        createdAt: expense.createdAt.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
      }))}
    />
  );
}
