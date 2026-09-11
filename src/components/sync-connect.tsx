'use client';

import { useState } from 'react';
import { parseGoogleSheetsUrl, suggestHeaderMappings } from '@/lib/google';

export function SyncConnect() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ headers: string[]; suggestions: ReturnType<typeof suggestHeaderMappings>; rows: string[][] } | null>(null);

  async function handleConnect() {
    setError('');
    setLoading(true);
    try {
      const parsed = parseGoogleSheetsUrl(spreadsheetUrl);
      const response = await fetch('/api/sync/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: 'demo-trip', spreadsheetUrl, accessToken: process.env.NEXT_PUBLIC_GOOGLE_TOKEN }),
      });
      const data = (await response.json()) as { mapping?: Record<string, number>; preview?: string[][]; anomalies?: string[]; error?: string };
      if (!response.ok) {
        setError(data.error || 'Koneksi gagal');
        return;
      }
      const headers = Object.keys(data.mapping || {});
      setPreview({ headers, suggestions: suggestHeaderMappings(headers, data.preview), rows: data.preview || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">URL Spreadsheet</label>
        <input type="text" value={spreadsheetUrl} onChange={(e) => setSpreadsheetUrl(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="https://docs.google.com/spreadsheets/d/..." />
      </div>
      <button onClick={handleConnect} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Validasi...' : 'Validasi Koneksi'}
      </button>
      {error && <div className="text-red-600">{error}</div>}
      {preview && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Pemetaan Header</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Field</th>
                <th className="text-left">Header Terdeteksi</th>
                <th className="text-left">Kepercayaan</th>
              </tr>
            </thead>
            <tbody>
              {preview.suggestions.map((item) => (
                <tr key={item.field} className={item.index === null ? 'bg-red-50' : ''}>
                  <td className="py-1">{item.field}</td>
                  <td className="py-1">{item.header || '—'}</td>
                  <td className="py-1">{(item.confidence * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.rows.length > 0 && (
            <>
              <h3 className="font-semibold mt-4 mb-2">Preview Baris (5 pertama)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b">
                        {row.slice(0, 5).map((cell, j) => (
                          <td key={j} className="px-2 py-1 border-r">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
