"use client";

import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Column } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { formatKES } from "@/lib/constants";

interface Transaction {
  id: number;
  date: string;
  type: "revenue" | "expense";
  cat: string;
  desc: string;
  amount: number;
}

const transactions: Transaction[] = [];

export function FinanceView() {
  const revenue = 0;
  const expenses = 0;
  const net = revenue - expenses;
  const netColor = net >= 0 ? "text-primary" : "text-danger";

  const columns: Column<Transaction>[] = [
    { key: "date", header: "Date" },
    {
      key: "type",
      header: "Type",
      render: (t) => (
        <Tag tone={t.type === "revenue" ? "success" : "danger"}>{t.type}</Tag>
      ),
    },
    { key: "cat", header: "Category" },
    { key: "desc", header: "Details & Breakdown", render: (t) => <strong>{t.desc}</strong> },
    {
      key: "amount",
      header: "Amount (KES)",
      className: "font-bold",
      render: (t) => formatKES(t.amount),
    },
    { key: "action", header: "Action", render: () => <Button variant="outline" size="sm">X</Button> },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <>
            <Button variant="danger" size="sm">
              <i className="fas fa-minus" /> Expense
            </Button>
            <Button variant="success" size="sm">
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
    </div>
  );
}
