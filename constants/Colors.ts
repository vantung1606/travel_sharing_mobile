// Wayfare Brand Design Tokens (Aligned 100% with Web Version)
const skyPrimary = '#0284C7'; // Sky 600
const skyLight = '#0EA5E9';   // Sky 500
const deepBlue = '#1D4ED8';   // Blue 700
const amberGold = '#F59E0B';  // Amber 500
const roseCoral = '#F43F5E';  // Rose 500
const emerald = '#10B981';    // Emerald 500
const violet = '#8B5CF6';     // Violet 500

export default {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F8FAFC',
    tint: skyPrimary,
    tabIconDefault: '#94A3B8',
    tabIconSelected: skyPrimary,
    card: '#FFFFFF',
    border: '#E2E8F0',
    primary: skyPrimary,
    primaryLight: '#E0F2FE', // Sky 100
    primaryDark: '#0369A1',
    secondary: deepBlue,
    amber: amberGold,
    rose: roseCoral,
    emerald: emerald,
    violet: violet,
    badge: '#F1F5F9',
  },
  dark: {
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    background: '#0B1329',   // Deep Ocean Midnight
    tint: skyLight,
    tabIconDefault: '#64748B',
    tabIconSelected: skyLight,
    card: '#131F37',         // Rich Blue-Grey Card
    border: '#1E2D4A',
    primary: skyLight,
    primaryLight: '#075985',
    primaryDark: skyPrimary,
    secondary: '#3B82F6',
    amber: '#FBBF24',
    rose: '#FB7185',
    emerald: '#34D399',
    violet: '#A78BFA',
    badge: '#1E2D4A',
  },
};
