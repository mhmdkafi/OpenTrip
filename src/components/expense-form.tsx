"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const expenseSchema = z.object({
  tripId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().min(1, "Kategori wajib diisi"),
  amount: z.number().positive("Nominal harus positif"),
  occurredAt: z.string().min(1, "Tanggal wajib diisi"),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  tenantId: string;
  categories: Array<{ id: string; name: string; active: boolean }>;
  trips?: Array<{ id: string; title: string }>;
  onSuccess?: () => void;
}

export function ExpenseForm({ tenantId, categories, trips, onSuccess }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      tripId: null,
      categoryId: "",
      amount: 0,
      occurredAt: new Date().toISOString().slice(0, 16),
      description: "",
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/expenses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          ...data,
          occurredAt: new Date(data.occurredAt).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal membuat pengeluaran");
      }

      reset();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="tripId" className="block text-sm font-medium mb-1">
          Trip
        </label>
        <select
          id="tripId"
          {...register("tripId")}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Umum Bisnis</option>
          {trips?.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title}
            </option>
          ))}
        </select>
        {errors.tripId && <p className="text-red-600 text-sm mt-1">{errors.tripId.message}</p>}
      </div>

      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium mb-1">
          Kategori *
        </label>
        <select
          id="categoryId"
          {...register("categoryId")}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Pilih kategori</option>
          {categories
            .filter((c) => c.active)
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>
        {errors.categoryId && <p className="text-red-600 text-sm mt-1">{errors.categoryId.message}</p>}
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Nominal *
        </label>
        <input
          id="amount"
          type="number"
          step="1000"
          {...register("amount", { valueAsNumber: true })}
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.amount && <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label htmlFor="occurredAt" className="block text-sm font-medium mb-1">
          Tanggal *
        </label>
        <input
          id="occurredAt"
          type="datetime-local"
          {...register("occurredAt")}
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.occurredAt && <p className="text-red-600 text-sm mt-1">{errors.occurredAt.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Deskripsi
        </label>
        <textarea
          id="description"
          {...register("description")}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />
        {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan Pengeluaran"}
      </button>
    </form>
  );
}
