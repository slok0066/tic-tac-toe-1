import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Zap, Trophy, Skull } from 'lucide-react';
import { Difficulty } from '../types';

interface DifficultyModalProps {
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
}

export const DifficultyModal = ({ onSelect, onClose }: DifficultyModalProps) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [sliderValue, setSliderValue] = useState(1); // 0: easy, 1: medium, 2: hard, 3: god

  const difficulties: { value: Difficulty; label: string; icon: any; description: string; color: string }[] = [
    {
      value: 'easy',
      label: 'Easy',
      icon: Zap,
      description: 'Perfect for beginners, AI makes random moves',
      color: 'green'
    },
    {
      value: 'medium',
      label: 'Medium',
      icon: Brain,
      description: 'Balanced gameplay with mix of strategy',
      color: 'blue'
    },
    {
      value: 'hard',
      label: 'Hard',
      icon: Trophy,
      description: 'Challenge yourself against a smart AI',
      color: 'yellow'
    },
    {
      value: 'god',
      label: 'God',
      icon: Skull,
      description: 'Nearly impossible to beat, plays perfectly',
      color: 'red'
    }
  ];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);
    setSelectedDifficulty(difficulties[value].value);
  };

  const handleConfirm = () => {
    onSelect(selectedDifficulty);
  };

  const selectedDifficultyData = difficulties.find(d => d.value === selectedDifficulty)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl border border-white/50"
      >
        {/* Background glow effect based on difficulty */}
        <motion.div 
          className="absolute inset-0 -z-10 opacity-20 blur-2xl"
          animate={{ 
            background: [
              `radial-gradient(circle, var(--${selectedDifficultyData.color}-500) 0%, transparent 70%)`,
              `radial-gradient(circle, var(--${selectedDifficultyData.color}-500) 30%, transparent 80%)`,
              `radial-gradient(circle, var(--${selectedDifficultyData.color}-500) 0%, transparent 70%)`
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 bg-white/50 p-2 rounded-full z-10"
        >
          <X size={18} />
        </motion.button>
        
        <motion.h2 
          className="text-2xl font-bold text-gray-800 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Select Difficulty
        </motion.h2>

        {/* Difficulty Slider */}
        <div className="mb-8">
          <div className="relative mb-8 pt-6">
            {/* Base Track */}
            <div className="w-full h-3 bg-gray-200 rounded-lg absolute top-[26px]"></div>
            
            {/* Colored Track */}
            <motion.div 
              className="absolute left-0 top-[26px] h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-lg pointer-events-none" 
              style={{ width: `${(sliderValue / 3) * 100}%` }}
              animate={{ width: `${(sliderValue / 3) * 100}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            />
            
            {/* Actual Range Input */}
            <input
              type="range"
              min="0"
              max="3"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full h-3 absolute top-[26px] opacity-0 cursor-pointer z-10"
            />
            
            {/* Slider Thumb */}
            <motion.div 
              className="absolute top-[18px] -ml-3 w-7 h-7 rounded-full bg-white shadow-lg border-2 border-gray-200 z-20 pointer-events-none"
              style={{ 
                left: `calc(${(sliderValue / 3) * 100}%)`,
                borderColor: sliderValue === 0 ? 'var(--green-500)' : 
                             sliderValue === 1 ? 'var(--blue-500)' : 
                             sliderValue === 2 ? 'var(--yellow-500)' : 
                             'var(--red-500)'
              }}
              animate={{ 
                left: `calc(${(sliderValue / 3) * 100}%)`,
                borderColor: sliderValue === 0 ? 'var(--green-500)' : 
                             sliderValue === 1 ? 'var(--blue-500)' : 
                             sliderValue === 2 ? 'var(--yellow-500)' : 
                             'var(--red-500)'
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            />
            
            {/* Difficulty Markers */}
            <div className="flex justify-between px-0 mt-7">
              {difficulties.map((diff, index) => (
                <motion.div 
                  key={diff.value} 
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
            <motion.button
                    whileHover={{ scale: 1.15, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSliderValue(index);
                      setSelectedDifficulty(diff.value);
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow-md ${
                      sliderValue >= index 
                        ? 'bg-gradient-to-br ' + 
                          (index === 0 ? 'from-green-400 to-green-600' : 
                           index === 1 ? 'from-blue-400 to-blue-600' : 
                           index === 2 ? 'from-yellow-400 to-yellow-600' : 
                           'from-red-400 to-red-600')
                        : 'bg-gray-200'
                    } text-white z-10`}
                  >
                    <diff.icon size={18} className={sliderValue === index ? "animate-pulse-slow" : ""} />
                  </motion.button>
                  <span className={`text-sm font-medium ${sliderValue === index ? 'text-gray-800' : 'text-gray-500'}`}>
                    {diff.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Selected Difficulty Detail */}
          <motion.div
            key={selectedDifficulty}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="p-5 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-full ${
                selectedDifficulty === 'easy' ? 'bg-green-100 text-green-500' :
                selectedDifficulty === 'medium' ? 'bg-blue-100 text-blue-500' :
                selectedDifficulty === 'hard' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-500'
              }`}>
                {(() => {
                  const Icon = difficulties.find(d => d.value === selectedDifficulty)?.icon!;
                  return <Icon size={24} className="animate-pulse-slow" />;
                })()}
              </div>
              <h3 className="font-bold text-xl">{difficulties.find(d => d.value === selectedDifficulty)?.label}</h3>
              </div>
            <p className="text-gray-600 pl-12 text-md">{difficulties.find(d => d.value === selectedDifficulty)?.description}</p>
          </motion.div>
        </div>
        
        <motion.div 
          className="flex justify-end space-x-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 rounded-lg text-gray-700 font-medium shadow-md"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            className={`px-6 py-2 rounded-lg text-white font-medium shadow-md ${
              selectedDifficulty === 'easy' ? 'bg-gradient-to-r from-green-400 to-green-600' :
              selectedDifficulty === 'medium' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
              selectedDifficulty === 'hard' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
              'bg-gradient-to-r from-red-500 to-red-700'
            }`}
          >
            Play
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};