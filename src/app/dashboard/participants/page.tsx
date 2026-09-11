"use client";

import { mockParticipants, mockTrips } from "@/lib/demo-data";
import { formatRupiah, BILL_STATUS_LABELS } from "@/lib/money";
import { Search, Filter, Download } from "lucide-react";
import { useState } from "react";

export default function ParticipantsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = mockParticipants.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: filtered.length,
    paid: filtered.filter((p) => p.payment_status === "paid").length,
    dp: filtered.filter((p) => p.payment_status === "dp").length,
    unpaid: filtered.filter((p) => p.payment_status === "unpaid").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Peserta & Pembayaran</h1>
        <p className="text-gray-600 mt-2">Kelola data peserta dan verifikasi pembayaran</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "blue" },
          { label: "Lunas", value: stats.paid, color: "green" },
          { label: "DP", value: stats.dp, color: "yellow" },
          { label: "Belum Bayar", value: stats.unpaid, color: "red" },
        ].map((item) => (
          <div
            key={item.label}
            className={`bg-${item.color}-50 border border-${item.color}-200 rounded-lg p-4`}
          >
            <p className={`text-sm font-medium text-${item.color}-700`}>
              {item.label}
            </p>
            <p className={`text-2xl font-bold text-${item.color}-900 mt-1`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-64 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama peserta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-gray-900"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download size={18} />
            Ekspor
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Nama
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  Fasilitas
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  MEPO
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Tagihan
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Terbayar
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Sisa
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.facility}</td>
                  <td className="px-4 py-3 text-gray-600">{p.meeting_point}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {formatRupiah(p.total_bill)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatRupiah(p.paid_amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    {formatRupiah(p.remaining)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        p.payment_status === "paid"
                          ? "bg-green-50 text-green-700"
                          : p.payment_status === "dp"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {BILL_STATUS_LABELS[p.payment_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
