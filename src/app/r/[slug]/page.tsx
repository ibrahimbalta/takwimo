"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  User,
  Phone,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceTry: number;
  depositTry: number;
  colorHex: string;
}

interface PublicMember {
  id: string;
  name: string;
  colorHex: string;
}

interface BookingPageData {
  business: {
    name: string;
    slug: string;
    workStartHour: string;
    workEndHour: string;
  };
  services: PublicService[];
  members: PublicMember[];
}

export default function PublicOnlineBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [data, setData] = useState<BookingPageData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    title: string;
    startAt: string;
    specialistName: string;
    priceTry: number;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetch(`/api/public/booking/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          if (active) setNotFound(true);
          return;
        }
        const json = (await res.json()) as BookingPageData;
        if (!active) return;
        setData(json);
        if (json.services[0]) setSelectedService(json.services[0]);
        if (json.members[0]) setSelectedMemberId(json.members[0].id);
      })
      .catch(() => {
        if (active) setNotFound(true);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || !selectedMemberId || !selectedDate) return;
    let active = true;
    const duration = selectedService?.durationMinutes ?? 30;
    const timer = setTimeout(() => {
      setLoadingSlots(true);
      setSelectedTime("");
      fetch(
        `/api/public/booking/${slug}?date=${selectedDate}&memberId=${selectedMemberId}&duration=${duration}`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!active) return;
          setSlots(json?.slots ?? []);
          setLoadingSlots(false);
        })
        .catch(() => {
          if (active) setLoadingSlots(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slug, selectedMemberId, selectedDate, selectedService?.durationMinutes]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTime || !selectedMemberId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/booking/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService?.id,
          customTitle: selectedService?.name ?? "Online Randevu",
          membershipId: selectedMemberId,
          date: selectedDate,
          time: selectedTime,
          contactName,
          contactPhone,
          notes,
          kvkkAccepted,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Randevu oluşturulamadı.");
        return;
      }
      setConfirmed(json.appointment);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Randevu Sayfası Bulunamadı</h1>
          <p className="text-sm text-slate-500">
            Bu işletmenin online randevu sayfası aktif değil veya bağlantı hatalı.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center text-sm text-slate-500">
        Online randevu takvimi yükleniyor...
      </div>
    );
  }

  if (confirmed) {
    const startDate = new Date(confirmed.startAt);
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 to-[#FAFAF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-lg p-8 max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-950">Randevunuz Onaylandı!</h1>
            <p className="text-sm text-slate-500">
              WhatsApp numaranıza onay mesajınız gönderildi.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-sm space-y-2">
            <p>
              <span className="text-slate-500">İşletme:</span>{" "}
              <strong className="text-slate-900">{data.business.name}</strong>
            </p>
            <p>
              <span className="text-slate-500">İşlem:</span>{" "}
              <strong className="text-slate-900">{confirmed.title}</strong>
            </p>
            <p>
              <span className="text-slate-500">Uzman:</span>{" "}
              <strong className="text-slate-900">{confirmed.specialistName}</strong>
            </p>
            <p>
              <span className="text-slate-500">Tarih & Saat:</span>{" "}
              <strong className="text-emerald-700">
                {startDate.toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · {startDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmed(null);
              setSelectedTime("");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Yeni Randevu Oluştur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              <Sparkles className="w-3 h-3" />
              7/24 Online Randevu · Anında WhatsApp Onayı
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {data.business.name}
            </h1>
            <p className="text-xs text-slate-300">
              Çalışma Saatleri: {data.business.workStartHour} – {data.business.workEndHour}
            </p>
          </div>
          <TakvimoLogo variant="dark" size="sm" />
        </div>

        <form onSubmit={handleBook} className="space-y-5">
          {/* 1. Service Selection */}
          {data.services.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">1. Hizmet Seçin</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.services.map((svc) => {
                  const active = selectedService?.id === svc.id;
                  return (
                    <button
                      type="button"
                      key={svc.id}
                      onClick={() => setSelectedService(svc)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        active
                          ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/15"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900">{svc.name}</span>
                        {svc.priceTry > 0 && (
                          <span className="text-xs font-extrabold text-emerald-700">
                            ₺{svc.priceTry.toLocaleString("tr-TR")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {svc.durationMinutes} dakika
                        {svc.depositTry > 0 ? ` · ₺${svc.depositTry} kapora` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Specialist + Date + Live Slots */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">2. Uzman, Tarih & Saat Seçin</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Uzman</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {data.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tarih</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Canlı Müsaitlik (Yeşil: Boş · Gri: Dolu)
              </p>
              {loadingSlots ? (
                <p className="text-xs text-slate-400">Google Takvim müsaitliği kontrol ediliyor...</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map((s) => {
                    const active = selectedTime === s.time;
                    return (
                      <button
                        type="button"
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => setSelectedTime(s.time)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          !s.available
                            ? "bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed"
                            : active
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                            : "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. Contact Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">3. İletişim Bilgileriniz</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ad Soyad</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Örn: Ayşe Yılmaz"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  WhatsApp Telefon Numaranız
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Notunuz (Opsiyonel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eklemek istediğiniz bir detay varsa yazabilirsiniz..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <label
              htmlFor="public-booking-kvkk"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 cursor-pointer text-xs text-slate-600"
            >
              <input
                id="public-booking-kvkk"
                type="checkbox"
                required
                checked={kvkkAccepted}
                onChange={(e) => setKvkkAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
              />
              <span>
                Randevu ve WhatsApp bilgilendirme mesajları kapsamında kişisel verilerimin işlenmesine ilişkin{" "}
                <a
                  href="/kvkk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-700 underline"
                >
                  KVKK Aydınlatma Metni
                </a>
                &apos;ni okudum ve onaylıyorum.
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedTime || !kvkkAccepted}
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>
                {submitting
                  ? "Randevunuz Oluşturuluyor..."
                  : selectedTime
                  ? `${selectedTime} İçin Randevuyu Onayla`
                  : "Önce Yukarıdan Boş Saat Seçin"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
