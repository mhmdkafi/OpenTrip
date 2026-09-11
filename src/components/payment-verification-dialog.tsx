"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatRupiah } from "@/lib/money";
import { CheckCircle, XCircle, Eye, Calendar, AlertCircle } from "lucide-react";

interface PaymentVerificationDialogProps {
  participantId: string;
  participantName: string;
  facility: string;
  meetingPoint: string;
  totalBill: number;
  paidAmount: number;
  remaining: number;
  evidenceUrl: string | null;
  evidencePreviewStatus: "loading" | "success" | "error";
  onClose: () => void;
  onSubmit: (data: PaymentVerificationFormData) => Promise<void>;
}

const verificationSchema = z.object({
  amount: z.number()
    .positive("Nominal harus lebih dari 0")
    .max(100000000, "Nominal terlalu besar"),
  paidDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  paymentMethod: z.enum(["transfer", "cash", "other"]),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  markAsFullyPaid: z.boolean(),
});

export type PaymentVerificationFormData = z.infer<typeof verificationSchema>;

export function PaymentVerificationDialog({
  participantId,
  participantName,
  facility,
  meetingPoint,
  totalBill,
  paidAmount,
  remaining,
  evidenceUrl,
  evidencePreviewStatus,
  onClose,
  onSubmit,
}: PaymentVerificationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      amount: remaining > 0 ? remaining : 0,
      paidDate: new Date().toISOString().split("T")[0],
      paymentMethod: "transfer" as const,
      notes: "",
      markAsFullyPaid: remaining === 0,
    },
    mode: "onChange",
  });

  const formValues = watch();
  const canMarkAsFullyPaid = formValues.amount >= remaining;

  const handleFormSubmit = async (data: PaymentVerificationFormData) => {
    if (data.markAsFullyPaid && data.amount < remaining) {
      alert("Tidak dapat menandai lunas jika nominal kurang dari sisa tagihan");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Payment verification failed:", error);
      alert("Verifikasi pembayaran gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewEvidence = () => {
    if (!evidenceUrl) {
      setPreviewError("Tidak ada URL bukti yang tersedia");
      return;
    }

    if (evidencePreviewStatus === "error") {
      setPreviewError("Akses bukti diperlukan");
      return;
    }

    window.open(evidenceUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Verifikasi Pembayaran</h2>
          <p className="text-gray-600 mt-1">
            {participantName} • {facility} • {meetingPoint}
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Ringkasan Tagihan</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Tagihan:</span>
                      <span className="font-medium">{formatRupiah(totalBill)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sudah Terbayar:</span>
                      <span className="font-medium text-green-600">{formatRupiah(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sisa Tagihan:</span>
                      <span className="font-medium text-red-600">{formatRupiah(remaining)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nominal Transfer
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      {...register("amount", { valueAsNumber: true })}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                        errors.amount ? "border-red-300" : "border-gray-300"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal Transfer
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="date"
                      {...register("paidDate")}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                        errors.paidDate ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {errors.paidDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.paidDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metode Pembayaran
                  </label>
                  <select
                    {...register("paymentMethod")}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      errors.paymentMethod ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai</option>
                    <option value="other">Lainnya</option>
                  </select>
                  {errors.paymentMethod && (
                    <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Preview Bukti Transfer
                  </h3>
                  
                  {evidencePreviewStatus === "loading" && (
                    <p className="text-yellow-700">Memuat preview...</p>
                  )}

                  {evidencePreviewStatus === "success" && evidenceUrl && (
                    <div>
                      <div className="relative bg-gray-100 border border-gray-200 rounded-lg h-40 flex items-center justify-center">
                        <Eye size={48} className="text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={handlePreviewEvidence}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full text-sm"
                      >
                        Buka di Google Drive
                      </button>
                    </div>
                  )}

                  {evidencePreviewStatus === "error" && (
                    <div className="space-y-3">
                      <p className="text-red-700">Tidak dapat mengakses bukti</p>
                      <button
                        type="button"
                        onClick={handlePreviewEvidence}
                        className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 w-full text-sm"
                      >
                        Buka Viewer Google
                      </button>
                    </div>
                  )}

                  {previewError && (
                    <p className="mt-2 text-sm text-red-600">{previewError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      errors.notes ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Catatan internal tentang pembayaran..."
                    maxLength={500}
                  />
                  {errors.notes && (
                    <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                  )}
                </div>

                {remaining > 0 && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register("markAsFullyPaid")}
                        className="rounded border-gray-300"
                        disabled={formValues.amount < remaining}
                      />
                      <div>
                        <span className="font-medium text-gray-900">Tandai Lunas</span>
                        <p className="text-sm text-gray-500">
                          {canMarkAsFullyPaid
                            ? `Sisa akan dilunasi (${formatRupiah(remaining)})`
                            : `Tidak dapat dilunasi - kekurangan ${formatRupiah(remaining - formValues.amount)}`}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Hasil Verifikasi</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Saat Ini:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        remaining === 0 ? "bg-green-50 text-green-700" : 
                        paidAmount > 0 ? "bg-yellow-50 text-yellow-700" : 
                        "bg-red-50 text-red-700"
                      }`}>
                        {remaining === 0 ? "Lunas" : paidAmount > 0 ? "DP" : "Belum Bayar"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Akan Dibayar:</span>
                      <span className="font-medium">{formatRupiah(formValues.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status Setelah:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        (paidAmount + formValues.amount) >= totalBill ? "bg-green-50 text-green-700" : 
                        (paidAmount + formValues.amount) > 0 ? "bg-yellow-50 text-yellow-700" : 
                        "bg-red-50 text-red-700"
                      }`}>
                        {(paidAmount + formValues.amount) >= totalBill ? "Lunas" : 
                         (paidAmount + formValues.amount) > 0 ? "DP" : "Belum Bayar"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Batal
            </button>
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || formValues.amount === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan DP/Belum Lunas"}
              </button>

              {canMarkAsFullyPaid && (
                <button
                  type="submit"
                  onClick={() => handleSubmit((data) => {
                    const fullData = { ...data, markAsFullyPaid: true };
                    handleFormSubmit(fullData);
                  })}
                  disabled={isSubmitting || !isValid || formValues.amount === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Menyimpan..." : "Tandai Lunas"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}