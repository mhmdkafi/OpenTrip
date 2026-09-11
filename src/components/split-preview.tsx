"use client";

import { useState } from "react";
import { splitName, SplitResult } from "@/lib/split-name";
import { calculateCharge, FacilityCharge, AddOnCharge } from "@/lib/charge";

interface SplitPreviewProps {
  bookingId: string;
  rawName: string;
  facility: string;
  meetingPoint: string;
  basePrice: number;
  onConfirm: (participants: ConfirmedParticipant[]) => void;
  onCancel: () => void;
}

export interface ConfirmedParticipant {
  name: string;
  facility: string;
  meetingPoint: string;
  addOns: AddOnCharge[];
  adjustment: number;
}

export function SplitPreview({
  bookingId,
  rawName,
  facility,
  meetingPoint,
  basePrice,
  onConfirm,
  onCancel,
}: SplitPreviewProps) {
  const splitResult = splitName(rawName);
  
  const [participants, setParticipants] = useState<ConfirmedParticipant[]>(
    splitResult.names.map((sr) => ({
      name: sr.name,
      facility,
      meetingPoint,
      addOns: [],
      adjustment: 0,
    }))
  );

  const handleFacilityChange = (index: number, newFacility: string) => {
    const updated = [...participants];
    updated[index].facility = newFacility;
    setParticipants(updated);
  };

  const handleMepoChange = (index: number, newMepo: string) => {
    const updated = [...participants];
    updated[index].meetingPoint = newMepo;
    setParticipants(updated);
  };

  const handleConfirm = () => {
    onConfirm(participants);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow">
      <h3 className="text-lg font-semibold mb-4">Preview Split Nama</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <strong>Booking ID:</strong> {bookingId}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Nama Asli:</strong> {rawName}
        </p>
      </div>

      {splitResult.hasAmbiguous && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
          <p className="text-sm text-yellow-800 font-semibold">
            ⚠️ Koma ambigu terdeteksi - mohon review
          </p>
        </div>
      )}

      {splitResult.totalWarnings > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded">
          <p className="text-sm text-orange-800">
            {splitResult.totalWarnings} warning ditemukan
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {splitResult.names.map((sr: SplitResult, index: number) => (
          <div
            key={index}
            className={`border rounded p-3 ${
              sr.isAmbiguous ? "bg-yellow-50 border-yellow-400" : "bg-gray-50"
            }`}
          >
            <div className="mb-2">
              <label className="text-sm font-medium">Peserta {index + 1}</label>
              <p className="text-base font-semibold">{sr.name}</p>
              {sr.warnings.length > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {sr.warnings.join(", ")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Fasilitas
                </label>
                <select
                  value={participants[index]?.facility || facility}
                  onChange={(e) => handleFacilityChange(index, e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="Full">Full</option>
                  <option value="Non">Non</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">MEPO</label>
                <input
                  type="text"
                  value={participants[index]?.meetingPoint || meetingPoint}
                  onChange={(e) => handleMepoChange(index, e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Meeting point"
                />
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              Tagihan:{" "}
              {calculateCharge(
                { facility: participants[index]?.facility || facility, basePrice },
                participants[index]?.addOns || [],
                participants[index]?.adjustment || 0
              ).total.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-100 text-sm"
        >
          Batal
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          disabled={splitResult.names.length === 0}
        >
          Konfirmasi Split ({splitResult.names.length} peserta)
        </button>
      </div>
    </div>
  );
}
