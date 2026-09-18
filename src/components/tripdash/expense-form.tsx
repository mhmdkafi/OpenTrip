"use client";
import type { Cash } from "@/lib/workspace/types";
import { cashDate } from "@/lib/workspace/finance-view";
import { useWorkspace } from "./context";
import { Field, Form, Modal, Submit, text, number } from "./ui";
export function ExpenseForm({ tripId, expense, date, onClose }: { tripId: string; expense?: Cash; date: string; onClose: () => void }) {
  const { state, mutate } = useWorkspace();
  return <Modal title={expense ? "Edit pengeluaran" : "Catat pengeluaran"} onClose={onClose}><p className="empty-note">{state.trips.find(t => t.id === tripId)?.title ?? "Umum bisnis"}</p><Form onSave={async data => {
    const fields = { amount: number(data, "amount"), date: text(data, "date"), category: text(data, "category"), description: text(data, "description") };
    await mutate(expense ? { action: "expense.update", expenseId: expense.id, ...fields } : { action: "expense.create", tripId, ...fields }); onClose();
  }}><Field label="Nominal pengeluaran (Rp)" name="amount" type="number" min={1} max={1000000000} required defaultValue={expense?.amount}/><Field label="Tanggal pengeluaran (WIB)" name="date" type="date" defaultValue={expense ? cashDate(expense) : date} required/><Field label="Kategori" name="category" list="expense-categories" required defaultValue={expense?.category}/><datalist id="expense-categories">{[...new Set(["Transportasi", "Konsumsi", "Tiket", "Sewa alat", ...state.cash.filter(c => c.direction === "out").map(c => c.category)])].map(category => <option key={category}>{category}</option>)}</datalist><Field label="Keterangan" name="description" required defaultValue={expense?.description}/><Submit>Simpan pengeluaran</Submit></Form></Modal>;
}
