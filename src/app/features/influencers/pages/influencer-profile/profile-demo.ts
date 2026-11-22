/**
 * Design-flight dossiers for the Profile screen (offline / demoMode
 * fallback), keyed by roster slug. The live path maps a Supabase
 * `influencers` uuid bundle onto the same ProfileData shape.
 */

export interface PlatformTelemetry {
  name: string;
  icon: string;
  /** Brand logo key (icon kept for fallback reference). */
  brand: 'instagram' | 'tiktok' | 'youtube' | 'snapchat';
  iconWrap: string;
  followerLabel: string;
  followers: string;
  /** Metric provenance badge — API / Declared / Manual (consent-first). */
  source?: string | null;
  /** Growth chip above the right metric (IG/TT); null for YT/SC. */
  delta: string | null;
  /** Small right-column caption (YT sentiment / SC swipe-up). */
  rightCaption: string | null;
  rightCaptionIcon: string | null;
  /** Primary right-column metric (e.g. "5.2% ER"). */
  rightMain: string;
  /** Compact meta shown in the hero channel dock (e.g. "5.2% ER"). */
  dockMeta: string;
  spark: string;
  sparkColor: string;
  stat1: { label: string; value: string; valueClass: string };
  stat2: { label: string; value: string; valueClass: string };
}

export interface ProfileData {
  name: string;
  handle: string;
  image: string;
  location: string;
  timezone: string;
  agentEmail: string;
  baseRate: string;
  deals: string;
  assignedCampaign: string | null;
  tags: string[];
  platforms: PlatformTelemetry[];
  auditScore: string;
  auditDesc: string;
  /** Internal note from the registering agent (live data). */
  notes?: string | null;
  task: { asn: string; title: string; stage: string; due: string; assignee: string };
  campaigns: string[];
}

/* Sparkline polylines per channel (viewBox 0 0 100 24). */
export const SPARKS = {
  ig: '0,18 15,14 30,16 45,9 60,11 75,4 90,6 100,2',
  tt: '0,20 18,12 35,15 50,7 68,9 82,3 100,1',
  yt: '0,15 20,13 40,11 55,14 70,8 85,9 100,5',
  sc: '0,10 25,18 45,6 65,12 80,10 100,4',
};

/** Builds the 4-channel telemetry grid from compact roster facts. */
export function platforms(
  ig: [string, string],
  tt: [string, string],
  yt: [string, string],
  sc: [string, string],
  storyReach: string,
  retention: string,
  avgViews: string,
  viral: string,
  shortsReach: string,
): PlatformTelemetry[] {
  return [
    {
      name: 'Instagram 9:16',
      brand: 'instagram',
      icon: 'photo_camera',
      iconWrap: 'text-primary',
      followerLabel: 'Total Followers',
      followers: ig[0],
      delta: '+0.8%',
      rightCaption: null,
      rightCaptionIcon: null,
      rightMain: `${ig[1]} ER`,
      dockMeta: `${ig[1]} ER`,
      spark: SPARKS.ig,
      sparkColor: 'text-primary',
      stat1: { label: 'Avg Story Reach', value: storyReach, valueClass: 'text-on-surface' },
      stat2: { label: 'Reel Retention', value: retention, valueClass: 'text-tertiary' },
    },
    {
      name: 'TikTok Vertical',
      brand: 'tiktok',
      icon: 'play_arrow',
      iconWrap: 'text-tertiary',
      followerLabel: 'Followers',
      followers: tt[0],
      delta: '+3.4%',
      rightCaption: null,
      rightCaptionIcon: null,
      rightMain: `${tt[1]} ER`,
      dockMeta: `${tt[1]} ER`,
      spark: SPARKS.tt,
      sparkColor: 'text-tertiary',
      stat1: { label: 'Avg Video Views', value: avgViews, valueClass: 'text-on-surface' },
      stat2: { label: 'Viral Index', value: viral, valueClass: 'text-primary' },
    },
    {
      name: 'YouTube Hub',
      brand: 'youtube',
      icon: 'smart_display',
      iconWrap: 'text-error',
      followerLabel: 'Subscribers',
      followers: yt[0],
      delta: null,
      rightCaption: 'Sentiment',
      rightCaptionIcon: null,
      rightMain: '89% Pos',
      dockMeta: yt[1],
      spark: SPARKS.yt,
      sparkColor: 'text-secondary',
      stat1: { label: 'Shorts Reach', value: yt[1], valueClass: 'text-on-surface' },
      stat2: { label: 'Avg Watch Time', value: '14m 20s', valueClass: 'text-on-surface' },
    },
    {
      name: 'Snapchat Spotlight',
      brand: 'snapchat',
      icon: 'bolt',
      iconWrap: 'text-primary',
      followerLabel: 'Followers',
      followers: sc[0],
      delta: null,
      rightCaption: 'Swipe Up',
      rightCaptionIcon: 'ads_click',
      rightMain: '4.2%',
      dockMeta: sc[1],
      spark: SPARKS.sc,
      sparkColor: 'text-outline',
      stat1: { label: '24h Story Views', value: shortsReach, valueClass: 'text-on-surface' },
      stat2: { label: 'Decay Velocity', value: 'High / Fast', valueClass: 'text-primary' },
    },
  ];
}

export const AUDIT_DESC =
  'No regulatory inquiries · clean disclosure record across 1,840+ indexed posts.';

export const PROFILES: Record<string, ProfileData> = {
  'maya-chen': {
    name: 'Maya Chen',
    handle: '@maya.lifestyle',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ3o8kIxeu3Lm-VTOsFRZ3p29FdVdqzQa1rzIFjwT0MxRHrS47uj0-iWPXXflr5FZH_1kC7dEfpMkm8KCz1gT9ipyA50SPMJ-6SZ1WX9PXBTrYyo5ToYjiUukf0ZJfx27bFOsd0JWp8Y2O0Ijh6QDtwytkC6K39CoVvX5wROwpKVCwPxBI0jugYa6usO3vvVKNimokmgiGrbDABnkSqWsvEIS2S4lc8vbdleZ6T2l5yQX2VrxmHwJD',
    location: 'Los Angeles, CA',
    timezone: 'PST (UTC-7)',
    agentEmail: 'sarah@talentagency.co',
    baseRate: '$18,500',
    deals: '2',
    assignedCampaign: "Sephora Glow '25",
    tags: ['Beauty & Skincare', 'Clean Aesthetics', 'Gen-Z Reach (78%)'],
    platforms: platforms(
      ['1.4M', '5.2%'],
      ['2.8M', '8.4%'],
      ['430K', '680K'],
      ['310K', '185K'],
      '420K',
      '92%',
      '1.9M',
      '9.4 / 10',
      '185K',
    ),
    auditScore: '99.4',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-9104',
      title: 'Maya Chen • Deliverable 1: TikTok 9:16 Unboxing + IG Reel Post',
      stage: 'Creative Review',
      due: 'Oct 28, 2025',
      assignee: 'Elena Rostova',
    },
    campaigns: ["Summer Hype '25 - Multi-Platform", "Fall Glow '25", 'Winter Tech Gala'],
  },
  'kai-tanaka': {
    name: 'Kai Tanaka',
    handle: '@kai.creative',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrofQntE6jnHk2jGeeFJUR1KxnsEsClBNeyFkR4WzNwFzubq9Pbi9yGVmFbxwj8cSctAueQAFCt_IPcKGHf5PvqfHEFhCMay_YL1niM15xCN8A8sPCdo1XScWJG2BngfqBYYgqfqjL0xJtaRkRZa6Go-21xs7VG2P6PwrmA4-TFjJYtVUvCu4Ibt4gL7lxlclK1iooK2SMRegGUoTE-iBhPnuHuujwyiV7uX1BT7hRqX4UIn97j8M',
    location: 'Tokyo, JP',
    timezone: 'JST (UTC+9)',
    agentEmail: 'kenji@creativenorth.jp',
    baseRate: '$12,000',
    deals: '3',
    assignedCampaign: "Sony Alpha Lab '25",
    tags: ['Tech & AI Tools', 'Hardware Labs', 'Millennial Reach (64%)'],
    platforms: platforms(
      ['490K', '4.9%'],
      ['2.1M', '9.1%'],
      ['910K', '420K'],
      ['95K', '60K'],
      '210K',
      '88%',
      '1.4M',
      '8.7 / 10',
      '60K',
    ),
    auditScore: '98.8',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-7721',
      title: 'Kai Tanaka • Deliverable 2: Sony Alpha Lab Cinematic B-Roll Reel',
      stage: 'Contract Stage',
      due: 'Nov 04, 2025',
      assignee: 'Marcus Brody',
    },
    campaigns: ["Summer Hype '25 - Multi-Platform", 'Winter Tech Gala'],
  },
  'elena-vance': {
    name: 'Elena Vance',
    handle: '@elena.vance',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBv2VCF8zZC8cWdER3dOBBFPESBf_33tCPCYFyuqq8W52ia32HKQd-KicttvUJgOwGZqx9JVCEyuyc9Ltv8_W1xA3Vg3GiBvBvmbpezdrEBBJRjCkAB2844dOMjnmQP0BZ0wrNFA3qHjcgZ9xrAaYqXG4RBdBG6BLaynve-jQzQtUb6BLgz7_WjI0xchNL4G-vMymi4WVgENrM018MuKy5Me_NiEkg_oTOkdaDROVyl2zxf2QNCUfw9',
    location: 'Milan, IT',
    timezone: 'CET (UTC+1)',
    agentEmail: 'giulia@maisonmode.it',
    baseRate: '$21,000',
    deals: '1',
    assignedCampaign: null,
    tags: ['Fashion & Luxury', 'Haute Couture', 'Affluent Audience (71%)'],
    platforms: platforms(
      ['1.2M', '6.4%'],
      ['890K', '5.8%'],
      ['110K', '65K'],
      ['420K', '240K'],
      '520K',
      '90%',
      '610K',
      '7.2 / 10',
      '240K',
    ),
    auditScore: '99.7',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-8150',
      title: 'Elena Vance • Pitch Brief: Winter Lookbook 9:16 Series',
      stage: 'Selection',
      due: 'Nov 12, 2025',
      assignee: 'Elena Rostova',
    },
    campaigns: ["Fall Glow '25", 'Winter Tech Gala'],
  },
  'marcus-brody': {
    name: 'Marcus Brody',
    handle: '@brody.fit',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCIOt1fnwKE1Mx8kkrR0p8RMgNlii9v16yaV_EixoCcLX9F1XdK68D_MsZ50LuWgsDDhT32DNqF8AcrpnQIK1d_554lmGQthFE3s_4PpaYmcpHj0pu9KqEcJjskWQbTxtuh1QgLvdYuthQo47CO-nLYAE485U6rNGgAokV8670vHHmz-RKfNq-Gcn7rcIAcXJjI-dr0RTn8ClRULhCWSXWcB-mL8dxeo7FzXIQWaAbPK19tivZmCOvn',
    location: 'Miami, FL',
    timezone: 'EST (UTC-4)',
    agentEmail: 'dana@fitcollective.us',
    baseRate: '$15,500',
    deals: '4',
    assignedCampaign: 'Nike Summer Air',
    tags: ['Fitness & Wellness', 'Supplements', 'Gen-Z Reach (82%)'],
    platforms: platforms(
      ['650K', '4.7%'],
      ['3.4M', '11.2%'],
      ['540K', '280K'],
      ['80K', '48K'],
      '290K',
      '85%',
      '2.6M',
      '9.8 / 10',
      '48K',
    ),
    auditScore: '97.9',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-8842',
      title: 'Marcus Brody • Deliverable 1: Nike Air Max Vertical Challenger Series',
      stage: 'Creative Review',
      due: 'Oct 22, 2025',
      assignee: 'Sarah Vance',
    },
    campaigns: ["Summer Hype '25 - Multi-Platform", 'Nike Summer Air'],
  },
  'sophia-rossi': {
    name: 'Sophia Rossi',
    handle: '@rossi.culinary',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAUwLzcZ3J_BjnmquNaSErRjMqYFcmCook7YiQ5zscS9kTwIJ9cbsWT529hKU6KF6KOqZfAE87VnhewLXGu3Go55KB8PzjOkUthKm12MDN_r2WlmhHl9aNdgheSnP712otOf4RGck6CKVC7NsHOSILFTA8oY_8EdsOoyFQj3Ag_ggOknb4JObLWrgseSvvPtP3UsOkrSmt9QO0qTOzOYKg0tCMKO2BPAyU_Dibv51QUk-VBGxA0RSMq',
    location: 'Rome, IT',
    timezone: 'CET (UTC+1)',
    agentEmail: 'luca@tavolatalent.it',
    baseRate: '$13,800',
    deals: '2',
    assignedCampaign: "Nespresso Origin '25",
    tags: ['Culinary & Travel', 'Slow Living', 'Millennial Reach (69%)'],
    platforms: platforms(
      ['1.4M', '7.1%'],
      ['2.8M', '8.4%'],
      ['430K', '210K'],
      ['310K', '185K'],
      '610K',
      '91%',
      '1.9M',
      '8.9 / 10',
      '185K',
    ),
    auditScore: '99.1',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-6439',
      title: 'Sophia Rossi • Deliverable 3: Nespresso Morning Ritual Reel Stack',
      stage: 'Scheduled',
      due: 'Nov 01, 2025',
      assignee: 'Elena Rostova',
    },
    campaigns: ["Fall Glow '25", "Nespresso Origin '25"],
  },
  'devon-miller': {
    name: 'Devon Miller',
    handle: '@devon.plays',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCKVQnrObiEiqdT7NCIfc9iyZ2viz0erKxJPJEic49hG5-QWdoXL7donI2iXsFDzo4DekBIY7ypciDtjAsKA7Q-ekgJX3GaVi_kD4aVlP4977V6rTEr3I26Wj0cncOH11U-AxTaIK-KUNYd8KN-nmx3GwzXi-lADGTBKJ-xVxz5tlu9GRv9seCVnp3OnhiTzy5I4Vvs9ZCqVxCAyVAT70Nj-tCC2ciRLiryYKdcwbowR-357m1P1SFR',
    location: 'Seoul, KR',
    timezone: 'KST (UTC+9)',
    agentEmail: 'min@stormgg.kr',
    baseRate: '$9,500',
    deals: '2',
    assignedCampaign: null,
    tags: ['Gaming & Esports', 'Twitch Live', 'Gen-Z Reach (88%)'],
    platforms: platforms(
      ['310K', '3.8%'],
      ['1.9M', '8.9%'],
      ['820K', '390K'],
      ['110K', '70K'],
      '140K',
      '83%',
      '1.2M',
      '8.1 / 10',
      '70K',
    ),
    auditScore: '96.4',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-6120',
      title: 'Devon Miller • Pitch Brief: Mobile FPS Launch Blitz Collab',
      stage: 'Selection',
      due: 'Nov 18, 2025',
      assignee: 'Marcus Brody',
    },
    campaigns: ['Winter Tech Gala', 'Mobile FPS Launch'],
  },
  'chloe-dupont': {
    name: 'Chloe Dupont',
    handle: '@chloe.design',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDOkLm26-ien3YsbQBr1GYFa5dY-6vcxIYNVTSP-lf9LhvCwN4o0TeYPAjNFcnKKkHbKjoZPsjzshOdI8Ki2zkZJ3jtbITWqbFhor17139u01Sia75jF6N20g3nU_rNXunSECj1132dSY7ZhoJpqmzhX3XLguGpiYTfl7a7REovYw_bBNEX-fN0u5F1sObpB2-N4kvjv6mUCvf4FJrH6mcWG3ip-tXo-kU3WEEAOPO7E6ftUsrBsyMV',
    location: 'Paris, FR',
    timezone: 'CET (UTC+1)',
    agentEmail: 'camille@studioatelier.fr',
    baseRate: '$7,200',
    deals: '1',
    assignedCampaign: "Dyson Home '25",
    tags: ['Design & Arch', 'Minimalist', 'Affluent Audience (58%)'],
    platforms: platforms(
      ['520K', '6.8%'],
      ['780K', '7.2%'],
      ['190K', '95K'],
      ['140K', '88K'],
      '230K',
      '89%',
      '540K',
      '7.6 / 10',
      '88K',
    ),
    auditScore: '99.8',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-3312',
      title: "Chloe Dupont • Deliverable 1: Dyson V15 Studio Aesthetic Cut",
      stage: 'Creative Review',
      due: 'Oct 30, 2025',
      assignee: 'Sarah Vance',
    },
    campaigns: ["Fall Glow '25", "Dyson Home '25"],
  },
  'liam-oconnor': {
    name: "Liam O'Connor",
    handle: '@liam.explore',
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJicy-tzcl6BJhNpsGDXkLRml0NlMwT37UEmviXfbXOVcwf_Bd7fuR2MENAcsH3FO5VZz37Cr5TWtRcwwp9nKxHKJD7C3WHXJ2QLewJJiHPdgwC4r8sjf2GBniyvzeKoyWTdC7VBP3DVkQil3NGyre2TJOJZnMtk41Ve9_izdocUyO6Gj7yNUrSPxPWKR1gj8uVQOlFE-_3XbWfGAxS5IPLmj2vHGMeMCb6SnY7x4nlO_NWlJZnX6s",
    location: 'Auckland, NZ',
    timezone: 'NZST (UTC+13)',
    agentEmail: 'jess@wildcard.nz',
    baseRate: '$11,400',
    deals: '2',
    assignedCampaign: null,
    tags: ['Outdoor & POV', '4K Cinema', 'Adventure Gen-Z (74%)'],
    platforms: platforms(
      ['970K', '5.9%'],
      ['2.4M', '8.3%'],
      ['610K', '330K'],
      ['220K', '130K'],
      '430K',
      '87%',
      '1.6M',
      '8.6 / 10',
      '130K',
    ),
    auditScore: '98.4',
    auditDesc: AUDIT_DESC,
    task: {
      asn: 'ASN-5580',
      title: "Liam O'Connor • Pitch Brief: Alpine Winter Gear POV Series",
      stage: 'Selection',
      due: 'Nov 20, 2025',
      assignee: 'Elena Rostova',
    },
    campaigns: ['Winter Tech Gala', 'Alpine POV Series'],
  },
};
