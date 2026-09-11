"use client";

import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { Search, Filter, ChevronDown, ChevronUp, ChevronsUpDown, Eye } from "lucide-react";
import { formatRupiah, BILL_STATUS_LABELS } from "@/lib/money";

export interface ParticipantRow {
  id: string;
  bookingId: string;
  name: string;
  facility: string;
  meetingPoint: string;
  addOns: string;
  totalBill: number;
  paidAmount: number;
  remaining: number;
  billStatus: "unpaid" | "dp" | "paid";
  evidence: string | null;
  groupId?: string;
}

interface ParticipantsTableProps {
  data: ParticipantRow[];
  onVerify?: (participantId: string) => void;
  onViewEvidence?: (evidenceUrl: string) => void;
  onSelectGroup?: (groupIds: string[]) => void;
}

export function ParticipantsTable({
  data,
  onVerify,
  onViewEvidence,
  onSelectGroup,
}: ParticipantsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [facilityFilter, setFacilityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [groupIdFilter, setGroupIdFilter] = useState<string>("");

  const columns: ColumnDef<ParticipantRow, unknown>[] = [
    {
      id: "select",
      header: ({ table }: { table: any }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded border-gray-300"
        />
      ),
      cell: ({ row }: { row: any }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="rounded border-gray-300"
        />
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }: { column: any }) => (
        <button
          className="flex items-center gap-2 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nama / Anggota Booking
          {column.getIsSorted() === "asc" ? (
            <ChevronUp size={16} />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronsUpDown size={16} />
          )}
        </button>
      ),
      cell: ({ row }: { row: any }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-gray-500">Booking: {row.original.bookingId.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      accessorKey: "facility",
      header: "Fasilitas",
      cell: ({ row }: { row: any }) => (
        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
          {row.original.facility}
        </span>
      ),
    },
    {
      accessorKey: "meetingPoint",
      header: "MEPO",
      cell: ({ row }: { row: any }) => (
        <span className="text-gray-700">{row.original.meetingPoint}</span>
      ),
    },
    {
      accessorKey: "addOns",
      header: "Add-on",
      cell: ({ row }: { row: any }) => (
        <span className="text-gray-600 text-sm">{row.original.addOns}</span>
      ),
    },
    {
      accessorKey: "totalBill",
      header: ({ column }: { column: any }) => (
        <button
          className="flex items-center gap-2 font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tagihan
          {column.getIsSorted() === "asc" ? (
            <ChevronUp size={16} />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronsUpDown size={16} />
          )}
        </button>
      ),
      cell: ({ row }: { row: any }) => (
        <span className="font-medium text-gray-900">
          {formatRupiah(row.original.totalBill)}
        </span>
      ),
    },
    {
      accessorKey: "paidAmount",
      header: "Terbayar",
      cell: ({ row }: { row: any }) => (
        <span className="text-green-600 font-medium">
          {formatRupiah(row.original.paidAmount)}
        </span>
      ),
    },
    {
      accessorKey: "remaining",
      header: "Sisa",
      cell: ({ row }: { row: any }) => (
        <span className="text-red-600 font-medium">
          {formatRupiah(row.original.remaining)}
        </span>
      ),
    },
    {
      accessorKey: "billStatus",
      header: "Status",
      cell: ({ row }: { row: any }) => {
        const status = row.original.billStatus as "unpaid" | "dp" | "paid";
        const colors = {
          unpaid: "bg-red-50 text-red-700",
          dp: "bg-yellow-50 text-yellow-700",
          paid: "bg-green-50 text-green-700",
        };
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
            {BILL_STATUS_LABELS[status]}
          </span>
        );
      },
    },
    {
      accessorKey: "evidence",
      header: "Bukti",
      cell: ({ row }: { row: any }) => (
        <button
          onClick={() => row.original.evidence && onViewEvidence?.(row.original.evidence)}
          disabled={!row.original.evidence}
          className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
            row.original.evidence
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "bg-gray-100 text-gray-500 cursor-not-allowed"
          }`}
        >
          <Eye size={14} />
          {row.original.evidence ? "Lihat" : "Tidak ada"}
        </button>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          {row.original.billStatus !== "paid" && (
            <button
              onClick={() => onVerify?.(row.original.id)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Verifikasi
            </button>
          )}
          {row.original.groupId && (
            <button
              onClick={() => onSelectGroup?.([row.original.groupId])}
              className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded hover:bg-purple-100"
            >
              Grup
            </button>
          )}
        </div>
      ),
    },
  ];

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = globalFilter
        ? row.name.toLowerCase().includes(globalFilter.toLowerCase())
        : true;
      const matchesFacility = facilityFilter
        ? row.facility === facilityFilter
        : true;
      const matchesStatus = statusFilter
        ? row.billStatus === statusFilter
        : true;
      const matchesGroup = groupIdFilter
        ? row.groupId === groupIdFilter
        : true;
      return matchesSearch && matchesFacility && matchesStatus && matchesGroup;
    });
  }, [data, globalFilter, facilityFilter, statusFilter, groupIdFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection: Object.fromEntries(
        Array.from(selectedRows).map((id) => [id, true])
      ),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater: any) => {
      const newSelection =
        typeof updater === "function"
          ? updater(Object.fromEntries(Array.from(selectedRows).map((id) => [id, true])))
          : updater;
      const newSelectedRows = new Set<string>(
        Object.keys(newSelection).filter((key) => newSelection[key])
      );
      setSelectedRows(newSelectedRows);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const facilities = Array.from(new Set(data.map((row) => row.facility)));
  const groupIds = Array.from(new Set(data.map((row) => row.groupId).filter(Boolean)));

  const handleGroupAction = () => {
    const selectedParticipants = Array.from(selectedRows)
      .map((id) => data.find((row) => row.id === id))
      .filter(Boolean);
    
    const groupedByGroupId = new Map<string, ParticipantRow[]>();
    selectedParticipants.forEach((p) => {
      if (p?.groupId) {
        if (!groupedByGroupId.has(p.groupId)) {
          groupedByGroupId.set(p.groupId, []);
        }
        groupedByGroupId.get(p.groupId)!.push(p);
      }
    });

    const groups = Array.from(groupedByGroupId.entries());
    if (groups.length > 0) {
      const groupIds = groups.map(([groupId]) => groupId);
      onSelectGroup?.(groupIds);
    }
  };

  const summary = {
    totalResponses: new Set(data.map((row) => row.bookingId)).size,
    totalPeople: data.length,
    totalPaid: data.reduce((sum, row) => sum + row.paidAmount, 0),
    totalRemaining: data.reduce((sum, row) => sum + row.remaining, 0),
    filteredResponses: new Set(filteredData.map((row) => row.bookingId)).size,
    filteredPeople: filteredData.length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-1 min-w-64 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama peserta..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="flex-1 outline-none text-gray-900 bg-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">Semua Fasilitas</option>
            {facilities.map((facility) => (
              <option key={facility} value={facility}>
                {facility}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">Semua Status</option>
            <option value="unpaid">Belum Bayar</option>
            <option value="dp">DP</option>
            <option value="paid">Lunas</option>
          </select>

          {groupIds.length > 0 && (
            <select
              value={groupIdFilter}
              onChange={(e) => setGroupIdFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">Semua Grup</option>
              {groupIds.map((groupId) => (
                <option key={groupId!} value={groupId!}>
                  Grup {groupId!.slice(0, 8)}
                </option>
              ))}
            </select>
          )}

          {selectedRows.size > 0 && (
            <button
              onClick={handleGroupAction}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Aksi Grup ({selectedRows.size} terpilih)
            </button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-blue-700">Respons</p>
            <p className="text-lg font-semibold">
              {summary.filteredResponses}/{summary.totalResponses}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Peserta</p>
            <p className="text-lg font-semibold">
              {summary.filteredPeople}/{summary.totalPeople}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Terbayar</p>
            <p className="text-lg font-semibold text-green-600">
              {formatRupiah(summary.totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Kekurangan</p>
            <p className="text-lg font-semibold text-red-600">
              {formatRupiah(summary.totalRemaining)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup: any) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header: any) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-semibold text-gray-900"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell: any) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data peserta
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Menampilkan {table.getRowModel().rows.length} dari {filteredData.length} peserta
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1 text-sm">
              Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
              {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}