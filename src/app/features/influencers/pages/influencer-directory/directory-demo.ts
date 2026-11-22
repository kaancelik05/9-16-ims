/**
 * Design-flight roster for the Directory (offline / demoMode fallback).
 * Mirrors the approved design 1:1 — the live path maps Supabase
 * `influencers` + `influencer_platform_metrics` rows onto this shape.
 */

/** Bento card shape for a rostered creator. */
export interface CreatorCard {
  id: string;
  name: string;
  handle: string;
  chip: string;
  niche: string;
  nicheTag: string;
  glow: string;
  image: string;
  metrics: {
    platform: string;
    code: string;
    followers: string;
    sub: string;
    subClass: string;
    /** Metric provenance — API / Declared / Manual (consent-first). */
    source?: string | null;
  }[];
  maxEr: number;
  reachK: number;
  assigned: boolean;
  campaign: string | null;
  asn: string | null;
  audit: string;
  /** Latest audit disposition (workflow-state filter). */
  auditFlag?: 'green' | 'red' | 'queued' | 'none';
  /** Any deliverable awaiting creative sign-off (in_review). */
  pendingSignoff?: boolean;
}

export const DEMO_CREATORS: CreatorCard[] = [
  {
    id: 'maya-chen',
    name: 'Maya Chen',
    handle: '@maya.lifestyle',
    chip: 'Beauty',
    niche: 'Beauty & Skincare',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ3o8kIxeu3Lm-VTOsFRZ3p29FdVdqzQa1rzIFjwT0MxRHrS47uj0-iWPXXflr5FZH_1kC7dEfpMkm8KCz1gT9ipyA50SPMJ-6SZ1WX9PXBTrYyo5ToYjiUukf0ZJfx27bFOsd0JWp8Y2O0Ijh6QDtwytkC6K39CoVvX5wROwpKVCwPxBI0jugYa6usO3vvVKNimokmgiGrbDABnkSqWsvEIS2S4lc8vbdleZ6T2l5yQX2VrxmHwJD',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '840K', sub: '5.2%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '1.6M', sub: '7.8%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '320K', sub: '140K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '190K', sub: 'Daily', subClass: 'text-primary font-medium' },
    ],
    maxEr: 7.8, reachK: 1600,
    assigned: true,
    campaign: "Sephora Glow '25",
    asn: 'ASN-9104',
    audit: '99.4%',
    nicheTag: 'UGC 9:16',
    glow: 'bg-primary-container/10 group-hover:bg-primary-container/20',
  },
  {
    id: 'kai-tanaka',
    name: 'Kai Tanaka',
    handle: '@kai.creative',
    chip: 'Tech & AI',
    niche: 'Tech & AI Tools',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrofQntE6jnHk2jGeeFJUR1KxnsEsClBNeyFkR4WzNwFzubq9Pbi9yGVmFbxwj8cSctAueQAFCt_IPcKGHf5PvqfHEFhCMay_YL1niM15xCN8A8sPCdo1XScWJG2BngfqBYYgqfqjL0xJtaRkRZa6Go-21xs7VG2P6PwrmA4-TFjJYtVUvCu4Ibt4gL7lxlclK1iooK2SMRegGUoTE-iBhPnuHuujwyiV7uX1BT7hRqX4UIn97j8M',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '490K', sub: '4.9%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '2.1M', sub: '9.1%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '910K', sub: '420K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '95K', sub: 'Stories', subClass: 'text-outline font-medium' },
    ],
    maxEr: 9.1, reachK: 2100,
    assigned: true,
    campaign: "Sony Alpha Lab '25",
    asn: 'ASN-7721',
    audit: '98.8%',
    nicheTag: 'Hardware Labs',
    glow: 'bg-secondary/10 group-hover:bg-secondary/20',
  },
  {
    id: 'elena-vance',
    name: 'Elena Vance',
    handle: '@elena.vance',
    chip: 'Fashion',
    niche: 'Fashion & Luxury',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBv2VCF8zZC8cWdER3dOBBFPESBf_33tCPCYFyuqq8W52ia32HKQd-KicttvUJgOwGZqx9JVCEyuyc9Ltv8_W1xA3Vg3GiBvBvmbpezdrEBBJRjCkAB2844dOMjnmQP0BZ0wrNFA3qHjcgZ9xrAaYqXG4RBdBG6BLaynve-jQzQtUb6BLgz7_WjI0xchNL4G-vMymi4WVgENrM018MuKy5Me_NiEkg_oTOkdaDROVyl2zxf2QNCUfw9',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '1.2M', sub: '6.4%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '890K', sub: '5.8%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '110K', sub: '65K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '420K', sub: 'High', subClass: 'text-primary font-medium' },
    ],
    maxEr: 6.4, reachK: 1200,
    assigned: false,
    campaign: null,
    asn: null,
    audit: '99.7%',
    nicheTag: 'Haute Couture',
    glow: 'bg-tertiary-container/10 group-hover:bg-tertiary-container/20',
  },
  {
    id: 'marcus-brody',
    name: 'Marcus Brody',
    handle: '@brody.fit',
    chip: 'Fitness',
    niche: 'Fitness & Wellness',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCIOt1fnwKE1Mx8kkrR0p8RMgNlii9v16yaV_EixoCcLX9F1XdK68D_MsZ50LuWgsDDhT32DNqF8AcrpnQIK1d_554lmGQthFE3s_4PpaYmcpHj0pu9KqEcJjskWQbTxtuh1QgLvdYuthQo47CO-nLYAE485U6rNGgAokV8670vHHmz-RKfNq-Gcn7rcIAcXJjI-dr0RTn8ClRULhCWSXWcB-mL8dxeo7FzXIQWaAbPK19tivZmCOvn',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '650K', sub: '4.7%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '3.4M', sub: '11.2%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '540K', sub: '280K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '80K', sub: 'Stories', subClass: 'text-outline font-medium' },
    ],
    maxEr: 11.2, reachK: 3400,
    assigned: true,
    campaign: 'Nike Summer Air',
    asn: 'ASN-8842',
    audit: '97.9%',
    nicheTag: 'Supplements',
    glow: 'bg-primary/10 group-hover:bg-primary/20',
  },
  {
    id: 'sophia-rossi',
    name: 'Sophia Rossi',
    handle: '@rossi.culinary',
    chip: 'Culinary',
    niche: 'Culinary',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAUwLzcZ3J_BjnmquNaSErRjMqYFcmCook7YiQ5zscS9kTwIJ9cbsWT529hKU6KF6KOqZfAE87VnhewLXGu3Go55KB8PzjOkUthKm12MDN_r2WlmhHl9aNdgheSnP712otOf4RGck6CKVC7NsHOSILFTA8oY_8EdsOoyFQj3Ag_ggOknb4JObLWrgseSvvPtP3UsOkrSmt9QO0qTOzOYKg0tCMKO2BPAyU_Dibv51QUk-VBGxA0RSMq',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '1.4M', sub: '7.1%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '2.8M', sub: '8.4%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '430K', sub: '210K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '310K', sub: 'Daily', subClass: 'text-primary font-medium' },
    ],
    maxEr: 8.4, reachK: 2800,
    assigned: true,
    campaign: "Nespresso Origin '25",
    asn: 'ASN-6439',
    audit: '99.1%',
    nicheTag: 'High Engagement',
    glow: 'bg-tertiary/10 group-hover:bg-tertiary/20',
  },
  {
    id: 'devon-miller',
    name: 'Devon Miller',
    handle: '@devon.plays',
    chip: 'Gaming',
    niche: 'Gaming & Esports',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCKVQnrObiEiqdT7NCIfc9iyZ2viz0erKxJPJEic49hG5-QWdoXL7donI2iXsFDzo4DekBIY7ypciDtjAsKA7Q-ekgJX3GaVi_kD4aVlP4977V6rTEr3I26Wj0cncOH11U-AxTaIK-KUNYd8KN-nmx3GwzXi-lADGTBKJ-xVxz5tlu9GRv9seCVnp3OnhiTzy5I4Vvs9ZCqVxCAyVAT70Nj-tCC2ciRLiryYKdcwbowR-357m1P1SFR',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '310K', sub: '3.8%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '1.9M', sub: '8.9%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '820K', sub: '390K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '110K', sub: 'Stories', subClass: 'text-outline font-medium' },
    ],
    maxEr: 8.9, reachK: 1900,
    assigned: false,
    campaign: null,
    asn: null,
    audit: '96.4%',
    nicheTag: 'Twitch Live',
    glow: 'bg-primary-container/10 group-hover:bg-primary-container/20',
  },
  {
    id: 'chloe-dupont',
    name: 'Chloe Dupont',
    handle: '@chloe.design',
    chip: 'Design',
    niche: 'Design',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDOkLm26-ien3YsbQBr1GYFa5dY-6vcxIYNVTSP-lf9LhvCwN4o0TeYPAjNFcnKKkHbKjoZPsjzshOdI8Ki2zkZJ3jtbITWqbFhor17139u01Sia75jF6N20g3nU_rNXunSECj1132dSY7ZhoJpqmzhX3XLguGpiYTfl7a7REovYw_bBNEX-fN0u5F1sObpB2-N4kvjv6mUCvf4FJrH6mcWG3ip-tXo-kU3WEEAOPO7E6ftUsrBsyMV',
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '520K', sub: '6.8%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '780K', sub: '7.2%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '190K', sub: '95K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '140K', sub: 'Stories', subClass: 'text-outline font-medium' },
    ],
    maxEr: 7.2, reachK: 780,
    assigned: true,
    campaign: "Dyson Home '25",
    asn: 'ASN-3312',
    audit: '99.8%',
    nicheTag: 'Minimalist',
    glow: 'bg-secondary/10 group-hover:bg-secondary/20',
  },
  {
    id: 'liam-oconnor',
    name: "Liam O'Connor",
    handle: '@liam.explore',
    chip: 'Outdoor',
    niche: 'Outdoor',
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJicy-tzcl6BJhNpsGDXkLRml0NlMwT37UEmviXfbXOVcwf_Bd7fuR2MENAcsH3FO5VZz37Cr5TWtRcwwp9nKxHKJD7C3WHXJ2QLewJJiHPdgwC4r8sjf2GBniyvzeKoyWTdC7VBP3DVkQil3NGyre2TJOJZnMtk41Ve9_izdocUyO6Gj7yNUrSPxPWKR1gj8uVQOlFE-_3XbWfGAxS5IPLmj2vHGMeMCb6SnY7x4nlO_NWlJZnX6s",
    metrics: [
      { platform: 'instagram', code: 'IG', followers: '970K', sub: '5.9%', subClass: 'text-tertiary font-semibold' },
      { platform: 'tiktok', code: 'TT', followers: '2.4M', sub: '8.3%', subClass: 'text-tertiary font-semibold' },
      { platform: 'youtube', code: 'YT', followers: '610K', sub: '330K', subClass: 'text-outline-variant' },
      { platform: 'snapchat', code: 'SC', followers: '220K', sub: 'Daily', subClass: 'text-primary font-medium' },
    ],
    maxEr: 8.3, reachK: 2400,
    assigned: false,
    campaign: null,
    asn: null,
    audit: '98.4%',
    nicheTag: '4K Cinema',
    glow: 'bg-primary/10 group-hover:bg-primary/20',
  },
];
