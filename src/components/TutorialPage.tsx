import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home, X, Circle, Gamepad, Users, Wifi, RefreshCw, Settings, Volume2, Moon, Sun } from 'lucide-react';
import { SYMBOL_OPTIONS } from '../types';

interface TutorialPageProps {
  onClose: () => void;
  darkMode: boolean;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ onClose, darkMode }) => {
  console.log("TutorialPage rendering, darkMode:", darkMode);
  
  try {
    const [currentSection, setCurrentSection] = useState(0);
    
    // Add effect for component mount/unmount logging
    useEffect(() => {
      console.log("TutorialPage mounted");
      
      // Add viewport meta tag for better mobile scaling
      let meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      document.head.appendChild(meta);
      
      // Cleanup function
      return () => {
        console.log("TutorialPage unmounted");
        // Remove it when component unmounts
        document.head.removeChild(meta);
      };
    }, []);
    
    const sections = [
      {
        title: "Welcome to Tic Tac Toe",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Welcome to our modern Tic Tac Toe game! This tutorial will guide you through all the features.</p>
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-1 sm:gap-2 w-32 h-32 xs:w-36 xs:h-36 sm:w-48 sm:h-48">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`flex items-center justify-center rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {i % 2 === 0 ? 
                      <X className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} /> : 
                      (i === 4 ? null : <Circle className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />)
                    }
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Game Modes",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Choose from multiple game modes to suit your play style:</p>
            
            <div className="space-y-2 mt-3">
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center space-x-2 sm:space-x-3`}>
                <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-blue-700' : 'bg-blue-100'}`}>
                  <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className="font-medium text-base sm:text-lg">Play with Friend</h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Take turns on the same device</p>
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center space-x-2 sm:space-x-3`}>
                <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-teal-700' : 'bg-teal-100'}`}>
                  <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`} />
                </div>
                <div>
                  <h3 className="font-medium text-base sm:text-lg">Infinity Mode</h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Each player has max 3 symbols</p>
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center space-x-2 sm:space-x-3`}>
                <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-purple-700' : 'bg-purple-100'}`}>
                  <Gamepad className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                </div>
                <div>
                  <h3 className="font-medium text-base sm:text-lg">Play with AI</h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Challenge the computer</p>
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center space-x-2 sm:space-x-3`}>
                <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-pink-700' : 'bg-pink-100'}`}>
                  <Wifi className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-pink-300' : 'text-pink-600'}`} />
                </div>
                <div>
                  <h3 className="font-medium text-base sm:text-lg">Online Play</h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Create or join rooms to play</p>
                </div>
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Infinity Mode",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Infinity Mode brings a twist to the classic game:</p>
            
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-teal-900/40' : 'bg-teal-50'} text-teal-800 dark:text-teal-200 mt-2`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl">♾️</span>
                <span className="font-semibold text-base sm:text-lg">INFINITY MODE</span>
              </div>
              <ul className="list-disc pl-4 sm:pl-5 text-sm sm:text-base space-y-1">
                <li>Each player can have a maximum of 3 symbols</li>
                <li>When placing a 4th symbol, oldest is removed</li>
                <li>Red-bordered symbols will be removed next</li>
                <li>Get three in a row to win</li>
              </ul>
            </div>
            
            <div className="flex justify-center mt-2">
              <div className="grid grid-cols-3 gap-1 sm:gap-2 w-32 h-32 xs:w-36 xs:h-36 sm:w-48 sm:h-48">
                {[...Array(9)].map((_, i) => {
                  const isFading = i === 0;
                  return (
                    <motion.div
                      key={i}
                      className={`flex items-center justify-center rounded-lg relative ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${isFading ? 'ring-2 ring-red-500' : ''}`}
                    >
                      {i === 0 || i === 4 || i === 8 ? 
                        <X className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'} ${isFading ? 'opacity-70' : ''}`} /> : 
                        (i === 2 || i === 6 ? 
                          <Circle className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-red-400' : 'text-red-500'}`} /> : 
                          null)
                      }
                      {isFading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[8px] sm:text-xs bg-white/70 dark:bg-black/50 px-1 text-red-600 dark:text-red-400 rounded">Will be removed</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Game Settings",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Customize your gameplay experience:</p>
            
            <div className="space-y-3 mt-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {darkMode ? 
                      <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" /> : 
                      <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                    }
                  </div>
                  <span className="text-base sm:text-lg">Dark Mode</span>
                </div>
                <div className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full relative ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <motion.div 
                    className={`absolute top-[2px] sm:top-1 w-4 h-4 rounded-full bg-white`}
                    animate={{ left: darkMode ? 'calc(100% - 18px)' : '2px' }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Volume2 className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <span className="text-base sm:text-lg">Sound Effects</span>
                </div>
                <div className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full bg-green-600 relative`}>
                  <div className="absolute top-[2px] sm:top-1 right-1 w-4 h-4 rounded-full bg-white"></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-1 sm:p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Settings className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <span className="text-base sm:text-lg">Animation Speed</span>
                </div>
                <select className={`text-sm sm:text-base px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}>
                  <option>Medium</option>
                </select>
              </div>
            </div>
            
            <div className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <p>More settings include board sizes, symbol styles, and sound packs!</p>
            </div>
          </div>
        )
      },
      {
        title: "Symbol Styles",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Choose from different symbol styles:</p>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3">
              {Object.entries(SYMBOL_OPTIONS).map(([style, symbols]) => (
                <div key={style} className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h3 className="font-medium capitalize mb-1 sm:mb-2 text-base sm:text-lg">{style}</h3>
                  <div className="flex justify-around">
                    <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <span className="text-2xl sm:text-3xl">{symbols.x}</span>
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <span className="text-2xl sm:text-3xl">{symbols.o}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      },
      {
        title: "Board Sizes",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Play on different board sizes:</p>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3">
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 sm:mb-2 text-base sm:text-lg">3x3 (Classic)</h3>
                <div className="grid grid-cols-3 gap-1 w-full aspect-square">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded`}></div>
                  ))}
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 sm:mb-2 text-base sm:text-lg">4x4</h3>
                <div className="grid grid-cols-4 gap-[2px] w-full aspect-square">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded`}></div>
                  ))}
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 sm:mb-2 text-base sm:text-lg">5x5</h3>
                <div className="grid grid-cols-5 gap-[1px] w-full aspect-square">
                  {[...Array(25)].map((_, i) => (
                    <div key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded`}></div>
                  ))}
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 sm:mb-2 text-base sm:text-lg">Ultimate</h3>
                <div className="grid grid-cols-3 gap-[2px] w-full aspect-square">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded p-[1px] sm:p-1`}>
                      <div className="grid grid-cols-3 gap-px w-full h-full">
                        {[...Array(9)].map((_, j) => (
                          <div key={j} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-sm`}></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Online Play",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Connect with players online:</p>
            
            <div className="space-y-2 sm:space-y-3 mt-3">
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 text-base sm:text-lg">Create Room</h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Create a room and share the code</p>
                
                <div className="mt-2">
                  <div className={`p-1 sm:p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'} font-mono text-center text-base sm:text-lg`}>
                    GAME123
                  </div>
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 text-base sm:text-lg">Join Room</h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Enter a code to join</p>
                
                <div className="mt-2 flex">
                  <input 
                    type="text" 
                    className={`p-1 sm:p-2 rounded-l flex-1 text-sm sm:text-base ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`} 
                    placeholder="Enter code" 
                    disabled
                  />
                  <button className={`px-2 sm:px-3 rounded-r text-sm sm:text-base ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                    Join
                  </button>
                </div>
              </div>
              
              <div className={`p-2 sm:p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-1 text-base sm:text-lg">Random Match</h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Find a random opponent</p>
                
                <div className="mt-2">
                  <div className={`p-1 sm:p-2 rounded ${darkMode ? 'bg-green-700/20' : 'bg-green-100'} text-center text-sm sm:text-base`}>
                    <span className="inline-block animate-pulse mr-1 sm:mr-2">●</span>
                    Searching for opponent...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      },
      {
        title: "Winning the Game",
        content: (
          <div className="space-y-3">
            <p className="text-base sm:text-lg">Get three in a row to win:</p>
            
            <div className="flex justify-center mt-3">
              <div className="relative">
                <div className="grid grid-cols-3 gap-1 sm:gap-2 w-32 h-32 xs:w-36 xs:h-36 sm:w-48 sm:h-48">
                  {[...Array(9)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center justify-center rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${[0, 4, 8].includes(i) ? (darkMode ? 'bg-green-700/50' : 'bg-green-100') : ''}`}
                    >
                      {i % 2 === 0 ? 
                        <X className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} /> : 
                        (i === 4 ? null : <Circle className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />)
                      }
                    </motion.div>
                  ))}
                </div>
                
                <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
                  <line
                    x1="10%"
                    y1="10%"
                    x2="90%"
                    y2="90%"
                    stroke={darkMode ? "#10B981" : "#059669"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="5,5"
                  />
                </svg>
              </div>
            </div>
            
            <div className={`p-3 sm:p-4 rounded-lg mt-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} text-center`}>
              <div className="flex items-center justify-center gap-2">
                <X className={`w-6 h-6 sm:w-7 sm:h-7 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <h3 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  X Wins!
                </h3>
              </div>
              <p className="text-sm sm:text-base text-blue-700 dark:text-blue-300 mt-1">
                Congratulations! X is the champion!
              </p>
            </div>
          </div>
        )
      }
    ];
    
    const handleNext = () => {
      if (currentSection < sections.length - 1) {
        setCurrentSection(currentSection + 1);
      }
    };
    
    const handlePrev = () => {
      if (currentSection > 0) {
        setCurrentSection(currentSection - 1);
      }
    };
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`min-h-screen flex flex-col overflow-x-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}
      >
        {/* Header */}
        <header className="p-2 sm:p-3 md:p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <button 
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-full ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Game Tutorial</h1>
          <div className="w-5 sm:w-6"></div> {/* For balance */}
        </header>
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
          <motion.div 
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        {/* Main content - using smaller padding on mobile */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-6 max-w-full sm:max-w-3xl mx-auto w-full">
          <AnimatedSection
            key={currentSection}
            title={sections[currentSection].title}
            content={sections[currentSection].content}
          />
        </div>
        
        {/* Navigation - simplified for mobile */}
        <div className="p-2 px-3 sm:p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <button
            onClick={handlePrev}
            disabled={currentSection === 0}
            className={`flex min-w-20 items-center justify-center px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base ${
              currentSection === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : `${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`
            }`}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="ml-1">Prev</span>
          </button>
          
          <div className="flex space-x-2 sm:space-x-3">
            {sections.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSection(index)}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${
                  index === currentSection 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Go to section ${index + 1}`}
              />
            ))}
          </div>
          
          {currentSection < sections.length - 1 ? (
            <button
              onClick={handleNext}
              className={`flex min-w-20 items-center justify-center px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              <span className="mr-1">Next</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className={`flex min-w-20 items-center justify-center px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base ${
                darkMode 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
            >
              <span>Finish</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  } catch (error) {
    console.error("Error rendering TutorialPage:", error);
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">Something went wrong</h1>
        <p className="mb-6 text-center">There was an error loading the tutorial.</p>
        <button 
          onClick={onClose}
          className={`px-6 py-2 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-lg`}
        >
          Back to Game
        </button>
      </div>
    );
  }
};

const AnimatedSection = ({ title, content }: { title: string, content: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      <motion.h2 
        className="text-2xl sm:text-3xl font-bold"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {title}
      </motion.h2>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-base sm:text-lg"
      >
        {content}
      </motion.div>
    </motion.div>
  );
}; 