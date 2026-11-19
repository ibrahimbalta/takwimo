"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Save,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Star,
  Sparkles,
} from "lucide-react";
import type { CmsContent, CmsReferenceItem, CmsFeatureItem } from "@/lib/cms";

export function AdminCmsEditor() {
  const [content, setContent] = useState<CmsContent | null>(null);
  const [brandsText, setBrandsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/super-admin/cms")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { content?: CmsContent } | null) => {
        if (!active || !json?.content) return;
        setContent(json.content);
        setBrandsText(json.content.referenceBrands.join(", "));
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload: CmsContent = {
        ...content,
        referenceBrands: brandsText
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/super-admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: payload }),
      });
      const json = await res.json();
      setFeedback({
        type: res.ok ? "ok" : "err",
        text: json.message ?? json.error ?? "Kaydedildi.",
      });
    } finally {
      setSaving(false);
    }
  }

  function updateRef(idx: number, patch: Partial<CmsReferenceItem>) {
    if (!content) return;
    const next = [...content.references];
    next[idx] = { ...next[idx], ...patch };
    setContent({ ...content, references: next });
  }

  function addRef() {
    if (!content) return;
    setContent({
      ...content,
      references: [
        ...content.references,
        {
          id: `ref-${Date.now()}`,
          business: "Yeni İşletme",
          sector: "Sektör · Şehir",
          person: "Ad Soyad",
          role: "İşletme Sahibi",
          metric: "%50 Zaman Tasarrufu",
          quote: "Müşteri yorumunu buraya yazın...",
        },
      ],
    });
  }

  function removeRef(idx: number) {
    if (!content) return;
    setContent({
      ...content,
      references: content.references.filter((_, i) => i !== idx),
    });
  }

  function updateFeature(idx: number, patch: Partial<CmsFeatureItem>) {
    if (!content) return;
    const next = [...content.advancedFeatures];
    next[idx] = { ...next[idx], ...patch };
    setContent({ ...content, advancedFeatures: next });
  }

  if (!content) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Site içerikleri yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Site İçerik Yönetimi (CMS)</p>
          <p className="text-xs text-slate-300 mt-0.5">
            <code>/referanslar</code> ve <code>/nasil-calisir</code> sayfalarındaki tüm metin,
            referans ve özellikleri buradan anında güncelleyebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/referanslar"
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            /referanslar <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/nasil-calisir"
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            /nasil-calisir <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor..." : "Tüm İçerikleri Yayınla"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. References CMS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Referanslar Sayfası (/referanslar)
            </h2>
          </div>
          <button
            type="button"
            onClick={addRef}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Referans Ekle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Sayfa Ana Başlığı
            </label>
            <input
              type="text"
              value={content.referencesTitle}
              onChange={(e) => setContent({ ...content, referencesTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Referans Marka İsimleri (Virgülle ayırın)
            </label>
            <input
              type="text"
              value={brandsText}
              onChange={(e) => setBrandsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {content.references.map((ref, idx) => (
            <div
              key={ref.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Referans #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRef(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={ref.business}
                  onChange={(e) => updateRef(idx, { business: e.target.value })}
                  placeholder="İşletme Adı"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
                <input
                  type="text"
                  value={ref.metric}
                  onChange={(e) => updateRef(idx, { metric: e.target.value })}
                  placeholder="Etki Rozeti (örn: %68 Daha Az Gelmeme)"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
                <input
                  type="text"
                  value={ref.person}
                  onChange={(e) => updateRef(idx, { person: e.target.value })}
                  placeholder="Kişi Adı"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
                <input
                  type="text"
                  value={ref.role}
                  onChange={(e) => updateRef(idx, { role: e.target.value })}
                  placeholder="Unvan"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                />
              </div>
              <input
                type="text"
                value={ref.sector}
                onChange={(e) => updateRef(idx, { sector: e.target.value })}
                placeholder="Sektör · Şehir"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
              <textarea
                rows={3}
                value={ref.quote}
                onChange={(e) => updateRef(idx, { quote: e.target.value })}
                placeholder="Müşteri yorumu..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. How It Works & Features CMS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Nasıl Çalışır? & Özellikler (/nasil-calisir)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Üst Başlık
            </label>
            <input
              type="text"
              value={content.howItWorksTitle}
              onChange={(e) => setContent({ ...content, howItWorksTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Alt Açıklama
            </label>
            <input
              type="text"
              value={content.howItWorksSubtitle}
              onChange={(e) => setContent({ ...content, howItWorksSubtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {content.advancedFeatures.map((feat, idx) => (
            <div key={feat.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={feat.badge}
                  onChange={(e) => updateFeature(idx, { badge: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                />
                <input
                  type="text"
                  value={feat.title}
                  onChange={(e) => updateFeature(idx, { title: e.target.value })}
                  className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                />
              </div>
              <textarea
                rows={2}
                value={feat.description}
                onChange={(e) => updateFeature(idx, { description: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
