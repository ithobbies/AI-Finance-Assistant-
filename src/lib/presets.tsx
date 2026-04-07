import React from 'react';
import { Youtube, Music, Film, Bot, Sparkles, Terminal, Cloud, Box, CreditCard, Landmark, Wallet } from 'lucide-react';

export const PRESETS = [
  { id: 'youtube', name: 'YouTube Premium', color: 'bg-[#FF0000]', iconKey: 'youtube' },
  { id: 'spotify', name: 'Spotify', color: 'bg-[#1DB954]', iconKey: 'music' },
  { id: 'netflix', name: 'Netflix', color: 'bg-[#E50914]', iconKey: 'film' },
  { id: 'chatgpt', name: 'ChatGPT Plus', color: 'bg-[#10A37F]', iconKey: 'bot' },
  { id: 'claude', name: 'Claude Pro', color: 'bg-[#D97757]', iconKey: 'sparkles' },
  { id: 'cursor', name: 'Cursor', color: 'bg-zinc-800', iconKey: 'terminal' },
  { id: 'apple', name: 'Apple One', color: 'bg-zinc-800', iconKey: 'cloud' },
  { id: 'custom', name: 'Custom', color: 'bg-zinc-800', iconKey: 'box' },
];

export const getPresetIcon = (iconKey?: string, className: string = "w-5 h-5") => {
  switch (iconKey) {
    case 'youtube': return <Youtube className={className} />;
    case 'music': return <Music className={className} />;
    case 'film': return <Film className={className} />;
    case 'bot': return <Bot className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'terminal': return <Terminal className={className} />;
    case 'cloud': return <Cloud className={className} />;
    case 'box': return <Box className={className} />;
    case 'credit-card': return <CreditCard className={className} />;
    case 'landmark': return <Landmark className={className} />;
    case 'wallet': return <Wallet className={className} />;
    default: return <Box className={className} />;
  }
};
