"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar as CalendarIcon, Plus, X, Clock } from "lucide-react";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { HelpBubble } from "@/components/HelpBubble";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";

interface Member {
  id: string;
  colorHex: string;
  user: { name: string };
}

interface AppointmentItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  isDemo: boolean;
  contact: { name: string; phoneE164: string };
  assignedMembership: { id: string; colorHex?: string; user: { name: string } };
}

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("+905");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("11:00");
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [apptRes, teamRes] = await Promise.all([
      fetch(`/api/appointments?membershipId=${selectedMember}`),
      fetch("/api/team"),
    ]);
    if (apptRes.ok) {
      const aData = await apptRes.json();
      setAppointments(aData.appointments ?? []);
    }
    if (teamRes.ok) {
      const tData = await teamRes.json();
      setMembers(tData.memberships ?? []);
      if (!memberId && tData.memberships?.[0]?.id) setMemberId(tData.memberships[0].id);
    }
  }, [selectedMember, memberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const startAt = new Date(`${date}T${time}:00+03:00`);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          contactPhoneE164: contactPhone,
          assignedMembershipId: memberId,
          title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Randevu oluşturulamadı.");
        return;
      }
      setModalOpen(false);
      setContactName("");
      setTitle("");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  // Group appointments by date string
  const grouped = appointments.reduce<Record<string, AppointmentItem[]>>((acc, item) => {
    if (item.status === "CANCELLED") return acc;
    const key = formatDateTR(item.startAt);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ekip Takvimi</h1>
          <p className="text-sm text-slate-500">
            Google Calendar ile senkronize, çakışma korumalı ortak randevu takvimi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpBubble
            title="Çakışma Korumalı Takvim"
            text="Buradan tüm ekibin randevularını gün gün görebilirsiniz. Yeni randevu eklerken sistem aynı çalışanın o saatte başka işi varsa sizi uyarır ve çakışmayı önler."
          />
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
          >
            <option value="ALL">Tüm Ekip</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Randevu</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(grouped).map(([dayLabel, items]) => (
          <div key={dayLabel} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-violet-600" />
              <span className="font-semibold text-sm text-slate-900">{dayLabel}</span>
            </div>
            <div className="p-3 space-y-2.5">
              {items.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-violet-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeTR(appt.startAt)} - {formatTimeTR(appt.endAt)}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {appt.assignedMembership.user.name}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 mt-1.5">{appt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{appt.contact.name}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Takvimde aktif randevu bulunmuyor.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-slate-900">Yeni Randevu Oluştur</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Müşteri Adı</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Telefon (E.164)</label>
                <input
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Randevu Başlığı</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ekip Üyesi</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tarih</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <TimeSlotPicker
                membershipId={memberId}
                date={date}
                selectedTime={time}
                onSelectTime={setTime}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold mt-2"
              >
                {saving ? "Kontrol Ediliyor..." : "Çakışma Kontrolü Yap & Kaydet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
