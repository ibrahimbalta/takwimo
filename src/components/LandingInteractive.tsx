"use client";

import React, { useState } from "react";
import {
  CheckCheck,
  Calendar,
  Clock,
  Check,
  ChevronDown,
  UserCheck,
  BellRing,
  Bot,
  Mic,
  Link2,
  Star,
  FileSignature,
  LayoutGrid,
  Users,
  Sparkles,
  ListChecks,
} from "lucide-react";

const DEMO_SLOTS = [
  { time: "10:00", busy: true },
  { time: "10:30", busy: true },
  { time: "11:00", busy: false },
  { time: "11:30", busy: false },
  { time: "14:00", busy: false },
  { time: "14:30", busy: false },
  { time: "15:00", busy: true },
  { time: "16:00", busy: false },
];

/**
 * Real, tactile interactive product workspace right on the homepage.
 * Visitors can click a free time slot and watch the WhatsApp -> Google Calendar -> Auto-Confirmation flow live.
 */
export function InteractiveHeroWorkspace() {
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [confirmedTime, setConfirmedTime] = useState<string | null>("14:00");
  const [assignedTo, setAssignedTo] = useState("Dr. Elif Yılmaz");

  function handleConfirmSlot() {
    setConfirmedTime(selectedTime);
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/[0.06] overflow-hidden">
      {/* Subtle Product Top Chrome */}
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
            T
          </div>
          <span className="text-xs font-semibold text-slate-800">
            Klinik Nova Estetik
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500">Ortak Gelen Kutusu & Takvim</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Canlı Etkileşimli Önizleme — Bir saat seçip deneyin
        </div>
      </div>

      {/* 3-Column Real Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Left: Conversation List */}
        <div className="lg:col-span-3 p-4 bg-slate-50/40 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 pb-1">
            WhatsApp Mesajları (3)
          </p>
          <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Selin Arslan</span>
              <span className="text-[10px] text-emerald-700 font-medium">Şimdi</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Yarın öğleden sonra uygun mu?
            </p>
            <span className="inline-block text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {assignedTo}
            </span>
          </div>

          <div className="p-3 rounded-xl hover:bg-white/70 transition-colors space-y-1 opacity-75">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Burak Yıldız</span>
              <span className="text-[10px] text-slate-400">12 dk</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Randevumu 16:00&apos;ya alabilir miyiz?
            </p>
            <span className="inline-block text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Atanmamış
            </span>
          </div>

          <div className="p-3 rounded-xl hover:bg-white/70 transition-colors space-y-1 opacity-60 hidden sm:block">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Ayşe Korkmaz</span>
              <span className="text-[10px] text-slate-400">Dün</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Teşekkürler, görüşmek üzere.
            </p>
          </div>
        </div>

        {/* Center: Live WhatsApp Thread */}
        <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between bg-white min-h-[300px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-900">Selin Arslan</p>
                <p className="text-[11px] text-slate-500">+90 532 111 22 33</p>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <select
                  aria-label="Uzman Seç"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                >
                  <option>Dr. Elif Yılmaz</option>
                  <option>Mert Kaya</option>
                  <option>Zeynep Demir</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {/* Inbound Customer Message */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 text-slate-800 px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed">
                  Merhaba, yarın öğleden sonra cilt bakımı için uygun saatiniz var mı?
                  <span className="block text-[10px] text-slate-400 mt-1">13:42</span>
                </div>
              </div>

              {/* Automated Confirmation Bubble */}
              {confirmedTime && (
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-emerald-700 text-white px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-200 mb-1">
                      <BellRing className="w-3 h-3" />
                      Otomatik Onay Şablonu
                    </span>
                    <p>
                      Merhaba Selin Hanım, yarın saat <strong>{confirmedTime}</strong> için{" "}
                      <strong>{assignedTo}</strong> ile randevunuz onaylanmıştır.
                    </p>
                    <span className="flex items-center justify-end gap-1 text-[10px] text-emerald-200 mt-1">
                      13:43 <CheckCheck className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              24 saatlik WhatsApp penceresi açık
            </span>
            <span className="text-emerald-700 font-medium">Hatırlatma: 24s önce</span>
          </div>
        </div>

        {/* Right: Live Google Calendar Slot Picker */}
        <div className="lg:col-span-4 p-4 sm:p-5 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-900">Google Calendar Müsaitlik</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              Yarın
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {DEMO_SLOTS.map((slot) => {
              const isSelected = selectedTime === slot.time;
              if (slot.busy) {
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled
                    className="py-2 rounded-lg text-[11px] font-medium bg-rose-50/80 text-rose-400 border border-rose-100 line-through cursor-not-allowed"
                  >
                    {slot.time}
                  </button>
                );
              }
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setSelectedTime(slot.time)}
                  className={`py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                    isSelected
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-800"
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleConfirmSlot}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{selectedTime} Randevusunu Onayla & Takvime İşle</span>
          </button>

          {confirmedTime && (
            <div className="p-3 rounded-xl bg-white border border-emerald-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-slate-800">
                  Google Takvim&apos;e İşlendi ({confirmedTime})
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Senkron
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: "Ekip üyesi ekledikçe ekstra ücret öder miyim?",
    a: "Hayır. TAKWİMO kullanıcı başına ücret almaz. İşletme bazlı tek abonelik ile tüm doktorlarınızı, uzmanlarınızı ve resepsiyon ekibinizi ücretsiz davet edebilirsiniz.",
  },
  {
    q: "Kişisel WhatsApp numaramızla mı yoksa resmî API ile mi çalışır?",
    a: "Resmî Meta WhatsApp Business Cloud API ile çalışır. Numaranız kapanma riski olmadan, 24 saatlik pencere ve onaylı şablon kurallarına tam uyumlu şekilde yönetilir.",
  },
  {
    q: "Her çalışan kendi Google Calendar hesabını bağlayabilir mi?",
    a: "Evet. Her ekip üyesi kendi Google hesabını tek tıkla bağlar; randevu verilirken yalnızca o çalışanın takvimindeki boş saatler yeşil, dolu saatler kırmızı olarak görünür.",
  },
  {
    q: "TAKWİMO karmaşık bir CRM veya muhasebe programı mı?",
    a: "Hayır. Stok, fatura, muhasebe veya gereksiz satış modülleri içermez. Yalnızca WhatsApp iletişimi ve Google Calendar randevu koordinasyonunu kusursuz yapmak için tasarlanmıştır.",
  },
];

export function LandingFaqAccordion() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {FAQS.map((item, idx) => {
        const isOpen = openFaq === idx;
        return (
          <div key={item.q} className="py-5">
            <button
              type="button"
              onClick={() => setOpenFaq(isOpen ? null : idx)}
              className="w-full text-left flex items-center justify-between gap-4 group"
            >
              <span className="font-semibold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                {item.q}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-emerald-700" : ""
                }`}
              />
            </button>
            {isOpen && (
              <p className="mt-3 text-sm text-slate-600 leading-relaxed pr-8">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const ADVANCED_FEATURES = [
  {
    icon: Bot,
    badge: "Yapay Zekâ",
    title: "7/24 AI WhatsApp Resepsiyonisti",
    description:
      "Mesai dışında veya 7/24 aktif yapay zekâ asistanı, müşterilerinize gerçek Google Takvim boş saatlerini sunar ve online randevu linkinizi iletir.",
  },
  {
    icon: Mic,
    badge: "Sesli Mesaj",
    title: "Sesli Mesajları Otomatik Yazıya Çevirme",
    description:
      "Müşterilerinizin WhatsApp'tan gönderdiği sesli notlar yapay zekâ ile saniyeler içinde Türkçe metne çevrilip sohbet ekranında görünür.",
  },
  {
    icon: Link2,
    badge: "Online Randevu",
    title: "İşletmenize Özel 7/24 Randevu Sayfası",
    description:
      "Instagram biyografinize ve Google Haritalar'a ekleyebileceğiniz /r/isletmeniz linkiyle müşteriler hizmet, uzman ve boş saati kendi seçer.",
  },
  {
    icon: LayoutGrid,
    badge: "Takvim",
    title: "Çoklu Uzman Sürükle-Bırak Takvim",
    description:
      "Tüm doktor ve uzmanları yan yana sütunlarda görün; randevuyu fareyle sürükleyip başka saate bıraktığınızda Google Takvim ve WhatsApp otomatik güncellenir.",
  },
  {
    icon: Star,
    badge: "Büyüme",
    title: "Otomatik 5 Yıldız Google Yorum Motoru",
    description:
      "Randevu bittikten 2 saat sonra müşteriye WhatsApp'tan otomatik Google Haritalar yorum linki gider; pasif müşterilere tekrar ziyaret hatırlatması yapılır.",
  },
  {
    icon: FileSignature,
    badge: "KVKK",
    title: "WhatsApp'tan Dijital KVKK Onam İmzalama",
    description:
      "Müşteri kartından tek tıkla gönderilen linkle müşteriniz telefonundan parmağıyla KVKK onam formunu imzalar; belge PDF olarak dosyasına kaydolur.",
  },
  {
    icon: ListChecks,
    badge: "Gelir Koruması",
    title: "Akıllı Bekleme Listesi & İnteraktif Butonlar",
    description:
      "İptal olan randevuda boşalan saat bekleme listesindeki sıradaki müşteriye otomatik WhatsApp'tan teklif edilir; boş koltuk kalmaz.",
  },
  {
    icon: Users,
    badge: "Mini CRM",
    title: "Müşteri Kartları, Excel Aktarım & Mobil PWA",
    description:
      "Uzman notları, VIP etiketleri, Excel/CSV ile toplu müşteri aktarımı, Instagram DM desteği ve telefona kurulabilen PWA mobil deneyim tek yerde.",
  },
];

export function MoreFeaturesShowcase() {
  const [expanded, setExpanded] = useState(false);
  const visibleFeatures = expanded ? ADVANCED_FEATURES : ADVANCED_FEATURES.slice(0, 4);

  return (
    <div className="pt-8 border-t border-slate-200/80 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>03 · Daha Fazlası — Türkiye&apos;de Tek Platform</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Sadece mesajlaşma değil, uçtan uca akıllı randevu büyüme motoru.
          </h3>
          <p className="text-sm text-slate-600">
            7/24 AI resepsiyonistten dijital KVKK imzaya, sürükle-bırak takvimden 5 yıldız Google
            yorum motoruna kadar işletmenizi öne çıkaran tüm araçlar dahildir.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors self-start md:self-auto shrink-0"
        >
          <span>{expanded ? "Daha Az Göster" : "Daha Fazlası (Tüm 8 Özellik)"}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleFeatures.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="rounded-2xl border border-slate-200/90 bg-[#FAFAF9] hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                    {feat.badge}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-950 leading-snug">{feat.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {!expanded && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
          >
            <span>+ 4 Yeni Nesil Özelliği Daha Gör (Google Yorum, KVKK İmza, Bekleme Listesi, CRM)</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
