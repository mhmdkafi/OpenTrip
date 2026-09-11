"use client";

import { useState, useEffect, useCallback } from "react";
import { PeriodFilter } from "./period-filter";
import type { FilterType } from "@/lib/report";
import { formatRupiah } from "@/lib/money";

interface CashReportProps {
  tenantId: string;
  trips?: Array<{ id: string; title: string }>;
}

interface CashFlowData {
  summary: {
    verified_income: number;
    paid_expenses: number;
    refunds: number;
    net_cash_flow: number;
    opening_balance: number;
    closing_balance: number;
  };
  details: Array<{
    id: string;
    source_type: string;
    direction: "in" | "out";
    amount: number;
    occurred_at: string;
  }>;
  period: {
    filterType: FilterType;
    startDate: string;
    endDate: string;
  };
}

export function CashReport({ tenantId, trips }: CashReportProps) {
  const [selectedTrip, setSelectedTrip] = useState<string>("all");
  const [reportData, setReportData] = useState<CashFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<{
    type: FilterType;
    start?: Date;
    end?: Date;
  }>({ type: "month" });

  const fetchReport = useCallback(async (tripId: string, filterType: FilterType, startDate?: Date, endDate?: Date) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        tripId: tripId,
        filterType: filterType,
      });

      if (filterType === "custom" && startDate && endDate) {
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      } else {
        params.append("referenceDate", new Date().toISOString());
      }

      const response = await fetch(`/api/reports/cash-flow?${params.toString()}`, {
        headers: {
          "x-tenant-id": tenantId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memuat laporan");
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const controller = new AbortController();
    
    async function loadReport() {
      await fetchReport(selectedTrip, currentFilter.type, currentFilter.start, currentFilter.end);
    }
    
    loadReport();
    
    return () => controller.abort();
  }, [selectedTrip, currentFilter.type, currentFilter.start, currentFilter.end, fetchReport]);

  const handlePeriodChange = (filterType: FilterType, startDate?: Date, endDate?: Date) => {
    setCurrentFilter({ type: filterType, start: startDate, end: endDate });
    fetchReport(selectedTrip, filterType, startDate, endDate);
  };

  const handleTripChange = (tripId: string) => {
    setSelectedTrip(tripId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tripSelect" className="block text-sm font-medium mb-2">
            Trip
          </label>
          <select
            id="tripSelect"
            value={selectedTrip}
            onChange={(e) => handleTripChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="all">Semua Trip</option>
            {trips?.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
          </select>
        </div>

        <PeriodFilter onFilterChange={handlePeriodChange} />
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Memuat laporan...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {reportData && !isLoading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Pemasukan Terverifikasi</p>
              <p className="text-xl font-bold text-green-700">
                {formatRupiah(reportData.summary.verified_income)}
              </p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Pengeluaran Dibayar</p>
              <p className="text-xl font-bold text-red-700">
                {formatRupiah(reportData.summary.paid_expenses)}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Refund</p>
              <p className="text-xl font-bold text-yellow-700">
                {formatRupiah(reportData.summary.refunds)}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Arus Kas Bersih</p>
              <p className="text-xl font-bold text-blue-700">
                {formatRupiah(reportData.summary.net_cash_flow)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Saldo Awal</p>
              <p className="text-xl font-bold text-gray-700">
                {formatRupiah(reportData.summary.opening_balance)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Saldo Akhir</p>
              <p className="text-xl font-bold text-purple-700">
                {formatRupiah(reportData.summary.closing_balance)}
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold">Rincian Transaksi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Tanggal</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Tipe</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Arah</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.details.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Tidak ada transaksi dalam periode ini
                      </td>
                    </tr>
                  ) : (
                    reportData.details.map((detail) => (
                      <tr key={detail.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {new Date(detail.occurred_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2 text-sm capitalize">{detail.source_type}</td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              detail.direction === "in"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {detail.direction === "in" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {formatRupiah(detail.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
