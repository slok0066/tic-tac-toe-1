import { Theme, BoardStyle } from '../types';

interface ThemeColors {
  primary: string;
  secondary: string;
  bg: string;
  text: string;
  xColor: string;
  oColor: string;
  hoverBg: string;
  boardBg: string;
  gradient: string;
}

const THEMES: Record<Theme, ThemeColors> = {
  blue: {
    primary: 'from-blue-500 to-blue-600',
    secondary: 'from-purple-500 to-purple-600',
    bg: 'from-blue-50 via-purple-50 to-pink-50',
    text: 'text-blue-600',
    xColor: 'text-blue-500',
    oColor: 'text-purple-500',
    hoverBg: 'hover:bg-blue-50',
    boardBg: 'bg-blue-50',
    gradient: 'from-blue-600 to-purple-600'
  },
  purple: {
    primary: 'from-purple-500 to-purple-600',
    secondary: 'from-indigo-500 to-indigo-600',
    bg: 'from-purple-50 via-indigo-50 to-pink-50',
    text: 'text-purple-600',
    xColor: 'text-purple-500',
    oColor: 'text-indigo-500',
    hoverBg: 'hover:bg-purple-50',
    boardBg: 'bg-purple-50',
    gradient: 'from-purple-600 to-indigo-600'
  },
  green: {
    primary: 'from-green-500 to-green-600',
    secondary: 'from-teal-500 to-teal-600',
    bg: 'from-green-50 via-teal-50 to-blue-50',
    text: 'text-green-600',
    xColor: 'text-green-500',
    oColor: 'text-teal-500',
    hoverBg: 'hover:bg-green-50',
    boardBg: 'bg-green-50',
    gradient: 'from-green-600 to-teal-600'
  },
  pink: {
    primary: 'from-pink-500 to-pink-600',
    secondary: 'from-red-500 to-red-600',
    bg: 'from-pink-50 via-red-50 to-orange-50',
    text: 'text-pink-600',
    xColor: 'text-pink-500',
    oColor: 'text-red-500',
    hoverBg: 'hover:bg-pink-50',
    boardBg: 'bg-pink-50',
    gradient: 'from-pink-600 to-red-600'
  },
  orange: {
    primary: 'from-orange-500 to-orange-600',
    secondary: 'from-amber-500 to-amber-600',
    bg: 'from-orange-50 via-amber-50 to-yellow-50',
    text: 'text-orange-600',
    xColor: 'text-orange-500',
    oColor: 'text-amber-500',
    hoverBg: 'hover:bg-orange-50',
    boardBg: 'bg-orange-50',
    gradient: 'from-orange-600 to-amber-600'
  }
};

// Expanded theme options
export const getThemeClasses = (theme: Theme, type: string = 'primary') => {
  const themeMap: Record<Theme, Record<string, string>> = {
    blue: {
      primary: 'text-blue-500 dark:text-blue-400',
      secondary: 'text-blue-700 dark:text-blue-300',
      gradient: 'from-blue-500 to-indigo-600',
      boardBg: 'bg-blue-50 dark:bg-blue-900/30',
      xColor: 'text-blue-500 dark:text-blue-400',
      oColor: 'text-indigo-500 dark:text-indigo-300',
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
    },
    purple: {
      primary: 'text-purple-500 dark:text-purple-400',
      secondary: 'text-purple-700 dark:text-purple-300',
      gradient: 'from-purple-500 to-fuchsia-600',
      boardBg: 'bg-purple-50 dark:bg-purple-900/30',
      xColor: 'text-purple-500 dark:text-purple-400',
      oColor: 'text-fuchsia-500 dark:text-fuchsia-300',
      bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20'
    },
    green: {
      primary: 'text-green-500 dark:text-green-400',
      secondary: 'text-green-700 dark:text-green-300',
      gradient: 'from-green-500 to-emerald-600',
      boardBg: 'bg-green-50 dark:bg-green-900/30',
      xColor: 'text-green-500 dark:text-green-400',
      oColor: 'text-emerald-500 dark:text-emerald-300',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
    },
    pink: {
      primary: 'text-pink-500 dark:text-pink-400',
      secondary: 'text-pink-700 dark:text-pink-300',
      gradient: 'from-pink-500 to-rose-600',
      boardBg: 'bg-pink-50 dark:bg-pink-900/30',
      xColor: 'text-pink-500 dark:text-pink-400',
      oColor: 'text-rose-500 dark:text-rose-300',
      bg: 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20'
    },
    orange: {
      primary: 'text-orange-500 dark:text-orange-400',
      secondary: 'text-orange-700 dark:text-orange-300',
      gradient: 'from-orange-500 to-amber-600',
      boardBg: 'bg-orange-50 dark:bg-orange-900/30',
      xColor: 'text-orange-500 dark:text-orange-400',
      oColor: 'text-amber-500 dark:text-amber-300',
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20'
    },
    red: {
      primary: 'text-red-500 dark:text-red-400',
      secondary: 'text-red-700 dark:text-red-300',
      gradient: 'from-red-500 to-rose-600',
      boardBg: 'bg-red-50 dark:bg-red-900/30',
      xColor: 'text-red-500 dark:text-red-400',
      oColor: 'text-rose-500 dark:text-rose-300',
      bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20'
    },
    teal: {
      primary: 'text-teal-500 dark:text-teal-400',
      secondary: 'text-teal-700 dark:text-teal-300',
      gradient: 'from-teal-500 to-cyan-600',
      boardBg: 'bg-teal-50 dark:bg-teal-900/30',
      xColor: 'text-teal-500 dark:text-teal-400',
      oColor: 'text-cyan-500 dark:text-cyan-300',
      bg: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20'
    },
    yellow: {
      primary: 'text-yellow-500 dark:text-yellow-400',
      secondary: 'text-yellow-700 dark:text-yellow-300',
      gradient: 'from-yellow-500 to-amber-600',
      boardBg: 'bg-yellow-50 dark:bg-yellow-900/30',
      xColor: 'text-yellow-500 dark:text-yellow-400',
      oColor: 'text-amber-500 dark:text-amber-300',
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20'
    },
    dark: {
      primary: 'text-gray-600 dark:text-gray-300',
      secondary: 'text-gray-800 dark:text-gray-100',
      gradient: 'from-gray-700 to-gray-900',
      boardBg: 'bg-gray-200 dark:bg-gray-800',
      xColor: 'text-gray-600 dark:text-gray-200',
      oColor: 'text-gray-700 dark:text-gray-400',
      bg: 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900'
    },
    neon: {
      primary: 'text-fuchsia-500 dark:text-fuchsia-400',
      secondary: 'text-violet-700 dark:text-violet-300',
      gradient: 'from-fuchsia-500 to-blue-600',
      boardBg: 'bg-violet-50 dark:bg-violet-900/30',
      xColor: 'text-fuchsia-500 dark:text-fuchsia-400',
      oColor: 'text-blue-500 dark:text-blue-300',
      bg: 'bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20'
    }
  };

  if (!themeMap[theme]) {
    console.warn(`Theme ${theme} not found, falling back to blue`);
    return themeMap.blue[type] || '';
  }

  return themeMap[theme][type] || '';
};

// Apply a theme color to a component
export const applyTheme = (baseClass: string, theme: Theme, type: string = 'primary') => {
  return `${baseClass} ${getThemeClasses(theme, type)}`;
};

// Get board style classes
export const getBoardStyleClasses = (boardStyle: BoardStyle, isDarkMode: boolean) => {
  const styles: Record<BoardStyle, Record<string, string>> = {
    'classic': {
      light: 'border border-gray-200',
      dark: 'border border-gray-700'
    },
    'modern': {
      light: 'shadow-lg backdrop-blur-sm bg-white/80 border-0',
      dark: 'shadow-xl backdrop-blur-sm bg-gray-800/90 border-0'
    },
    'minimal': {
      light: 'border-0 bg-transparent shadow-none',
      dark: 'border-0 bg-transparent shadow-none'
    },
    'retro': {
      light: 'border-4 border-dashed border-gray-400 bg-gray-100',
      dark: 'border-4 border-dashed border-gray-500 bg-gray-800'
    },
    'gradient': {
      light: 'bg-gradient-to-br from-white to-gray-100 shadow-lg border-0',
      dark: 'bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl border-0'
    }
  };

  const mode = isDarkMode ? 'dark' : 'light';
  return styles[boardStyle][mode] || styles.classic[mode];
};

// Get a theme color without the TailwindCSS class prefix
export const getThemeColor = (theme: Theme, type: keyof ThemeColors): string => {
  const themeClass = THEMES[theme][type];
  
  // Extract the main color from classes like "from-blue-500"
  const colorMatch = themeClass.match(/-([\w-]+)-\d+/);
  return colorMatch ? colorMatch[1] : 'blue';
};