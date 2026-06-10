import React from 'react';
import { Box, CreditCard, Landmark, Wallet, Terminal } from 'lucide-react';
import { 
  SiYoutube, 
  SiSpotify, 
  SiNetflix, 
  SiApplemusic, 
  SiIcloud, 
  SiPlaystation, 
  SiOpenai, 
  SiAnthropic, 
  SiGooglegemini, 
  SiGoogledrive, 
  SiGoogle 
} from 'react-icons/si';

export const SUBSCRIPTION_PRESETS = [
  { id: 'youtube', name: 'YouTube', color: 'bg-gradient-to-br from-[#FF4D4D] to-[#CC0000]', iconKey: 'youtube' },
  { id: 'spotify', name: 'Spotify', color: 'bg-gradient-to-br from-[#1ED760] to-[#14833B]', iconKey: 'spotify' },
  { id: 'netflix', name: 'Netflix', color: 'bg-gradient-to-br from-[#E50914] to-[#83050C]', iconKey: 'netflix' },
  { id: 'apple-music', name: 'Apple Music', color: 'bg-gradient-to-br from-[#FA243C] to-[#B21A2B]', iconKey: 'apple-music' },
  { id: 'apple-icloud', name: 'Apple iCloud', color: 'bg-gradient-to-br from-[#36A1F8] to-[#1A73E8]', iconKey: 'apple-icloud' },
  { id: 'playstation', name: 'PS Plus', color: 'bg-gradient-to-br from-[#00439C] to-[#00224D]', iconKey: 'playstation' },
  { id: 'chatgpt', name: 'ChatGPT', color: 'bg-gradient-to-br from-[#10A37F] to-[#0B7057]', iconKey: 'chatgpt' },
  { id: 'claude', name: 'Claude', color: 'bg-gradient-to-br from-[#D97757] to-[#A65B43]', iconKey: 'claude' },
  { id: 'gemini', name: 'Gemini', color: 'bg-gradient-to-br from-[#4285F4] to-[#1557B0]', iconKey: 'gemini' },
  { id: 'google-drive', name: 'Google Drive', color: 'bg-gradient-to-br from-[#1FA463] to-[#146C41]', iconKey: 'google-drive' },
  { id: 'google-one', name: 'Google One', color: 'bg-gradient-to-br from-[#4285F4] to-[#2B5BB8]', iconKey: 'google-one' },
  { id: 'cursor', name: 'Cursor', color: 'bg-gradient-to-br from-zinc-600 to-zinc-900', iconKey: 'cursor' },
  { id: 'custom', name: 'Custom', color: 'bg-gradient-to-br from-zinc-600 to-zinc-900', iconKey: 'box' },
];

export const BANKING_PRESETS = [
  { id: 'mono', name: 'Monobank', color: 'bg-black', iconKey: 'mono' },
  { id: 'pumb', name: 'ПУМБ', color: 'bg-[#E3000F]', iconKey: 'pumb' },
  { id: 'custom_bank', name: 'Custom', color: 'bg-gradient-to-br from-zinc-600 to-zinc-900', iconKey: 'landmark' },
];

// For backward compatibility and shared generic searches:
export const PRESETS = [...SUBSCRIPTION_PRESETS, ...BANKING_PRESETS];

export const getPresetColor = (iconKey?: string, fallbackColor?: string) => {
  const preset = PRESETS.find(p => p.iconKey === iconKey);
  return preset ? preset.color : (fallbackColor || 'bg-zinc-800');
};

export const getPresetIcon = (iconKey?: string, className: string = "w-5 h-5") => {
  switch (iconKey) {
    case 'youtube': return <SiYoutube className={className} />;
    case 'spotify': return <SiSpotify className={className} />;
    case 'netflix': return <SiNetflix className={className} />;
    case 'apple-music': return <SiApplemusic className={className} />;
    case 'apple-icloud': return <SiIcloud className={className} />;
    case 'playstation': return <SiPlaystation className={className} />;
    case 'chatgpt': return <SiOpenai className={className} />;
    case 'claude': return <SiAnthropic className={className} />;
    case 'gemini': return <SiGooglegemini className={className} />;
    case 'google-drive': return <SiGoogledrive className={className} />;
    case 'google-one': return <SiGoogle className={className} />;
    case 'cursor': return <Terminal className={className} />;
    case 'credit-card': return <CreditCard className={className} />;
    case 'landmark': return <Landmark className={className} />;
    case 'wallet': return <Wallet className={className} />;
    case 'mono': 
      return <span className={`font-bold tracking-tight text-white ${className.includes('w-7') ? 'text-xs' : 'text-[10px]'}`}>mono</span>;
    case 'pumb':
      return <span className={`font-bold text-white ${className.includes('w-7') ? 'text-sm' : 'text-[10px]'}`}>ПУМБ</span>;
    case 'box':
    default:
      return <Box className={className} />;
  }
};
