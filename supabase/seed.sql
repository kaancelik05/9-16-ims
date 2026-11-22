-- ══════════════════════════════════════════════════════════════════
-- 9-16 IMP · seed — UI roster alignment (Faz 2)
--
-- The 8 creators shown across Directory (Module 1) and Profile (Module 3)
-- with their full telemetry, the campaign set from the Add-Influencer
-- modal, Kanban deliverables, safety audits and asset metrics.
-- Deterministic UUIDs keep deep links stable across reseeds.
--
-- Metric provenance: all rows are source='declared' (creator-declared /
-- design-flight values) until platform OAuth ingestion lands (Faz 4).
-- ══════════════════════════════════════════════════════════════════

-- ── Campaigns ──────────────────────────────────────────────────────

insert into public.campaigns
  (id, name, client_name, status, budget, spend, currency, start_date, end_date, asana_project_gid)
values
  ('ca000000-0000-4000-8000-000000000001', 'Summer Hype ''25', '9-16 Media House', 'active', 450000, 342800, 'USD', '2026-06-01', '2026-09-30', null),
  ('ca000000-0000-4000-8000-000000000002', 'Nike Summer Air ''25', 'Nike', 'active', 350000, 284500, 'USD', '2026-06-15', '2026-10-15', '1218666402505911'),
  ('ca000000-0000-4000-8000-000000000003', 'Sony Alpha Lab ''25', 'Sony', 'active', 180000, 96000, 'USD', '2026-07-01', '2026-11-01', null),
  ('ca000000-0000-4000-8000-000000000004', 'Nespresso Origin ''25', 'Nespresso', 'active', 220000, 142000, 'USD', '2026-08-01', '2026-12-01', null),
  ('ca000000-0000-4000-8000-000000000005', 'Dyson Home ''25', 'Dyson', 'active', 150000, 88000, 'USD', '2026-08-15', '2026-12-15', null),
  ('ca000000-0000-4000-8000-000000000006', 'Sephora Glow ''25', 'Sephora', 'active', 260000, 176000, 'USD', '2026-07-10', '2026-11-10', null),
  ('ca000000-0000-4000-8000-000000000007', 'Fall Glow ''25', '9-16 Media House', 'draft', 200000, 0, 'USD', '2026-10-01', '2027-01-15', null);

-- ── Influencers (the UI roster) ────────────────────────────────────

insert into public.influencers
  (id, full_name, primary_handle, region, niche, category, tier, status, verified,
   agent_name, agent_contact, rate_card, timezone, tags, avatar_url, languages)
values
  ('11111111-1111-4111-8111-111111111111', 'Maya Chen', 'maya.lifestyle', 'Los Angeles, CA', 'Beauty & Skincare', 'Beauty', 'tier1_kol', 'assigned', true,
   'Sarah Kim', 'sarah@talentagency.co', 18500, 'PST (UTC-7)',
   '{"Beauty & Skincare","Clean Aesthetics","Gen-Z Reach (78%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ3o8kIxeu3Lm-VTOsFRZ3p29FdVdqzQa1rzIFjwT0MxRHrS47uj0-iWPXXflr5FZH_1kC7dEfpMkm8KCz1gT9ipyA50SPMJ-6SZ1WX9PXBTrYyo5ToYjiUukf0ZJfx27bFOsd0JWp8Y2O0Ijh6QDtwytkC6K39CoVvX5wROwpKVCwPxBI0jugYa6usO3vvVKNimokmgiGrbDABnkSqWsvEIS2S4lc8vbdleZ6T2l5yQX2VrxmHwJD',
   '{en,zh}'),
  ('22222222-2222-4222-8222-222222222222', 'Kai Tanaka', 'kai.creative', 'Tokyo, JP', 'Tech & AI Tools', 'Tech & AI', 'tier1_kol', 'assigned', true,
   'Kenji Sato', 'kenji@creativenorth.jp', 12000, 'JST (UTC+9)',
   '{"Tech & AI Tools","Hardware Labs","Millennial Reach (64%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDrofQntE6jnHk2jGeeFJUR1KxnsEsClBNeyFkR4WzNwFzubq9Pbi9yGVmFbxwj8cSctAueQAFCt_IPcKGHf5PvqfHEFhCMay_YL1niM15xCN8A8sPCdo1XScWJG2BngfqBYYgqfqjL0xJtaRkRZa6Go-21xs7VG2P6PwrmA4-TFjJYtVUvCu4Ibt4gL7lxlclK1iooK2SMRegGUoTE-iBhPnuHuujwyiV7uX1BT7hRqX4UIn97j8M',
   '{ja,en}'),
  ('33333333-3333-4333-8333-333333333333', 'Elena Vance', 'elena.vance', 'Milan, IT', 'Fashion & Luxury', 'Fashion', 'tier1_kol', 'prospect', true,
   'Giulia Ferrari', 'giulia@maisonmode.it', 21000, 'CET (UTC+1)',
   '{"Fashion & Luxury","Haute Couture","Affluent Audience (71%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBv2VCF8zZC8cWdER3dOBBFPESBf_33tCPCYFyuqq8W52ia32HKQd-KicttvUJgOwGZqx9JVCEyuyc9Ltv8_W1xA3Vg3GiBvBvmbpezdrEBBJRjCkAB2844dOMjnmQP0BZ0wrNFA3qHjcgZ9xrAaYqXG4RBdBG6BLaynve-jQzQtUb6BLgz7_WjI0xchNL4G-vMymi4WVgENrM018MuKy5Me_NiEkg_oTOkdaDROVyl2zxf2QNCUfw9',
   '{it,en}'),
  ('44444444-4444-4444-8444-444444444444', 'Marcus Brody', 'brody.fit', 'Miami, FL', 'Fitness & Wellness', 'Fitness', 'tier1_kol', 'assigned', true,
   'Dana Cruz', 'dana@fitcollective.us', 15500, 'EST (UTC-4)',
   '{"Fitness & Wellness","Supplements","Gen-Z Reach (82%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCIOt1fnwKE1Mx8kkrR0p8RMgNlii9v16yaV_EixoCcLX9F1XdK68D_MsZ50LuWgsDDhT32DNqF8AcrpnQIK1d_554lmGQthFE3s_4PpaYmcpHj0pu9KqEcJjskWQbTxtuh1QgLvdYuthQo47CO-nLYAE485U6rNGgAokV8670vHHmz-RKfNq-Gcn7rcIAcXJjI-dr0RTn8ClRULhCWSXWcB-mL8dxeo7FzXIQWaAbPK19tivZmCOvn',
   '{en,es}'),
  ('55555555-5555-4555-8555-555555555555', 'Sophia Rossi', 'rossi.culinary', 'Rome, IT', 'Culinary', 'Culinary', 'mid_tier', 'assigned', true,
   'Luca Moretti', 'luca@tavolatalent.it', 13800, 'CET (UTC+1)',
   '{"Culinary & Travel","Slow Living","Millennial Reach (69%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAUwLzcZ3J_BjnmquNaSErRjMqYFcmCook7YiQ5zscS9kTwIJ9cbsWT529hKU6KF6KOqZfAE87VnhewLXGu3Go55KB8PzjOkUthKm12MDN_r2WlmhHl9aNdgheSnP712otOf4RGck6CKVC7NsHOSILFTA8oY_8EdsOoyFQj3Ag_ggOknb4JObLWrgseSvvPtP3UsOkrSmt9QO0qTOzOYKg0tCMKO2BPAyU_Dibv51QUk-VBGxA0RSMq',
   '{it,en}'),
  ('66666666-6666-4666-8666-666666666666', 'Devon Miller', 'devon.plays', 'Seoul, KR', 'Gaming & Esports', 'Gaming', 'mid_tier', 'prospect', true,
   'Min Park', 'min@stormgg.kr', 9500, 'KST (UTC+9)',
   '{"Gaming & Esports","Twitch Live","Gen-Z Reach (88%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCKVQnrObiEiqdT7NCIfc9iyZ2viz0erKxJPJEic49hG5-QWdoXL7donI2iXsFDzo4DekBIY7ypciDtjAsKA7Q-ekgJX3GaVi_kD4aVlP4977V6rTEr3I26Wj0cncOH11U-AxTaIK-KUNYd8KN-nmx3GwzXi-lADGTBKJ-xVxz5tlu9GRv9seCVnp3OnhiTzy5I4Vvs9ZCqVxCAyVAT70Nj-tCC2ciRLiryYKdcwbowR-357m1P1SFR',
   '{ko,en}'),
  ('77777777-7777-4777-8777-777777777777', 'Chloe Dupont', 'chloe.design', 'Paris, FR', 'Design', 'Design', 'nano', 'assigned', true,
   'Camille Laurent', 'camille@studioatelier.fr', 7200, 'CET (UTC+1)',
   '{"Design & Arch","Minimalist","Affluent Audience (58%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDOkLm26-ien3YsbQBr1GYFa5dY-6vcxIYNVTSP-lf9LhvCwN4o0TeYPAjNFcnKKkHbKjoZPsjzshOdI8Ki2zkZJ3jtbITWqbFhor17139u01Sia75jF6N20g3nU_rNXunSECj1132dSY7ZhoJpqmzhX3XLguGpiYTfl7a7REovYw_bBNEX-fN0u5F1sObpB2-N4kvjv6mUCvf4FJrH6mcWG3ip-tXo-kU3WEEAOPO7E6ftUsrBsyMV',
   '{fr,en}'),
  ('88888888-8888-4888-8888-888888888888', 'Liam O''Connor', 'liam.explore', 'Auckland, NZ', 'Outdoor', 'Outdoor', 'mid_tier', 'prospect', true,
   'Jess Walker', 'jess@wildcard.nz', 11400, 'NZST (UTC+13)',
   '{"Outdoor & POV","4K Cinema","Adventure Gen-Z (74%)"}',
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAJicy-tzcl6BJhNpsGDXkLRml0NlMwT37UEmviXfbXOVcwf_Bd7fuR2MENAcsH3FO5VZz37Cr5TWtRcwwp9nKxHKJD7C3WHXJ2QLewJJiHPdgwC4r8sjf2GBniyvzeKoyWTdC7VBP3DVkQil3NGyre2TJOJZnMtk41Ve9_izdocUyO6Gj7yNUrSPxPWKR1gj8uVQOlFE-_3XbWfGAxS5IPLmj2vHGMeMCb6SnY7x4nlO_NWlJZnX6s',
   '{en,mi}');

-- ── Cross-platform telemetry (creator-declared until Faz 4 ingestion) ──

insert into public.influencer_platform_metrics
  (influencer_id, platform, handle, followers, engagement_rate, avg_views, viral_index, story_reach, reel_retention, source, declared_at)
values
  -- Maya Chen
  ('11111111-1111-4111-8111-111111111111', 'instagram', 'maya.lifestyle', 1400000, 5.2, null, null, 420000, 92.0, 'declared', now() - interval '3 days'),
  ('11111111-1111-4111-8111-111111111111', 'tiktok',    'maya.lifestyle', 2800000, 8.4, 1900000, 9.4, null, null, 'declared', now() - interval '3 days'),
  ('11111111-1111-4111-8111-111111111111', 'youtube',   'maya.lifestyle', 430000, 0, 680000, null, null, null, 'declared', now() - interval '3 days'),
  ('11111111-1111-4111-8111-111111111111', 'snapchat',  'maya.lifestyle', 310000, 0, null, null, 185000, null, 'declared', now() - interval '3 days'),
  -- Kai Tanaka
  ('22222222-2222-4222-8222-222222222222', 'instagram', 'kai.creative', 490000, 4.9, null, null, 210000, 88.0, 'declared', now() - interval '4 days'),
  ('22222222-2222-4222-8222-222222222222', 'tiktok',    'kai.creative', 2100000, 9.1, 1400000, 8.7, null, null, 'declared', now() - interval '4 days'),
  ('22222222-2222-4222-8222-222222222222', 'youtube',   'kai.creative', 910000, 0, 420000, null, null, null, 'declared', now() - interval '4 days'),
  ('22222222-2222-4222-8222-222222222222', 'snapchat',  'kai.creative', 95000, 0, null, null, 60000, null, 'declared', now() - interval '4 days'),
  -- Elena Vance
  ('33333333-3333-4333-8333-333333333333', 'instagram', 'elena.vance', 1200000, 6.4, null, null, 520000, 90.0, 'declared', now() - interval '6 days'),
  ('33333333-3333-4333-8333-333333333333', 'tiktok',    'elena.vance', 890000, 5.8, 610000, 7.2, null, null, 'declared', now() - interval '6 days'),
  ('33333333-3333-4333-8333-333333333333', 'youtube',   'elena.vance', 110000, 0, 65000, null, null, null, 'declared', now() - interval '6 days'),
  ('33333333-3333-4333-8333-333333333333', 'snapchat',  'elena.vance', 420000, 0, null, null, 240000, null, 'declared', now() - interval '6 days'),
  -- Marcus Brody
  ('44444444-4444-4444-8444-444444444444', 'instagram', 'brody.fit', 650000, 4.7, null, null, 290000, 85.0, 'declared', now() - interval '2 days'),
  ('44444444-4444-4444-8444-444444444444', 'tiktok',    'brody.fit', 3400000, 11.2, 2600000, 9.8, null, null, 'declared', now() - interval '2 days'),
  ('44444444-4444-4444-8444-444444444444', 'youtube',   'brody.fit', 540000, 0, 280000, null, null, null, 'declared', now() - interval '2 days'),
  ('44444444-4444-4444-8444-444444444444', 'snapchat',  'brody.fit', 80000, 0, null, null, 48000, null, 'declared', now() - interval '2 days'),
  -- Sophia Rossi
  ('55555555-5555-4555-8555-555555555555', 'instagram', 'rossi.culinary', 1400000, 7.1, null, null, 610000, 91.0, 'declared', now() - interval '5 days'),
  ('55555555-5555-4555-8555-555555555555', 'tiktok',    'rossi.culinary', 2800000, 8.4, 1900000, 8.9, null, null, 'declared', now() - interval '5 days'),
  ('55555555-5555-4555-8555-555555555555', 'youtube',   'rossi.culinary', 430000, 0, 210000, null, null, null, 'declared', now() - interval '5 days'),
  ('55555555-5555-4555-8555-555555555555', 'snapchat',  'rossi.culinary', 310000, 0, null, null, 185000, null, 'declared', now() - interval '5 days'),
  -- Devon Miller
  ('66666666-6666-4666-8666-666666666666', 'instagram', 'devon.plays', 310000, 3.8, null, null, 140000, 83.0, 'declared', now() - interval '7 days'),
  ('66666666-6666-4666-8666-666666666666', 'tiktok',    'devon.plays', 1900000, 8.9, 1200000, 8.1, null, null, 'declared', now() - interval '7 days'),
  ('66666666-6666-4666-8666-666666666666', 'youtube',   'devon.plays', 820000, 0, 390000, null, null, null, 'declared', now() - interval '7 days'),
  ('66666666-6666-4666-8666-666666666666', 'snapchat',  'devon.plays', 110000, 0, null, null, 70000, null, 'declared', now() - interval '7 days'),
  -- Chloe Dupont
  ('77777777-7777-4777-8777-777777777777', 'instagram', 'chloe.design', 520000, 6.8, null, null, 230000, 89.0, 'declared', now() - interval '1 day'),
  ('77777777-7777-4777-8777-777777777777', 'tiktok',    'chloe.design', 780000, 7.2, 540000, 7.6, null, null, 'declared', now() - interval '1 day'),
  ('77777777-7777-4777-8777-777777777777', 'youtube',   'chloe.design', 190000, 0, 95000, null, null, null, 'declared', now() - interval '1 day'),
  ('77777777-7777-4777-8777-777777777777', 'snapchat',  'chloe.design', 140000, 0, null, null, 88000, null, 'declared', now() - interval '1 day'),
  -- Liam O'Connor
  ('88888888-8888-4888-8888-888888888888', 'instagram', 'liam.explore', 970000, 5.9, null, null, 430000, 87.0, 'declared', now() - interval '8 days'),
  ('88888888-8888-4888-8888-888888888888', 'tiktok',    'liam.explore', 2400000, 8.3, 1600000, 8.6, null, null, 'declared', now() - interval '8 days'),
  ('88888888-8888-4888-8888-888888888888', 'youtube',   'liam.explore', 610000, 0, 330000, null, null, null, 'declared', now() - interval '8 days'),
  ('88888888-8888-4888-8888-888888888888', 'snapchat',  'liam.explore', 220000, 0, null, null, 130000, null, 'declared', now() - interval '8 days');

-- ── Safety audits (design-flight scores) ───────────────────────────

insert into public.safety_audits
  (influencer_id, status, score, sentiment_positive, sentiment_neutral, sentiment_negative,
   ftc_compliant, toxicity_score, mentions_scanned, months_covered, completed_at)
values
  ('11111111-1111-4111-8111-111111111111', 'green_flag', 99.4, 74.2, 21.5, 4.3, true, 0.2, 120412, 36, now() - interval '9 days'),
  ('22222222-2222-4222-8222-222222222222', 'green_flag', 98.8, 71.8, 22.9, 5.3, true, 0.4, 98340, 36, now() - interval '11 days'),
  ('33333333-3333-4333-8333-333333333333', 'green_flag', 99.7, 76.5, 19.8, 3.7, true, 0.1, 142205, 36, now() - interval '6 days'),
  ('44444444-4444-4444-8444-444444444444', 'green_flag', 97.9, 69.4, 24.1, 6.5, true, 0.6, 187330, 36, now() - interval '4 days'),
  ('55555555-5555-4555-8555-555555555555', 'green_flag', 99.1, 73.0, 21.2, 5.8, true, 0.3, 105877, 36, now() - interval '8 days'),
  ('66666666-6666-4666-8666-666666666666', 'green_flag', 96.4, 66.2, 26.8, 7.0, true, 0.8, 210450, 36, now() - interval '13 days'),
  ('77777777-7777-4777-8777-777777777777', 'green_flag', 99.8, 78.1, 18.4, 3.5, true, 0.1, 87610, 36, now() - interval '2 days'),
  ('88888888-8888-4888-8888-888888888888', 'green_flag', 98.4, 72.6, 21.0, 6.4, true, 0.4, 133980, 36, now() - interval '10 days');

-- ── Deliverables (Kanban + profile pipeline) ───────────────────────

insert into public.deliverables
  (campaign_id, influencer_id, stage, title, content_format, fee, due_date, approval_status, asana_task_label, sort_order)
values
  ('ca000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'content_creation',      'Maya Chen • Deliverable 1: TikTok 9:16 Unboxing + IG Reel Post', 'TikTok 9:16', 18500, '2026-10-28', 'in_review', 'ASN-9104', 1),
  ('ca000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'briefing_contract',     'Kai Tanaka • Deliverable 2: Sony Alpha Lab Cinematic B-Roll Reel', 'IG Reels', 12000, '2026-11-04', 'pending', 'ASN-7721', 2),
  ('ca000000-0000-4000-8000-000000000007', '33333333-3333-4333-8333-333333333333', 'selection_pitching',    'Elena Vance • Pitch Brief: Winter Lookbook 9:16 Series', 'IG Reels', null, '2026-11-12', 'pending', 'ASN-8150', 3),
  ('ca000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'content_creation',      'Marcus Brody • Deliverable 1: Nike Air Max Vertical Challenger Series', 'TikTok 9:16', 15500, '2026-10-22', 'in_review', 'ASN-8842', 4),
  ('ca000000-0000-4000-8000-000000000004', '55555555-5555-4555-8555-555555555555', 'scheduled_live',        'Sophia Rossi • Deliverable 3: Nespresso Morning Ritual Reel Stack', 'IG Stories', 13800, '2026-11-01', 'approved', 'ASN-6439', 5),
  ('ca000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', 'selection_pitching',    'Devon Miller • Pitch Brief: Mobile FPS Launch Blitz Collab', 'YouTube Shorts', null, '2026-11-18', 'pending', 'ASN-6120', 6),
  ('ca000000-0000-4000-8000-000000000005', '77777777-7777-4777-8777-777777777777', 'content_creation',      'Chloe Dupont • Deliverable 1: Dyson V15 Studio Aesthetic Cut', 'IG Reels', 7200, '2026-10-30', 'in_review', 'ASN-3312', 7),
  ('ca000000-0000-4000-8000-000000000007', '88888888-8888-4888-8888-888888888888', 'selection_pitching',    'Liam O''Connor • Pitch Brief: Alpine Winter Gear POV Series', 'TikTok 9:16', null, '2026-11-20', 'pending', 'ASN-5580', 8),
  ('ca000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'performance_reporting', 'Maya Chen • Performance Wrap: Sephora Glow Q4 Report', 'IG Stories', null, '2026-12-05', 'approved', 'ASN-9140', 9),
  ('ca000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'performance_reporting', 'Marcus Brody • Performance Wrap: Nike Air Max Flight Report', 'TikTok 9:16', null, '2026-12-01', 'approved', 'ASN-8871', 10);

-- ── Asset metrics (live/scheduled deliverables — declared values) ──

insert into public.asset_metrics
  (deliverable_id, platform, reach, impressions, views, likes, comments, shares, swipe_ups, saves, vcr, sentiment_pct, cpe, emv, source, captured_at)
select d.id, 'instagram', 3840000, 5620000, 5210000, 318400, 14620, 41800, 22400, 62400, 74.2, 92.0, 0.0214, 214300.00, 'declared', now() - interval '36 hours'
from public.deliverables d where d.asana_task_label = 'ASN-6439';

insert into public.asset_metrics
  (deliverable_id, platform, reach, impressions, views, likes, comments, shares, swipe_ups, saves, vcr, sentiment_pct, cpe, emv, source, captured_at)
select d.id, 'tiktok', 4128000, 6240000, 5980000, 486200, 31240, 88700, 0, 94300, 68.9, 89.0, 0.0182, 289400.00, 'declared', now() - interval '12 hours'
from public.deliverables d where d.asana_task_label = 'ASN-9104';

insert into public.asset_metrics
  (deliverable_id, platform, reach, impressions, views, likes, comments, shares, swipe_ups, saves, vcr, sentiment_pct, cpe, emv, source, captured_at)
select d.id, 'youtube', 1240000, 1890000, 1760000, 96400, 4820, 12400, 0, 21800, 61.4, 88.0, 0.0291, 96400.00, 'declared', now() - interval '2 days'
from public.deliverables d where d.asana_task_label = 'ASN-8842';

insert into public.asset_metrics
  (deliverable_id, platform, reach, impressions, views, likes, comments, shares, swipe_ups, saves, vcr, sentiment_pct, cpe, emv, source, captured_at)
select d.id, 'tiktok', 2870000, 4310000, 3980000, 341000, 22900, 74200, 0, 68900, 72.6, 94.0, 0.0163, 198700.00, 'declared', now() - interval '4 days'
from public.deliverables d where d.asana_task_label = 'ASN-3312';

-- ── Asana connection & sync ledger (demo telemetry) ────────────────

insert into public.asana_connections
  (workspace_gid, project_gid, project_name, status, last_sync_at)
values
  ('1218680723828207', '1218666402505911', 'Nike Summer Air ''25', 'connected', now() - interval '42 seconds');

insert into public.asana_sync_log
  (direction, entity_type, entity_id, event, status, latency_ms, message)
values
  ('inbound',  'deliverable', 'ASN-9104', 'task.stage_changed',   'success', 214, 'Asana → IMP: Maya Chen Deliverable 1 moved to Creative Review'),
  ('outbound', 'deliverable', 'ASN-6439', 'update-task',          'success', 342, 'IMP → Asana: approval_status set to Approved'),
  ('inbound',  'deliverable', 'ASN-8842', 'task.changed',         'success', 198, 'Asana → IMP: custom field Deliverable Fee updated'),
  ('outbound', 'comment',     'ASN-7721', 'add-comment',          'success', 276, 'IMP → Asana: contract notes attached'),
  ('inbound',  'deliverable', 'ASN-5580', 'task.added',           'success', 305, 'Asana → IMP: new pitch task created from board');
