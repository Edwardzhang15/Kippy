export type PackingCategory =
  | 'Documents & Essentials'
  | 'Electronics'
  | 'Toiletries'
  | 'Clothing'
  | 'Comfort & Sleep'
  | 'Health & Safety';

export type Vibe = 'beach' | 'adventure' | 'city' | 'food' | 'party';

type RuleItem = { label: string; category: PackingCategory; labelKey: string };

const BASE: RuleItem[] = [
  // Documents & Essentials
  { label: 'Passport / ID',                category: 'Documents & Essentials', labelKey: 'packingList.items.passport_id' },
  { label: 'Travel insurance docs',        category: 'Documents & Essentials', labelKey: 'packingList.items.travel_insurance_docs' },
  { label: 'Copies of important documents', category: 'Documents & Essentials', labelKey: 'packingList.items.copies_of_docs' },
  { label: 'Credit / debit cards',         category: 'Documents & Essentials', labelKey: 'packingList.items.credit_debit_cards' },
  { label: 'Local currency (cash)',        category: 'Documents & Essentials', labelKey: 'packingList.items.local_currency' },
  // Electronics
  { label: 'Phone charger',                category: 'Electronics', labelKey: 'packingList.items.phone_charger' },
  { label: 'Travel adapter',               category: 'Electronics', labelKey: 'packingList.items.travel_adapter' },
  { label: 'Portable charger / power bank', category: 'Electronics', labelKey: 'packingList.items.power_bank' },
  { label: 'Headphones',                   category: 'Electronics', labelKey: 'packingList.items.headphones' },
  // Toiletries
  { label: 'Toothbrush & toothpaste',     category: 'Toiletries', labelKey: 'packingList.items.toothbrush_toothpaste' },
  { label: 'Deodorant',                    category: 'Toiletries', labelKey: 'packingList.items.deodorant' },
  { label: 'Sunscreen SPF 50+',           category: 'Toiletries', labelKey: 'packingList.items.sunscreen' },
  { label: 'Shampoo & conditioner',       category: 'Toiletries', labelKey: 'packingList.items.shampoo_conditioner' },
  { label: 'Razor',                        category: 'Toiletries', labelKey: 'packingList.items.razor' },
  { label: 'Moisturiser',                 category: 'Toiletries', labelKey: 'packingList.items.moisturiser' },
  // Comfort & Sleep
  { label: 'Neck pillow',                 category: 'Comfort & Sleep', labelKey: 'packingList.items.neck_pillow' },
  { label: 'Eye mask',                    category: 'Comfort & Sleep', labelKey: 'packingList.items.eye_mask' },
  { label: 'Earplugs',                    category: 'Comfort & Sleep', labelKey: 'packingList.items.earplugs' },
  { label: 'Reusable water bottle',       category: 'Comfort & Sleep', labelKey: 'packingList.items.water_bottle' },
  { label: 'Laundry bag',                 category: 'Comfort & Sleep', labelKey: 'packingList.items.laundry_bag' },
  { label: 'Ziplock bags (for liquids)',  category: 'Comfort & Sleep', labelKey: 'packingList.items.ziplock_bags' },
  // Health & Safety
  { label: 'Pain relievers (ibuprofen / paracetamol)', category: 'Health & Safety', labelKey: 'packingList.items.pain_relievers' },
  { label: 'Bandages & antiseptic wipes',  category: 'Health & Safety', labelKey: 'packingList.items.bandages_antiseptic' },
  { label: 'Prescription medications',     category: 'Health & Safety', labelKey: 'packingList.items.prescription_meds' },
  { label: 'Hand sanitizer',              category: 'Health & Safety', labelKey: 'packingList.items.hand_sanitizer' },
];

function clothingBase(days: number): RuleItem[] {
  const n = Math.min(days, 7);
  const shirts = Math.min(Math.ceil(days / 2), 5);
  const sleepwear = days > 5 ? 2 : 1;
  return [
    { label: `Underwear ×${n}`,              category: 'Clothing', labelKey: `packingList.items.underwear:${n}` },
    { label: `Socks ×${n}`,                  category: 'Clothing', labelKey: `packingList.items.socks:${n}` },
    { label: `T-shirts / tops ×${shirts}`,   category: 'Clothing', labelKey: `packingList.items.tshirts:${shirts}` },
    { label: `Sleepwear ×${sleepwear}`,      category: 'Clothing', labelKey: `packingList.items.sleepwear:${sleepwear}` },
    { label: 'Comfortable walking shoes',    category: 'Clothing', labelKey: 'packingList.items.walking_shoes' },
    { label: 'Casual / everyday outfit',     category: 'Clothing', labelKey: 'packingList.items.casual_outfit' },
  ];
}

const VIBE_ITEMS: Record<Vibe, RuleItem[]> = {
  beach: [
    { label: 'Swimsuit',                      category: 'Clothing',            labelKey: 'packingList.items.swimsuit' },
    { label: 'Flip-flops / sandals',          category: 'Clothing',            labelKey: 'packingList.items.flip_flops' },
    { label: 'Cover-up / sarong',             category: 'Clothing',            labelKey: 'packingList.items.cover_up' },
    { label: 'Beach hat / sun hat',           category: 'Clothing',            labelKey: 'packingList.items.beach_hat' },
    { label: 'Sunglasses',                    category: 'Clothing',            labelKey: 'packingList.items.sunglasses' },
    { label: 'Reef-safe sunscreen',           category: 'Toiletries',          labelKey: 'packingList.items.reef_safe_sunscreen' },
    { label: 'Aloe vera / after-sun gel',     category: 'Toiletries',          labelKey: 'packingList.items.aloe_vera' },
    { label: 'Waterproof phone pouch',        category: 'Electronics',         labelKey: 'packingList.items.waterproof_phone_pouch' },
    { label: 'Beach towel',                   category: 'Comfort & Sleep',     labelKey: 'packingList.items.beach_towel' },
  ],
  adventure: [
    { label: 'Hiking boots',                  category: 'Clothing',            labelKey: 'packingList.items.hiking_boots' },
    { label: 'Moisture-wicking shirts ×3',    category: 'Clothing',            labelKey: 'packingList.items.moisture_wicking_shirts' },
    { label: 'Rain jacket / windbreaker',     category: 'Clothing',            labelKey: 'packingList.items.rain_jacket' },
    { label: 'Sunglasses',                    category: 'Clothing',            labelKey: 'packingList.items.sunglasses' },
    { label: 'Hat / cap',                     category: 'Clothing',            labelKey: 'packingList.items.hat_cap' },
    { label: 'Insect repellent',             category: 'Toiletries',           labelKey: 'packingList.items.insect_repellent' },
    { label: 'Headlamp + spare batteries',   category: 'Electronics',          labelKey: 'packingList.items.headlamp' },
    { label: 'Offline maps downloaded',      category: 'Documents & Essentials', labelKey: 'packingList.items.offline_maps' },
    { label: 'Blister plasters',             category: 'Health & Safety',      labelKey: 'packingList.items.blister_plasters' },
    { label: 'Electrolyte sachets',          category: 'Health & Safety',      labelKey: 'packingList.items.electrolyte_sachets' },
  ],
  city: [
    { label: 'Smart-casual outfit',          category: 'Clothing',            labelKey: 'packingList.items.smart_casual_outfit' },
    { label: 'Comfortable walking shoes (extra pair)', category: 'Clothing',  labelKey: 'packingList.items.walking_shoes_extra' },
    { label: 'Day backpack / tote bag',      category: 'Clothing',            labelKey: 'packingList.items.day_backpack' },
    { label: 'Transit card / day pass',      category: 'Documents & Essentials', labelKey: 'packingList.items.transit_card' },
  ],
  food: [
    { label: 'Smart-casual outfit for restaurants', category: 'Clothing',     labelKey: 'packingList.items.smart_casual_outfit_restaurants' },
    { label: 'Food allergy card (local language)',  category: 'Documents & Essentials', labelKey: 'packingList.items.food_allergy_card' },
    { label: 'Antacids / digestive tablets',       category: 'Health & Safety', labelKey: 'packingList.items.antacids' },
  ],
  party: [
    { label: 'Going-out outfit',             category: 'Clothing',            labelKey: 'packingList.items.going_out_outfit' },
    { label: 'Dress shoes / heels',          category: 'Clothing',            labelKey: 'packingList.items.dress_shoes' },
    { label: 'Portable speaker',             category: 'Electronics',         labelKey: 'packingList.items.portable_speaker' },
    { label: 'Cash for covers & tips',       category: 'Documents & Essentials', labelKey: 'packingList.items.cash_for_covers' },
    { label: 'Electrolyte sachets / Pedialyte', category: 'Health & Safety', labelKey: 'packingList.items.electrolyte_sachets_pedialyte' },
    { label: 'Heavy-duty blackout eye mask', category: 'Comfort & Sleep',     labelKey: 'packingList.items.blackout_eye_mask' },
  ],
};

const SEASON_ITEMS: Record<'winter' | 'summer', RuleItem[]> = {
  winter: [
    { label: 'Warm jacket / puffer coat',    category: 'Clothing',        labelKey: 'packingList.items.warm_jacket' },
    { label: 'Gloves',                       category: 'Clothing',        labelKey: 'packingList.items.gloves' },
    { label: 'Scarf',                        category: 'Clothing',        labelKey: 'packingList.items.scarf' },
    { label: 'Thermal base layer',           category: 'Clothing',        labelKey: 'packingList.items.thermal_base_layer' },
    { label: 'Lip balm',                     category: 'Toiletries',      labelKey: 'packingList.items.lip_balm' },
    { label: 'Heavy-duty moisturiser',       category: 'Toiletries',      labelKey: 'packingList.items.heavy_duty_moisturiser' },
    { label: 'Compression socks',            category: 'Comfort & Sleep', labelKey: 'packingList.items.compression_socks' },
  ],
  summer: [
    { label: 'Light breathable shirts ×3',   category: 'Clothing',        labelKey: 'packingList.items.light_breathable_shirts' },
    { label: 'Sunglasses',                   category: 'Clothing',        labelKey: 'packingList.items.sunglasses' },
    { label: 'Hat / cap',                    category: 'Clothing',        labelKey: 'packingList.items.hat_cap' },
    { label: 'Cooling face mist',            category: 'Toiletries',      labelKey: 'packingList.items.cooling_face_mist' },
    { label: 'Insect repellent',             category: 'Toiletries',      labelKey: 'packingList.items.insect_repellent' },
  ],
};

export function buildPackingList(
  vibe: Vibe | null,
  totalDays: number,
  season: 'winter' | 'summer' | null,
): { label: string; category: PackingCategory; labelKey: string }[] {
  const all: RuleItem[] = [
    ...BASE,
    ...clothingBase(totalDays),
    ...(vibe ? VIBE_ITEMS[vibe] : []),
    ...(season ? SEASON_ITEMS[season] : []),
  ];

  const seen = new Set<string>();
  return all.filter((item) => {
    // Deduplicate by base key (strip count suffix for dynamic items)
    const baseKey = item.labelKey.split(':')[0];
    if (seen.has(baseKey)) return false;
    seen.add(baseKey);
    return true;
  });
}

export function getSeason(startDate: string | null): 'winter' | 'summer' | null {
  if (!startDate) return null;
  const month = new Date(startDate).getMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month >= 6 && month <= 8) return 'summer';
  return null;
}

export function getTripDays(
  startDate: string | null,
  endDate: string | null,
): number {
  if (!startDate || !endDate) return 5;
  const diff =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
    (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(diff));
}
