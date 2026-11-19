import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TAKWİMO — WhatsApp Business & Google Calendar Randevu Platformu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #020617 0%, #064e3b 65%, #047857 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Brand Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #10B981 0%, #059669 55%, #0F766E 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 900,
              color: "#ffffff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            ✓
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: "42px", fontWeight: 900, letterSpacing: "-0.02em" }}>
              <span>TAKW</span>
              <span style={{ color: "#34d399" }}>İ</span>
              <span>MO</span>
            </div>
            <div style={{ fontSize: "18px", color: "#a7f3d0", fontWeight: 600 }}>
              Tek Gelen Kutusu · Tek Takvim · Tek Ekip
            </div>
          </div>
        </div>

        {/* Center Value Proposition */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "960px" }}>
          <div style={{ fontSize: "54px", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.025em" }}>
            WhatsApp&apos;tan gelen her mesajı çakışmasız randevuya dönüştürün.
          </div>
          <div style={{ fontSize: "24px", color: "#cbd5e1", lineHeight: 1.45 }}>
            Resmî Meta WhatsApp Cloud API + İki Yönlü Google Calendar senkronizasyonu ve otomatik
            randevu hatırlatmaları — ₺0 ücretsiz başlangıç paketiyle.
          </div>
        </div>

        {/* Bottom Feature Pills */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {["Ortak WhatsApp Kutusu", "Google Calendar Sync", "Otomatik Hatırlatma", "KVKK Uyumlu"].map(
            (badge) => (
              <div
                key={badge}
                style={{
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(167,243,208,0.35)",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#ecfdf5",
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
