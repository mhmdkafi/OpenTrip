"use client";

import { mockTrips, mockExpenses, mockCashFlow } from "@/lib/demo-data";
import { formatRupiah } from "@/lib/money";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

export default function FinancePage() {
  const [selectedTrip, setSelectedTrip] = useState("all");

  const filteredExpenses =
    selectedTrip === "all"
      ? mockExpenses
      : mockExpenses.filter((e) => e.trip_id === selectedTrip);

  const totalIncome = mockCashFlow.total_income;
  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netFlow = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Keuangan</h1>
          <p className="text-gray-600 mt-2">
            Laporan kas, pengeluaran, dan rekonsiliasi keuangan
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Tambah Pengeluaran
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Pemasukan</p>
              <p className="text-2xl font-bold text-green-900 mt-2">
                {formatRupiah(totalIncome)}
              </p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Pengeluaran</p>
              <p className="text-2xl font-bold text-red-900 mt-2">
                {formatRupiah(totalExpense)}
              </p>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Arus Kas Bersih</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">
                {formatRupiah(netFlow)}
              </p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ringkasan Kas</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo Awal</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.opening_balance)}
              </span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>+ Pemasukan</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.total_income)}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>- Pengeluaran</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.total_expenses)}
              </span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>- Refund</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.total_refund)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-blue-600">
              <span>Saldo Akhir</span>
              <span>{formatRupiah(mockCashFlow.closing_balance)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Pengeluaran</h2>
            <select
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">Semua Trip</option>
              {mockTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="border-b border-gray-200 pb-3 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {expense.description}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {expense.category} •{" "}
                      {expense.date.toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <p className="font-bold text-red-600">
                    -{formatRupiah(expense.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
