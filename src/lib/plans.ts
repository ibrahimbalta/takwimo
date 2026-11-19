import { prisma } from "@/lib/prisma";

export type PlanTierId = "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE";

export interface PlanDefinition {
  id: PlanTierId;
  name: string;
  priceTry: number;
  priceLabel: string;
  periodLabel: string;
  badge?: string;
  description: string;
  ctaLabel: string;
  limits: {
    maxContacts: number;
    maxMonthlyAppointments: number;
    maxSeats: number;
    maxMonthlyMessages: number | null; // null = unlimited (billed by Meta)
  };
  features: string[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: "STARTER",
    name: "Başlangıç",
    priceTry: 0,
    priceLabel: "₺0",
    periodLabel: "Sonsuza dek ücretsiz",
    description: "TAKWİMO'yu değerlendirmek ve küçük ölçekte başlamak için.",
    ctaLabel: "Ücretsiz Başla",
    limits: {
      maxContacts: 50,
      maxMonthlyAppointments: 50,
      maxSeats: 2,
      maxMonthlyMessages: 100,
    },
    features: [
      "50 müşteriye kadar",
      "Ayda 50 randevu",
      "2 ekip koltuğu",
      "Paylaşımlı / Demo WhatsApp hattı — ayda 100 mesaj",
      "Google Calendar entegrasyonu",
      "E-posta desteği",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    priceTry: 500,
    priceLabel: "₺500",
    periodLabel: "/ ay",
    badge: "En Popüler",
    description: "Büyüyen klinikler ve aktif randevulu ekipler için.",
    ctaLabel: "Pro'ya Geç",
    limits: {
      maxContacts: 500,
      maxMonthlyAppointments: 1000,
      maxSeats: 5,
      maxMonthlyMessages: null,
    },
    features: [
      "500 müşteriye kadar",
      "Ayda 1.000 randevu",
      "5 ekip koltuğu",
      "Kendi WhatsApp Business numaranız (Embedded Signup)",
      "Kendi mesaj şablonlarınız — işletmenize özel markalı",
      "Sınırsız mesaj (Meta konuşma bazlı)",
      "Randevu otomasyonu (öncesi / sırası / sonrası)",
      "Öncelikli e-posta desteği",
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    priceTry: 1000,
    priceLabel: "₺1.000",
    periodLabel: "/ ay",
    description: "Ölçekli üretim iş yükleri ve çoklu uzman ekipleri için.",
    ctaLabel: "Business'a Geç",
    limits: {
      maxContacts: 5000,
      maxMonthlyAppointments: 10000,
      maxSeats: 20,
      maxMonthlyMessages: null,
    },
    features: [
      "5.000 müşteriye kadar",
      "Ayda 10.000 randevu",
      "20 ekip koltuğu",
      "Kendi WhatsApp Business numaranız & özel şablonlar",
      "Sınırsız mesaj + Çift yönlü Google Calendar sync",
      "Randevu otomasyonu (öncesi / sırası / sonrası)",
      "KVKK denetim günlüğü & veri anonimleştirme",
      "Öncelikli destek",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceTry: 2000,
    priceLabel: "₺2.000",
    periodLabel: "/ ay",
    description: "Üretim ölçeğindeki kurumsal klinikler ve zincir işletmeler için.",
    ctaLabel: "Enterprise'a Geç",
    limits: {
      maxContacts: 50000,
      maxMonthlyAppointments: 100000,
      maxSeats: 50,
      maxMonthlyMessages: null,
    },
    features: [
      "50.000 müşteriye kadar",
      "Ayda 100.000 randevu",
      "50 ekip koltuğu",
      "Tüm Business özellikleri dahil",
      "Özel geliştirmeler & özel entegrasyon desteği",
      "KVKK tam uyumluluk & otomatik veri saklama",
      "Özel kurulum ve doğrudan destek hattı",
    ],
  },
];

export const PLAN_PRICES_TRY: Record<PlanTierId, number> = {
  STARTER: 0,
  PRO: 500,
  BUSINESS: 1000,
  ENTERPRISE: 2000,
};

export function getPlanById(planTier: string | null | undefined): PlanDefinition {
  const normalized = (planTier ?? "STARTER").toUpperCase();
  return PLANS.find((p) => p.id === normalized) ?? PLANS[0];
}

export function isValidPlanTier(tier: string): tier is PlanTierId {
  return tier === "STARTER" || tier === "PRO" || tier === "BUSINESS" || tier === "ENTERPRISE";
}

export async function getTenantUsageAndQuota(tenantId: string, planTier: string) {
  const plan = getPlanById(planTier);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [contactsCount, monthlyAppointmentsCount, seatsCount, monthlyOutboundMessagesCount] =
    await Promise.all([
      prisma.contact.count({ where: { tenantId, anonymizedAt: null } }),
      prisma.appointment.count({
        where: { tenantId, createdAt: { gte: monthStart } },
      }),
      prisma.membership.count({ where: { tenantId, isActive: true } }),
      prisma.message.count({
        where: { tenantId, direction: "OUTBOUND", createdAt: { gte: monthStart } },
      }),
    ]);

  return {
    plan,
    usage: {
      contacts: contactsCount,
      monthlyAppointments: monthlyAppointmentsCount,
      seats: seatsCount,
      monthlyMessages: monthlyOutboundMessagesCount,
    },
    limits: plan.limits,
  };
}
