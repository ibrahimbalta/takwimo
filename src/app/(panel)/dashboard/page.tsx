"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  MessageSquare,
  Users,
  Plug,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { HelpBubble, PageGuideBanner } from "@/components/HelpBubble";
import { StatusBadge, ErrorState } from "@/components/ui";

interface DashboardData {
  stats: {
    todayAppointmentsCount: number;
    unassignedConversationsCount: number;
    openConversationsCount: number;
    teamCount: number;
    googleConnectedCount: number;
  };
  upcomingAppointments: Array<{
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    isDemo: boolean;
    contact: { name: string; phoneE164: string };
    assignedMembership: { user: { name: string } };
  }>;
  whatsappAccount: {
    mode: "DEMO" | "LIVE";
    status: string;
    displayPhone: string;
  } | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadDashboard() {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error ?? "Özet verileri yüklenemedi.");
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError((err as Error)?.message ?? "Sunucuya bağlanılamadı."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  const stats = data?.stats;
  const wa = data?.whatsappAccount;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Clean High-Trust Welcome Header + 3 Quick Actions */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Hoş Geldiniz!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Hızlıca mesajlara bakın, yeni randevu oluşturun veya bağlantılarınızı yönetin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <Link
            href="/inbox"
            className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">WhatsApp</p>
              <p className="text-sm font-bold text-slate-950 mt-0.5 truncate">Mesajlara Bak</p>
              <p className="text-[11px] text-slate-600 mt-0.5 hidden sm:block">Müşterilere hemen cevap yazın</p>
            </div>
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700 shrink-0" />
          </Link>

          <Link
            href="/calendar"
            className="p-3.5 sm:p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-200 uppercase">Takvim</p>
              <p className="text-sm font-bold text-white mt-0.5 truncate">+ Yeni Randevu</p>
              <p className="text-[11px] text-emerald-100 mt-0.5 hidden sm:block">Yeşil boş saati seçip kaydedin</p>
            </div>
            <CalendarCheck2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-200 shrink-0" />
          </Link>

          <Link
            href="/integrations"
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Bağlantılar</p>
              <p className="text-sm font-bold text-slate-950 mt-0.5 truncate">Takvim &amp; WhatsApp</p>
              <p className="text-[11px] text-slate-600 mt-0.5 hidden sm:block">Google hesabınızı eşitleyin</p>
            </div>
            <Plug className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Simple Plain-Turkish Page Guide */}
      <PageGuideBanner
        title="Burası İşletmenizin Özet Ekranıdır"
        description="Bugün kaç randevunuz var, cevap bekleyen WhatsApp mesajı kaldı mı hepsini tek bakışta buradan görebilirsiniz."
        steps={[
          "Mesajlara bakmak için 'Mesajlara Bak' kartına basın",
          "Randevu eklemek için '+ Yeni Randevu' butonuna tıklayın",
          "Bilmediğiniz kutuların yanındaki (?) işaretine dokunun",
        ]}
      />

      {/* Symmetrical 2x2 Mobile / 4x1 Desktop KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Bugünkü Randevu</p>
              <HelpBubble
                title="Bugünkü Randevular"
                text="Bugün içinde gerçekleşecek, iptal edilmemiş tüm onaylı veya bekleyen randevularınızın toplam sayısıdır."
              />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 sm:mt-2">
              {stats?.todayAppointmentsCount ?? 0}
            </p>
            <Link href="/appointments" className="text-[11px] sm:text-xs text-emerald-700 hover:text-emerald-800 font-semibold mt-1.5 sm:mt-2 inline-flex items-center gap-1">
              Tümünü gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center text-emerald-700 shrink-0">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Atanmamış Sohbet</p>
              <HelpBubble
                title="Atanmamış Konuşmalar"
                text="WhatsApp'tan yeni mesaj gelmiş ama henüz ekipten bir çalışana görevlendirilmemiş sohbetlerin sayısıdır."
              />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 sm:mt-2">
              {stats?.unassignedConversationsCount ?? 0}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 truncate">
              Açık: {stats?.openConversationsCount ?? 0}
            </p>
          </div>
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-sky-50 items-center justify-center text-sky-600 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Aktif Ekip</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 sm:mt-2">{stats?.teamCount ?? 0}</p>
            <p className="text-[11px] sm:text-xs text-emerald-600 font-medium mt-1.5 sm:mt-2 truncate">
              Kişi başı ₺0
            </p>
          </div>
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center text-emerald-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Bağlantı</p>
              <HelpBubble
                title="Bağlantı Durumu"
                text="WhatsApp numaranızın ve çalışanlarınızın Google Takvimlerinin bağlı olup olmadığını gösterir."
              />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-2 truncate">
              {wa?.mode === "LIVE" ? "Canlı WhatsApp" : "Demo Modu"}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2 truncate">
              Takvim: {stats?.googleConnectedCount ?? 0} üye
            </p>
          </div>
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-amber-50 items-center justify-center text-amber-600 shrink-0">
            <Plug className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Yaklaşan Randevular</h2>
          <Link href="/appointments" className="text-xs font-semibold text-emerald-700 hover:underline">
            Randevu Yönetimi
          </Link>
        </div>
        {data?.upcomingAppointments.length ? (
          <div className="divide-y divide-slate-100">
            {data.upcomingAppointments.map((appt) => (
              <div key={appt.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{appt.title}</p>
                      {appt.isDemo && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">
                          DEMO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {appt.contact.name} • {appt.assignedMembership.user.name}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-xs font-semibold text-slate-800">
                    {formatDateTR(appt.startAt)} • {formatTimeTR(appt.startAt)}
                  </p>
                  <StatusBadge status={appt.status} domain="appointment" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" />
            <span>Yaklaşan randevu bulunmuyor.</span>
          </div>
        )}
      </div>
    </div>
  );
}
