"use client";

import { Settings as SettingsIcon, Bell, Lock, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600 mt-2">
          Kelola pengaturan bisnis, akun, dan integrasi
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            icon: SettingsIcon,
            title: "Pengaturan Bisnis",
            description: "Kelola profil, kategori pengeluaran, dan preferensi",
            href: "#",
          },
          {
            icon: Lock,
            title: "Koneksi Google",
            description: "Hubungkan dan kelola akses ke Google Sheets",
            href: "#",
          },
          {
            icon: Database,
            title: "Koneksi Database",
            description: "Konfigurasi koneksi data dan sinkronisasi",
            href: "#",
          },
          {
            icon: Bell,
            title: "Notifikasi",
            description: "Atur preferensi pemberitahuan dan peringatan",
            href: "#",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.title}
              href={item.href}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <Icon className="text-gray-400 group-hover:text-blue-600" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-blue-600">→</span>
            </a>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
        <p className="text-sm text-blue-900">
          <strong>Bantuan:</strong> Hubungi support untuk bantuan lebih lanjut atau pertanyaan
          tentang fitur dan integrasi.
        </p>
      </div>
    </div>
  );
}
