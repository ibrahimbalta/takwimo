"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UserPlus, Calendar, Shield, CheckCircle2 } from "lucide-react";

interface MemberRow {
  id: string;
  role: string;
  isActive: boolean;
  user: { id: string; name: string; email: string };
  googleCalendar: { googleEmail: string; mode: string; status: string } | null;
}

export default function TeamPage() {
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setMemberships(data.memberships ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteLink(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Davet oluşturulamadı.");
      return;
    }
    setInviteEmail("");
    setInviteLink(data.inviteLink);
  }

  async function handleRoleChange(id: string, role: string) {
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ekip Yönetimi</h1>
          <p className="text-sm text-slate-500">
            Kullanıcı başına ekstra ücret olmadan tüm ekibinizi aynı gelen kutusu ve takvimde toplayın.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold self-start">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sınırsız Ekip Üyesi (0₺ / Ekstra Kişi)
        </span>
      </div>

      {/* Invite Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-violet-600" />
          Yeni Ekip Üyesi Davet Et
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="calisan@isletme.com"
            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "STAFF" | "ADMIN")}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="STAFF">Personel (STAFF)</option>
            <option value="ADMIN">Yönetici (ADMIN)</option>
          </select>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold"
          >
            Davet Oluştur
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        {inviteLink && (
          <div className="mt-3 p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-900 break-all">
            <span className="font-semibold">Davet Bağlantısı: </span>
            {inviteLink}
          </div>
        )}
      </div>

      {/* Team List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {memberships.map((m) => (
          <div key={m.id} className="p-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-slate-900">{m.user.name}</p>
              <p className="text-xs text-slate-500">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  m.googleCalendar?.status === "CONNECTED"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {m.googleCalendar?.status === "CONNECTED"
                  ? `Google (${m.googleCalendar.mode})`
                  : "Takvim Bağlı Değil"}
              </span>

              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={m.role}
                  disabled={m.role === "OWNER"}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                >
                  <option value="OWNER">Sahip (OWNER)</option>
                  <option value="ADMIN">Yönetici (ADMIN)</option>
                  <option value="STAFF">Personel (STAFF)</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
