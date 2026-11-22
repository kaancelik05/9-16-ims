# 9-16 IMS — Entegrasyon ve Backend Yol Haritası

> Bu doküman, güncel ekran tasarımlarının (7 ekran) akış analizi, Supabase
> backend geliştirme planı, Asana API entegrasyon değerlendirmesi ve platform
> (Instagram / YouTube / TikTok / Snapchat) veri temin stratejisinin tek
> referansıdır. Kod ve schema değişikliği içermez — uygulama fazları
> `ARCHITECTURE.md` ile birlikte bu dokümandan yönetilir.
>
> **Alınan stratejik kararlar (2026-09-21):**
> 1. Veri stratejisi: **Consent-first** — tüm platform verisi creator OAuth
>    onayıyla; keşif aşamasında creator-beyan + manuel giriş.
> 2. Bu turun çıktısı: **sadece bu plan dokümanı**.
> 3. AI Safety Audit motoru: **şimdilik mock** kalır; schema ve akış korunur.

---

## İçindekiler

1. [Yönetici özeti](#1-yönetici-özeti)
2. [Mevcut durum tespiti](#2-mevcut-durum-tespiti)
3. [Eksik akış envanteri (ekran ekran)](#3-eksik-akış-envanteri-ekran-ekran)
4. [Supabase backend: hatalar ve geliştirme planı](#4-supabase-backend-hatalar-ve-geliştirme-planı)
5. [Asana entegrasyon planı](#5-asana-entegrasyon-planı)
6. [Platform veri stratejisi (consent-first) ve erişim/limit analizi](#6-platform-veri-stratejisi-consent-first-ve-erişimlimit-analizi)
7. [Faz yol haritası ve kabul kriterleri](#7-faz-yol-haritası-ve-kabul-kriterleri)
8. [Risk kaydı](#8-risk-kaydı)
9. [Kaynakça](#9-kaynakça)

---

## 1. Yönetici özeti

Frontend tasarım-uçuşu tamamlandı: 7 ekran (Login, Dashboard, Directory +
Add Modal, Profile & AI Safety Audit, Campaign Kanban, Analytics, Consent
Portal) piksel seviyesinde hazır. Backend tarafında schema (10 tablo), RLS,
4 RPC ve 4 Edge Function yazıldı. **Ancak köprü atılmadı**: canlı veri
yalnızca üç noktada akıyor — auth (dev'de demo bypass), `get_consent_context`
RPC (token'lı consent) ve hiçbir bileşene bağlanmamış Asana realtime
servisleri. Tüm liste/profil/kanban/analytics verisi bileşen içine
gömülü demo diziler.

Dört ana bulgu:

| # | Bulgu | Önem |
|---|-------|------|
| 1 | Ekranlarda ~20 ölü buton / eksik akış var; consent zinciri (link üretimi → onay → bağlantı) tamamlanmamış | Yüksek |
| 2 | Backend'de 1 çökme riski (consent context alan adı), 1 güvenlik açığı (webhook HMAC'siz), 5 küçük hata tespit edildi | Yüksek |
| 3 | Asana tarafı PAT + webhook mimarisi doğru; eksik olan HMAC doğrulaması, heartbeat yanıtı ve UI wiring'i. Rate limit (1500 req/dk) sorun değil | Orta |
| 4 | Platform verisi: YouTube en açık; Instagram consent'li tam; TikTok consent + app audit şartlı; **Snapchat pratikte kapalı** (partner-gated). TikTok/Snap keşif verisinin meşru yolu yok → consent-first strateji bunu doğru kapsıyor | Kritik |

---

## 2. Mevcut durum tespiti

### 2.1 Canlı veri yüzeyi (bugün gerçekten çalışan)

| Yer | Ne yapıyor | Dosya |
|-----|-----------|-------|
| Auth | Supabase email/şifre (dev'de `demoMode: true` bypass — her giriş "Elena Rostova" mock admin) | `src/app/core/auth/auth.service.ts:34-104` |
| Consent context | `/consent?token=…` varsa `get_consent_context` RPC'si — **tek gerçek feature sorgusu** | `src/app/features/consent/pages/consent-portal/consent-portal.ts:57` |
| Asana sync (orphan) | `asana_sync_log` + `deliverables` realtime aboneliği yazıldı ama hiçbir bileşen servisi enjekte etmiyor | `src/app/core/asana/asana-sync.service.ts:38-66` |

Frontend'in dokunduğu tablolar yalnızca: `profiles`, `asana_sync_log`,
`deliverables` (+ 1 RPC). `influencers`, `influencer_platform_metrics`,
`safety_audits`, `campaigns`, `asset_metrics`, `asana_connections`,
`consent_tokens`, `creator_consents` — **hiç sorgulanmıyor**.

### 2.2 Roster ayrışması (kritik yapısal sorun)

- UI roster'ı: 8 creator, **slug id'ler** (`maya-chen`, `kai-tanaka`, …) —
  `influencer-directory.ts:102-279` ve `influencer-profile.ts:135-408`
- DB seed roster'ı: 5 **farklı** creator, **uuid id'ler** — `supabase/seed.sql`
- İki küme kesişmiyor. UI data swap'a geçerken id sistemi uuid'ye taşınmalı;
  seed, UI'daki 8 creator'a yeniden yazılmalı (ya da tersi).

### 2.3 Demo veri konumları (data swap checklist)

| Ekran | Mock veri yeri |
|-------|----------------|
| Dashboard | `dashboard.ts:23-239` (platformlar, task'ler, creator'lar, consent'ler, assetler) + statik HTML KPI'lar `dashboard.html:49-171` |
| Directory | `influencer-directory.ts:102-279` (8 kart), `:378-413` (fake kayıt), `:513-556` (statik "1.240" sayısı + ölü sayfalama) |
| Add Modal | `add-influencer-modal.ts:63,113-117` (fake auto-fetch 1.2 sn spinner), `:77-90` (hardcoded kampanya listesi) |
| Profile | `influencer-profile.ts:135-408` (PROFILES sözlüğü), `:427` (bilinmeyen id → Maya Chen fallback), `:448-452` (fake audit rerun) |
| Kanban | `campaign-workflow.ts:109-363` (10 demo kart), `:382-389` (fake force-sync), `campaign-workflow.html:126-167` (hardcoded telemetry banner) |
| Analytics | `campaign-analytics.ts:75-327` (platform hızları + 6 asset satırı), `:66-72` (statik format pill sayaçları), `campaign-analytics.html:86-174` (KPI'lar) |
| Consent | `consent-portal.ts:34-38` (demo context), `:68-79` (setTimeout el sıkışma simülasyonu) |
| Shell | `shell.html:19-22,44,63-64,95-99,105` ("428" creator, "99.4% Safe", 4.2/10 TB, "Asana 200 OK" — hepsi statik) |

---

## 3. Eksik akış envanteri (ekran ekran)

### 3.1 Consent zinciri — üç halkası da kopuk

```
[Agency: link üret] ──✗──▶ [Creator: onay ver] ──✗──▶ [Sistem: kaydet + bağla]
        yok                        simülasyon                    hiç çağrılmıyor
```

1. **Agency tarafı link üretimi yok.** `consent-api` Edge Function'ının
   `create-link` aksiyonu hazır (72 saat TTL'li tek kullanımlık token üretir,
   `{APP_URL}/consent?token=…` döndürür) ama çağıran tek bir UI butonu yok.
   Dashboard'daki "Batch Send Digital Releases" ve "Ping" butonları ölü.
2. **Onay simülasyon.** "Approve & Connect Accounts" → `setTimeout(1.2s)` →
   "Connected Successfully" (`consent-portal.ts:68-79`). `grant_consent` RPC'si
   hiç çağrılmıyor; `revoke_consent` kodda hiç geçmiyor.
3. **Token hata durumları yok.** Süresi dolmuş / kullanılmış / geçersiz token
   durumunda portal hata göstermek yerine sessizce demo "Maya Lin" kartına
   düşüyor (`consent-portal.ts:62-65`). "View Terms" (`#terms-modal`) ve
   "Cancel" (`#cancel`) ölü anchor'lar.

**Gerekli akış:** Directory/Profile/Dashboard'da "Consent Link Üret" butonu →
`consent-api create-link` → kopyalanan link + WhatsApp/e-posta gönderimi →
creator portalda gerçek `grant_consent` çağrısı → `creator_consents` kaydı →
(consent-first strateji gereği) platform OAuth bağlantı adımına köprü (bkz. §6.5).

### 3.2 Add Influencer — kalıcılık yok

Modal `NewInfluencer` payload'u üretiyor (`add-influencer-modal.ts:51-61`) ama
Directory yalnızca in-memory sinyale kart ekliyor (`influencer-directory.ts:378-413`).
Eksik: `influencers` insert (Supabase), opsiyonel ilk `influencer_platform_metrics`
satırları (creator-beyan), "Add to Asana campaign" seçildiyse `create-task`,
"Instant AI audit" toggle'ı ise `safety_audits`'e `in_progress` satır. Kayıt
sonrası yeni uuid ile profil sayfasına navigasyon eklenmeli (bkz. 3.3).

### 3.3 Profile — fallback bug'ı ve ölü aksiyonlar

- **Bilinmeyen `:id` sessizce `maya-chen`'e düşüyor** (`influencer-profile.ts:427`).
  3.2'deki yeni kayıtlar bu bug'a düşer → yanlış dosya gösterilir. Çözüm:
  id'ler uuid'ye taşınınca sorgu bulunamazsa "bulunamadı" durum sayfası.
- "Assign" (kampanya atama), "Open in Asana", "Approve Concept" butonları ve
  sosyal dock linkleri (`href="#"`) ölü. "Rerun" audit simülasyonu
  (`:448-452`) — mock kararına göre şimdilik bilinçli olarak öyle kalır.

### 3.4 Campaign Kanban — salt görüntüleme

- Kart taşıma (drag & drop) yok; stage değişikliği akışı yok.
- "Approve"/"Revision" kart aksiyonları yok → `approval_status` +
  `asana-proxy update-task` (custom field) zinciri eksik.
- Stage "+" ekleme butonları, kart yorum/ek sayaçları ölü.
- View switcher (Stage/Creator/Deliverable) sinyali set ediyor ama template
  yalnızca stage board'u render ediyor — diğer iki gruplama implement
  edilmemiş.
- Telemetry banner ("42/42 Synced, 320ms, 60s Auto") hardcoded HTML;
  `AsanaSyncService.health` ({connected, syncedTasks, conflicts, latencyMs,
  lastSyncAt}) zaten hesaplanıyor — bağlanmalı.
- "Force Sync" simülasyon → gerçek `list-tasks` + deliverable upsert olmalı.
- Stage sayaçları (6/5/8/4/5) demo kart sayısıyla tutmuyor (kart başına 2).

### 3.5 Analytics — gerçek sorgular ve ölü kontroller

- Asset telemetry tablosu `asset_metrics` + `deliverables` join'iyle
  beslenmeli; format pill sayaçları `content_format` gruplamasından
  hesaplanmalı (şu an statik "24/10/8/4/2").
- Campaign selector, date-range chip'leri, "Export PDF Report" ölü.
- Platform velocity (ER, EMV, pay) `asset_metrics` üzerinden türetilmeli
  (formüller bkz. §6.4).

### 3.6 Auth ve yönetim

- **Signup UI yok** — `handle_new_user()` trigger'ı ilk kullanıcıyı admin
  yapar ama tetikleyecek kayıt ekranı yok. Login sayfasına "İlk kez mı?
  Hesap oluştur" akışı veya Faz 0'da manuel `supabase.auth.admin.createUser`.
- Şifre sıfırlama akışı yok.
- `/settings` boş placeholder: rol yönetimi (viewer→manager→admin yükseltme)
  ekranı planlanmalı — RLS altyapısı hazır, sadece UI + güvenli RPC eksik.
- `/audit` boş placeholder (roster geneli safety görünümü; mock kararına
  göre Faz 5'e kadar ertelenebilir).

### 3.7 Shell — ölü global kontroller

Global search (⌘K, handler yok), bildirim zili, "active campaign" chip'i,
avatar tıklaması = çıkış (niyet belirsiz — dropdown olmalı). Kanal rozetleri
("428", "99.4% Safe", storage, "Asana 200 OK") statik → Aggregate sorgulara
bağlanmalı (Faz 2).

### 3.8 Directory — ölü aksiyonlar

"Export Media Kit", tablo görünümü switch'i, "Save Filter Preset", kart
başına "Add to Asana campaign" (playlist_add) ve audit (verified_user)
ikonları, "Bulk Add to Asana" / "Bulk Outreach", sayfalama (155 sayfa statik).
Filtre konsolu (arama, niche, platform pill'leri, reach slider, ER, Asana
state) çalışıyor ama %100 client-side — gerçek veriye geçince server-side
sayfalama + count RPC gerekir.

---

## 4. Supabase backend: hatalar ve geliştirme planı

### 4.1 Tespit edilen hatalar (Faz 1 düzeltme listesi)

| # | Hata | Yer | Etki | Düzeltme |
|---|------|-----|------|----------|
| 1 | `get_consent_context` `influencer_name` döndürüyor, UI `name` bekliyor | `0003_functions.sql:115-119` ↔ `consent-portal.ts:5-9` | `ctx.name` undefined → `initials()` (`:82`) `.split` crash'i | RPC'ye `name` alanı ekle (geriye dönük uyumlu) **veya** UI'ı `influencer_name`'e çevir |
| 2 | `revoke_consent` RPC `database.types.ts` Functions map'inde yok | `database.types.ts:597-616` | typing drift; çağıran yazılamaz | Tiplere ekle |
| 3 | **Güvenlik:** `asana-webhook` public endpoint'te `X-Hook-Signature` HMAC doğrulaması yok — secret saklanıyor ama hiç kullanılmıyor; herhangi bir POST işleniyor | `supabase/functions/asana-webhook/index.ts` | Sahte event enjeksiyonu → deliverable bozulması | Gövde üzerinde SHA256 HMAC (`X-Hook-Secret` anahtar) doğrula; uyuşmazsa 401 |
| 4 | Webhook handshake secret'ı project filtresiz **tüm** `status='connected'` satırlarına yazıyor | asana-webhook | Çok projeli bağlantıda birbirinin secret'ını ezme | Handshake'te hedef webhook/resource'dan project belirle veya secret'ı webhook bazında sakla |
| 5 | `consent-api list` ham token string'ini viewer dahil tüm rollere döndürüyor | `consent-api/index.ts` | Token sızıntısı yüzeyi | Viewer için maskele (`abcd…wxyz`), tam token yalnız create-link anında |
| 6 | `influencer_platform_metrics.updated_at` için `set_updated_at` trigger yok | `0003_functions.sql` | updated_at bayat kalır | Trigger ekle |
| 7 | "Admin update all" profiles politikası fiilen manager'a da izin veriyor (`is_agency_member() and can_write()`) | `0002_rls.sql` | Yetki genişlemesi | Politikayı `role = 'admin'` kontrolüne daralt |
| 8 | `grant_consent` typing'te `p_scopes` zorunlu işaretli ama SQL'de default'u var | `database.types.ts` | Küçük | Optional yap |

### 4.2 Schema eksikleri — migration 0004 önerisi

Consent-first stratejinin veri modeli gereksinimleri:

```sql
-- 1) platform_connections: stratejinin kalbi — creator OAuth bağlantıları
CREATE TABLE platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,          -- instagram|tiktok|youtube|snapchat
  provider text NOT NULL,                   -- 'meta_ig_login'|'google_oauth'|'tiktok_login_kit'|'manual_export'
  external_user_id text,                    -- platform tarafındaki kullanıcı kimliği
  scopes text[] NOT NULL DEFAULT '{}',
  access_token_encrypted text,              -- service-role'da şifreli; UI'a asla dönmez
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',    -- active|expired|revoked|pending
  connected_via_consent uuid REFERENCES creator_consents(id),
  last_sync_at timestamptz,
  created_at/updated_at …
);
-- RLS: staff okuma; yazma yalnız service role (edge functions).

-- 2) metric_snapshots: IG insights ~30 gün penceresi → geçmişi kendimiz biriktiririz
CREATE TABLE metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  followers bigint, engagement_rate numeric(5,2),
  extra jsonb NOT NULL DEFAULT '{}',        -- platform-özel alanlar (watch_time, story_reach…)
  source metric_source NOT NULL,            -- api|declared|manual
  captured_at timestamptz NOT NULL DEFAULT now()
);

-- 3) audit_log: "kim ne yaptı" (asana_sync_log yalnız sync olayları)
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES profiles(id),
  action text NOT NULL,                     -- influencer.create, consent.grant, deliverable.approve …
  entity_type text NOT NULL, entity_id text,
  diff jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) metric_sync_runs: ingest işlerinin koşus kaydı (başarı/hata/limit)
CREATE TABLE metric_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_type,                   -- null = tümü
  status sync_status NOT NULL,
  creators_scanned int, metrics_written int,
  error_message text, started_at, finished_at …
);
```

Ayrıca:

- `influencers` tablosuna: `avatar_url`, `bio`, `languages text[]`,
  `audience_summary jsonb` (creator-beyan demografikler: yaş/cinsiyet/geo
  dağılımı — consent-first'te API'den gelmeyeceği için beyan saklanır),
  `last_consent_state text` (none|pending|granted|revoked — Directory
  rozetleri için hızlı okuma).
- `influencer_platform_metrics`'e: `source metric_source` (api|declared|manual),
  `declared_at timestamptz` — her satırın nereden geldiği işaretlenir.
- `asset_metrics`'e: `saves int`, `watch_time_seconds int`,
  `source metric_source` (UI'daki saves/taps alanları için karşılık).
- **Provenance kuralı (tüm tablolara):** hiçbir metrik "kaynaksız" yazılamaz;
  UI'da her metrik yanında API / Beyan / Manuel rozeti gösterilir (Faz 2).
- **Storage:** `ims-assets` bucket (deliverable taslak videoları) +
  policy: staff okuma/yazma, bucket public değil; `deliverables.asset_url`
  signed URL üretecek şekilde kullanılır.
- Enum: `metric_source ('api','declared','manual')`.

### 4.3 Edge Function planı

| Function | Durum | Amaç |
|----------|-------|------|
| `asana-proxy` | ✅ var | Outbound Asana köprüsü — Faz 3'te aksiyonlar genişler (webhook lifecycle, sections, 429 backoff) |
| `asana-webhook` | ✅ var, düzeltilmeli | HMAC doğrulaması (hata #3), heartbeat yanıtı, project-scoped secret (hata #4) |
| `consent-api` | ✅ var, düzeltilmeli | Token maskeleme (hata #5); Faz 4'te platform bağlantı köprüsü |
| `platform-connect` | 🆕 Faz 4 | OAuth callback işleyici: Meta (IG Login) / Google / TikTok token exchange → `platform_connections` yazımı. URL şeması: `/platform-connect?state=…` (state = consent token) |
| `metrics-ingest` | 🆕 Faz 4 | Scheduled (pg_cron / Supabase schedule): aktif `platform_connections` için platform API'lerinden çekim → `influencer_platform_metrics` upsert + `metric_snapshots` + `metric_sync_runs` kaydı. Rate-limit korumalı (platform bazlı token bucket) |
| `safety-audit` | 📋 iskelet (mock kararı) | LLM audit motoru Faz 5 kararı; girdi sözleşmesi (consent'li API verisi + YouTube herkese açık yorumlar + er taraması) bu dokümanda sabitlendi |

### 4.4 UI data swap planı (Faz 2)

Mekanizma: `environment.demoMode` genişletilir — her feature servisi önce
gerçek sorguyu dener, `demoMode` veya bağlantı hatasında mock diziye döner
(ng-serve stale-cache dersleri gereği mock veri ayrı `*.demo.ts` dosyalarına
taşınır, bileşen gövdelerinden çıkarılır).

| Ekran | Sorgu |
|-------|-------|
| Directory | `influencers` + `influencer_platform_metrics` join (`InfluencerWithMetrics`); server-side sayfalama + count RPC; filtreler Postgres'e |
| Profile | `influencers` + metrics + son `safety_audits` + `creator_consents` + atanmış `deliverables`; bulunamayan id → durum sayfası |
| Kanban | `deliverables` (+campaign, +influencer) → stage gruplama; telemetry banner `AsanaSyncService.health`'e |
| Analytics | `asset_metrics` + `deliverables` join; platform velocity RPC/aggregate; format sayaçları `content_format` gruplama |
| Dashboard | Türetme görünümü ya da `dashboard_stats()` RPC ( toplam reach, aktif deliverable, bekleyen consent, sync health) |
| Shell | Aynı aggregate'lerden rozetler; bildirim zili → `audit_log`/consent olayları |
| Consent portal | Gerçek `grant_consent` çağrısı + hata durumları (expired/used/invalid) + (Faz 4) platform bağlantı butonları |

---

## 5. Asana entegrasyon planı

### 5.1 API değerlendirmesi (developers.asana.com, Eylül 2026)

**Kimlik doğrulama.** Personal Access Token resmi ve yürürlükte; bir
deprecasyon duyusu **yok** (2026 PAT kısıtlaması duyumu Atlassian kaynaklı;
Asana tarafında yalnız MCP V1 sunucusu kapanıyor — bizim kurulumumuzla
ilgisiz). OAuth 2.0, uygulama çok-organizasyonlu SaaS'a açıldığında gerekir;
tek ajans içi kullanım için PAT doğru seçim.

**PAT'ye bağlı webhook ölüm riski.** Webhook'lar oluşturan token'ın
kullanıcısına bağlıdır: kullanıcı ayrılır/erişim kaybederse event akışı durar.
→ **Öneri:** Ajansın Asana workspace'inde ayrı bir `ims-integration` bot
kullanıcısı açılır; PAT ve webhook'lar bu hesaptan yönetilir. PAT süresiz,
yine de 90 günde bir rotate edilecek operasyon kuralı konur.

**Rate limit.** Standart uçlar ~1500 req/dk (paid domain; free'da 150).
Bizim senkrono (onlarca task, webhook event sonrası tek fetch) için
asimptotik olarak bol. Yine de `asana-proxy`'ye 429 → exponential backoff
(Retry-After başlığına uyarak) eklenmeli. Search API 60 req/dk — kullanmıyoruz.

**Webhook sözleşmesi (mevcut kodda eksikler dahil):**

1. **Handshake** ✅ var — `X-Hook-Secret` geri yankılanıyor. Ancak secret
   project filtresiz tüm bağlantı satırlarına yazılıyor (hata #4).
2. **HMAC imza doğrulaması** ❌ — her teslimatta gövde üzerinde
   `X-Hook-Signature` (SHA256 HMAC, anahtar `X-Hook-Secret`) doğrulanmalı.
   Bu bir güvenlik düzeltmesi (hata #3).
3. **Heartbeat** ❌ — Asana handshake anında ve her 8 saatte boş payload
   gönderir; 24 saat yanıt alamazsa webhook'u **siler**. Endpoint boş
   gövdeye 200 dönmeli; `last_success_at` izlenmeli (health panelinde
   "webhook yaşıyor" göstergesi).
4. **Event sonrası tam fetch** ✅ mantık doğru — payload compact gelir,
   mevcut kod task'i yeniden çekiyor. 
5. **At-most-once teslim** ⚠️ — event kaçabilir → günlük fallback polling
   (`forceSync` altyapısı buna hizmet eder; sağlık sinyaliyle tetiklenir).
6. **Filtreler** — webhook oluştururken `resource_type: 'task', action:
   changed|added|deleted` filtresi konmalı; şimdilik filtresiz kayıt akışı
   gürültü yaratabilir. Event'ler yukarı yayılır (comment → task → project):
   task seviyesinde abonelik + `parent` kontrolü yeterli.
7. **10 saniye yanıt penceresi** — webhook handler'ı ağır işi kuyruğa
   bırakıp hızla 200 dönmeli (mevcut handler zaten hafif; korunmalı).

**Limitler:** kaynak başına 1000 webhook, token başına 10.000 — bizim için
sınırsız. Retry: exponential backoff, 24 saat başarısızlıkta event silinir.

### 5.2 Veri eşlemesi (mevcut + planlanan)

| IMS | Asana | Yön | Durum |
|-----|-------|-----|-------|
| `deliverables.asana_task_gid` | task gid | — | ✅ upsert anahtarı (partial unique index hazır) |
| Kanban section (5 stage) | Task'ın section'ı | inbound | ✅ regex eşleme webhook'da yazılmış; **outbound stage taşıma da yazılmalı** (task'ı section'a taşıma aksiyonu) |
| `content_format` | "Content Format" custom field | çift yönlü | ✅ inbound var; outbound `update-task`'a eklenmeli |
| `fee` | "Deliverable Fee" custom field | çift yönlü | ✅ inbound var; outbound eklenmeli |
| `approval_status` | "Approval Status" custom field | çift yönlü | ✅ inbound var; **Kanban approve/revision butonları buradan yazmalı** |
| `influencers.asana_gid` | Task assignee / tag? | — | ❌ henüz tanımlı değil — task'da creator eşlemesi (custom text field "Creator ASN-ID" önerisi) |
| Yorum sayıları | stories | inbound | opsiyonel; şimdilik ertelenebilir |

### 5.3 UI bağlantı noktaları (Faz 3)

1. **Kanban telemetry banner** → `AsanaSyncService.health` (connected,
   syncedTasks/totalTasks, conflicts, latencyMs, lastSyncAt, "60s Auto"
   gerçeğe bağlanır: realtime event akışının son mesaj yaşı).
2. **Event ticker** → sync service zaten `asana_sync_log` INSERT akışını
   dinliyor; Kanban alt bandındaki log akışı buna bağlanır.
3. **Kart approve/revision** → yerel `deliverables.approval_status` update +
   `asana-proxy update-task` (custom field) + sync log.
4. **Kart taşıma** → `deliverables.stage` update + Asana'da section taşıma.
5. **Kart derin link** → `https://app.asana.com/0/{project_gid}/{task_gid}`
   ("Open in Asana").
6. **"Add to Asana campaign"** (Directory kart ikonu + modal) →
   `create-task` + dönen gid'in `deliverables`'a kaydı.
7. **Force Sync** → `list-tasks` (opt_fields ile custom fields + section) →
   upsert döngüsü + `metric_sync_runs` benzeri sonuç raporu banner'da.
8. **Profile "Assign"** → seçilen kampanyada create-task; "Approve Concept"
   → approval_status güncelleme.

---

## 6. Platform veri stratejisi (consent-first) ve erişim/limit analizi

### 6.1 Strateji özeti

**Tüm platform verisi creator onayıyla toplanır.** Keşif (henüz onay
vermemiş creator) aşamasında metrikler creator-beyanına (consent formunda
self-report) ve manuel girieye dayanır. Hiçbir scraping / resmi olmayan yol
kullanılmaz (TikTok ToS, Meta ToS ihlali riski ve hesap yaptırımları).

**Veri kaynağı hiyerarşisi ve provenance:**

```
api (creator OAuth)  >  declared (creator beyanı)  >  manual (ajans girişi)
```

Her `influencer_platform_metrics` ve `asset_metrics` satırı `source`
işaretli yazılır; UI'da her metrik API / Beyan / Manuel rozetiyle gösterilir.
Bu, ajansa "bu sayı nereden geliyor" şeffaflığını verir ve sözleşme/FTC
uyumunda koruma sağlar.

### 6.2 Platform durum tablosu

#### Instagram (Meta)

| Konu | Durum |
|------|-------|
| Kullanılacak API | **Instagram API with Instagram Login** (Graph API üzerinde; eski Basic Display API **4 Aralık 2024'te kapandı** — migrating dokümanı bu API'yi işaret ediyor) |
| Kim bağlar | Creator kendi professional (Business/Creator) hesabıyla OAuth onayı verir |
| Alınabilecek veri | Profil (followers, media_count); kendi medyaları (like/comment sayıları); **App Review sonrası insights**: reach, impressions, profile views; story metrikleri (UI'daki story reach / reel retention karşılığı); follower demographics (yaş/cinsiyet/geo — **sadece hesap sahibi** görür) |
| Gereksinimler | Meta developer app + App Review (`instagram_basic`, `instagram_manage_insights` vb. scope'lar), muhtemelen Business Verification; geçerli privacy policy + veri silme akışı |
| Limitler | BUC (Business Use Case) token bütçesi; saatlik rate limitler; **insights geçmişi ~24-30 gün** → `metric_snapshots` ile biriktirme zorunlu |
| Consent'siz keşif | `business_discovery` bu senaryo için var ama strateji gereği **kullanılmıyor** (bilgi: agency IG business hesabı şart, 200 uniq kullanıcı/saat + haftalık medya cap) |

#### YouTube (Google) — en açık platform

| Konu | Durum |
|------|-------|
| Kullanılacak API | YouTube Data API v3 (OAuth read-only) + YouTube Analytics API (sahip verisi) |
| Kim bağlar | Creator Google hesabıyla OAuth |
| Alınabilecek veri | Data API: subscribers, toplam views, video başına views/likes/comments; herkese açık yorumlar (`commentThreads` — AI audit girdisi için ileride değerli). Analytics API: **watch time, average view duration, retention, subscribers gained, audience demographics** (UI'daki "Avg Watch Time 14m20s" karşılığı — yalnızca sahibi görür) |
| Gereksinimler | Google Cloud projesi + OAuth consent screen; read-only scope'lar. API key (anonim public sorgular için) yalnız Faz 4 sonrası opsiyonel zenginleştirme — consent-first'te OAuth esas |
| Limitler | 10.000 unit/gün varsayılan; `channels.list`/`videos.list` **1 unit** — yüzlerce creator'ın günlük sync'ine bol bol yeter. `search.list` 100 unit (kullanmayacağız). Kota artışı formu mevcut |
| Risk | Düşük. Review süreci hafif (read-only) |

#### TikTok

| Konu | Durum |
|------|-------|
| Kullanılacak API | Login Kit → Display API (`/v2/user/info/`, `video/list/`) |
| Kim bağlar | Creator OAuth onayı |
| Alınabilecek veri | Temel: open_id, display_name, avatar. **`user.info.stats` scope onaylıysa**: `follower_count`, `following_count`, `video_count`, toplam likes. `video.list`: video başına views/likes/comments/shares (UI'daki avg views / viral hesap girdisi) |
| Gereksinimler | TikTok developer app + **iki aşamalı audit** (app + ürün incelemesi; ~3-4+ gün, ret riski); privacy policy; **veri silme endpoint'i zorunlu**; scope gerekçesi net yazılmalı |
| Limitler | Display API ~600 req/dk; token refresh akışı |
| Consent'siz keşif | **Meşru yol YOK.** Research API yalnız akademik/kar amacı gütmeyen kurumlara; scraping ToS ihlali (hesap/ip yaptırımı). → beyan/manual |
| Not | `user.info.stats` audit'te reddedilirse bile basic + creator beyanı ile çalışır; audit gerekçesi "creator kendi performansını ajansla paylaşmak üzere bağlar" senaryosu |

#### Snapchat — pratikte kapalı

| Konu | Durum |
|------|-------|
| Mevcut API'ler | Snap Kit (Login Kit): yalnızca temel profil (displayName/avatar) — **creator metrikleri yok**. **Creator Discovery API** (follower count, Spotlight views ile creator arama): yalnızca **onaylı Snap Marketing API partner'ı** olmayı + creator opt-in gerektirir. Marketing API erişimi: işletme hesabı + Snap Business Tools şartları + partner onayı |
| Pratik yol | ① Creator in-app Insights'ını (Public Story/Spotlight performansı) düzenli export/screenshot → ajans manual giriş (`source='manual'`, `declared_at` işaretli). ② Consent formunda self-report alanları (followers, 24h story views, swipe-up oranı). ③ Uzun vadede Snap partner süreci değerlendirilir (gerçekçi değil kritik yol) |
| UI etkisi | SC kolonundaki metriklerin tamamı **Beyan/Manuel** rozetli gösterilir; "Daily/Stories/High" gibi niteliksel değerler beyan alanlarına düşer |

### 6.3 Erişemeyeceğimiz / limitte takılacağımız noktalar — net cevap

1. **TikTok consent'siz keşif verisi: yok.** (Research API akademik; scraping
   ToS ihlali.) Directory'de TikTok kolonu onaysız creator'larda boş/beyanlı
   kalacak — bilinçli UX kararı olarak tasarlanmalı ("Connect" CTA'sı).
2. **Snapchat API yolu kapalı** (partner-gated). SC metrikleri süresiz
   olarak beyan/manual — bu planın kabul ettiği tek kalıcı kısıt.
3. **IG consent'siz keşif kullanılmıyor** (strateji kararı; teknik olarak
   business_discovery sınırlı mümkün: 200 uniq kullanıcı/saat, BUC bütçesi,
   haftalık cap).
4. **Audience demographics (yaş/cinsiyet/geo) yalnız hesap sahibi API'sinde.**
   UI'daki "Gen-Z Reach %78" gibi etiketler creator-beyana dönüşür
   (`audience_summary jsonb` + rozet).
5. **Fake-follower / audience quality skoru hiçbir resmi API'de yok.**
   V1: er/follower + yorum/like oranı heuristiği ("viral index" kendi
   formülümüz). İleride isteğe bağlı 3. parti zenginleştirme: Modash
   (~$99-120/ay, API'li, IG/TT/YT; **Snap yok**), HypeAuditor (~$299+/ay,
   audience quality odaklı) — bu dokümanda alternatif olarak kayıtlı,
   karar ayrıca alınır.
6. **IG insights ~30 gün penceresi** → `metric_snapshots` günlük birikimi
   şart; trend/sparkline'lar kendi snapshot'larımızdan çizilir.
7. **Meta + TikTok app review süreçleri kritik yolda** (haftalar sürebilir;
   TikTok iki aşamalı + ret riski). Faz 4'ün ilk işi başvuruları yapmak.
8. **Asana'da limit sorunu yok** (1500 req/dk); tek risk PAT sahibi
   kullanıcının erişimini kaybetmesi → bot hesabı önerisi (§5.1).
9. **Watch time / retention / story reach gibi "sahip-özel" metrikler**
   yalnız OAuth'lu creator'dan gelir; onaysız creator'da gösterilmez
   (placeholder + "Connect" CTA).
10. **EMV / CPE / Viral Index / Decay Velocity**: hiçbir platform API'sinde
    hazır gelmez — kendi formüllerimiz (§6.4).

### 6.4 Türetilmiş metrik formülleri (kurumsal tanım)

| Metrik | Formül | Girdi kaynağı |
|--------|--------|---------------|
| Engagement Rate | (likes + comments + shares) / followers × 100 | api/declared |
| EMV (Earned Media Value) | views × platform CPM sabiti × kalite katsayısı (ER bazlı) — ajans katsayı tablosu `settings`'te | api/declared |
| CPE | toplam harcama / engagements | campaigns.spend + asset_metrics |
| Viral Index (0-10) | son N videonın views/follower oranının normalize edilmiş skorunun ER ile harmanı — V1 tanımı | api |
| Swipe-Up Rate | swipe_ups / story views × 100 | api (IG) / declared (SC) |
| Decay Velocity (SC) | 24s story completion eğiminin niteliksel sınıfı (High/Fast/…) | declared |

### 6.5 Consent Portal → platform bağlantı köprüsü (Faz 4 UX)

```
Agency: "Consent Link Üret" (Directory/Profile/Dashboard)
   └─▶ consent-api create-link  → 72s TTL'li tek kullanımlık token
Creator: /consent?token=…
   ├─▶ get_consent_context (gerçek) → hata durumları: expired/used/invalid
   ├─▶ şartlar + read_only_analytics kapsamı onayı
   ├─▶ grant_consent RPC (tek kullanımlık; scopes sunucuda whitelist)
   └─▶ onay sonrası "Hesaplarını Bağla" ekranı:
        [Instagram ile bağlan] → Meta OAuth (state=consent) → platform-connect
        [YouTube ile bağlan]   → Google OAuth → platform-connect
        [TikTok ile bağlan]    → TikTok OAuth → platform-connect
        [Snapchat]             → beyan formu (manual/declared)
   └─▶ platform_connections satırı (active) → metrics-ingest ilk çekim
```

**Zero-posting garantisi korunur:** OAuth scope'ları read-only
(`instagram_manage_insights`, `youtube.readonly`, `user.info.stats`);
token'lar şifreli, yalnız service-role erişir; UI'a asla dönmez.

---

## 7. Faz yol haritası ve kabul kriterleri

> **Durum (2026-09-21):**
> - **Faz 0 — TAMAM:** proje `gccipoiophqivifwjkgj` bağlı; migration'lar
>   0001→0005 uygulandı; seed yüklendi (5 creator); edge function
>   secret'ları set (ASANA_ACCESS_TOKEN, APP_URL=http://localhost:4200);
>   asana-proxy / asana-webhook / consent-api deploy edildi; ilk admin
>   kullanıcı `k.celik05@gmail.com` (role=admin, geçici şifre ile —
>   değiştirilmeli); dev `demoMode: false`; canlı doğrulama: login ✅,
>   RLS okuma (5 satır) ✅, anon boş küme ✅, proxy JWT'siz 403 ✅,
>   Asana health + list-projects PAT üzerinden ✅. Yardımcılar:
>   `scripts/db-query.js`, `scripts/verify-faz0.js` (credential'lar
>   gitignored `.env.local`'dan okunur).
> - **Faz 1 — TAMAM:** 8 hata düzeltmesi + `0004_integration.sql` + edge
>   function güncellemeleri + `database.types.ts` senkronu (build + test
>   yeşil). Kapsama eklenenler: self-role-escalation guard, proxy
>   `create-webhook`/`delete-webhook` (secret proje bazlı), event gövde
>   normalizasyonu.
> - **Bootstrap sırasında bulunan ve kapatılan 2 ek hata:** (1)
>   `handle_new_user` CASE ifadesi `text` döndürüp ilk kullanıcıda
>   patlıyordu → `0005_function_fixes.sql` (açık enum cast); (2) gateway
>   publishable key'i anon kimlik olarak kabul ettiğinden `asana-proxy`
>   JWT'siz çağrılabiliyordu → fonksiyon içi `requireAgencyMember` +
>   mutasyonlarda admin/manager zorunluluğu (`_shared/auth.ts`; consent-api
>   de aynı modüle taşındı).
> - **Faz 2 — TAMAM (çekirdek):** ekranlar gerçek Supabase verisine bağlı
>   (build + test yeşil, 10/10 canlı doğrulama — `scripts/verify-faz2.js`).
>   Yapılanlar: seed UI roster'ına hizalandı (8 creator, deterministik
>   uuid'ler, 32 `source='declared'` metrik satırı, 7 kampanya — Nike
>   kampanyası gerçek Asana projesine `1218666402505911` bağlı, 10
>   deliverable, 8 audit, 4 asset metriği); Directory + Profile uuid
>   sorguları + Add Influencer kalıcı kayıt (`InfluencerDataService`);
>   Kanban gerçek deliverables board'u + telemetry banner
>   (`asana_connections` + `asana_sync_log`'dan, `CampaignDataService`);
>   Analytics gerçek asset tablosu + hesaplanan format pill'leri ve
>   platform velocity; Consent Portal gerçek `grant_consent` + token
>   hata durumları (geçersiz/süresi dolmuş/kullanılmış); Shell creator
>   sayacı canlı. Her ekranda LIVE DB / DEMO kaynak çipi. Ek bulunan
>   gizli hata: `create_consent_token` `search_path=public` yüzünden
>   `gen_random_bytes`'i çözemedi → `0006_rpc_fixes.sql`
>   (`search_path = public, extensions`).
>   **Faz 2 artığı (Faz 2B/Faz 3'e):** Dashboard sayfası hâlâ tamamen
>   demo; Analytics KPI bento'su + kampanya/date seçicileri statik;
>   Directory kart aksiyon butonları ve per-metric provenance rozetleri
>   (API/Beyan/Manuel) henüz UI'da değil (DB'de `source` hazır).
> - **Faz 2B — TAMAM:** Dashboard tamamen gerçek verilere bağlandı (KPI
>   kartları asset_metrics + campaigns toplamlarından hesaplanıyor;
>   platform bento, Asana task stream'i `asana_sync_log`'dan, AI safety
>   radar `safety_audits` join'inden, consent paneli
>   `last_consent_state='pending'`'den, asset showcase EMV sıralamasıyla
>   besleniyor; banner kampanya adı + uçuş günü hesaplanıyor).
>   Analytics: 5 KPI kartı hesaplanan, kampanya seçici ve tarih aralığı
>   (All/7/30/90g) fonksiyonel — KPI'lar ve platform velocity seçime
>   göre yeniden hesaplanıyor. Provenance rozetleri eklendi: Profile
>   telemetri kartlarında ve Directory metrik hücrelerinde API/Declared/
>   Manuel etiketi (`sourceLabel` yardımcısı; DB'deki `source` alanından).
>   `loadCampaigns` CampaignDataService'e taşındı; asset join'ine
>   `fee` + `campaigns(name)` eklendi. Böylece **Faz 2'nin tamamı bitti**
>   — kalan tüm parçalar Faz 3 kapsamında (outbound Asana aksiyonları,
>   consent link üretim UI'ı, kart taşıma/approve).
> - **Faz 3 — TAMAM (çekirdek):** iki yönlü Asana senkronu canlı ve gerçek
>   proje üzerinde doğrulandı. Edge: `_shared/ingest.ts` (webhook + manuel
>   sync ortak görev işleme); asana-proxy yeni aksiyonlar — `sync-project`
>   (bağlı projenin görevlerini deliverables'a çeker; canlı test: gerçek
>   projedeki 3 görev 3/3 alındı), `set-approval` ("Approval Status"
>   custom field'ı varsa yazar, yoksa görev yorumu; yerel satırı da
>   günceller — canlı test OK), `move-stage` (eşleşen Asana section'ına
>   taşır, yoksa yorum fallback — canlı test OK). UI: Kanban
>   Approve/Revision/İlerlet (→) butonları + gerçek Force Sync + Asana
>   derin link + "Webhook Live / + Connect Webhook" göstergesi; Directory
>   playlist_add gerçek create-task + deliverable kaydı (başarı/hata
>   notu çipi); Dashboard "Batch Send Digital Releases" gerçek link
>   üretim paneli (kopyalanabilir tek-kullanımlık linkler) + Ping satırı.
>   Yeni servisler: `AsanaApiService.syncProject/setApproval/moveStage`,
>   `ConsentApiService.createLink`. Bootstrap'ta yakalanan 2 hata:
>   (1) **0007**: partial unique index PostgREST `ON CONFLICT` ile
>   eşleşmiyordu → tüm inbound upsert'ler sessizce conflict yazıyordu
>   (düz unique index ile çözüldü; NULL'lar zaten ayrı sayılır);
>   (2) consent-api service client ile `can_write()` RPC'sini
>   çağıramıyor (auth.uid yok) → rol doğrulaması sonrası direkt token
>   insert. **Kalan (Faz 3B):** drag&drop kart taşıma (şimdilik →
>   butonu), Profile "Assign/Approve Concept" butonları, webhook
>   canlı teslim testi (buton kurulurken), 429 exponential backoff.
> - **Sıradaki:** Faz 3B kalıntıları veya Faz 4 (platform OAuth
>   başvuruları — kritik yol: Meta app + TikTok app + Google OAuth).

| Faz | İçerik | Kabul kriterleri | Tahmini bağımlılık |
|-----|--------|------------------|--------------------|
| **0 — Bağlantı** | Supabase projesi aç, gerçek URL+anon key, migrations+seed uygula, ilk admin kaydı (manual), `ASANA_ACCESS_TOKEN` secret'ı, integration-bot Asana hesabı | `supabase db push` temiz; login gerçek auth ile; Kanban force-sync gerçek task'leri çekiyor | Supabase hesabı, Asana workspace admin |
| **1 — Düzeltmeler** | §4.1'deki 8 hata + migration 0004 (§4.2: platform_connections, metric_snapshots, audit_log, metric_sync_runs, yeni kolonlar, storage bucket, metric_source enum) + `database.types.ts` yeniden üretim | Consent portal gerçek token ile context gösteriyor; webhook imzasız POST reddediyor; typecheck + build yeşil | — |
| **2 — UI data swap** | §4.4: 6 ekran gerçek sorgulara bağlanır (demoMode fallback korunur); mock veri `*.demo.ts`'e taşınır; provenance rozetleri; uuid id sistemine geçiş + seed'i UI roster'ına hizala; profil 404 durumu; consent hata durumları; Add Influencer gerçek insert | Ekranlardaki her sayı ya DB'den ya rozetli mock'tan geliyor; yeni kayıt kalıcı ve profil sayfası doğru açılıyor | Faz 1 |
| **3 — Asana canlı** | §5.3: sync servisleri UI'a; Kanban approve/revision/taşıma outbound; telemetry+ticker gerçek; consent link üretim UI'ı; Force Sync gerçek; webhook heartbeat izleme | İki yönlü senkron canlı: Asana'da stage taşıma → Kanban anında; Kanban'da approve → Asana custom field güncel; sync log ticker akıyor | Faz 0 (PAT), Faz 2 |
| **4 — Platform OAuth** | **Kritik yol önce başvurular:** Meta app + App Review, Google OAuth consent, TikTok app + iki aşamalı audit (paralel, haftalar sürebilir). Sonra: `platform-connect` + `metrics-ingest` edge function'ları, consent→bağlantı UX'i, snapshot birikimi, SC beyan formu | Onaylı creator'ın IG/YT/TT metrikleri günlük otomatik güncelliyor; source rozetleri doğru; IG trendi snapshot'lardan çiziliyor | Faz 1 (schema), platform onayları |
| **5 — AI audit (ayrı karar)** | `safety-audit` edge function (LLM seçimi ayrıca), `/audit` ekranı, dashboard risk radar gerçek veri | Audit, meşru girdiden (consent'li API + YouTube public yorumlar + er taraması) üretilebiliyor; skor `safety_audits`'e yazılıyor | Faz 4 (girdi verisi), LLM kararı |

Önerilen sıra: 0 → 1 → 2 → 3 (platform başvuruları 1'de paralel başlar —
review süreleri Faz 4'ü bekletmesin).

---

## 8. Risk kaydı

| # | Risk | Olasılık | Etki | Önlem |
|---|------|----------|------|-------|
| R1 | Meta/TikTok app review gecikmesi veya reddi | Orta-Yüksek | Faz 4 gecikir | Başvuruları Faz 1'de paralel başlat; ret senaryosunda beyan/manual moduna düş; YouTube'dan başla |
| R2 | `user.info.stats` scope reddi (TikTok) | Orta | TikTok follower verisi api yerine beyan olur | Gerekçeyi "creator self-service analytics paylaşımı" çerçevesinde yaz; basic scope'la + beyanla yaşam planı |
| R3 | Snapchat verisi süresiz beyan/manual | Kesin | SC kolonu seyrek kalır | Beyan formu + "Connect" CTA UX'i; periodik yenileme hatırlatıcısı (`declared_at` yaşı > 30 gün → stale rozeti) |
| R4 | IG insights 30 gün penceresi | Kesin | Trend geçmişi kaybolur | Günlük metric_snapshots; ilk bağlantıda geçmiş backfill yapılamaz — UI'da "trend X tarihinden itibaren" notu |
| R5 | PAT sahibi kullanıcının ayrılması → webhook ölümü | Düşük-Orta | Inbound sync durur | Bot hesap + PAT; heartbeat `last_success_at` izleme + 8s+ gecikmede uyarı; fallback polling |
| R6 | Webhook HMAC'siz endpoint istismarı (mevcut açık) | — | Veri bütünlüğü | Faz 1'de kapat (hata #3); o ana kadar public URL'i gizli tut |
| R7 | Consent-first discovery zayıf görünür (boş metrikler) | Kesin | UX | Provenance rozetleri + "Connect" CTA + beyan formu; dashboard'ta bağlantı kapsamı metriği |
| R8 | Token sızıntısı (consent-api list) | Düşük | Güvenlik | Faz 1'de maskeleme (hata #5) |
| R9 | Roster id ayrışması migration'da kırılır | Orta | Faz 2 gecikir | Tek yönlü plan: UI uuid'ye taşınır; seed yeniden yazılır; demoMode fallback sigortası |
| R10 | Rate limit (Asana 429, BUC, TikTok 600/dk) | Düşük | Sync gecikmesi | `asana-proxy` backoff; metrics-ingest'te platform bazlı token bucket + `metric_sync_runs` gözlemlenebilirlik |

---

## 9. Kaynakça

Platform ve entegrasyon araştırmasının temel kaynakları (Eylül 2026 itibarıyla):

**Asana**
- Asana Developers — genel bakış ve kimlik doğrulama: https://developers.asana.com/docs/overview
- Webhook rehberi (handshake, X-Hook-Signature HMAC, heartbeat, filtreler, limitler): https://developers.asana.com/docs/webhooks-guide
- Rate limitler (1500 req/dk paid, search 60/dk): https://developers.asana.com/docs/rate-limits
- Personal Access Tokens (deprecasyon yok): https://developers.asana.com/docs/personal-access-token

**Instagram / Meta**
- Basic Display API kapanış duyurusu (4 Aralık 2024): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
- Instagram API with Instagram Login (migration hedefi): https://developers.facebook.com/docs/instagram-platform
- Instagram Account Insights (sahip metrikleri): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/instagram-account-insights
- Business Discovery (consent'siz keşif sınırı — stratejide kullanılmıyor): https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery

**YouTube / Google**
- Data API v3 kota hesaplayıcı (10.000 unit/gün; list uçları 1 unit): https://developers.google.com/youtube/v3/determine_quota_cost
- Channels / Videos statistics uçları: https://developers.google.com/youtube/v3/docs/channels/list
- YouTube Analytics API (watch time, retention, demographics — sahip): https://developers.google.com/youtube/analytics

**TikTok**
- Display API / user.info alanları ve scope'lar: https://developers.tiktok.com/doc/display-api-overview
- Scope'lar genel bakış (`user.info.stats`): https://developers.tiktok.com/doc/scopes-overview
- Research API erişim koşulları (yalnız akademik): https://developers.tiktok.com/doc/research-api-tos

**Snapchat**
- Snap for Developers — Creator Discovery (partner + creator opt-in şartı): https://developers.snap.com/marketing-api/Public-Profile-API/CreatorDiscovery
- Snapchat Marketing API SSS (işletme hesabı + şartlar): https://businesshelp.snapchat.com/s/article/api-faq
- Creator in-app Insights: https://help.snapchat.com/hc/en-us/articles/10173706850707

**3. parti alternatifler (kayıtlı, karar ayrıca)**
- Modash API (~$99-120/ay, IG/TT/YT): https://www.modash.io
- HypeAuditor (~$299+/ay, audience quality): https://hypeauditor.com
