'use client';

import { useState } from 'react';

export function SyncRun() {
  const [connectionId, setConnectionId] = useState('');
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<{ newCount: number; changedCount: number; anomalyCount: number } | null>(null);
  const [results, setResults] = useState<unknown[] | null>(null);

  async function handleSync() {
    setRunning(true);
    try {
      const response = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, accessToken: process.env.NEXT_PUBLIC_GOOGLE_TOKEN }),
      });
      const data = (await response.json()) as { stats?: { newCount: number; changedCount: number; anomalyCount: number }; results?: unknown[] };
      if (!response.ok) throw new Error('Sinkronisasi gagal');
      setStats(data.stats || null);
      setResults(data.results || null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Connection ID</label>
        <input type="text" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="trip-id:spreadsheet-id:sheet-id" />
      </div>
      <button onClick={handleSync} disabled={running} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
        {running ? 'Sinkronisasi...' : 'Sinkronisasi Sekarang'}
      </button>
      {stats && (
        <div className="border rounded p-4 bg-blue-50">
          <h3 className="font-semibold mb-2">Statistik Sinkronisasi</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.newCount}</div>
              <div className="text-sm text-gray-600">Baris Baru</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.changedCount}</div>
              <div className="text-sm text-gray-600">Diperbarui</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.anomalyCount}</div>
              <div className="text-sm text-gray-600">Perlu Review</div>
            </div>
          </div>
        </div>
      )}
      {results && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Hasil Rekonsiliasi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">Row</th>
                  <th className="px-2 py-1 text-left">Aksi</th>
                  <th className="px-2 py-1 text-left">Booking ID</th>
                  <th className="px-2 py-1 text-left">Field Berubah</th>
                </tr>
              </thead>
              <tbody>
                {(results as Array<{ row?: { rowNumber?: number }; action?: string; bookingId?: string; changedFields?: string[] }>).slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1">{item.row?.rowNumber}</td>
                    <td className="px-2 py-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${item.action === 'new' ? 'bg-green-100 text-green-800' : item.action === 'update' ? 'bg-blue-100 text-blue-800' : item.action === 'review' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100'}`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="px-2 py-1">{item.bookingId || '—'}</td>
                    <td className="px-2 py-1">{item.changedFields?.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
