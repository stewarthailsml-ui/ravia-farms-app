"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { ArchiveButton } from "@/components/ui/archive-button";
import { ArchivedToggle } from "@/components/ui/archived-toggle";
import { formatKES } from "@/lib/constants";
import { InputPurchaseRow, InputStockRow, InputUsageRow } from "@/lib/api-client";
import { useFinance, useInputs, useInputPurchases, useInputUsage } from "./use-ravia-data";
import { LogExpenseModal, LogRevenueModal } from "./modals/finance-modals";
import { LogPurchaseModal, LogUsageModal, INPUT_CATEGORY_LABELS, SECTOR_LABELS } from "./modals/inputs-modals";

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
  sector: string;
}

type StockRow = InputStockRow & { id: string };

// `margin` is null rather than 0 for a sector that has spent but never sold —
// there is no denominator, which is a different fact from "broke even".
interface SectorPnl {
  id: string;
  sector: string;
  revenue: number;
  expenses: number;
  net: number;
  margin: number | null;
}

// finance_transactions.source_type predates the sector model and has no
// 'GENERAL' — purchases map GENERAL onto 'OTHER' on the way in, so it maps back
// to the same label here. A NULL is a legacy manual expense with no attribution.
const SOURCE_LABELS: Record<string, string> = {
  POULTRY: "Poultry",
  VEGETABLES: "Vegetables",
  RABBITRY: "Rabbitry",
  CANINE: "Canine",
  OTHER: "General / Farm-wide",
};

export function FinanceView() {
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedPurchases, setShowArchivedPurchases] = useState(false);
  const [showArchivedUsage, setShowArchivedUsage] = useState(false);

  const { data } = useFinance(showArchived);
  // Separate, deliberately unparameterised query for the P&L. `data` above is
  // wired to the Transactions tab's archive toggle, and applyArchiveFilter is
  // exclusive — archived=true returns *only* archived rows — so sharing it would
  // let that toggle silently redraw the P&L from retired transactions. React
  // Query keys these apart, so this is one extra fetch only while the toggle is on.
  const { data: liveFinance } = useFinance();
  const { data: inputs } = useInputs();
  const { data: purchases } = useInputPurchases(showArchivedPurchases);
  const { data: usage } = useInputUsage(showArchivedUsage);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

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
    sector: t.source_type ? (SOURCE_LABELS[t.source_type] ?? t.source_type) : "Unattributed",
  }));

  const revenue = data?.summary.revenue ?? 0;
  const expenses = data?.summary.expenses ?? 0;
  const net = data?.summary.net ?? 0;
  const netColor = net >= 0 ? "text-primary" : "text-danger";

  // ---------- Profit & Loss ----------
  // Always the live books, never the archive view. Derived client-side from the
  // rows already fetched — the totals are the same numbers the summary sums, just
  // grouped, so there is nothing for a second endpoint to disagree with.
  const pnlRevenue = liveFinance?.summary.revenue ?? 0;
  const pnlExpenses = liveFinance?.summary.expenses ?? 0;
  const pnlNet = liveFinance?.summary.net ?? 0;
  const pnlNetColor = pnlNet >= 0 ? "text-primary" : "text-danger";
  // A farm with costs but no sales yet has no meaningful margin — reporting
  // -Infinity% (or 0%) would read as a real figure rather than "not applicable".
  const netMargin = pnlRevenue > 0 ? (pnlNet / pnlRevenue) * 100 : null;

  const bySector = (liveFinance?.transactions ?? []).reduce<
    Record<string, { revenue: number; expenses: number }>
  >((acc, t) => {
    const sector = t.source_type
      ? (SOURCE_LABELS[t.source_type] ?? t.source_type)
      : "Unattributed";
    const row = (acc[sector] ??= { revenue: 0, expenses: 0 });
    if (t.type === "REVENUE") row.revenue += Number(t.amount);
    else row.expenses += Number(t.amount);
    return acc;
  }, {});

  const pnlRows: SectorPnl[] = Object.entries(bySector)
    .map(([sector, v]) => ({
      id: sector,
      sector,
      revenue: v.revenue,
      expenses: v.expenses,
      net: v.revenue - v.expenses,
      margin: v.revenue > 0 ? ((v.revenue - v.expenses) / v.revenue) * 100 : null,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.expenses - a.expenses);

  const pnlColumns: Column<SectorPnl>[] = [
    { key: "sector", header: "Sector", render: (r) => <strong>{r.sector}</strong> },
    {
      key: "revenue",
      header: "Revenue",
      render: (r) => <span className="text-primary">{formatKES(r.revenue)}</span>,
    },
    {
      key: "expenses",
      header: "Expenses",
      render: (r) => <span className="text-danger">{formatKES(r.expenses)}</span>,
    },
    {
      key: "net",
      header: "Net",
      render: (r) => (
        <strong className={r.net >= 0 ? "text-primary" : "text-danger"}>{formatKES(r.net)}</strong>
      ),
    },
    {
      key: "margin",
      header: "Margin",
      render: (r) =>
        r.margin === null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={r.margin >= 0 ? "text-primary" : "text-danger"}>
            {r.margin.toFixed(1)}%
          </span>
        ),
    },
  ];

  const columns: Column<Transaction>[] = [
    { key: "date", header: "Date" },
    {
      key: "type",
      header: "Type",
      render: (t) => <Tag tone={t.type === "revenue" ? "success" : "danger"}>{t.type}</Tag>,
    },
    { key: "cat", header: "Category" },
    { key: "sector", header: "Sector" },
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
      render: (t) =>
        showArchived ? null : (
          <ArchiveButton
            id={t.id}
            queryKey="finance"
            url="finance"
            label="X"
            // A REVENUE row may be one half of a sale (archive_finance_transaction
            // restores the stock too); an EXPENSE may be one half of an input
            // purchase. Both caches are stale the instant the archive succeeds.
            alsoInvalidate={["sales", "poultry", "eggs", "egg-stock", "vegetables", "rabbits", "dogs", "inputs"]}
            confirmMessage="Archive this transaction? If it's a sale or a purchase, the linked stock change is reversed too. Nothing is deleted."
          />
        ),
    },
  ];

  // The input_stock view is keyed by item_id; Table keys rows on `id`.
  const stockRows: StockRow[] = (inputs?.stock ?? []).map((s) => ({ ...s, id: s.item_id }));

  const stockColumns: Column<StockRow>[] = [
    { key: "name", header: "Input", render: (s) => <strong>{s.name}</strong> },
    { key: "category", header: "Category", render: (s) => INPUT_CATEGORY_LABELS[s.category] ?? s.category },
    { key: "sector", header: "Sector", render: (s) => SECTOR_LABELS[s.sector] ?? s.sector },
    {
      key: "on_hand",
      header: "On Hand",
      className: "font-bold",
      render: (s) => {
        // At or below zero means a purchase was never recorded, or a usage entry
        // is wrong — worth seeing at a glance, not buried in a stock count.
        const low = Number(s.on_hand) <= 0;
        return (
          <span className={low ? "text-accent" : undefined}>
            {Number(s.on_hand).toLocaleString()} {s.unit_label}
          </span>
        );
      },
    },
    { key: "purchased", header: "Purchased", render: (s) => Number(s.purchased).toLocaleString() },
    { key: "used", header: "Used", render: (s) => Number(s.used).toLocaleString() },
    {
      key: "last_unit_price",
      header: "Last Price",
      render: (s) => (s.last_unit_price != null ? formatKES(Number(s.last_unit_price)) : "—"),
    },
    { key: "last_supplier", header: "Last Supplier", render: (s) => s.last_supplier ?? "—" },
    { key: "total_spent", header: "Total Spent", render: (s) => formatKES(Number(s.total_spent)) },
    {
      key: "action",
      header: "Action",
      render: (s) => <ArchiveButton id={s.item_id} queryKey="inputs" url="inputs" label="X" />,
    },
  ];

  const purchaseColumns: Column<InputPurchaseRow>[] = [
    { key: "date", header: "Date" },
    { key: "item_name", header: "Input", render: (p) => <strong>{p.item_name}</strong> },
    { key: "supplier", header: "Supplier" },
    { key: "sector", header: "Sector", render: (p) => SECTOR_LABELS[p.sector] ?? p.sector },
    {
      key: "qty",
      header: "Breakdown",
      render: (p) => (
        <span className="text-accent text-[0.7rem] font-medium">
          {Number(p.qty).toLocaleString()} {p.unit_label} @ {Number(p.unit_price).toLocaleString()}
        </span>
      ),
    },
    { key: "amount", header: "Amount (KES)", className: "font-bold", render: (p) => formatKES(Number(p.amount)) },
    {
      key: "action",
      header: "Action",
      render: (p) =>
        showArchivedPurchases ? null : (
          <ArchiveButton
            id={p.id}
            queryKey="input-purchases"
            url="input-purchases"
            label="X"
            alsoInvalidate={["finance", "inputs"]}
            confirmMessage="Archive this purchase? Its expense will be removed from the P&L and the stock balance will be corrected. Nothing is deleted."
          />
        ),
    },
  ];

  const usageColumns: Column<InputUsageRow>[] = [
    { key: "date", header: "Date" },
    { key: "item_name", header: "Input", render: (u) => <strong>{u.item_name}</strong> },
    {
      key: "qty",
      header: "Quantity Used",
      className: "font-bold",
      render: (u) => `${Number(u.qty).toLocaleString()} ${u.unit_label}`,
    },
    { key: "sector", header: "Sector", render: (u) => SECTOR_LABELS[u.sector] ?? u.sector },
    { key: "notes", header: "Notes", render: (u) => u.notes || "—" },
    {
      key: "action",
      header: "Action",
      render: (u) =>
        showArchivedUsage ? null : (
          <ArchiveButton
            id={u.id}
            queryKey="input-usage"
            url="input-usage"
            label="X"
            alsoInvalidate={["inputs"]}
          />
        ),
    },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <>
            <Button variant="danger" size="sm" onClick={() => setPurchaseOpen(true)}>
              <i className="fas fa-cart-shopping" /> Purchase
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUsageOpen(true)}>
              <i className="fas fa-arrow-down" /> Log Usage
            </Button>
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

      <Card title="Financial Summary" className="mb-6">
        <div className="grid grid-cols-3 gap-4">
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

      <Tabs
        tabs={[
          {
            id: "pnl",
            label: "Profit & Loss",
            content: (
              <Card title="Profit & Loss">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
                    <h4 className="text-[0.7rem] text-muted uppercase">Revenue</h4>
                    <div className="text-xl font-bold text-primary">{formatKES(pnlRevenue)}</div>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
                    <h4 className="text-[0.7rem] text-muted uppercase">Expenses</h4>
                    <div className="text-xl font-bold text-danger">{formatKES(pnlExpenses)}</div>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
                    <h4 className="text-[0.7rem] text-muted uppercase">Net Profit</h4>
                    <div className={`text-xl font-bold ${pnlNetColor}`}>{formatKES(pnlNet)}</div>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
                    <h4 className="text-[0.7rem] text-muted uppercase">Net Margin</h4>
                    <div className={`text-xl font-bold ${netMargin === null ? "text-muted" : pnlNetColor}`}>
                      {netMargin === null ? "—" : `${netMargin.toFixed(1)}%`}
                    </div>
                  </div>
                </div>

                <h4 className="text-[0.7rem] text-muted uppercase mb-2 tracking-wide">
                  Profit &amp; Loss by Sector
                </h4>
                <Table
                  columns={pnlColumns}
                  rows={pnlRows}
                  emptyMessage="No transactions yet. Log revenue or an expense to build the P&L."
                  footer={
                    pnlRows.length ? (
                      <tr>
                        <td className="p-4">ALL SECTORS</td>
                        <td className="p-4 text-primary">{formatKES(pnlRevenue)}</td>
                        <td className="p-4 text-danger">{formatKES(pnlExpenses)}</td>
                        <td className={`p-4 ${pnlNetColor}`}>{formatKES(pnlNet)}</td>
                        <td className="p-4">{netMargin === null ? "—" : `${netMargin.toFixed(1)}%`}</td>
                      </tr>
                    ) : undefined
                  }
                />

                <p className="text-[0.7rem] text-muted mt-4">
                  All-time figures across the live books. Archived transactions are excluded and
                  are not affected by the archive toggle on the Transactions tab.
                </p>
              </Card>
            ),
          },
          {
            id: "transactions",
            label: "Transactions",
            content: (
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
                      <td colSpan={5} className="p-4">
                        GRAND TOTAL EXPENSES
                      </td>
                      <td className="p-4">{formatKES(expenses)}</td>
                      <td />
                    </tr>
                  }
                />
              </Card>
            ),
          },
          {
            id: "stock",
            label: "Inputs & Stock",
            content: (
              <Card title="Stock on Hand">
                <Table
                  columns={stockColumns}
                  rows={stockRows}
                  emptyMessage="No inputs recorded yet. Record a purchase to start tracking stock."
                />
              </Card>
            ),
          },
          {
            id: "purchases",
            label: "Purchases",
            content: (
              <Card title="Purchase History">
                <div className="flex justify-end mb-3">
                  <ArchivedToggle checked={showArchivedPurchases} onChange={setShowArchivedPurchases} />
                </div>
                <Table
                  columns={purchaseColumns}
                  rows={purchases ?? []}
                  emptyMessage="No purchases recorded yet."
                />
              </Card>
            ),
          },
          {
            id: "usage",
            label: "Usage Log",
            content: (
              <Card title="Input Usage">
                <div className="flex justify-end mb-3">
                  <ArchivedToggle checked={showArchivedUsage} onChange={setShowArchivedUsage} />
                </div>
                <Table columns={usageColumns} rows={usage ?? []} emptyMessage="No usage logged yet." />
              </Card>
            ),
          },
        ]}
      />

      <LogExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} />
      <LogRevenueModal open={revenueOpen} onClose={() => setRevenueOpen(false)} />
      <LogPurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} />
      <LogUsageModal open={usageOpen} onClose={() => setUsageOpen(false)} />
    </div>
  );
}
