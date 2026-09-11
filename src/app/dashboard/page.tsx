"use client";

import { mockTrips, mockParticipants, mockCashFlow } from "@/lib/demo-data";
import { formatRupiah } from "@/lib/money";
import { TrendingUp, Users, DollarSign, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const totalTrips = mockTrips.length;
  const totalParticipants = mockTrips.reduce(
    (sum, trip) => sum + trip.participants_count,
    0
  );
  const totalRevenue = mockTrips.reduce(
    (sum, trip) => sum + trip.total_revenue,
    0
  );
  const totalUnpaid = mockTrips.reduce(
    (sum, trip) => sum + trip.unpaid_amount,
    0
  );

  const stats = [
    {
      label: "Total Trip",
      value: totalTrips.toString(),
      icon: TrendingUp,
      color: "bg-blue-50",
    },
    {
      label: "Total Peserta",
      value: totalParticipants.toString(),
      icon: Users,
      color: "bg-green-50",
    },
    {
      label: "Total Tagihan",
      value: formatRupiah(totalRevenue),
      icon: DollarSign,
      color: "bg-purple-50",
    },
    {
      label: "Belum Terbayar",
      value: formatRupiah(totalUnpaid),
      icon: AlertCircle,
      color: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ringkasan</h1>
        <p className="text-gray-600 mt-2">
          Selamat datang di OpenTrip Dash. Kelola operasional dan keuangan open trip Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`${stat.color} rounded-lg p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <Icon className="text-gray-400" size={32} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Trip Aktif</h2>
          <div className="space-y-4">
            {mockTrips.map((trip) => (
              <div
                key={trip.id}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <h3 className="font-medium text-gray-900">{trip.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {trip.participants_count} peserta
                </p>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-600">
                    Terbayar: {formatRupiah(trip.paid_amount)}
                  </span>
                  <span className="text-red-600 font-medium">
                    Kurang: {formatRupiah(trip.unpaid_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Arus Kas</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo Awal</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.opening_balance)}
              </span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Pemasukan</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.total_income)}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Pengeluaran</span>
              <span className="font-medium">
                {formatRupiah(mockCashFlow.total_expenses)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
              <span>Saldo Akhir</span>
              <span className="text-blue-600">
                {formatRupiah(mockCashFlow.closing_balance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
