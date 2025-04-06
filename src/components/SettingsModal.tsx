import { motion } from 'framer-motion';
import { X, Volume2, VolumeX, Zap, Sparkles, Clock, Shield, Moon, Sun, Palette, Grid, Layout, Music, Disc, PlayCircle, Gamepad } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Theme, GameSettings, GameMode, BoardSize, BoardStyle, SymbolStyle, SoundPack, SYMBOL_OPTIONS } from '../types';
import { playClickSound, playMoveSound, playResultSound } from '../utils/sounds';

interface SettingsModalProps {
  settings: GameSettings;
  onSave: (settings: GameSettings) => void;
  onClose: () => void;
  currentGameMode?: GameMode | null;
}

// Settings section component for visual grouping
const SettingsSection = ({ 
  title, 
  icon, 
  children, 
  delay = 0 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  delay?: number 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3, type: "spring", stiffness: 300 }}
    className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-white/20 dark:border-gray-700/30"
    whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
  >
    <h3 className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200 mb-4 text-lg">
      {icon}
      {title}
    </h3>
    <div className="space-y-4">
      {children}
    </div>
  </motion.div>
);

// Toggle switch component for consistency
const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  activeColor = 'bg-green-500',
  size = 'normal' 
}: { 
  enabled: boolean; 
  onChange: () => void; 
  activeColor?: string;
  size?: 'small' | 'normal'
}) => (
  <motion.button
    onClick={onChange}
    className={`${size === 'small' ? 'w-12 h-6' : 'w-14 h-7'} rounded-full transition-colors flex items-center px-0.5 ${
      enabled ? `${activeColor} justify-end` : 'bg-gray-300 dark:bg-gray-600 justify-start'
    } shadow-inner touch-manipulation`}
    whileTap={{ scale: 0.95 }}
    layout
    aria-checked={enabled}
    role="switch"
  >
    <motion.div 
      layout
      className={`${size === 'small' ? 'w-5 h-5' : 'w-6 h-6'} bg-white rounded-full shadow-md`}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </motion.button>
);

// Sound test button component
const SoundTestButton = ({ 
  label, 
  onClick,
  icon,
  color = 'bg-blue-500 hover:bg-blue-600',
  textColor = 'text-white'
}: { 
  label: string; 
  onClick: () => void;
  icon?: React.ReactNode;
  color?: string;
  textColor?: string;
}) => (
  <motion.button
    onClick={onClick}
    className={`px-3 py-2 ${color} ${textColor} rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </motion.button>
);

// Volume slider component
const VolumeSlider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  activeColor = 'bg-blue-500',
  trackColor = 'bg-gray-300 dark:bg-gray-600'
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  activeColor?: string;
  trackColor?: string;
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative w-full h-6 flex items-center">
      <div className={`absolute h-2 w-full rounded-full ${trackColor}`}></div>
      <div 
        className={`absolute h-2 rounded-full ${activeColor}`} 
        style={{ width: `${percentage}%` }}
      ></div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute w-full opacity-0 cursor-pointer z-10 h-6"
      />
      <div 
        className={`absolute h-4 w-4 rounded-full bg-white shadow-md border-2 ${activeColor.replace('bg-', 'border-')}`} 
        style={{ left: `calc(${percentage}% - 8px)` }}
      ></div>
    </div>
  );
};

export const SettingsModal = ({ settings, onSave, onClose, currentGameMode }: SettingsModalProps) => {
  const [currentSettings, setCurrentSettings] = useState<GameSettings>({...settings});
  const [activeTab, setActiveTab] = useState<'appearance' | 'gameplay' | 'audio'>('appearance');
  
  const themeOptions: { value: Theme; label: string; color: string }[] = [
    { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
    { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
    { value: 'green', label: 'Green', color: 'bg-green-500' },
    { value: 'pink', label: 'Pink', color: 'bg-pink-500' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
    { value: 'red', label: 'Red', color: 'bg-red-500' },
    { value: 'teal', label: 'Teal', color: 'bg-teal-500' },
    { value: 'yellow', label: 'Yellow', color: 'bg-yellow-500' },
    { value: 'dark', label: 'Dark', color: 'bg-gray-700' },
    { value: 'neon', label: 'Neon', color: 'bg-fuchsia-500' },
  ];
  
  const boardStyleOptions: { value: BoardStyle; label: string; }[] = [
    { value: 'classic', label: 'Classic' },
    { value: 'modern', label: 'Modern' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'retro', label: 'Retro' },
    { value: 'gradient', label: 'Gradient' },
  ];
  
  const symbolStyleOptions: { value: SymbolStyle; label: string; }[] = [
    { value: 'classic', label: 'Classic (X/O)' },
    { value: 'emoji', label: 'Emoji (❌/⭕)' },
    { value: 'animals', label: 'Animals (🐶/🐱)' },
    { value: 'shapes', label: 'Shapes (🔶/🔵)' },
    { value: 'planets', label: 'Planets (🪐/🌕)' },
  ];
  
  const boardSizeOptions: { value: BoardSize; label: string; disabled: boolean }[] = [
    { value: '3x3', label: 'Classic 3×3', disabled: false },
    { value: '4x4', label: 'Large 4×4', disabled: false },
    { value: '5x5', label: 'Extra Large 5×5', disabled: false },
    { value: 'ultimate', label: 'Ultimate (3×3 of 3×3)', disabled: false },
  ];

  // Determine if board size should be disabled based on game mode
  // We can only enable it if there's no game in progress, or if we're in AI or friend mode
  // The App component will enforce the restriction for non-normal game types
  const isBoardSizeSelectable = !currentGameMode || currentGameMode === 'ai' || currentGameMode === 'friend';

  const handleSave = () => {
    playClickSound(); // Provide audio feedback
    onSave(currentSettings);
    onClose();
  };

  const handleTestSound = (type: 'click' | 'move' | 'win' | 'draw') => {
    if (!currentSettings.soundEnabled) return;
    
    switch (type) {
      case 'click':
        playClickSound();
        break;
      case 'move':
        playMoveSound('X');
        setTimeout(() => playMoveSound('O'), 500);
        break;
      case 'win':
        playResultSound('win');
        break;
      case 'draw':
        playResultSound('draw');
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center p-4 z-50 ${currentSettings.darkMode ? 'dark' : ''}`}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className={`${currentSettings.darkMode ? 'bg-gray-900/95 text-white' : 'bg-white/95 text-gray-800'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-md w-full relative overflow-y-auto max-h-[90vh] shadow-2xl border ${currentSettings.darkMode ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className={`absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${currentSettings.darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-full z-10 touch-manipulation`}
          aria-label="Close settings"
        >
          <X size={18} />
        </motion.button>
        
        <motion.h2 
          className={`text-xl sm:text-2xl font-bold ${currentSettings.darkMode ? 'text-white' : 'text-gray-800'} mb-4`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Game Settings
        </motion.h2>

        {/* Tab Navigation */}
        <div className="flex items-center mb-6 border-b border-gray-200 dark:border-gray-700">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-2 px-3 font-medium text-center ${
              activeTab === 'appearance' 
                ? 'text-blue-500 border-b-2 border-blue-500 dark:text-blue-400 dark:border-blue-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Palette className="w-4 h-4 mx-auto mb-1" />
            <span className="text-xs">Appearance</span>
          </motion.button>
          
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            onClick={() => setActiveTab('gameplay')}
            className={`flex-1 py-2 px-3 font-medium text-center ${
              activeTab === 'gameplay' 
                ? 'text-green-500 border-b-2 border-green-500 dark:text-green-400 dark:border-green-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Gamepad className="w-4 h-4 mx-auto mb-1" />
            <span className="text-xs">Gameplay</span>
          </motion.button>
          
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 px-3 font-medium text-center ${
              activeTab === 'audio' 
                ? 'text-purple-500 border-b-2 border-purple-500 dark:text-purple-400 dark:border-purple-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Volume2 className="w-4 h-4 mx-auto mb-1" />
            <span className="text-xs">Audio</span>
          </motion.button>
        </div>

        <div className="space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(80vh-120px)] pr-1">
          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <>
          <SettingsSection 
                title="Display Mode" 
                icon={currentSettings.darkMode ? 
                  <Moon className="w-5 h-5 text-blue-400" /> : 
                  <Sun className="w-5 h-5 text-yellow-500" />}
                delay={0.1}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base">
                {currentSettings.darkMode ? "Dark Mode" : "Light Mode"}
              </span>
              <ToggleSwitch 
                enabled={currentSettings.darkMode} 
                onChange={() => setCurrentSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                activeColor="bg-indigo-500"
              />
            </div>
              </SettingsSection>
              
              <SettingsSection 
                title="Theme Color" 
                icon={<Palette className="w-5 h-5 text-purple-500" />}
                delay={0.2}
              >
              <div className="grid grid-cols-5 gap-2">
                {themeOptions.map((theme, idx) => (
                <motion.button
                    key={theme.value}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + idx * 0.05 }}
                      onClick={() => setCurrentSettings(prev => ({
                        ...prev,
                        theme: theme.value
                      }))}
                    className={`h-10 sm:h-12 rounded-lg transition-all ${theme.color} ${
                      currentSettings.theme === theme.value 
                        ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 scale-110 shadow-lg' 
                        : 'opacity-60 hover:opacity-100 hover:shadow-md'
                    } touch-manipulation`}
                    aria-label={`${theme.label} theme`}
                    whileHover={{ y: -2, scale: 1.05 }}
                    whileTap={{ y: 0 }}
                  />
              ))}
          </div>
          </SettingsSection>
          
          <SettingsSection 
                title="Animation Settings" 
                icon={<Zap className="w-5 h-5 text-yellow-500" />}
                delay={0.3}
              >
            <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base">Show Animations</span>
              <ToggleSwitch 
                enabled={currentSettings.showAnimations} 
                onChange={() => setCurrentSettings(prev => ({ ...prev, showAnimations: !prev.showAnimations }))}
              />
            </div>
            
            {currentSettings.showAnimations && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Animation Speed</label>
                    <div className="flex gap-2 justify-between">
                      {['slow', 'medium', 'fast'].map((speed) => (
                        <motion.button
                          key={speed}
                          whileHover={{ y: -2 }}
                          whileTap={{ y: 0, scale: 0.95 }}
                          onClick={() => setCurrentSettings(prev => ({
                            ...prev,
                            animationSpeed: speed as 'slow' | 'medium' | 'fast'
                          }))}
                          className={`flex-1 py-2 rounded-lg text-center text-sm ${
                            currentSettings.animationSpeed === speed
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {speed.charAt(0).toUpperCase() + speed.slice(1)}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </SettingsSection>
              
              <SettingsSection 
                title="Board Style" 
                icon={<Grid className="w-5 h-5 text-teal-500" />}
                delay={0.4}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {boardStyleOptions.map((option, idx) => (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      onClick={() => setCurrentSettings(prev => ({
                        ...prev,
                        boardStyle: option.value
                      }))}
                      className={`p-3 rounded-lg ${
                        currentSettings.boardStyle === option.value 
                          ? `${currentSettings.darkMode ? 'bg-teal-600/80' : 'bg-teal-100'} ${currentSettings.darkMode ? 'text-white' : 'text-teal-800'}`
                          : `${currentSettings.darkMode ? 'bg-gray-800/80' : 'bg-gray-100'} ${currentSettings.darkMode ? 'text-gray-200' : 'text-gray-700'}`
                      } hover:bg-opacity-90 text-sm text-center`}
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </SettingsSection>
              
              <SettingsSection 
                title="Symbol Style" 
                icon={<Layout className="w-5 h-5 text-pink-500" />}
                delay={0.5}
              >
                <div className="space-y-2">
                  {symbolStyleOptions.map((option, idx) => (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                      onClick={() => setCurrentSettings(prev => ({
                        ...prev,
                        symbolStyle: option.value
                      }))}
                      className={`w-full p-3 rounded-lg flex items-center justify-between ${
                        currentSettings.symbolStyle === option.value 
                          ? `${currentSettings.darkMode ? 'bg-pink-600/80' : 'bg-pink-100'} ${currentSettings.darkMode ? 'text-white' : 'text-pink-800'}`
                          : `${currentSettings.darkMode ? 'bg-gray-800/80' : 'bg-gray-100'} ${currentSettings.darkMode ? 'text-gray-200' : 'text-gray-700'}`
                      } hover:bg-opacity-90`}
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                    >
                      <span>{option.label}</span>
                      {currentSettings.symbolStyle === option.value && (
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          className="w-3 h-3 bg-pink-600 dark:bg-pink-300 rounded-full"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </SettingsSection>
            </>
          )}

          {/* Gameplay Settings */}
          {activeTab === 'gameplay' && (
            <>
              <SettingsSection 
                title="Board Size" 
                icon={<Grid className="w-5 h-5 text-green-500" />}
                delay={0.1}
              >
                <div className="space-y-2">
                  {boardSizeOptions.map((option, idx) => (
                    <motion.button
                      key={option.value}
                      disabled={!isBoardSizeSelectable || option.disabled}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: !isBoardSizeSelectable || option.disabled ? 0.5 : 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      onClick={() => {
                        if (isBoardSizeSelectable && !option.disabled) {
                          playClickSound();
                          setCurrentSettings(prev => ({
                            ...prev,
                            boardSize: option.value
                          }))
                        }
                      }}
                      className={`w-full p-3 rounded-lg flex items-center justify-between ${
                        currentSettings.boardSize === option.value 
                          ? `${currentSettings.darkMode ? 'bg-green-600/80' : 'bg-green-100'} ${currentSettings.darkMode ? 'text-white' : 'text-green-800'}`
                          : `${currentSettings.darkMode ? 'bg-gray-800/80' : 'bg-gray-100'} ${currentSettings.darkMode ? 'text-gray-200' : 'text-gray-700'}`
                      } hover:bg-opacity-90 ${(!isBoardSizeSelectable || option.disabled) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      whileHover={isBoardSizeSelectable && !option.disabled ? { y: -2 } : {}}
                      whileTap={isBoardSizeSelectable && !option.disabled ? { y: 0 } : {}}
                    >
                      <span>{option.label}</span>
                      {currentSettings.boardSize === option.value && (
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          className="w-3 h-3 bg-green-600 dark:bg-green-300 rounded-full"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
                
                {!isBoardSizeSelectable && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30 p-2 rounded-md">
                    Board size can only be changed in AI or Friend mode.
                  </div>
                )}
              </SettingsSection>
              
              <SettingsSection 
                title="Gameplay Features" 
                icon={<Sparkles className="w-5 h-5 text-amber-500" />}
                delay={0.2}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Show Timer
                    </span>
                    <ToggleSwitch 
                      enabled={currentSettings.showTimer} 
                      onChange={() => setCurrentSettings(prev => ({ ...prev, showTimer: !prev.showTimer }))}
                      activeColor="bg-amber-500"
                    />
                  </div>
                  
            <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                  Show Hints
                </span>
              <ToggleSwitch 
                enabled={currentSettings.showHints} 
                onChange={() => setCurrentSettings(prev => ({ ...prev, showHints: !prev.showHints }))}
                      activeColor="bg-amber-500"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Haptic Feedback
                    </span>
                    <ToggleSwitch 
                      enabled={currentSettings.hapticFeedback} 
                      onChange={() => setCurrentSettings(prev => ({ ...prev, hapticFeedback: !prev.hapticFeedback }))}
                      activeColor="bg-amber-500"
                    />
                  </div>
            </div>
          </SettingsSection>
            </>
          )}
          
          {/* Audio Settings */}
          {activeTab === 'audio' && (
            <>
          <SettingsSection
                title="Sound Settings" 
                icon={<Volume2 className="w-5 h-5 text-purple-500" />}
                delay={0.1}
              >
                <div className="space-y-4">
            <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base flex items-center gap-2">
                  {currentSettings.soundEnabled ? 
                        <Volume2 className="w-4 h-4 text-purple-500" /> : 
                        <VolumeX className="w-4 h-4 text-gray-500" />
                  }
                      Enable Sounds
                </span>
              <ToggleSwitch 
                enabled={currentSettings.soundEnabled} 
                onChange={() => setCurrentSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      activeColor="bg-purple-500"
              />
              </div>
            
            {currentSettings.soundEnabled && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Volume</label>
                        <div className="flex items-center gap-3">
                          <VolumeX className="w-4 h-4 text-gray-500" />
                          <VolumeSlider 
                    value={currentSettings.volume}
                            onChange={(value) => setCurrentSettings(prev => ({ ...prev, volume: value }))}
                            activeColor="bg-purple-500"
                          />
                          <Volume2 className="w-4 h-4 text-purple-500" />
                  </div>
                </div>
            
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Background Music</label>
            <div className="flex justify-between items-center">
                          <span className="text-sm flex items-center gap-2">
                            <Music className="w-4 h-4" />
                            Play Background Music
                </span>
              <ToggleSwitch 
                            enabled={currentSettings.backgroundMusic} 
                            onChange={() => {
                              const newSetting = !currentSettings.backgroundMusic;
                              setCurrentSettings(prev => ({ ...prev, backgroundMusic: newSetting }));
                              
                              // Apply the change immediately
                              if (newSetting && currentSettings.soundEnabled) {
                                import('../utils/sounds').then(sounds => {
                                  sounds.playBackgroundMusic();
                                });
                              } else {
                                import('../utils/sounds').then(sounds => {
                                  sounds.stopBackgroundMusic();
                                });
                              }
                            }}
                            activeColor="bg-purple-500"
              />
            </div>
                      </div>
                      
                      <div className="space-y-2 pt-3">
                        <label className="block text-sm font-medium">Test Sounds</label>
                        <div className="grid grid-cols-2 gap-2">
                          <SoundTestButton 
                            label="UI Click" 
                            icon={<PlayCircle className="w-4 h-4" />}
                            onClick={() => handleTestSound('click')}
                            color="bg-purple-500 hover:bg-purple-600"
                          />
                          <SoundTestButton 
                            label="Game Moves" 
                            icon={<PlayCircle className="w-4 h-4" />}
                            onClick={() => handleTestSound('move')}
                            color="bg-purple-500 hover:bg-purple-600"
                          />
                          <SoundTestButton 
                            label="Win Sound" 
                            icon={<PlayCircle className="w-4 h-4" />}
                            onClick={() => handleTestSound('win')}
                            color="bg-purple-500 hover:bg-purple-600"
                          />
                          <SoundTestButton 
                            label="Draw Sound" 
                            icon={<PlayCircle className="w-4 h-4" />}
                            onClick={() => handleTestSound('draw')}
                            color="bg-purple-500 hover:bg-purple-600"
                          />
                        </div>
              </div>
                    </>
                  )}
          </div>
          </SettingsSection>
            </>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className={`py-2 rounded-lg ${currentSettings.darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-medium`}
          >
            Cancel
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
          >
            Save Changes
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};