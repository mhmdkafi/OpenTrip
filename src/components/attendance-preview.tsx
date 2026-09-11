"use client";

import React, { useState } from "react";
import { Trip } from "@/types";
import { AttendanceParticipant } from "@/lib/pdf/types";

interface Props {
  trip: Trip;
  participants: AttendanceParticipant[];
}

export function AttendancePreview({ trip, participants }: Props) {
  const [includeUnpaid, setIncludeUnpaid] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalParticipants = participants.length;
  const unpaidCount = participants.filter((participant) => (participant.charge ?? 0) - (participant.paid ?? 0) > 0).length;
  const missingMepoCount = participants.filter((participant) => !participant.meetingPoint?.trim()).length;

  const handleExport = async (includeUnpaidOnly?: boolean) => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip,
          participants,
          includeUnpaidAttachment: includeUnpaidOnly ?? includeUnpaid,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengekspor absensi");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${trip.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengekspor absensi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white space-y-4">
      <h3 className="text-lg font-bold">Preview Absensi Baku</h3>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-gray-500">Total Peserta</p>
          <p className="text-xl font-bold">{totalParticipants}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-gray-500">Belum Lunas</p>
          <p className="text-xl font-bold text-amber-600">{unpaidCount}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-gray-500">Mepo Kosong</p>
          <p className="text-xl font-bold text-red-600">{missingMepoCount}</p>
        </div>
      </div>

      {missingMepoCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded">
          Perhatian: Terdapat {missingMepoCount} peserta tanpa Meeting Point (MEPO).
        </div>
      )}

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="includeUnpaid"
          checked={includeUnpaid}
          onChange={(e) => setIncludeUnpaid(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="includeUnpaid" className="text-sm">
          Sertakan Lampiran Sisa Tagihan
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleExport(false)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? "Mengekspor..." : "Ekspor PDF Absensi Baku"}
        </button>
        <button
          onClick={() => handleExport(true)}
          disabled={loading}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
        >
          Ekspor Lampiran Sisa Tagihan
        </button>
      </div>
    </div>
  );
}
