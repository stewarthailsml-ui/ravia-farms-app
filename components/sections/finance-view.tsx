"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Column } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { ArchiveButton } from "@/components/ui/archive-button";
import { ArchivedToggle } from "@/components/ui/archived-toggle";
import { formatKES } from "@/lib/constants";
import { useFinance } from "./use-ravia-data";
import { LogExpenseModal, LogRevenueModal } from "./modals/finance-modals";

interface Transaction {
  id: string;
  date: string;
  type: "revenue" | "expense";
  cat: string;
  desc: string;
  amount: number;
  qty: number | null;
  unitPrice: number | null;
  unitLabel: string | null;
}

export function FinanceView() {
  const [showArchived, setShowArchived] = useState(false);
  const { data } = useFinance(showArchived);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);

  const transactions: Transaction[] = (data?.transactions ?? []).map((t) => ({
    id: t.id,
    date: new Date(t.date).toISOString().split("T")[0],
    type: t.type === "REVENUE" ? "revenue" : "expense",
    cat: t.category,
    desc: t.description,
    amount: Number(t.amount),
    qty: t.qty,
    unitPrice: t.unit_price,
    unitLabel: t.unit_label,
  }));

  const revenue = data?.summary.revenue ?? 0;
  const expenses = data?.summary.expenses ?? 0;
  const net = data?.summary.net ?? 0;
  const netColor = net >= 0 ? "text-primary" : "text-danger";

  const columns: Column<Transaction>[] = [
    { key: "date", header: "Date" },
    {
      key: "type",
      header: "Type",
      render: (t) => <Tag tone={t.type === "revenue" ? "success" : "danger"}>{t.type}</Tag>,
    },
    { key: "cat", header: "Category" },
    {
      key: "desc",
      header: "Details & Breakdown",
      render: (t) => (
        <>
          <strong>{t.desc}</strong>
          {t.qty && t.unitPrice ? (
            <span className={`block text-[0.7rem] font-medium mt-0.5 ${t.type === "revenue" ? "text-primary" : "text-accent"}`}>
              {t.qty.toLocaleString()} {t.unitLabel ?? "units"} @ {t.unitPrice.toLocaleString()} = {t.amount.toLocaleString()}
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: "amount",
      header: "Amount (KES)",
      className: "font-bold",
      render: (t) => formatKES(t.amount),
    },
    {
      key: "action",
      header: "Action",
      render: (t) => (showArchived ? null : <ArchiveButton id={t.id} queryKey="finance" url="finance" label="X" />),
    },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <>
            <Button variant="danger" size="sm" onClick={() => setExpenseOpen(true)}>
              <i className="fas fa-minus" /> Expense
            </Button>
            <Button variant="success" size="sm" onClick={() => setRevenueOpen(true)}>
              <i className="fas fa-plus" /> Revenue
            </Button>
          </>
        }
      >
        Finance Hub
      </SectionHeader>

      <Card title="Financial Summary">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <h4 className="text-[0.7rem] text-muted uppercase">Total Revenue</h4>
            <div className="text-xl font-bold text-primary">{formatKES(revenue)}</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <h4 className="text-[0.7rem] text-muted uppercase">Total Expenses</h4>
            <div className="text-xl font-bold text-danger">{formatKES(expenses)}</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
            <h4 className="text-[0.7rem] text-muted uppercase">Net Cash Flow</h4>
            <div className={`text-xl font-bold ${netColor}`}>{formatKES(net)}</div>
          </div>
        </div>
      </Card>

      <Card title="Transaction History">
        <div className="flex justify-end mb-3">
          <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
        </div>
        <Table
          columns={columns}
          rows={transactions}
          emptyMessage="No transactions yet."
          footer={
            <tr>
              <td colSpan={4} className="p-4">
                GRAND TOTAL EXPENSES
              </td>
              <td className="p-4">{formatKES(expenses)}</td>
              <td />
            </tr>
          }
        />
      </Card>

      <LogExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <LogRevenueModal open={revenueOpen} onClose={() => setRevenueOpen(false)} />
    </div>
  );
}
