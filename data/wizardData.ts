export type Vibe = 'beach' | 'adventure' | 'city' | 'food' | 'party';

export type VibeOption = {
  id: Vibe;
  label: string;
  icon: string;
};

export type VibeTip = {
  icon: string;
  text: string;
};

export type PacingAdvice = {
  headline: string;
  body: string;
  callout?: string;
};

export const VIBES: VibeOption[] = [
  { id: 'beach',     label: 'Relaxing / Beach',     icon: 'sunny-outline' },
  { id: 'adventure', label: 'Adventure / Outdoors', icon: 'trail-sign-outline' },
  { id: 'city',      label: 'City / Culture',       icon: 'business-outline' },
  { id: 'food',      label: 'Food-focused',          icon: 'restaurant-outline' },
  { id: 'party',     label: 'Party / Nightlife',    icon: 'musical-notes-outline' },
];

export const VIBE_TIPS: Record<Vibe, VibeTip[]> = {
  beach: [
    { icon: 'calendar-outline', text: 'Book beach accommodation 3+ months ahead in peak season. Prices double and rooms disappear fast.' },
    { icon: 'water-outline', text: 'Check monsoon calendars before booking — SE Asian beaches are borderline unusable June–October.' },
    { icon: 'shield-checkmark-outline', text: 'Pack reef-safe sunscreen. Many marine areas now confiscate traditional SPF on entry.' },
  ],
  adventure: [
    { icon: 'medical-outline', text: 'Book vaccinations 6–8 weeks before departure. Yellow fever, typhoid, and hep A are common for adventure routes.' },
    { icon: 'document-text-outline', text: 'Get travel insurance that explicitly covers adventure activities — most standard policies exclude trekking and bungee.' },
    { icon: 'cloud-download-outline', text: 'Download offline maps (Maps.me or AllTrails) before going remote. Signal is often non-existent on trail.' },
  ],
  city: [
    { icon: 'train-outline', text: 'Buy multi-day transit passes on arrival. They usually pay for themselves by day 2.' },
    { icon: 'restaurant-outline', text: 'Walk one block off the main tourist drag: prices drop by half, quality goes up.' },
    { icon: 'map-outline', text: 'Group activities by neighbourhood — walk each area rather than criss-crossing the city all day.' },
  ],
  food: [
    { icon: 'time-outline', text: 'Eat at odd hours: 11am or 3pm, not peak tourist times. Lunch is frequently cheaper and better than dinner.' },
    { icon: 'people-outline', text: 'Take a food tour on day 1 — you\'ll find places worth returning to for the rest of the week.' },
    { icon: 'wallet-outline', text: 'Budget for one splurge meal. Food trips always have a non-negotiable worth saving for.' },
  ],
  party: [
    { icon: 'moon-outline', text: 'Peak club hours rarely start before midnight. Rest until 10–11pm or you\'ll be exhausted before anything good happens.' },
    { icon: 'cash-outline', text: 'Bring more cash than you expect for covers, tips, and drinks. Card readers are slow in high-energy venues.' },
    { icon: 'bed-outline', text: 'Book a room with blackout curtains, or far from the noise. You need real sleep between nights out.' },
  ],
};

export const TRANSPORT_OPTIONS = ['Plane', 'Car', 'Train', 'Other'] as const;
export type Transport = (typeof TRANSPORT_OPTIONS)[number];

export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function getPacingAdvice(
  pace: 'packed' | 'balanced' | 'relaxed',
  days: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): PacingAdvice {
  const maxPerDay = pace === 'packed' ? 3 : pace === 'balanced' ? 2 : 1;
  const total     = maxPerDay * days;

  if (pace === 'packed') {
    if (days <= 3) {
      return {
        headline: t('wizard.pacing.packed_short_headline', { count: days, total, days }),
        body:     t('wizard.pacing.packed_short_body', { days, maxPerDay }),
      };
    }
    if (days <= 7) {
      const buffer = Math.ceil(days * 0.55);
      return {
        headline: t('wizard.pacing.packed_mid_headline', { total, buffer }),
        body:     t('wizard.pacing.packed_mid_body', { buffer, days }),
        callout:  t('wizard.pacing.packed_mid_callout', { buffer }),
      };
    }
    return {
      headline: t('wizard.pacing.packed_long_headline', { total }),
      body:     t('wizard.pacing.packed_long_body', { maxPerDay }),
      callout:  t('wizard.pacing.packed_long_callout'),
    };
  }

  if (pace === 'balanced') {
    if (days <= 3) {
      return {
        headline: t('wizard.pacing.balanced_short_headline', { count: days, total, days }),
        body:     t('wizard.pacing.balanced_short_body', { total }),
      };
    }
    if (days <= 7) {
      const restDay = Math.min(4, Math.ceil(days / 2));
      return {
        headline: t('wizard.pacing.balanced_mid_headline', { total, restDay }),
        body:     t('wizard.pacing.balanced_mid_body', { maxPerDay, restDay, days }),
        callout:  t('wizard.pacing.balanced_mid_callout', { restDay }),
      };
    }
    const r1 = Math.ceil(days * 0.4);
    const r2 = Math.ceil(days * 0.75);
    return {
      headline: t('wizard.pacing.balanced_long_headline', { approxTotal: Math.round(total * 0.85), r1, r2 }),
      body:     t('wizard.pacing.balanced_long_body', { days, maxPerDay, r1, r2 }),
      callout:  t('wizard.pacing.balanced_long_callout', { r1, r2 }),
    };
  }

  // relaxed
  if (days <= 3) {
    return {
      headline: t('wizard.pacing.relaxed_short_headline', { count: days, total, days }),
      body:     t('wizard.pacing.relaxed_short_body'),
    };
  }
  if (days <= 7) {
    return {
      headline: t('wizard.pacing.relaxed_mid_headline', { total }),
      body:     t('wizard.pacing.relaxed_mid_body', { days }),
      callout:  t('wizard.pacing.relaxed_mid_callout'),
    };
  }
  return {
    headline: t('wizard.pacing.relaxed_long_headline', { total }),
    body:     t('wizard.pacing.relaxed_long_body', { days }),
    callout:  t('wizard.pacing.relaxed_long_callout'),
  };
}
