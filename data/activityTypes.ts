export type ActivityTypeDef = {
  id: string;
  label: string;
  icon: string;   // Ionicons name
  color: string;
  bg: string;
};

export const ACTIVITY_TYPES: ActivityTypeDef[] = [
  { id: 'dining',      label: 'Dining Out',        icon: 'restaurant-outline',                color: '#FF6B5B', bg: '#FFF0EE' },
  { id: 'sightseeing', label: 'Sightseeing',        icon: 'camera-outline',                    color: '#6A9BD8', bg: '#EEF3FF' },
  { id: 'beach',       label: 'Beach',              icon: 'water-outline',                     color: '#4BA3C3', bg: '#EEF8FF' },
  { id: 'walking',     label: 'Explore',            icon: 'walk-outline',                      color: '#F4A261', bg: '#FFF8EE' },
  { id: 'shopping',    label: 'Shopping',           icon: 'bag-handle-outline',                color: '#8B72BE', bg: '#F3F0FF' },
  { id: 'outdoor',     label: 'Adventure',          icon: 'trail-sign-outline',                color: '#57A85B', bg: '#F0F8F0' },
  { id: 'cultural',    label: 'Cultural',           icon: 'people-outline',                    color: '#7FA68C', bg: '#F0F5F2' },
  { id: 'museum',      label: 'Museums',            icon: 'color-palette-outline',             color: '#E8857A', bg: '#FFF2F0' },
  { id: 'parks',       label: 'Parks',              icon: 'ticket-outline',                    color: '#E8A020', bg: '#FFFBE8' },
  { id: 'drive',       label: 'Scenic Drive',       icon: 'car-outline',                       color: '#5E86C1', bg: '#EEF3FF' },
  { id: 'other',       label: 'Other',              icon: 'ellipsis-horizontal-circle-outline', color: '#A0A0A0', bg: '#F5F5F5' },
];

export function getActivityType(id: string | null | undefined): ActivityTypeDef | undefined {
  if (!id) return undefined;
  return ACTIVITY_TYPES.find(t => t.id === id);
}
