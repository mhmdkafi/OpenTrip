"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/money";
import { CheckCircle, XCircle, AlertTriangle, Lock } from "lucide-react";

export interface GroupApprovalData {
  groupId: string;
  groupParticipants: {
    id: string;
    name: string;
    facility: string;
    meetingPoint: string;
    totalBill: number;
    alreadyPaid: number;
    remaining: number;
  }[];
  totalPaymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  allocationPlan: {
    participantId: string;
    allocated: number;
    remainingAfterAllocation: number;
  }[];
  evidenceUrl: string | null;
  accessStatus: "accessible" | "restricted" | "unknown";
  dataVersion: number;
}

interface GroupApprovalDialogProps {
  data: GroupApprovalData;
  onClose: () => void;
  onSubmit: (
    allocation: GroupApprovalData["allocationPlan"],
    markAllFullyPaid: boolean
  ) => Promise<void>;
  onSavePartial: (allocation: GroupApprovalData["allocationPlan"]) => Promise<void>;
}

export function GroupApprovalDialog({
  data,
  onClose,
  onSubmit,
  onSavePartial,
}: GroupApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataVersion, setDataVersion] = useState(data.dataVersion);
  const [allocations, setAllocations] = useState(data.allocationPlan);
  const [optimisticLockError, setOptimisticLockError] = useState(false);

  const totalBill = data.groupParticipants.reduce((sum, p) => sum + p.totalBill, 0);
  const totalAlreadyPaid = data.groupParticipants.reduce((sum, p) => sum + p.alreadyPaid, 0);
  const totalRemaining = data.groupParticipants.reduce((sum, p) => sum + p.remaining, 0);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
  const remainingFunds = data.totalPaymentAmount - totalAllocated;
  const excessFunds = Math.max(0, data.totalPaymentAmount - totalRemaining);

  const canFullyPay = data.totalPaymentAmount >= totalRemaining;
  const allParticipantsCanBeFullyPaid = allocations.every(
    (a) => a.remainingAfterAllocation === 0
  );

  const handleAllocationChange = (participantId: string, value: number) => {
    const participant = data.groupParticipants.find((p) => p.id === participantId);
    if (!participant) return;

    const maxAllocatable = Math.min(participant.remaining, remainingFunds + participant.remaining);
    const newAllocation = Math.max(0, Math.min(value, maxAllocatable));

    setAllocations((prev) =>
      prev.map((item) =>
        item.participantId === participantId
          ? {
              ...item,
              allocated: newAllocation,
              remainingAfterAllocation: participant.remaining - newAllocation,
            }
          : item
      )
    );
  };

  const handleDistributeEqually = () => {
    const participantsWithRemaining = data.groupParticipants.filter((p) => p.remaining > 0);
    if (participantsWithRemaining.length === 0) return;

    const remainingPerParticipant = Math.floor(data.totalPaymentAmount / participantsWithRemaining.length);
    const newAllocations = allocations.map((item) => {
      const participant = data.groupParticipants.find((p) => p.id === item.participantId);
      if (!participant || participant.remaining === 0) {
        return item;
      }

      const allocated = Math.min(participant.remaining, remainingPerParticipant);
      return {
        ...item,
        allocated,
        remainingAfterAllocation: participant.remaining - allocated,
      };
    });

    setAllocations(newAllocations);
  };

  const handleDistributeProportional = () => {
    const participantsWithRemaining = data.groupParticipants.filter((p) => p.remaining > 0);
    if (participantsWithRemaining.length === 0) return;

    const totalRemaining = participantsWithRemaining.reduce((sum, p) => sum + p.remaining, 0);
    
    const newAllocations = allocations.map((item) => {
      const participant = data.groupParticipants.find((p) => p.id === item.participantId);
      if (!participant || participant.remaining === 0) {
        return item;
      }

      const proportion = participant.remaining / totalRemaining;
      const allocated = Math.min(participant.remaining, Math.floor(data.totalPaymentAmount * proportion));
      return {
        ...item,
        allocated,
        remainingAfterAllocation: participant.remaining - allocated,
      };
    });

    setAllocations(newAllocations);
  };

  const handleMarkAllFullyPaid = () => {
    if (!canFullyPay) return;

    const newAllocations = allocations.map((item) => {
      const participant = data.groupParticipants.find((p) => p.id === item.participantId);
      return {
        ...item,
        allocated: participant?.remaining || 0,
        remainingAfterAllocation: 0,
      };
    });

    setAllocations(newAllocations);
  };

  const handleSubmit = async (markAllFullyPaid: boolean) => {
    if (markAllFullyPaid && !allParticipantsCanBeFullyPaid) {
      alert("Tidak semua peserta dapat dilunasi");
      return;
    }

    if (optimisticLockError) {
      alert("Data telah berubah. Muat ulang halaman dan coba lagi.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (markAllFullyPaid) {
        await onSubmit(allocations, true);
      } else {
        await onSavePartial(allocations);
      }
    } catch (error: any) {
      if (error?.code === "OPTIMISTIC_LOCK_ERROR") {
        setOptimisticLockError(true);
        alert("Data telah berubah. Muat ulang halaman dan coba lagi.");
      } else {
        console.error("Group approval failed:", error);
        alert("Persetujuan grup gagal");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvidencePreview = () => {
    if (!data.evidenceUrl) {
      alert("Tidak ada URL bukti yang tersedia");
      return;
    }

    if (data.accessStatus === "restricted" || data.accessStatus === "unknown") {
      alert("Akses bukti terbatas. Buka viewer Google secara manual.");
      return;
    }

    window.open(data.evidenceUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Persetujuan Pembayaran Grup</h2>
              <p className="text-gray-600 mt-1">
                Grup {data.groupId} • {data.groupParticipants.length} peserta
              </p>
            </div>
            {optimisticLockError && (
              <div className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <Lock size={14} className="inline mr-1" />
                Data telah berubah
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Transfer</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Nominal:</span>
                    <span className="font-bold">{formatRupiah(data.totalPaymentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Tanggal:</span>
                    <span>{new Date(data.paymentDate).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Metode:</span>
                    <span className="capitalize">{data.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-3">Bukti Transfer</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      data.accessStatus === "accessible" ? "bg-green-500" :
                      data.accessStatus === "restricted" ? "bg-yellow-500" :
                      "bg-gray-400"
                    }`} />
                    <span className="text-sm">
                      {data.accessStatus === "accessible" ? "Akses tersedia" :
                       data.accessStatus === "restricted" ? "Akses terbatas" :
                       "Akses tidak diketahui"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEvidencePreview}
                    disabled={!data.evidenceUrl || data.accessStatus !== "accessible"}
                    className={`w-full px-3 py-2 text-sm rounded ${
                      data.evidenceUrl && data.accessStatus === "accessible"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Buka Preview
                  </button>
                </div>
              </div>

              {excessFunds > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-3">Kelebihan Dana</h3>
                  <p className="text-lg font-bold text-green-700">
                    {formatRupiah(excessFunds)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Dana akan dicatat sebagai &quot;belum dialokasikan&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Tagihan</p>
                      <p className="text-lg font-bold">{formatRupiah(totalBill)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sudah Bayar</p>
                      <p className="text-lg font-bold text-green-600">{formatRupiah(totalAlreadyPaid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Kekurangan</p>
                      <p className="text-lg font-bold text-red-600">{formatRupiah(totalRemaining)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dana Tersisa</p>
                      <p className={`text-lg font-bold ${remainingFunds > 0 ? "text-blue-600" : "text-gray-600"}`}>
                        {formatRupiah(remainingFunds)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Distribusi Merata
                    </button>
                    <button
                      type="button"
                      onClick={handleDistributeProportional}
                      className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Distribusi Proporsional
                    </button>
                    {canFullyPay && (
                      <button
                        type="button"
                        onClick={handleMarkAllFullyPaid}
                        className="px-4 py-2 bg-green-100 border border-green-300 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                      >
                        Lunaskan Semua
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Peserta</th>
                          <th className="px-4 py-3 text-left">Fasilitas</th>
                          <th className="px-4 py-3 text-left">MEPO</th>
                          <th className="px-4 py-3 text-right">Tagihan</th>
                          <th className="px-4 py-3 text-right">Sudah Bayar</th>
                          <th className="px-4 py-3 text-right">Sisa</th>
                          <th className="px-4 py-3 text-right">Alokasi</th>
                          <th className="px-4 py-3 text-right">Setelah Alokasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.groupParticipants.map((participant, index) => {
                          const allocation = allocations.find((a) => a.participantId === participant.id);
                          return (
                            <tr key={participant.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">{participant.name}</p>
                                  <p className="text-xs text-gray-500">Peserta {index + 1}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                                  {participant.facility}
                                </span>
                              </td>
                              <td className="px-4 py-3">{participant.meetingPoint}</td>
                              <td className="px-4 py-3 text-right font-medium">
                                {formatRupiah(participant.totalBill)}
                              </td>
                              <td className="px-4 py-3 text-right text-green-600">
                                {formatRupiah(participant.alreadyPaid)}
                              </td>
                              <td className="px-4 py-3 text-right text-red-600 font-medium">
                                {formatRupiah(participant.remaining)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">Rp</span>
                                  <input
                                    type="number"
                                    value={allocation?.allocated || 0}
                                    onChange={(e) =>
                                      handleAllocationChange(participant.id, Number(e.target.value))
                                    }
                                    min="0"
                                    max={Math.min(participant.remaining, remainingFunds + participant.remaining)}
                                    className="w-32 px-3 py-1 border border-gray-300 rounded text-right"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-medium ${
                                  allocation?.remainingAfterAllocation === 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}>
                                  {formatRupiah(allocation?.remainingAfterAllocation || 0)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-600">Status Kelengkapan</p>
                <p className={`text-lg font-bold ${
                  allParticipantsCanBeFullyPaid ? "text-green-700" : "text-yellow-700"
                }`}>
                  {allParticipantsCanBeFullyPaid
                    ? "Semua peserta dapat dilunasi"
                    : `${allocations.filter(a => a.remainingAfterAllocation > 0).length} peserta masih ada sisa`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Alokasi</p>
                <p className="text-lg font-bold">
                  {formatRupiah(totalAllocated)} / {formatRupiah(data.totalPaymentAmount)}
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || totalAllocated === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran Sebagian"}
              </button>

              {allParticipantsCanBeFullyPaid && (
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || totalAllocated === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Menyimpan..." : "Setujui & Lunaskan Terpilih"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}