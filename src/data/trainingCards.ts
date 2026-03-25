import type { TrainingCard } from '@/types';

export const TARGET_CARDS: TrainingCard[] = [
  {
    id: 'poacher-sighting',
    category: 'targets',
    name: 'Poacher Sighting',
    description: 'Intel reports poacher activity. Locate, observe, and report. Do not engage without backup.',
    minCount: 1,
    maxCount: 3,
    assetTypes: ['poacher'],
  },
  {
    id: 'armed-intrusion',
    category: 'targets',
    name: 'Armed Intrusion',
    description: 'ARMED THREAT. Multiple armed individuals detected. Exercise extreme caution. Request support.',
    minCount: 2,
    maxCount: 4,
    assetTypes: ['poacher_armed'],
  },
  {
    id: 'snare-line',
    category: 'targets',
    name: 'Snare Line Detected',
    description: 'Snare network discovered. Document locations, photograph evidence, and safely disable.',
    minCount: 3,
    maxCount: 6,
    assetTypes: ['snare'],
  },
  {
    id: 'vehicle-incursion',
    category: 'targets',
    name: 'Vehicle Incursion',
    description: 'Unauthorized vehicles in protected zone. Track movement, note registration, coordinate intercept.',
    minCount: 1,
    maxCount: 2,
    assetTypes: ['poacher_vehicle'],
  },
  {
    id: 'injured-wildlife',
    category: 'targets',
    name: 'Injured Wildlife',
    description: 'Animal down - possible poaching injury. Secure perimeter, assess condition, call vet team.',
    minCount: 1,
    maxCount: 2,
    assetTypes: ['injured_animal'],
  },
  {
    id: 'mixed-threat',
    category: 'targets',
    name: 'Mixed Threat',
    description: 'Multiple threat types detected. Prioritize armed threats, then vehicles, then foot patrols.',
    minCount: 2,
    maxCount: 5,
    assetTypes: ['poacher', 'poacher_armed', 'poacher_vehicle'],
  },
];

export const FRIENDLY_CARDS: TrainingCard[] = [
  {
    id: 'patrol-team',
    category: 'friendlies',
    name: 'Ground Patrol',
    description: 'Foot patrol rangers deployed. Maintain radio contact. Report position every 30 minutes.',
    minCount: 2,
    maxCount: 4,
    assetTypes: ['ranger'],
  },
  {
    id: 'ranger-squad',
    category: 'friendlies',
    name: 'Ranger Squad',
    description: 'Full tactical team on standby. Armed response capability. 15-minute deployment window.',
    minCount: 1,
    maxCount: 2,
    assetTypes: ['ranger_team'],
  },
  {
    id: 'vehicle-support',
    category: 'friendlies',
    name: 'Mobile Unit',
    description: 'Patrol vehicles ready. Fuel and supplies stocked. Can reach any point in sector within 20 min.',
    minCount: 1,
    maxCount: 2,
    assetTypes: ['vehicle'],
  },
  {
    id: 'air-support',
    category: 'friendlies',
    name: 'Air Support',
    description: 'Helicopter on standby. Thermal imaging equipped. Flight time limited to 2 hours fuel.',
    minCount: 1,
    maxCount: 1,
    assetTypes: ['helicopter'],
  },
  {
    id: 'field-camp',
    category: 'friendlies',
    name: 'Forward Base',
    description: 'Temporary operations base. Medical supplies, communications relay, emergency shelter.',
    minCount: 1,
    maxCount: 1,
    assetTypes: ['base_camp'],
  },
  {
    id: 'checkpoint',
    category: 'friendlies',
    name: 'Checkpoint Active',
    description: 'Road checkpoint operational. Vehicle inspections in progress. Radio channel 7.',
    minCount: 1,
    maxCount: 2,
    assetTypes: ['checkpoint'],
  },
  {
    id: 'mixed-support',
    category: 'friendlies',
    name: 'Combined Forces',
    description: 'Multiple units deployed. Coordinate via command channel. Establish clear sectors.',
    minCount: 2,
    maxCount: 4,
    assetTypes: ['ranger', 'ranger_team', 'vehicle'],
  },
];

export const ENVIRONMENTAL_CARDS: TrainingCard[] = [
  {
    id: 'night-patrol',
    category: 'environmental',
    name: 'Night Operations',
    description: 'Darkness limits visibility to 50m. Use NVG/thermal. Silent movement protocols. No white light.',
    condition: 'night_patrol',
  },
  {
    id: 'animal-down',
    category: 'environmental',
    name: 'Animal Emergency',
    description: 'Priority 1: Secure the animal. Poachers may return. Establish 200m perimeter. Vet ETA 45 min.',
    condition: 'animal_down',
  },
  {
    id: 'person-injured',
    category: 'environmental',
    name: 'Casualty Evacuation',
    description: 'CASEVAC required. Stabilize patient. Clear LZ for extraction. All units maintain security.',
    condition: 'person_injured',
  },
  {
    id: 'radio-blackout',
    category: 'environmental',
    name: 'Comms Failure',
    description: 'Radio network down. Use runners or visual signals. Rally points active. Check-in at waypoints.',
    condition: 'radio_blackout',
  },
  {
    id: 'storm-incoming',
    category: 'environmental',
    name: 'Severe Weather',
    description: 'Storm ETA 60 min. Complete objectives or shelter. No air support. Flash flood risk in valleys.',
    condition: 'storm_incoming',
  },
  {
    id: 'low-visibility',
    category: 'environmental',
    name: 'Reduced Visibility',
    description: 'Fog/dust limiting visibility to 100m. GPS navigation required. Thermal advantage. Slow movement.',
    condition: 'low_visibility',
  },
];

export const ALL_CARDS = [...TARGET_CARDS, ...FRIENDLY_CARDS, ...ENVIRONMENTAL_CARDS];

export function pickRandomCard(category: 'targets' | 'friendlies' | 'environmental'): TrainingCard {
  let cards: TrainingCard[];
  switch (category) {
    case 'targets':
      cards = TARGET_CARDS;
      break;
    case 'friendlies':
      cards = FRIENDLY_CARDS;
      break;
    case 'environmental':
      cards = ENVIRONMENTAL_CARDS;
      break;
  }
  return cards[Math.floor(Math.random() * cards.length)];
}
