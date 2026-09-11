"use client";

import { mockTrips } from "@/lib/demo-data";
import { formatRupiah } from "@/lib/money";
import { Plus, Settings } from "lucide-react";

export default function TripsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip</h1>
          <p className="text-gray-600 mt-2">Kelola trip dan koneksi sumber data</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Tambah Trip
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Judul Trip
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Tanggal Berangkat
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Peserta
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                Total Tagihan
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockTrips.map((trip) => (
              <tr key={trip.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{trip.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {trip.description}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {trip.departure_date.toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {trip.participants_count} orang
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatRupiah(trip.total_revenue)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Settings size={18} className="text-gray-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
