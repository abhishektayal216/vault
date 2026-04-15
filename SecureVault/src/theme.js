export const DARK_COLORS = {
  bg: '#070a0e', surf: '#0d1319', surf2: '#121b26', surf3: '#18253a',
  border: '#1a2d40', border2: '#243855',
  accent: '#00e5a0', accentDim: 'rgba(0,229,160,0.09)', accent2: '#0ea5e9',
  text: '#c4d4e8', textBright: '#e8f4ff',
  muted: '#4a6a85', muted2: '#2a4260',
  err: '#ff4757', warn: '#ffb700',
};

export const LIGHT_COLORS = {
  bg: '#f8fafc', surf: '#ffffff', surf2: '#f1f5f9', surf3: '#e2e8f0',
  border: '#e2e8f0', border2: '#cbd5e1',
  accent: '#10b981', accentDim: 'rgba(16,185,129,0.09)', accent2: '#0ea5e9',
  text: '#334155', textBright: '#0f172a',
  muted: '#64748b', muted2: '#94a3b8',
  err: '#ef4444', warn: '#f59e0b',
};

import { Platform } from 'react-native';

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 30 };
export const SPACING = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };
export const FONT_MONO = Platform.select({ ios: 'Courier New', android: 'monospace' });

