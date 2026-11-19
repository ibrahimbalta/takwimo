# TAKWİMO — WhatsApp Business & Google Calendar Koordinasyon Platformu

TAKWİMO, randevu ile çalışan işletmeler (klinikler, estetik merkezleri, veterinerler, psikologlar, kuaförler ve KOBİ'ler) için geliştirilmiş **çoklu işletmeli (Multi-Tenant) SaaS** platformudur.

**Tek gelen kutusu. Tek takvim. Tek ekip.**

## Öne Çıkan Özellikler

- **Ortak WhatsApp Business Gelen Kutusu:** Meta Cloud API + Embedded Signup, 24 saatlik müşteri penceresi kontrolü, şablon mesaj değişkenleri (`components`), medya algılama ve 5 saniyede bir canlı yenileme.
- **İki Yönlü Google Calendar Senkronizasyonu:** Çakışma önleme (`freeBusy`), 30 dakikalık slot seçici, Google'a otomatik etkinlik yazma/güncelleme/iptal ve `/api/webhooks/google` push bildirim senkronizasyonu.
- **Otomatik Hatırlatma & Cron Motoru:** Randevu onayı, 24 saat önce hatırlatma, iptal ve erteleme otomasyonları (`/api/cron/run` ile tüm işletmeler için otomatik tetikleme).
- **3 Katmanlı Rol Yönetimi & Bağımsız Admin CRM:** Süper Admin (`/admin`), İşletme Sahibi/Yöneticisi (`OWNER`/`ADMIN`) ve Uzman/Personel (`STAFF`) ayrımı.
- **E-posta & Şifre Sıfırlama:** Resend destekli ekip davet e-postaları ve `/forgot-password` → `/reset-password` akışı.
- **KVKK Uyumluluğu:** Tek tıkla unutulma hakkı (anonimleştirme), denetim günlüğü (`AuditLog`), otomatik veri saklama temizliği ve yasal sayfalar (`/privacy`, `/terms`, `/kvkk`).

## Paketler & Fiyatlandırma

| Paket | Aylık Ücret | Müşteri | Aylık Randevu | Ekip Koltuğu |
| :--- | :--- | :--- | :--- | :--- |
| **Başlangıç** | **₺0** (Sonsuza dek ücretsiz) | 50 | 50 | 2 |
| **Pro** | **₺500 / ay** | 500 | 1.000 | 5 |
| **Business** | **₺1.000 / ay** | 5.000 | 10.000 | 20 |
| **Enterprise** | **₺2.000 / ay** | 50.000 | 100.000 | 50 |

## Kurulum & Geliştirme

```bash
# 1. Bağımlılıkları kurun
npm install

# 2. Ortam değişkenlerini ayarlayın
cp .env.example .env

# 3. Veritabanı şemasını uygulayın ve örnek verileri yükleyin
npm run db:push
npm run db:seed

# 4. Geliştirme sunucusunu başlatın
npm run dev
```

## Test, Lint ve Build

```bash
npm test
npm run lint
npm run build
```

## Üretim Cron Görevi

Hatırlatma mesajları, KVKK otomatik veri saklama temizliği ve Google Calendar watch yenilemesi için her 5 dakikada bir aşağıdaki endpoint'i tetikleyin:

```bash
curl -X POST https://app.takwimo.com/api/cron/run \
  -H "Authorization: Bearer $CRON_SECRET"
```
