"use client";

import { useState } from "react";
import type { FilterType } from "@/lib/report";

interface PeriodFilterProps {
  onFilterChange: (filterType: FilterType, startDate?: Date, endDate?: Date) => void;
}

export function PeriodFilter({ onFilterChange }: PeriodFilterProps) {
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10));

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    if (type !== "custom") {
      onFilterChange(type);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      if (start >= end) {
        alert("Tanggal akhir harus setelah tanggal awal");
        return;
      }
      
      onFilterChange("custom", start, end);
    }
  };

  const handleReferenceDateChange = (date: string) => {
    setReferenceDate(date);
    if (filterType !== "custom") {
      onFilterChange(filterType);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-md">
      <div>
        <label className="block text-sm font-medium mb-2">Periode</label>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleFilterTypeChange("week")}
            className={`px-4 py-2 rounded-md ${
              filterType === "week"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Minggu
          </button>
          <button
            type="button"
            onClick={() => handleFilterTypeChange("month")}
            className={`px-4 py-2 rounded-md ${
              filterType === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bulan
          </button>
          <button
            type="button"
            onClick={() => handleFilterTypeChange("year")}
            className={`px-4 py-2 rounded-md ${
              filterType === "year"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tahun
          </button>
          <button
            type="button"
            onClick={() => handleFilterTypeChange("custom")}
            className={`px-4 py-2 rounded-md ${
              filterType === "custom"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {filterType !== "custom" && (
        <div>
          <label htmlFor="referenceDate" className="block text-sm font-medium mb-1">
            Tanggal Referensi
          </label>
          <input
            id="referenceDate"
            type="date"
            value={referenceDate}
            onChange={(e) => handleReferenceDateChange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      )}

      {filterType === "custom" && (
        <div className="space-y-3">
          <div>
            <label htmlFor="customStart" className="block text-sm font-medium mb-1">
              Tanggal Mulai
            </label>
            <input
              id="customStart"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="customEnd" className="block text-sm font-medium mb-1">
              Tanggal Akhir
            </label>
            <input
              id="customEnd"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <button
            type="button"
            onClick={handleCustomApply}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Terapkan
          </button>
        </div>
      )}
    </div>
  );
}
