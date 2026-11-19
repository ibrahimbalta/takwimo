import { describe, it, expect } from "vitest";
import { getStatusMeta } from "@/lib/status";

describe("FAZ 2 / Modül E — Ortak Tasarım Sistemi & Merkezi Durum Birliği", () => {
  it("provides centralized Turkish status labels and color tokens across all domains", () => {
    expect(getStatusMeta("CONFIRMED", "appointment").label).toBe("Onaylandı");
    expect(getStatusMeta("PENDING", "appointment").label).toBe("Bekliyor");
    expect(getStatusMeta("RESCHEDULED", "appointment").label).toBe("Ertelendi");
    expect(getStatusMeta("COMPLETED", "appointment").label).toBe("Tamamlandı");
    expect(getStatusMeta("CANCELLED", "appointment").label).toBe("İptal Edildi");

    expect(getStatusMeta("OPEN", "conversation").label).toBe("Açık");
    expect(getStatusMeta("RESOLVED", "conversation").label).toBe("Çözüldü");

    expect(getStatusMeta("QUEUED", "job").label).toBe("Sırada");
    expect(getStatusMeta("SENT", "job").label).toBe("Gönderildi");
    expect(getStatusMeta("FAILED", "job").label).toBe("Başarısız");

    expect(getStatusMeta("WAITING", "waitlist").label).toBe("Bekliyor");
    expect(getStatusMeta("NOTIFIED", "waitlist").label).toBe("Bildirildi");

    // Unknown status gracefully falls back without throwing
    expect(getStatusMeta("CUSTOM_STATE", "appointment").label).toBe("CUSTOM_STATE");
  });
});
