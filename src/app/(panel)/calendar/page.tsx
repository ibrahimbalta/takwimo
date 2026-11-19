"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar as CalendarIcon, Plus, X, Clock, LayoutGrid, List, GripVertical } from "lucide-react";
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

const BOARD_HOURS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState("ALL");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [boardDate, setBoardDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragFeedback, setDragFeedback] = useState<string | null>(null);
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
      setMemberId((prev) => prev || tData.memberships?.[0]?.id || "");
    }
  }, [selectedMember]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const startAt = new Date(`${date}T${time}:00+03:00`);
      const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
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

  async function handleDropOnSlot(targetMemberId: string, targetTime: string) {
    if (!draggingId) return;
    const appt = appointments.find((a) => a.id === draggingId);
    setDraggingId(null);
    if (!appt) return;

    const durationMs = Math.max(
      15 * 60_000,
      new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime()
    );
    const nextStart = new Date(`${boardDate}T${targetTime}:00+03:00`);
    const nextEnd = new Date(nextStart.getTime() + durationMs);

    setDragFeedback(null);
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedMembershipId: targetMemberId,
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
        status: "RESCHEDULED",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setDragFeedback(json.error ?? "Saat taşınamadı (çakışma veya yetki hatası).");
      return;
    }
    setDragFeedback(
      `"${appt.title}" ${targetTime} saatine taşındı — Google Takvim ve WhatsApp otomatik güncellendi!`
    );
    await loadData();
  }

  const activeAppointments = appointments.filter((a) => a.status !== "CANCELLED");

  const grouped = activeAppointments.reduce<Record<string, AppointmentItem[]>>((acc, item) => {
    const key = formatDateTR(item.startAt);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  const visibleMembers =
    selectedMember === "ALL" ? members : members.filter((m) => m.id === selectedMember);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ekip Takvimi (Sürükle-Bırak)</h1>
          <p className="text-sm text-slate-500">
            Randevuları fareyle sürükleyip başka saate veya uzmana taşıyın; Google Takvim ve
            WhatsApp anında güncellensin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                viewMode === "board" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Pano
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                viewMode === "list" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Liste
            </button>
          </div>

          <HelpBubble
            title="Sürükle-Bırak Çakışma Korumalı Takvim"
            text="Pano görünümünde her uzmanın sütununu yan yana görürsünüz. Bir randevuyu sürükleyip başka saate bıraktığınızda çakışma kontrolü yapılır, Google Takvim güncellenir ve müşteriye WhatsApp bildirimi gider."
          />

          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Randevu</span>
          </button>
        </div>
      </div>

      {dragFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {dragFeedback}
        </div>
      )}

      {viewMode === "board" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <input
                type="date"
                value={boardDate}
                onChange={(e) => setBoardDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              İpucu: Bir randevu kartını tutup başka bir saat kutusuna sürükleyin.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div
              className="grid min-w-[680px]"
              style={{
                gridTemplateColumns: `80px repeat(${Math.max(1, visibleMembers.length)}, minmax(180px, 1fr))`,
              }}
            >
              {/* Column Headers */}
              <div className="p-3 border-b border-r border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 text-center">
                Saat
              </div>
              {visibleMembers.map((m) => (
                <div
                  key={m.id}
                  className="p-3 border-b border-r border-slate-200 bg-slate-50 flex items-center gap-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.colorHex ?? "#059669" }}
                  />
                  <span className="text-xs font-bold text-slate-900 truncate">{m.user.name}</span>
                </div>
              ))}

              {/* Time Rows */}
              {BOARD_HOURS.map((slotTime) => (
                <React.Fragment key={slotTime}>
                  <div className="px-2 py-3 border-b border-r border-slate-100 text-[11px] font-semibold text-slate-400 text-center bg-slate-50/40">
                    {slotTime}
                  </div>
                  {visibleMembers.map((m) => {
                    const slotAppts = activeAppointments.filter((a) => {
                      const d = new Date(a.startAt);
                      const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 10);
                      return (
                        a.assignedMembership.id === m.id &&
                        trDate === boardDate &&
                        formatTimeTR(a.startAt) === slotTime
                      );
                    });

                    return (
                      <div
                        key={`${m.id}-${slotTime}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnSlot(m.id, slotTime)}
                        className={`p-1.5 border-b border-r border-slate-100 min-h-[54px] transition-colors ${
                          draggingId ? "hover:bg-emerald-50/80" : ""
                        }`}
                      >
                        {slotAppts.map((appt) => (
                          <div
                            key={appt.id}
                            draggable
                            onDragStart={() => setDraggingId(appt.id)}
                            onDragEnd={() => setDraggingId(null)}
                            style={{ borderLeftColor: m.colorHex ?? "#059669" }}
                            className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-200 border-l-4 cursor-grab active:cursor-grabbing shadow-2xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-900 truncate">
                                {appt.title}
                              </span>
                              <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                            </div>
                            <p className="text-[10px] text-slate-600 truncate">
                              {appt.contact.name} · {formatTimeTR(appt.startAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(grouped).map(([dayLabel, items]) => (
            <div key={dayLabel} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-sm text-slate-900">{dayLabel}</span>
              </div>
              <div className="p-3 space-y-2.5">
                {items.map((appt) => (
                  <div
                    key={appt.id}
                    style={{ borderLeftColor: appt.assignedMembership.colorHex ?? "#059669" }}
                    className="p-3.5 rounded-xl border border-slate-200 border-l-4 bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeTR(appt.startAt)} - {formatTimeTR(appt.endAt)}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {appt.assignedMembership.user.name}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 mt-2">{appt.title}</p>
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
      )}

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
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold mt-2"
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
