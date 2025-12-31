
import { NavItem, PlatformItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: 'home' },
  { label: 'Archives', href: 'archives' },
  { label: 'News', href: 'news' },
  { label: 'Tools', href: 'tools' },
  { label: 'About', href: 'about' },
];

export interface PlatformMetric extends PlatformItem {
  pwned: number;
  maxPwned: number;
  rank: string;
  percentile: string;
}

export const PLATFORMS_METRICS: PlatformMetric[] = [
  { 
    name: 'TRYHACKME', 
    description: 'GAMIFIED LEARNING PATHS.',
    pwned: 142,
    maxPwned: 200,
    rank: '#1,204',
    percentile: 'TOP 1%'
  },
  { 
    name: 'HACKTHEBOX', 
    description: 'ADVANCED PENTESTING LABS.',
    pwned: 64,
    maxPwned: 150,
    rank: '#3,450',
    percentile: 'PRO'
  },
  { 
    name: 'VULNHUB', 
    description: 'LOCAL VM SECURITY LABS.',
    pwned: 28,
    maxPwned: 50,
    rank: 'LOCAL',
    percentile: 'MASTER'
  },
  { 
    name: 'OFFSEC PG', 
    description: 'PROFESSIONAL PROVING GROUNDS.',
    pwned: 19,
    maxPwned: 40,
    rank: '#892',
    percentile: 'ELITE'
  },
];

export const PLATFORMS: PlatformItem[] = PLATFORMS_METRICS;
