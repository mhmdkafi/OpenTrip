"use client";

import { FileText, Download, Eye } from "lucide-react";

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Absensi</h1>
        <p className="text-gray-600 mt-2">
          Kelola dan ekspor daftar hadir peserta
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Ekspor Absensi</h2>

        <div className="space-y-4">
          {[
            {
              trip: "Puncak Besar Malabar Vol 12",
              participants: 21,
              unpaid: 3,
              version: 2,
              date: "11 Sep 2026 12:30",
            },
            {
              trip: "Gili Trawangan Adventure",
              participants: 15,
              unpaid: 1,
              version: 1,
              date: "10 Sep 2026 14:15",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <FileText className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-medium text-gray-900">{item.trip}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.participants} peserta • {item.unpaid} belum lunas • v{item.version}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{item.date}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-sm">
                  <Eye size={16} />
                  Pratinjau
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <Download size={16} />
                  Unduh PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Info:</strong> Ekspor absensi mencakup seluruh peserta aktif, termasuk yang belum lunas. Kolom NO, NAMA, dan MEPO otomatis terisi dari data peserta.
        </p>
      </div>
    </div>
  );
}
