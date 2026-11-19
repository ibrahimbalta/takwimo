"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UserPlus, Calendar, Shield, CheckCircle2, Copy, Check } from "lucide-react";
import { Button, Input, Select, LoadingSkeleton, ErrorState, ToastBanner } from "@/components/ui";

interface MemberRow {
  id: string;
  role: string;
  isActive: boolean;
  user: { id: string; name: string; email: string };
  googleCalendar: { googleEmail: string; mode: string; status: string } | null;
}

export default function TeamPage() {
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/team");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setLoadError(j?.error ?? "Ekip listesi yüklenemedi.");
        return;
      }
      const data = await res.json();
      setMemberships(data.memberships ?? []);
    } catch {
      setLoadError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setInviteLink(null);
    setInviting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? "Davet oluşturulamadı." });
        return;
      }
      setInviteEmail("");
      setInviteLink(data.inviteLink);
      setFeedback({ type: "ok", text: "Davet bağlantısı oluşturuldu." });
    } catch {
      setFeedback({ type: "err", text: "Bağlantı hatası: Davet gönderilemedi." });
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(id: string, role: string) {
    setFeedback(null);
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setFeedback({ type: "err", text: j?.error ?? "Rol güncellenemedi." });
        return;
      }
      setFeedback({ type: "ok", text: "Ekip üyesi rolü güncellendi." });
      await load();
    } catch {
      setFeedback({ type: "err", text: "Bağlantı hatası oluştu." });
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ekip Yönetimi</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kullanıcı başına ekstra ücret olmadan tüm ekibinizi aynı gelen kutusu ve takvimde toplayın.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold self-start">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sınırsız Ekip Üyesi (0₺ / Ekstra Kişi)
        </span>
      </div>

      {feedback && (
        <ToastBanner type={feedback.type} text={feedback.text} onClose={() => setFeedback(null)} />
      )}

      {/* Invite Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-700" />
          Yeni Ekip Üyesi Davet Et
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            required
            aria-label="Davet edilecek e-posta adresi"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="calisan@isletme.com"
            className="flex-1"
          />
          <Select
            aria-label="Davet edilecek rol"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "STAFF" | "ADMIN")}
          >
            <option value="STAFF">Ekip Üyesi (STAFF)</option>
            <option value="ADMIN">Yönetici (ADMIN)</option>
          </Select>
          <Button type="submit" loading={inviting}>
            {inviting ? "Oluşturuluyor..." : "Davet Oluştur"}
          </Button>
        </form>
        {inviteLink && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="break-all">
              <span className="font-bold">Davet Bağlantısı: </span>
              {inviteLink}
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={copyInviteLink}>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Team List */}
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="p-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{m.user.name}</p>
                <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    m.googleCalendar?.status === "CONNECTED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {m.googleCalendar?.status === "CONNECTED"
                    ? `Google (${m.googleCalendar.mode})`
                    : "Takvim Bağlı Değil"}
                </span>

                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <Select
                    aria-label={`${m.user.name} rolü`}
                    value={m.role}
                    disabled={m.role === "OWNER"}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="py-1 text-xs"
                  >
                    <option value="OWNER">Sahip (OWNER)</option>
                    <option value="ADMIN">Yönetici (ADMIN)</option>
                    <option value="STAFF">Ekip Üyesi (STAFF)</option>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
