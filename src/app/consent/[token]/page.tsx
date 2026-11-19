"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, Eraser, Printer } from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";

interface ConsentData {
  id: string;
  title: string;
  bodyText: string;
  businessName: string;
  contactName: string;
  signedAt: string | null;
  signerName: string | null;
  signatureDataUrl: string | null;
}

export default function DigitalConsentSignPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [form, setForm] = useState<ConsentData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/consent/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return;
        }
        const d = (await r.json()) as ConsentData;
        setForm(d);
        setSignerName(d.signerName ?? d.contactName);
      })
      .catch(() => setNotFound(true));
  }, [token]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function endDraw() {
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!hasDrawn || !canvasRef.current) {
      setError("Lütfen imza kutusuna parmağınızla veya farenizle imzanızı çizin.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const signatureDataUrl = canvasRef.current.toDataURL("image/png");
      const res = await fetch(`/api/consent/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signatureDataUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "İmza kaydedilemedi.");
        return;
      }
      setForm((prev) =>
        prev
          ? { ...prev, signedAt: json.signedAt, signerName, signatureDataUrl }
          : prev
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4 text-sm text-slate-600">
        Onam formu bağlantısı geçersiz veya süresi dolmuş.
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4 text-sm text-slate-500">
        KVKK Onam Formu yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {form.businessName}
            </p>
            <h1 className="text-xl font-extrabold text-slate-950 mt-0.5">{form.title}</h1>
          </div>
          <TakvimoLogo variant="light" size="sm" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed">
          {form.bodyText}
        </div>

        {form.signedAt ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Dijital İmza Onaylandı</p>
                <p className="text-xs text-emerald-700">
                  İmzalayan: {form.signerName} ·{" "}
                  {new Date(form.signedAt).toLocaleString("tr-TR")}
                </p>
              </div>
            </div>
            {form.signatureDataUrl && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-white text-center">
                <img
                  src={form.signatureDataUrl}
                  alt="Müşteri İmzası"
                  className="max-h-28 mx-auto"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 print:hidden"
            >
              <Printer className="w-4 h-4" />
              PDF Olarak Kaydet / Yazdır
            </button>
          </div>
        ) : (
          <form onSubmit={handleSign} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adınız Soyadınız
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  İmzanızı Çizin (Parmağınızla veya Fare ile)
                </label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Temizle
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={520}
                height={180}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 touch-none cursor-crosshair"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? "Kaydediliyor..." : "Okudum, Dijital Olarak Onaylıyorum"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
