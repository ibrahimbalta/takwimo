import { prisma } from "@/lib/prisma";

export interface CmsReferenceItem {
  id: string;
  business: string;
  sector: string;
  person: string;
  role: string;
  metric: string;
  quote: string;
}

export interface CmsFeatureItem {
  id: string;
  badge: string;
  title: string;
  description: string;
}

export interface CmsHowItWorksStep {
  id: string;
  stepNumber: string;
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  imageUrl: string;
}

export interface CmsContent {
  referencesTitle: string;
  referencesSubtitle: string;
  referenceBrands: string[];
  references: CmsReferenceItem[];
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  howItWorksSteps: CmsHowItWorksStep[];
  advancedFeatures: CmsFeatureItem[];
}

export const DEFAULT_CMS_CONTENT: CmsContent = {
  referencesTitle: "Randevu trafiğini TAKWİMO ile düzene sokan işletmeler",
  referencesSubtitle:
    "Kliniklerden güzellik merkezlerine, danışmanlık ofislerinden kurumsal ekiplere kadar her gün yüzlerce randevu TAKWİMO ile çakışmasız yönetiliyor.",
  referenceBrands: [
    "Klinik Nova Estetik",
    "Aura Diş Polikliniği",
    "Go2Tek",
    "Denge Fizyoterapi",
    "PatiVet Veteriner",
    "Lumina Güzellik",
  ],
  references: [
    {
      id: "ref-1",
      business: "Klinik Nova Estetik",
      sector: "Estetik & Dermatoloji · İstanbul",
      person: "Dr. Elif Yılmaz",
      role: "Kurucu Hekim",
      metric: "%68 Daha Az Gelmeme",
      quote:
        "Resepsiyonumuz artık uzmanları arayıp 'saat 3 boş mu?' diye sormuyor. WhatsApp'tan gelen mesajı 3 saniyede Google Takvime işliyoruz, 24 saat önce giden otomatik hatırlatma sayesinde boş kalan koltuğumuz neredeyse sıfırlandı.",
    },
    {
      id: "ref-2",
      business: "Aura Diş Polikliniği",
      sector: "Ağız ve Diş Sağlığı · Ankara",
      person: "Dt. Ahmet Şahin",
      role: "Klinik Yöneticisi",
      metric: "4.9★ Google Puanı",
      quote:
        "5 hekimimizin Google Takvimini tek ekranda yan yana yönetiyoruz. Randevudan 2 saat sonra otomatik giden Google Yorum mesajı ile 2 ayda 90'dan fazla yeni 5 yıldızlı yorum aldık.",
    },
    {
      id: "ref-3",
      business: "Go2Tek Danışmanlık & Teknoloji",
      sector: "Kurumsal Randevu & Hizmet · İzmir",
      person: "İbrahim Balta",
      role: "İşletme Sahibi",
      metric: "Günde 2 Saat Tasarruf",
      quote:
        "Her ekip üyesi sadece kendisine atanan müşterileri görüyor, kişisel telefonlarda dağınık sohbet kalmadı. Online randevu linkimizi Instagram biyografimize koyduğumuzdan beri gece bile onaylı randevu düşüyor.",
    },
  ],
  howItWorksTitle: "WhatsApp'tan gelen mesaj, 3 saniyede Google Takvim randevusuna dönüşür.",
  howItWorksSubtitle:
    "Karmaşık CRM menüleri olmadan; ekibinizin zaten kullandığı WhatsApp Business ve Google Calendar'ı tek kusursuz akışta birleştiriyoruz.",
  howItWorksSteps: [
    {
      id: "step-1",
      stepNumber: "01",
      badge: "Tek Numara, Tek Ekip",
      title: "Resepsiyon ve uzmanlarınız birbirine sormadan senkron çalışır.",
      description:
        "Müşterileriniz işletmenizin tek WhatsApp numarasına yazar. Yönetici konuşmayı ilgili ekip üyesine atar; Google Takvimdeki yeşil boş saatleri görerek tek tıkla randevuyu oluşturur.",
      bullets: [
        "Telefon elden ele dolaşmaz; tüm ekip kendi bilgisayarından görür.",
        "Uzmanın Google Takvimi doluysa o saat kırmızı görünür, çakışma olmaz.",
        "Ekip üyeleri yalnızca kendilerine atanan müşteri sohbetlerini görür.",
      ],
      imageUrl: "/images/clinic-reception.jpg",
    },
    {
      id: "step-2",
      stepNumber: "02",
      badge: "Otomatik Onay & Mobil Deneyim",
      title: "Müşteriniz onayını anında alır, siz telefonunuzdan yönetirsiniz.",
      description:
        "Randevu oluşturduğunuz anda müşterinizin WhatsApp'ına şık bir onay mesajı gider. Randevudan 24 saat ve 2 saat önce otomatik hatırlatma gönderilir; gelmeme ve son dakika unutmaları ortadan kalkar.",
      bullets: [
        "Onay, 24s / 2s hatırlatma, erteleme ve iptal mesajları tam otomatik.",
        "Sürükle-bırak saat değişikliği Google Calendar'a anında işlenir.",
        "Resmî Meta API, 256-bit şifreleme ve dijital KVKK onam formu dahil.",
      ],
      imageUrl: "/images/mobile-whatsapp.jpg",
    },
  ],
  advancedFeatures: [
    {
      id: "feat-1",
      badge: "Yapay Zekâ",
      title: "7/24 AI WhatsApp Resepsiyonisti",
      description:
        "Mesai dışında veya 7/24 aktif yapay zekâ asistanı, müşterilerinize gerçek Google Takvim boş saatlerini sunar ve online randevu linkinizi iletir.",
    },
    {
      id: "feat-2",
      badge: "Sesli Mesaj",
      title: "Sesli Mesajları Otomatik Yazıya Çevirme",
      description:
        "Müşterilerinizin WhatsApp'tan gönderdiği sesli notlar yapay zekâ ile saniyeler içinde Türkçe metne çevrilip sohbet ekranında görünür.",
    },
    {
      id: "feat-3",
      badge: "Online Randevu",
      title: "İşletmenize Özel 7/24 Randevu Sayfası",
      description:
        "Instagram biyografinize ve Google Haritalar'a ekleyebileceğiniz /r/isletmeniz linkiyle müşteriler hizmet, uzman ve boş saati kendi seçer.",
    },
    {
      id: "feat-4",
      badge: "Takvim",
      title: "Çoklu Uzman Sürükle-Bırak Takvim",
      description:
        "Tüm uzmanları yan yana sütunlarda görün; randevuyu fareyle sürükleyip başka saate bıraktığınızda Google Takvim ve WhatsApp otomatik güncellenir.",
    },
    {
      id: "feat-5",
      badge: "Büyüme",
      title: "Otomatik 5 Yıldız Google Yorum Motoru",
      description:
        "Randevu bittikten 2 saat sonra müşteriye WhatsApp'tan otomatik Google Haritalar yorum linki gider; pasif müşterilere tekrar ziyaret hatırlatması yapılır.",
    },
    {
      id: "feat-6",
      badge: "KVKK",
      title: "WhatsApp'tan Dijital KVKK Onam İmzalama",
      description:
        "Müşteri kartından tek tıkla gönderilen linkle müşteriniz telefonundan parmağıyla KVKK onam formunu imzalar; belge PDF olarak dosyasına kaydolur.",
    },
    {
      id: "feat-7",
      badge: "Gelir Koruması",
      title: "Akıllı Bekleme Listesi & İnteraktif Butonlar",
      description:
        "İptal olan randevuda boşalan saat bekleme listesindeki sıradaki müşteriye otomatik WhatsApp'tan teklif edilir; boş koltuk kalmaz.",
    },
    {
      id: "feat-8",
      badge: "Mini CRM",
      title: "Müşteri Kartları, Excel Aktarım & Mobil PWA",
      description:
        "Uzman notları, VIP etiketleri, Excel/CSV ile toplu müşteri aktarımı, Instagram DM desteği ve telefona kurulabilen PWA mobil deneyim tek yerde.",
    },
  ],
};

const CMS_SETTING_KEY = "CMS_PUBLIC_CONTENT_V1";

export async function getCmsContent(): Promise<CmsContent> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: CMS_SETTING_KEY },
    });
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<CmsContent>;
      return {
        ...DEFAULT_CMS_CONTENT,
        ...parsed,
        references: parsed.references ?? DEFAULT_CMS_CONTENT.references,
        referenceBrands: parsed.referenceBrands ?? DEFAULT_CMS_CONTENT.referenceBrands,
        howItWorksSteps: parsed.howItWorksSteps ?? DEFAULT_CMS_CONTENT.howItWorksSteps,
        advancedFeatures: parsed.advancedFeatures ?? DEFAULT_CMS_CONTENT.advancedFeatures,
      };
    }
  } catch {
    // Fallback to defaults cleanly
  }
  return DEFAULT_CMS_CONTENT;
}

export async function saveCmsContent(content: CmsContent): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: CMS_SETTING_KEY },
    update: { value: JSON.stringify(content), isSecret: false },
    create: { key: CMS_SETTING_KEY, value: JSON.stringify(content), isSecret: false },
  });
}
