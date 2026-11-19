"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Briefcase,
  Phone,
  Edit3,
} from "lucide-react";
import { formatDateTR, formatPhoneDisplay, formatTimeTR } from "@/lib/utils";
import { HelpBubble } from "@/components/HelpBubble";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Member {
  id: string;
  colorHex: string;
  user: { name: string };
}

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  priceTry: number;
  colorHex: string;
  isActive: boolean;
}

interface AppointmentItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string | null;
  isDemo: boolean;
  serviceId?: string | null;
  contact: { name: string; phoneE164: string };
  assignedMembership: { id: string; colorHex?: string; user: { name: string } };
  service?: {
    id: string;
    name: string;
    colorHex: string;
    durationMinutes: number;
    priceTry: number;
  } | null;
}

type ViewMode = "day" | "week" | "month";

const STATUS_META: Record<string, { label: string; badge: string; card: string }> = {
  CONFIRMED: {
    label: "Onaylı",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    card: "bg-emerald-50/85 border-emerald-200/90",
  },
  PENDING: {
    label: "Bekleyen",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    card: "bg-amber-50/85 border-amber-200/90",
  },
  RESCHEDULED: {
    label: "Ertelendi",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    card: "bg-sky-50/85 border-sky-200/90",
  },
  COMPLETED: {
    label: "Tamamlandı",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    card: "bg-slate-100/80 border-slate-200",
  },
  CANCELLED: {
    label: "İptal",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    card: "bg-rose-50/60 border-rose-200 opacity-70",
  },
};

const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getTodayIstanbul(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toIstanbulDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIstanbulDateKey(d.toISOString());
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(dateStr, diff);
}

function getMonthGridDays(dateStr: string): Array<{ date: string; inMonth: boolean }> {
  const [y, m] = dateStr.split("-").map(Number);
  const firstOfMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  const gridStart = getMondayOfWeek(firstOfMonth);
  const days: Array<{ date: string; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const cur = addDays(gridStart, i);
    const curMonth = Number(cur.split("-")[1]);
    days.push({ date: cur, inMonth: curMonth === m });
  }
  return days;
}

function buildWorkSlots(startHHMM: string, endHHMM: string): string[] {
  const [sH, sM] = startHHMM.split(":").map(Number);
  const [eH, eM] = endHHMM.split(":").map(Number);
  const startMin = (Number.isFinite(sH) ? sH : 9) * 60 + (Number.isFinite(sM) ? sM : 0);
  const endMin = (Number.isFinite(eH) ? eH : 18) * 60 + (Number.isFinite(eM) ? eM : 0);
  const slots: string[] = [];
  for (let mins = startMin; mins + 30 <= endMin; mins += 30) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
  }
  return slots.length > 0 ? slots : ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
}

function formatMonthTitleTR(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [userRole, setUserRole] = useState<string>("OWNER");
  const [currentMembershipId, setCurrentMembershipId] = useState<string>("");
  const [workHours, setWorkHours] = useState({ start: "09:00", end: "18:00" });

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [anchorDate, setAnchorDate] = useState(() => getTodayIstanbul());
  const [selectedMember, setSelectedMember] = useState("ALL");
  const [selectedService, setSelectedService] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err" | "warn"; text: string } | null>(null);

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("+905");
  const [createServiceId, setCreateServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [date, setDate] = useState(() => getTodayIstanbul());
  const [time, setTime] = useState("10:00");
  const [memberId, setMemberId] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail / Edit / Mobile Touch Reschedule Modal State
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("10:00");
  const [editMemberId, setEditMemberId] = useState("");
  const [editStatus, setEditStatus] = useState("CONFIRMED");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Compute visible Istanbul date range for API query
  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      return {
        from: new Date(`${anchorDate}T00:00:00+03:00`).toISOString(),
        to: new Date(`${anchorDate}T23:59:59+03:00`).toISOString(),
        weekDays: [anchorDate],
      };
    }
    if (viewMode === "week") {
      const monday = getMondayOfWeek(anchorDate);
      const sunday = addDays(monday, 6);
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
      return {
        from: new Date(`${monday}T00:00:00+03:00`).toISOString(),
        to: new Date(`${sunday}T23:59:59+03:00`).toISOString(),
        weekDays,
      };
    }
    const grid = getMonthGridDays(anchorDate);
    return {
      from: new Date(`${grid[0].date}T00:00:00+03:00`).toISOString(),
      to: new Date(`${grid[grid.length - 1].date}T23:59:59+03:00`).toISOString(),
      weekDays: grid.map((g) => g.date),
    };
  }, [viewMode, anchorDate]);

  // Load team & services once on mount
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/team"), fetch("/api/services")])
      .then(async ([teamRes, svcRes]) => {
        if (!active) return;
        if (teamRes.ok) {
          const tData = await teamRes.json();
          const list = (tData.memberships ?? []) as Member[];
          setMembers(list);
          setMemberId((prev) => prev || list[0]?.id || "");
        }
        if (svcRes.ok) {
          const sData = await svcRes.json();
          setServices(((sData.services ?? []) as ServiceOption[]).filter((s) => s.isActive));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadAppointments = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const qs = new URLSearchParams({
          membershipId: selectedMember,
          serviceId: selectedService,
          from: dateRange.from,
          to: dateRange.to,
        });
        if (statusFilter !== "ACTIVE" && statusFilter !== "ALL") {
          qs.set("status", statusFilter);
        }
        const res = await fetch(`/api/appointments?${qs.toString()}`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          setLoadError(errJson?.error ?? "Takvim verileri yüklenemedi.");
          return;
        }
        const aData = await res.json();
        setAppointments(aData.appointments ?? []);
        if (aData.role) setUserRole(aData.role);
        if (aData.currentMembershipId) {
          setCurrentMembershipId(aData.currentMembershipId);
          if (aData.role === "STAFF") {
            setMemberId(aData.currentMembershipId);
          }
        }
        if (aData.workHours) setWorkHours(aData.workHours);
      } catch {
        setLoadError("Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
      } finally {
        setLoading(false);
      }
    },
    [selectedMember, selectedService, statusFilter, dateRange.from, dateRange.to]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAppointments]);

  // Escape key closes modals
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (confirmCancelOpen) return;
      if (createOpen && !saving) setCreateOpen(false);
      if (selectedAppt && !editSaving) setSelectedAppt(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createOpen, saving, selectedAppt, editSaving, confirmCancelOpen]);

  function openCreateModal(prefill?: { date?: string; time?: string; memberId?: string }) {
    setCreateError(null);
    setDate(prefill?.date ?? anchorDate);
    if (prefill?.time) setTime(prefill.time);
    if (userRole === "STAFF" && currentMembershipId) {
      setMemberId(currentMembershipId);
    } else if (prefill?.memberId) {
      setMemberId(prefill.memberId);
    }
    setCreateOpen(true);
  }

  function openDetailModal(appt: AppointmentItem) {
    setEditError(null);
    setSelectedAppt(appt);
    setEditTitle(appt.title);
    setEditDate(toIstanbulDateKey(appt.startAt));
    setEditTime(formatTimeTR(appt.startAt));
    setEditMemberId(appt.assignedMembership.id);
    setEditStatus(appt.status);
    setEditNotes(appt.notes ?? "");
  }

  function shiftDate(direction: -1 | 1) {
    if (viewMode === "day") {
      setAnchorDate((d) => addDays(d, direction));
    } else if (viewMode === "week") {
      setAnchorDate((d) => addDays(d, direction * 7));
    } else {
      const [y, m] = anchorDate.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1 + direction, 1, 12, 0, 0));
      setAnchorDate(toIstanbulDateKey(next.toISOString()));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setSaving(true);
    try {
      const targetMember =
        userRole === "STAFF" && currentMembershipId ? currentMembershipId : memberId;
      const startAt = new Date(`${date}T${time}:00+03:00`);
      const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          contactPhoneE164: contactPhone,
          assignedMembershipId: targetMember,
          serviceId: createServiceId || null,
          title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          notes: createNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error ?? "Randevu oluşturulamadı.");
        return;
      }
      setCreateOpen(false);
      setContactName("");
      setTitle("");
      setCreateServiceId("");
      setCreateNotes("");
      setDurationMin(30);
      const syncWarn =
        data.googleSync && data.googleSync.mode === "LIVE" && !data.googleSync.synced;
      setFeedback({
        type: syncWarn ? "warn" : "ok",
        text: syncWarn
          ? `Randevu kaydedildi ancak Google Takvim senkronizasyonu başarısız oldu (${data.googleSync.reason ?? "bağlantıyı kontrol edin"}).`
          : "Randevu oluşturuldu, Google Takvime işlendi ve müşteriye WhatsApp onayı gönderildi.",
      });
      await loadAppointments({ silent: true });
    } catch {
      setCreateError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAppt) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const durationMs = Math.max(
        15 * 60_000,
        new Date(selectedAppt.endAt).getTime() - new Date(selectedAppt.startAt).getTime()
      );
      const nextStart = new Date(`${editDate}T${editTime}:00+03:00`);
      const nextEnd = new Date(nextStart.getTime() + durationMs);
      const targetMember =
        userRole === "STAFF" && currentMembershipId ? currentMembershipId : editMemberId;

      const res = await fetch(`/api/appointments/${selectedAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          assignedMembershipId: targetMember,
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          status: editStatus,
          notes: editNotes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(json.error ?? "Randevu güncellenemedi.");
        return;
      }
      setSelectedAppt(null);
      const syncWarn =
        json.googleSync && json.googleSync.mode === "LIVE" && !json.googleSync.synced;
      setFeedback({
        type: syncWarn ? "warn" : "ok",
        text: syncWarn
          ? `Randevu güncellendi ancak Google Takvim güncellenemedi (${json.googleSync.reason ?? "hata"}).`
          : `"${editTitle}" güncellendi — Google Takvim ve bildirimler senkronize edildi.`,
      });
      await loadAppointments({ silent: true });
    } catch {
      setEditError("Sunucuya bağlanılamadı.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleConfirmCancel() {
    if (!selectedAppt) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/appointments/${selectedAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(json.error ?? "Randevu iptal edilemedi.");
        return;
      }
      setConfirmCancelOpen(false);
      setSelectedAppt(null);
      setFeedback({
        type: "ok",
        text: "Randevu iptal edildi, Google Takvimden kaldırıldı ve müşteriye bilgi gönderildi.",
      });
      await loadAppointments({ silent: true });
    } catch {
      setEditError("İptal sırasında bağlantı hatası oluştu.");
    } finally {
      setEditSaving(false);
    }
  }

  // Desktop Drag-and-Drop with optimistic UI + automatic rollback on failure
  async function handleDropOnSlot(targetMemberId: string, targetTime: string) {
    if (!draggingId) return;
    const appt = appointments.find((a) => a.id === draggingId);
    setDraggingId(null);
    if (!appt) return;

    const durationMs = Math.max(
      15 * 60_000,
      new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime()
    );
    const nextStart = new Date(`${anchorDate}T${targetTime}:00+03:00`);
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    const targetMemberObj = members.find((m) => m.id === targetMemberId);

    const snapshot = appointments;
    setFeedback(null);
    setAppointments((prev) =>
      prev.map((item) =>
        item.id === appt.id
          ? {
              ...item,
              startAt: nextStart.toISOString(),
              endAt: nextEnd.toISOString(),
              status: "RESCHEDULED",
              assignedMembership: targetMemberObj
                ? { id: targetMemberObj.id, colorHex: targetMemberObj.colorHex, user: targetMemberObj.user }
                : item.assignedMembership,
            }
          : item
      )
    );

    try {
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAppointments(snapshot); // Automatic rollback!
        setFeedback({
          type: "err",
          text: json.error ?? "Randevu taşınamadı (çakışma veya yetki hatası). Eski konumuna alındı.",
        });
        return;
      }
      const syncWarn =
        json.googleSync && json.googleSync.mode === "LIVE" && !json.googleSync.synced;
      setFeedback({
        type: syncWarn ? "warn" : "ok",
        text: syncWarn
          ? `"${appt.title}" ${targetTime} saatine taşındı ancak Google Takvim senkronizasyonu uyarı verdi.`
          : `"${appt.title}" ${targetTime} saatine taşındı — Google Takvim ve WhatsApp güncellendi.`,
      });
      await loadAppointments({ silent: true });
    } catch {
      setAppointments(snapshot);
      setFeedback({ type: "err", text: "Bağlantı hatası: Randevu eski konumuna geri alındı." });
    }
  }

  const visibleAppointments = useMemo(() => {
    if (statusFilter === "ACTIVE") {
      return appointments.filter((a) => a.status !== "CANCELLED");
    }
    return appointments;
  }, [appointments, statusFilter]);

  const visibleMembers = useMemo(() => {
    if (userRole === "STAFF" && currentMembershipId) {
      return members.filter((m) => m.id === currentMembershipId);
    }
    return selectedMember === "ALL" ? members : members.filter((m) => m.id === selectedMember);
  }, [members, selectedMember, userRole, currentMembershipId]);

  const boardSlots = useMemo(
    () => buildWorkSlots(workHours.start, workHours.end),
    [workHours.start, workHours.end]
  );

  const todayKey = getTodayIstanbul();
  const monthGrid = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);

  return (
    <div className="space-y-4 min-w-0">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
              Takvim & Randevu Yönetimi
            </h1>
            <HelpBubble
              title="Çakışma Korumalı Takvim"
              text="Günlük görünümde masaüstünde randevuları sürükleyip bırakabilir, mobilde veya herhangi bir cihazda randevuya tıklayıp saat/personel değiştirebilirsiniz. Tüm işlemler Google Takvim ve WhatsApp ile senkronize çalışır."
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Günlük, haftalık ve aylık planlama · çakışma korumalı · iki yönlü Google Calendar senkronizasyonu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            {(
              [
                { id: "day", label: "Günlük" },
                { id: "week", label: "Haftalık" },
                { id: "month", label: "Aylık" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === v.id
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Randevu</span>
          </button>
        </div>
      </div>

      {/* Filter & Date Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Date Navigation */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAnchorDate(todayKey)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-xs font-semibold text-slate-700 transition-colors"
          >
            Bugün
          </button>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              aria-label="Önceki dönem"
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              aria-label="Tarih seç"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none bg-transparent"
            />
            <button
              type="button"
              aria-label="Sonraki dönem"
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {viewMode === "month" && (
            <span className="text-xs font-bold text-slate-800 capitalize px-1">
              {formatMonthTitleTR(anchorDate)}
            </span>
          )}
        </div>

        {/* Personel, Hizmet, Durum Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {userRole !== "STAFF" && (
            <select
              aria-label="Personel filtresi"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 max-w-[155px]"
            >
              <option value="ALL">Tüm Ekip</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="Hizmet filtresi"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 max-w-[155px]"
          >
            <option value="ALL">Tüm Hizmetler</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Durum filtresi"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="ACTIVE">Aktif Randevular</option>
            <option value="ALL">Tüm Durumlar</option>
            <option value="CONFIRMED">Onaylı</option>
            <option value="PENDING">Bekleyen</option>
            <option value="RESCHEDULED">Ertelenen</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : feedback.type === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] opacity-75 hover:opacity-100 shrink-0"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Main Calendar Surface */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 animate-pulse">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="h-28 bg-slate-100 rounded-xl" />
            <div className="h-28 bg-slate-100 rounded-xl" />
            <div className="h-28 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">{loadError}</p>
          <button
            type="button"
            onClick={() => loadAppointments()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      ) : viewMode === "day" ? (
        <>
          {/* Mobile Touch-Friendly Day Agenda (< md) — Zero horizontal overflow at 360px */}
          <div className="md:hidden bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                {formatDateTR(`${anchorDate}T12:00:00+03:00`)}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {visibleAppointments.length} randevu
              </span>
            </div>
            <div className="p-3 space-y-2.5">
              {visibleAppointments.map((appt) => {
                const st = STATUS_META[appt.status] ?? STATUS_META.CONFIRMED;
                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => openDetailModal(appt)}
                    style={{ borderLeftColor: appt.assignedMembership.colorHex ?? "#059669" }}
                    className={`w-full text-left p-3.5 rounded-xl border border-l-4 transition-all ${st.card}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-emerald-700" />
                        {formatTimeTR(appt.startAt)} - {formatTimeTR(appt.endAt)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.badge}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-slate-900 mt-1.5 truncate">{appt.title}</p>
                    <div className="flex items-center justify-between gap-2 mt-1 text-xs text-slate-600">
                      <span className="truncate">{appt.contact.name}</span>
                      <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                        {appt.assignedMembership.user.name}
                      </span>
                    </div>
                  </button>
                );
              })}
              {visibleAppointments.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Bu gün için randevu yok</p>
                  <button
                    type="button"
                    onClick={() => openCreateModal({ date: anchorDate })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Randevu Ekle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Multi-Specialist Drag-and-Drop Day Board (md+) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {formatDateTR(`${anchorDate}T12:00:00+03:00`)} · Mesai {workHours.start} – {workHours.end}
              </span>
              <span className="text-[11px] text-slate-500">
                Kartı sürükleyip bırakarak taşıyın, boş saate tıklayıp yeni randevu ekleyin veya karta tıklayıp düzenleyin.
              </span>
            </div>
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[640px]"
                style={{
                  gridTemplateColumns: `76px repeat(${Math.max(1, visibleMembers.length)}, minmax(185px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-10 p-3 border-b border-r border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 text-center">
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

                {boardSlots.map((slotTime) => (
                  <React.Fragment key={slotTime}>
                    <div className="sticky left-0 z-10 px-2 py-3 border-b border-r border-slate-100 text-[11px] font-semibold text-slate-500 text-center bg-slate-50/95">
                      {slotTime}
                    </div>
                    {visibleMembers.map((m) => {
                      const slotAppts = visibleAppointments.filter(
                        (a) =>
                          a.assignedMembership.id === m.id &&
                          toIstanbulDateKey(a.startAt) === anchorDate &&
                          formatTimeTR(a.startAt) === slotTime
                      );

                      return (
                        <div
                          key={`${m.id}-${slotTime}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropOnSlot(m.id, slotTime)}
                          onClick={() => {
                            if (slotAppts.length === 0) {
                              openCreateModal({ date: anchorDate, time: slotTime, memberId: m.id });
                            }
                          }}
                          className={`p-1.5 border-b border-r border-slate-100 min-h-[56px] transition-colors ${
                            slotAppts.length === 0 ? "cursor-pointer hover:bg-emerald-50/40" : ""
                          } ${draggingId ? "hover:bg-emerald-100/60" : ""}`}
                        >
                          {slotAppts.map((appt) => {
                            const st = STATUS_META[appt.status] ?? STATUS_META.CONFIRMED;
                            return (
                              <div
                                key={appt.id}
                                draggable={appt.status !== "CANCELLED"}
                                onDragStart={() => setDraggingId(appt.id)}
                                onDragEnd={() => setDraggingId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal(appt);
                                }}
                                style={{ borderLeftColor: m.colorHex ?? "#059669" }}
                                className={`p-2 rounded-xl border border-l-4 cursor-pointer shadow-2xs space-y-0.5 hover:shadow-xs transition-all ${st.card}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold text-slate-900 truncate">
                                    {appt.title}
                                  </span>
                                  <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                                </div>
                                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600">
                                  <span className="truncate">{appt.contact.name}</span>
                                  <span className="font-semibold shrink-0">{st.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : viewMode === "week" ? (
        /* Weekly 7-Day View (Responsive: stacked on mobile, 7 columns on lg+) */
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2.5">
          {dateRange.weekDays.map((dayStr, idx) => {
            const dayAppts = visibleAppointments.filter(
              (a) => toIstanbulDateKey(a.startAt) === dayStr
            );
            const isToday = dayStr === todayKey;
            return (
              <div
                key={dayStr}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col min-h-[120px] lg:min-h-[360px] ${
                  isToday ? "border-emerald-400 ring-1 ring-emerald-500/20" : "border-slate-200"
                }`}
              >
                <div
                  className={`px-3 py-2 border-b flex items-center justify-between ${
                    isToday ? "bg-emerald-50/80 border-emerald-200" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAnchorDate(dayStr);
                      setViewMode("day");
                    }}
                    className="text-left"
                  >
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      {WEEKDAY_SHORT[idx]}
                    </p>
                    <p
                      className={`text-xs font-extrabold ${
                        isToday ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {dayStr.slice(8, 10)}.{dayStr.slice(5, 7)}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`${dayStr} için randevu ekle`}
                    onClick={() => openCreateModal({ date: dayStr })}
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2 space-y-1.5 flex-1">
                  {dayAppts.map((appt) => {
                    const st = STATUS_META[appt.status] ?? STATUS_META.CONFIRMED;
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => openDetailModal(appt)}
                        style={{ borderLeftColor: appt.assignedMembership.colorHex ?? "#059669" }}
                        className={`w-full text-left p-2 rounded-xl border border-l-4 text-[11px] space-y-0.5 hover:shadow-xs transition-all ${st.card}`}
                      >
                        <div className="flex items-center justify-between gap-1 font-bold text-slate-900">
                          <span>{formatTimeTR(appt.startAt)}</span>
                          <span className="text-[9px] font-bold opacity-80">{st.label}</span>
                        </div>
                        <p className="font-semibold text-slate-800 truncate">{appt.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {appt.contact.name} · {appt.assignedMembership.user.name}
                        </p>
                      </button>
                    );
                  })}
                  {dayAppts.length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-4">Boş</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Monthly Grid View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAY_SHORT.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[11px] font-bold text-slate-500 uppercase"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthGrid.map(({ date: cellDate, inMonth }) => {
              const dayAppts = visibleAppointments.filter(
                (a) => toIstanbulDateKey(a.startAt) === cellDate
              );
              const isToday = cellDate === todayKey;
              return (
                <button
                  key={cellDate}
                  type="button"
                  onClick={() => {
                    setAnchorDate(cellDate);
                    setViewMode("day");
                  }}
                  className={`min-h-[68px] sm:min-h-[96px] p-1.5 sm:p-2 text-left flex flex-col justify-between hover:bg-emerald-50/40 transition-colors ${
                    inMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        isToday
                          ? "bg-emerald-700 text-white"
                          : inMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {Number(cellDate.slice(8, 10))}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block space-y-1 mt-1 w-full">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold truncate"
                      >
                        {formatTimeTR(a.startAt)} {a.title}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <p className="text-[9px] font-bold text-slate-400 px-1">
                        +{dayAppts.length - 2} daha
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-appt-title"
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!saving) setCreateOpen(false);
          }}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="create-appt-title" className="font-bold text-lg text-slate-900">
                Yeni Randevu Oluştur
              </h2>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              {services.length > 0 && (
                <div>
                  <label
                    htmlFor="cal-create-service"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Hizmet (Opsiyonel)
                  </label>
                  <select
                    id="cal-create-service"
                    value={createServiceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCreateServiceId(id);
                      const svc = services.find((s) => s.id === id);
                      if (svc) {
                        setTitle(svc.name);
                        setDurationMin(svc.durationMinutes);
                      } else {
                        setDurationMin(30);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="">Hizmet seçin veya özel başlık yazın</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} dk · ₺{s.priceTry})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="cal-create-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Randevu Başlığı
                </label>
                <input
                  id="cal-create-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Ön Görüşme"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cal-create-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Müşteri Adı
                  </label>
                  <input
                    id="cal-create-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cal-create-phone"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    WhatsApp Telefon
                  </label>
                  <input
                    id="cal-create-phone"
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cal-create-member"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Ekip Üyesi
                  </label>
                  <select
                    id="cal-create-member"
                    value={
                      userRole === "STAFF" && currentMembershipId ? currentMembershipId : memberId
                    }
                    disabled={userRole === "STAFF"}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-100"
                  >
                    {visibleMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="cal-create-date"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tarih
                  </label>
                  <input
                    id="cal-create-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <TimeSlotPicker
                membershipId={
                  userRole === "STAFF" && currentMembershipId ? currentMembershipId : memberId
                }
                date={date}
                selectedTime={time}
                onSelectTime={setTime}
              />

              <div>
                <label
                  htmlFor="cal-create-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Not (Opsiyonel)
                </label>
                <input
                  id="cal-create-notes"
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold disabled:opacity-60"
              >
                {saving ? "Kontrol Ediliyor..." : "Çakışma Kontrolü Yap & Kaydet"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Mobile Touch Reschedule Modal */}
      {selectedAppt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-appt-title"
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!editSaving && !confirmCancelOpen) setSelectedAppt(null);
          }}
        >
          <div
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="edit-appt-title" className="font-bold text-lg text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-700" />
                  Randevu Detayı & Taşıma
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" /> {selectedAppt.contact.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {formatPhoneDisplay(selectedAppt.contact.phoneE164)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setSelectedAppt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedAppt.service && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <Briefcase className="w-3.5 h-3.5" />
                <span>
                  {selectedAppt.service.name} · {selectedAppt.service.durationMinutes} dk · ₺
                  {selectedAppt.service.priceTry}
                </span>
              </div>
            )}

            {editError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label
                  htmlFor="cal-edit-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Başlık
                </label>
                <input
                  id="cal-edit-title"
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cal-edit-member"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Ekip Üyesi
                  </label>
                  <select
                    id="cal-edit-member"
                    value={editMemberId}
                    disabled={userRole === "STAFF"}
                    onChange={(e) => setEditMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-100"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cal-edit-status"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Durum
                  </label>
                  <select
                    id="cal-edit-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="CONFIRMED">Onaylı</option>
                    <option value="PENDING">Bekleyen</option>
                    <option value="RESCHEDULED">Ertelendi</option>
                    <option value="COMPLETED">Tamamlandı</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="cal-edit-date"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Tarih
                </label>
                <input
                  id="cal-edit-date"
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <TimeSlotPicker
                membershipId={editMemberId}
                date={editDate}
                selectedTime={editTime}
                onSelectTime={setEditTime}
              />

              <div>
                <label
                  htmlFor="cal-edit-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Not
                </label>
                <input
                  id="cal-edit-notes"
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
                </button>
                {selectedAppt.status !== "CANCELLED" && (
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => setConfirmCancelOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold inline-flex items-center gap-1 disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>İptal</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Randevuyu İptal Et"
        description={`${selectedAppt?.contact.name ?? "Müşteri"} için "${selectedAppt?.title ?? ""}" randevusu iptal edilecek, Google Takvimden kaldırılacak ve müşteriye WhatsApp iptal bildirimi gönderilecektir.`}
        confirmLabel="Evet, İptal Et"
        variant="danger"
        loading={editSaving}
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
