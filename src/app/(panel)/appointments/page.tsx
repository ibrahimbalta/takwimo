"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, CalendarClock } from "lucide-react";
import { formatDateTR, formatPhoneDisplay, formatTimeTR } from "@/lib/utils";
import { HelpBubble, PageGuideBanner } from "@/components/HelpBubble";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge, ToastBanner, LoadingSkeleton, ErrorState } from "@/components/ui";

interface AppointmentRow {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  isDemo: boolean;
  contact: { name: string; phoneE164: string };
  assignedMembership: { user: { name: string } };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<AppointmentRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/appointments?status=${statusFilter}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setLoadError(j?.error ?? "Randevular yüklenemedi.");
        return;
      }
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    } catch {
      setLoadError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? "Randevu durumu güncellenemedi." });
        return;
      }
      setFeedback({ type: "ok", text: "Randevu durumu güncellendi." });
      await load();
    } catch {
      setFeedback({ type: "err", text: "Bağlantı hatası oluştu." });
    } finally {
      setBusyId(null);
    }
  }

  async function reschedulePlusOneHour(appt: AppointmentRow) {
    setBusyId(appt.id);
    setFeedback(null);
    try {
      const nextStart = new Date(new Date(appt.startAt).getTime() + 60 * 60 * 1000);
      const nextEnd = new Date(new Date(appt.endAt).getTime() + 60 * 60 * 1000);
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          status: "RESCHEDULED",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error ?? "Saat güncellenemedi." });
        return;
      }
      setFeedback({
        type: "ok",
        text: "Randevu +1 saat ertelendi ve değişiklik bildirimi tetiklendi.",
      });
      await load();
    } catch {
      setFeedback({ type: "err", text: "Bağlantı hatası oluştu." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">Randevular</h1>
            <HelpBubble
              title="Randevu İşlemleri"
              text="'Onayla', '+1 Saat Ertele' veya 'İptal Et' butonlarına bastığınızda hem Google Takvim güncellenir hem de müşteriye WhatsApp'tan otomatik bilgi mesajı gider."
            />
          </div>
          <p className="hidden sm:block text-sm text-slate-500 mt-0.5">
            Onay, iptal ve erteleme işlemleri Google Calendar ve WhatsApp bildirimleriyle senkronize çalışır.
          </p>
        </div>
        <select
          aria-label="Randevu durum filtresi"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 shrink-0 shadow-2xs"
        >
          <option value="ALL">Tüm Durumlar</option>
          <option value="CONFIRMED">Onaylandı</option>
          <option value="PENDING">Bekliyor</option>
          <option value="RESCHEDULED">Ertelendi</option>
          <option value="COMPLETED">Tamamlandı</option>
          <option value="CANCELLED">İptal Edildi</option>
        </select>
      </div>

      <PageGuideBanner
        title="Tüm Randevular Tek Listede"
        description="Bekleyen randevuları onaylayabilir, tek tıkla 1 saat erteleyebilir veya iptal edebilirsiniz. Her işlem müşteriye otomatik bildirilir."
      />

      {feedback && (
        <ToastBanner type={feedback.type} text={feedback.text} onClose={() => setFeedback(null)} />
      )}

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between md:justify-start gap-2">
                  <span className="font-bold text-slate-900 text-sm truncate">{appt.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={appt.status} domain="appointment" />
                    {appt.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        DEMO
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-600 truncate">
                  {appt.contact.name} ({formatPhoneDisplay(appt.contact.phoneE164)}) ·{" "}
                  <span className="font-semibold text-slate-800">{appt.assignedMembership.user.name}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {formatDateTR(appt.startAt)} · {formatTimeTR(appt.startAt)} - {formatTimeTR(appt.endAt)}
                  </span>
                </p>
              </div>

              {appt.status !== "CANCELLED" && (
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
                  {appt.status !== "CONFIRMED" && (
                    <button
                      type="button"
                      disabled={busyId === appt.id}
                      onClick={() => updateStatus(appt.id, "CONFIRMED")}
                      className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Onayla
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === appt.id}
                    onClick={() => reschedulePlusOneHour(appt)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-semibold hover:bg-sky-100 disabled:opacity-50 transition-colors"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    +1 Saat Ertele
                  </button>
                  <button
                    type="button"
                    disabled={busyId === appt.id}
                    onClick={() => setPendingCancel(appt)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    İptal Et
                  </button>
                </div>
              )}
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              Seçili filtreye uygun randevu bulunamadı.
            </div>
          )}
        </div>
      </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title="Randevuyu İptal Et"
        description={`${pendingCancel?.contact.name ?? "Müşteri"} için ${pendingCancel ? `${formatDateTR(pendingCancel.startAt)} ${formatTimeTR(pendingCancel.startAt)}` : ""} tarihli "${pendingCancel?.title ?? ""}" randevusu iptal edilecek, Google Takvimden kaldırılacak ve müşteriye WhatsApp iptal bildirimi gönderilecektir.`}
        confirmLabel="Evet, Randevuyu İptal Et"
        variant="danger"
        loading={cancelling}
        onCancel={() => setPendingCancel(null)}
        onConfirm={async () => {
          if (!pendingCancel) return;
          setCancelling(true);
          try {
            await updateStatus(pendingCancel.id, "CANCELLED");
          } finally {
            setCancelling(false);
            setPendingCancel(null);
          }
        }}
      />
    </div>
  );
}
