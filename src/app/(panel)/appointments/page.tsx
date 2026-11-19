"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, CalendarClock } from "lucide-react";
import { formatDateTR, formatPhoneDisplay, formatTimeTR } from "@/lib/utils";
import { HelpBubble, PageGuideBanner } from "@/components/HelpBubble";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<AppointmentRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/appointments?status=${statusFilter}`);
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setFeedback(null);
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setFeedback(`Randevu durumu güncellendi (${status}).`);
      await load();
    }
  }

  async function reschedulePlusOneHour(appt: AppointmentRow) {
    setFeedback(null);
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
    const data = await res.json();
    if (!res.ok) {
      setFeedback(data.error ?? "Saat güncellenemedi.");
      return;
    }
    setFeedback("Randevu +1 saat ertelendi ve değişiklik bildirimi tetiklendi.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Randevular</h1>
          <p className="text-sm text-slate-500">
            Onay, iptal ve erteleme işlemleri Google Calendar ve WhatsApp bildirimleriyle senkronize çalışır.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <HelpBubble
            title="Randevu İşlemleri"
            text="'Onayla', '+1 Saat Ertele' veya 'İptal Et' butonlarına bastığınızda hem Google Takvim güncellenir hem de müşteriye WhatsApp'tan otomatik bilgi mesajı gider."
          />
          <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 self-start"
        >
          <option value="ALL">Tüm Durumlar</option>
          <option value="CONFIRMED">Onaylı</option>
          <option value="PENDING">Bekleyen</option>
          <option value="RESCHEDULED">Ertelenen</option>
          <option value="CANCELLED">İptal</option>
        </select>
        </div>
      </div>

      <PageGuideBanner
        title="Tüm Randevular Tek Listede"
        description="Bekleyen randevuları onaylayabilir, tek tıkla 1 saat erteleyebilir veya iptal edebilirsiniz. Her işlem müşteriye otomatik bildirilir."
      />

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{appt.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700">
                    {appt.status}
                  </span>
                  {appt.isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      DEMO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {appt.contact.name} ({formatPhoneDisplay(appt.contact.phoneE164)}) •{" "}
                  <span className="font-medium text-slate-800">{appt.assignedMembership.user.name}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTR(appt.startAt)} • {formatTimeTR(appt.startAt)} - {formatTimeTR(appt.endAt)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {appt.status !== "CONFIRMED" && appt.status !== "CANCELLED" && (
                  <button
                    onClick={() => updateStatus(appt.id, "CONFIRMED")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Onayla
                  </button>
                )}
                {appt.status !== "CANCELLED" && (
                  <>
                    <button
                      onClick={() => reschedulePlusOneHour(appt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      +1 Saat Ertele
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingCancel(appt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      İptal Et
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              Seçili filtreye uygun randevu bulunamadı.
            </div>
          )}
        </div>
      </div>

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
