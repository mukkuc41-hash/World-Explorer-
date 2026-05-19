import { 
  Globe, Map, Compass, Camera, Plane, Train, Ship, 
  Tent, Mountain, Waves, Sun, Moon, Cloud, 
  Navigation, MapPin, Footprints, Backpack, Wallet, 
  Ticket, Trees, Wind, Thermometer, Flame, Anchor, 
  Award, Heart, Star, Zap, Calendar, Bookmark
} from 'lucide-react';
import React from 'react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hint: string;
  category: 'discovery' | 'planning' | 'social' | 'explorer';
  requirement: (stats: any) => boolean;
}

export const TRAVEL_BADGES: Badge[] = [
  {
    id: 'first_step',
    name: 'First Step',
    description: 'Shared your first discovery with the world.',
    icon: <Footprints className="w-5 h-5" />,
    color: '#00af87',
    hint: 'Add 1 location',
    category: 'discovery',
    requirement: (s) => s.contributed >= 1
  },
  {
    id: 'pathfinder',
    name: 'Pathfinder',
    description: 'Added 5 unique locations.',
    icon: <MapPin className="w-5 h-5" />,
    color: '#3b82f6',
    hint: 'Add 5 locations',
    category: 'discovery',
    requirement: (s) => s.contributed >= 5
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    description: 'Added 15 unique locations.',
    icon: <Map className="w-5 h-5" />,
    color: '#8b5cf6',
    hint: 'Add 15 locations',
    category: 'discovery',
    requirement: (s) => s.contributed >= 15
  },
  {
    id: 'itinerary_architect',
    name: 'Itinerary Architect',
    description: 'Planned your first grand tour.',
    icon: <Calendar className="w-5 h-5" />,
    color: '#f59e0b',
    hint: 'Add to Next Tour',
    category: 'planning',
    requirement: (s) => s.planned >= 1
  },
  {
    id: 'tour_guide',
    name: 'Tour Guide',
    description: 'Created 5 different tour plans.',
    icon: <Navigation className="w-5 h-5" />,
    color: '#10b981',
    hint: 'Add 5 to Next Tour',
    category: 'planning',
    requirement: (s) => s.planned >= 5
  },
  {
    id: 'collector',
    name: 'Gem Collector',
    description: 'Saved 10 locations to your favorites.',
    icon: <Heart className="w-5 h-5" />,
    color: '#ef4444',
    hint: 'Favorite 10 items',
    category: 'social',
    requirement: (s) => s.saved >= 10
  },
  {
    id: 'archivist',
    name: 'The Archivist',
    description: 'Archived 5 meaningful memories.',
    icon: <Bookmark className="w-5 h-5" />,
    color: '#6366f1',
    hint: 'Archive 5 items',
    category: 'social',
    requirement: (s) => s.archived >= 5
  },
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    description: 'Contributed to 3 different continents.',
    icon: <Globe className="w-5 h-5" />,
    color: '#0ea5e9',
    hint: 'Explore all regions',
    category: 'explorer',
    requirement: (s) => s.contributed >= 10
  },
  {
    id: 'mountain_goat',
    name: 'Mountain Goat',
    description: 'Discovered high-altitude retreats.',
    icon: <Mountain className="w-5 h-5" />,
    color: '#4ade80',
    hint: 'Add 3 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 3
  },
  {
    id: 'beach_bum',
    name: 'Beach Bum',
    description: 'Found the perfect coastal escape.',
    icon: <Waves className="w-5 h-5" />,
    color: '#38bdf8',
    hint: 'Add 2 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 2
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Discovered spots that shine after dark.',
    icon: <Moon className="w-5 h-5" />,
    color: '#1e293b',
    hint: 'Save 5 locations',
    category: 'explorer',
    requirement: (s) => s.saved >= 5
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Found the best sunrise viewpoints.',
    icon: <Sun className="w-5 h-5" />,
    color: '#fbbf24',
    hint: 'Save 3 locations',
    category: 'explorer',
    requirement: (s) => s.saved >= 3
  },
  {
    id: 'backpacker',
    name: 'Backpacker',
    description: 'A true budget-conscious adventurer.',
    icon: <Backpack className="w-5 h-5" />,
    color: '#a8a29e',
    hint: 'Add 4 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 4
  },
  {
    id: 'paparazzi',
    name: 'Paparazzi',
    description: 'Your discoveries are picture perfect.',
    icon: <Camera className="w-5 h-5" />,
    color: '#ec4899',
    hint: 'Add 7 locations',
    category: 'discovery',
    requirement: (s) => s.contributed >= 7
  },
  {
    id: 'sky_captain',
    name: 'Sky Captain',
    description: 'A frequent flyer in the discovery world.',
    icon: <Plane className="w-5 h-5" />,
    color: '#60a5fa',
    hint: 'Add 8 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 8
  },
  {
    id: 'rail_rider',
    name: 'Rail Rider',
    description: 'Master of scenic train journeys.',
    icon: <Train className="w-5 h-5" />,
    color: '#71717a',
    hint: 'Save 8 locations',
    category: 'explorer',
    requirement: (s) => s.saved >= 8
  },
  {
    id: 'seafarer',
    name: 'Seafarer',
    description: 'Explorer of the blue horizons.',
    icon: <Ship className="w-5 h-5" />,
    color: '#0284c7',
    hint: 'Add 6 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 6
  },
  {
    id: 'camper',
    name: 'Wild Camper',
    description: 'Sleeping under the stars.',
    icon: <Tent className="w-5 h-5" />,
    color: '#166534',
    hint: 'Add 2 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 2
  },
  {
    id: 'woodcutter',
    name: 'Forest Guardian',
    description: 'Discovering the deep greens.',
    icon: <Trees className="w-5 h-5" />,
    color: '#15803d',
    hint: 'Add 4 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 4
  },
  {
    id: 'navigator',
    name: 'Ace Navigator',
    description: 'Never lost, always exploring.',
    icon: <Compass className="w-5 h-5" />,
    color: '#b45309',
    hint: 'Add 12 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 12
  },
  {
    id: 'storm_chaser',
    name: 'Storm Chaser',
    description: 'Found beauty in the wild weather.',
    icon: <Wind className="w-5 h-5" />,
    color: '#94a3b8',
    hint: 'Add 3 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 3
  },
  {
    id: 'climatic',
    name: 'Climatic Expert',
    description: 'Chasing the perfect temperature.',
    icon: <Thermometer className="w-5 h-5" />,
    color: '#f43f5e',
    hint: 'Save 4 locations',
    category: 'explorer',
    requirement: (s) => s.saved >= 4
  },
  {
    id: 'trailblazer',
    name: 'Trailblazer',
    description: 'Setting the path for others.',
    icon: <Flame className="w-5 h-5" />,
    color: '#f97316',
    hint: 'Add 20 locations',
    category: 'discovery',
    requirement: (s) => s.contributed >= 20
  },
  {
    id: 'mariner',
    name: 'Deep Mariner',
    description: 'Anchored in great discoveries.',
    icon: <Anchor className="w-5 h-5" />,
    color: '#334155',
    hint: 'Add 5 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 5
  },
  {
    id: 'mvp',
    name: 'Elite Explorer',
    description: 'Top tier contributor to the community.',
    icon: <Award className="w-5 h-5" />,
    color: '#eab308',
    hint: 'Add 25 locations',
    category: 'explorer',
    requirement: (s) => s.contributed >= 25
  },
  {
    id: 'influencer',
    name: 'Travel Guru',
    description: 'Your taste is admired by everyone.',
    icon: <Star className="w-5 h-5" />,
    color: '#a855f7',
    hint: 'Save 20 locations',
    category: 'social',
    requirement: (s) => s.saved >= 20
  },
  {
    id: 'teleporter',
    name: 'Master Teleporter',
    description: 'Zapped through the world with ease.',
    icon: <Zap className="w-5 h-5" />,
    color: '#facc15',
    hint: 'Plan 10 items',
    category: 'explorer',
    requirement: (s) => s.planned >= 10
  }
];
