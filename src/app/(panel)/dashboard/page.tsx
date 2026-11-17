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

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
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

  const stats = data?.stats;
  const wa = data?.whatsappAccount;

  return (
    <div className="space-y-6">
      {/* Vibrant Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-7 text-white shadow-lg shadow-emerald-900/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
            Günlük Özet
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hoş Geldiniz!</h1>
          <p className="text-xs sm:text-sm text-emerald-50">
            WhatsApp konuşmalarınız, ekip takviminiz ve randevu akışınız tek merkezde.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/inbox"
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/25 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            WhatsApp Kutusu
          </Link>
          <Link
            href="/calendar"
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs sm:text-sm font-bold shadow-sm hover:bg-emerald-50 transition-colors"
          >
            + Takvim & Randevu
          </Link>
        </div>
      </div>

      {/* Simple Plain-Turkish Page Guide */}
      <PageGuideBanner
        title="Burası İşletmenizin Özet Ekranıdır"
        description="Bugün kaç randevunuz var, cevap bekleyen WhatsApp mesajı kaldı mı hepsini tek bakışta buradan görebilirsiniz."
        steps={[
          "Mesajlara bakmak için 'Gelen Kutusuna Git' butonuna basın",
          "Takvimi görmek için 'Takvimi Aç' butonuna tıklayın",
          "Bilmediğiniz kutuların yanındaki (?) işaretine dokunun",
        ]}
      />

      {/* Symmetrical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-500">Bugünkü Randevular</p>
              <HelpBubble
                title="Bugünkü Randevular"
                text="Bugün içinde gerçekleşecek, iptal edilmemiş tüm onaylı veya bekleyen randevularınızın toplam sayısıdır."
              />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {stats?.todayAppointmentsCount ?? 0}
            </p>
            <Link href="/appointments" className="text-xs text-violet-600 font-medium mt-2 inline-flex items-center gap-1">
              Tümünü gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-500">Atanmamış Konuşmalar</p>
              <HelpBubble
                title="Atanmamış Konuşmalar"
                text="WhatsApp'tan yeni mesaj gelmiş ama henüz ekipten bir çalışana görevlendirilmemiş sohbetlerin sayısıdır. Hemen bakmanız önerilir."
              />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {stats?.unassignedConversationsCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Toplam açık: {stats?.openConversationsCount ?? 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Aktif Ekip Üyesi</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.teamCount ?? 0}</p>
            <p className="text-xs text-emerald-600 font-medium mt-2">
              Kullanıcı başı ücret yok
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-500">Entegrasyon Durumu</p>
              <HelpBubble
                title="Bağlantı Durumu"
                text="WhatsApp numaranızın ve çalışanlarınızın Google Takvimlerinin bağlı olup olmadığını gösterir. Demo Modu gerçek mesaj atmaz, deneme amaçlıdır."
              />
            </div>
            <p className="text-sm font-bold text-slate-900 mt-2">
              {wa?.mode === "LIVE" ? "Canlı WhatsApp Bağlı" : "Demo Modu Aktif"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Google Takvim: {stats?.googleConnectedCount ?? 0} üye
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Plug className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Yaklaşan Randevular</h2>
          <Link href="/appointments" className="text-xs font-medium text-violet-600 hover:underline">
            Randevu Yönetimi
          </Link>
        </div>
        {data?.upcomingAppointments.length ? (
          <div className="divide-y divide-slate-100">
            {data.upcomingAppointments.map((appt) => (
              <div key={appt.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
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
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-800">
                    {formatDateTR(appt.startAt)} • {formatTimeTR(appt.startAt)}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                    {appt.status}
                  </span>
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
