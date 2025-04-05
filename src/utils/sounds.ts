import { GameSettings, Player, SoundPack } from '../types';

// Audio context for better browser support
let audioContext: AudioContext | null = null;
let soundEnabled = true;
let soundsLoaded = false;
let volume = 0.8;
let backgroundMusicPlaying = false;
let currentSoundPack: SoundPack = 'arcade';

// Initialize Audio context
const initAudioContext = () => {
  if (!audioContext) {
  try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('Audio context initialized');
      return audioContext;
    } catch (err) {
      console.error('Failed to create audio context:', err);
      return null;
    }
  }
  return audioContext;
};

// Audio elements for different sound packs
interface SoundAssets {
  click: HTMLAudioElement;
  moveX: HTMLAudioElement;
  moveO: HTMLAudioElement;
  win: HTMLAudioElement;
  draw: HTMLAudioElement;
  background: HTMLAudioElement;
}

const soundPacks: Record<SoundPack, SoundAssets> = {
  arcade: {
    click: new Audio(),
    moveX: new Audio(),
    moveO: new Audio(),
    win: new Audio(),
    draw: new Audio(),
    background: new Audio()
  }
};

// Sound URLs for each pack
const soundUrls: Record<SoundPack, Record<string, string>> = {
  arcade: {
    click: '/sounds/arcade/click.mp3',
    moveX: '/sounds/arcade/move-x.mp3',
    moveO: '/sounds/arcade/move-o.mp3',
    win: '/sounds/arcade/win.mp3',
    draw: '/sounds/arcade/draw.mp3',
    background: '/sounds/arcade/background.mp3'
  }
};

// Helper function to check if an audio file is available
const isAudioFileAvailable = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`Failed to check audio file availability: ${url}`);
    return false;
  }
};

// Initialize audio files
export const initializeAudio = async () => {
  if (soundsLoaded) return;
  
  try {
    // Initialize audio context
    initAudioContext();
    
    console.log('Initializing audio files...');
    
    // Try to load sound files, fall back to synthetic audio if needed
    for (const packName of Object.keys(soundPacks) as SoundPack[]) {
      const pack = soundPacks[packName];
      const urls = soundUrls[packName];
      
      console.log(`Loading sound pack: ${packName}`);
      
      for (const [key, url] of Object.entries(urls)) {
        const soundElement = pack[key as keyof SoundAssets];
        
        try {
          // Check if the file exists
          const fileExists = await isAudioFileAvailable(url);
          if (fileExists) {
            console.log(`Loading sound file: ${url}`);
            soundElement.src = url;
            
            // For background music, preload metadata only to save bandwidth
            if (key === 'background') {
              soundElement.preload = 'metadata';
            } else {
              soundElement.preload = 'auto';
            }
            
            // Setup background music to loop
            if (key === 'background') {
              soundElement.loop = true;
            }
            
            // Force load the file
            if (key !== 'background') {
              await soundElement.load();
            }
          } else {
            // If file doesn't exist, we'll use synthetic audio when playing
            console.warn(`Sound file not found: ${url}, will use synthetic fallback`);
          }
        } catch (err) {
          console.warn(`Error loading sound file ${url}:`, err);
        }
      }
    }
    
    soundsLoaded = true;
    console.log('Audio initialized successfully');
  } catch (err) {
    console.error('Failed to initialize audio', err);
    // We'll still set this to true to avoid repeated initialization attempts
    soundsLoaded = true;
  }
};

// Set the volume for all sounds
export const setVolume = (newVolume: number) => {
  volume = newVolume / 100;
  
  Object.values(soundPacks).forEach(pack => {
    pack.click.volume = volume;
    pack.moveX.volume = volume;
    pack.moveO.volume = volume;
    pack.win.volume = volume;
    pack.draw.volume = volume;
    pack.background.volume = volume * 0.3; // Background music quieter
  });
};

// Enable or disable sounds
export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  
  if (!enabled && backgroundMusicPlaying) {
    stopBackgroundMusic();
  }
};

// Set the current sound pack
export const setSoundPack = (soundPack: SoundPack) => {
  currentSoundPack = soundPack;
  
  // If background music is playing, restart with new pack
  if (backgroundMusicPlaying) {
    stopBackgroundMusic();
    playBackgroundMusic();
  }
};

// Play background music
export const playBackgroundMusic = () => {
  if (!soundEnabled) return;
  
  try {
    // Make sure audio is initialized
    if (!soundsLoaded) {
      initializeAudio().then(() => {
        playBackgroundMusic();
      });
      return;
    }
    
    stopBackgroundMusic(); // Stop any currently playing music
    
    console.log('Attempting to play background music...');
    const music = soundPacks[currentSoundPack].background;
    backgroundMusicPlaying = true;
    
    // Check if the audio source is set (file exists)
    if (music.src) {
      console.log('Playing background music from file:', music.src);
      music.currentTime = 0;
      music.volume = volume * 0.3; // Make sure volume is set correctly
      
      // Use the Web Audio API to play the music
      if (audioContext) {
        try {
          // Resume audio context if it was suspended
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          
          const mediaSource = audioContext.createMediaElementSource(music);
          mediaSource.connect(audioContext.destination);
        } catch (err) {
          // Just log the error and continue with regular play
          console.warn('Could not use Web Audio API for background music:', err);
        }
      }
      
      // Play the music
      const playPromise = music.play();
      if (playPromise) {
        playPromise.catch(err => {
          console.warn('Could not play background music, using synthetic fallback:', err);
          playSyntheticBackgroundMusic();
        });
      }
    } else {
      // Use synthetic background music
      console.log('Using synthetic background music');
      playSyntheticBackgroundMusic();
    }
  } catch (err) {
    console.error('Failed to play background music', err);
    // Try synthetic music as a fallback
    try {
      playSyntheticBackgroundMusic();
    } catch (synthErr) {
      console.error('Failed to play synthetic background music', synthErr);
    }
  }
};

// Stop background music
export const stopBackgroundMusic = () => {
  if (audioContext) {
    // Stop any synthetic oscillators
    stopAllAudioNodes();
  }
  
  Object.values(soundPacks).forEach(pack => {
    pack.background.pause();
    pack.background.currentTime = 0;
  });
  
  backgroundMusicPlaying = false;
};

// Play sound on move
export const playMoveSound = (player: Player) => {
  if (!soundEnabled || !soundsLoaded) return;
  
  try {
    const sound = player === 'X' 
      ? soundPacks[currentSoundPack].moveX 
      : soundPacks[currentSoundPack].moveO;
    
    // Check if the audio source is set (file exists)
    if (sound.src) {
      sound.currentTime = 0;
      void sound.play().catch(err => {
        console.warn(`Could not play move sound for ${player}, using synthetic fallback:`, err);
        player === 'X' ? playMoveXSound() : playMoveOSound();
      });
    } else {
      // Use synthetic sounds as fallback
      player === 'X' ? playMoveXSound() : playMoveOSound();
    }
  } catch (err) {
    console.error('Failed to play move sound', err);
  }
};

// Play sound on game result
export const playResultSound = (result: 'win' | 'draw') => {
  if (!soundEnabled || !soundsLoaded) return;
  
  try {
    const sound = result === 'win' 
      ? soundPacks[currentSoundPack].win 
      : soundPacks[currentSoundPack].draw;
    
    // Check if the audio source is set (file exists)
    if (sound.src) {
      sound.currentTime = 0;
      void sound.play().catch(err => {
        console.warn(`Could not play result sound for ${result}, using synthetic fallback:`, err);
        result === 'win' ? playWinSound() : playDrawSound();
      });
    } else {
      // Use synthetic sounds as fallback
      result === 'win' ? playWinSound() : playDrawSound();
    }
  } catch (err) {
    console.error('Failed to play result sound', err);
  }
};

// Play click sound for UI interactions
export const playClickSound = () => {
  if (!soundEnabled || !soundsLoaded) return;
  
  try {
    const sound = soundPacks[currentSoundPack].click;
    
    // Check if the audio source is set (file exists)
    if (sound.src) {
      sound.currentTime = 0;
      void sound.play().catch(err => {
        console.warn('Could not play click sound, using synthetic fallback:', err);
        playClickSoundEffect();
      });
    } else {
      // Use synthetic sounds as fallback
      playClickSoundEffect();
    }
  } catch (err) {
    console.error('Failed to play click sound', err);
  }
};

// Store active audio nodes so we can stop them later
const activeAudioNodes: AudioNode[] = [];

// Stop all active audio nodes
const stopAllAudioNodes = () => {
  while (activeAudioNodes.length > 0) {
    const node = activeAudioNodes.pop();
    if (node) {
      try {
        if ('stop' in node) {
          (node as OscillatorNode).stop();
        } else if ('disconnect' in node) {
          node.disconnect();
        }
      } catch (err) {
        console.warn('Error stopping audio node:', err);
      }
    }
  }
};

// Create an oscillator for generating tones
const createOscillator = (
  frequency: number,
  type: OscillatorType = 'sine',
  duration: number = 0.15,
  volume: number = 0.2,
  delay: number = 0
) => {
  if (!audioContext) {
    audioContext = initAudioContext();
    if (!audioContext) return;
  }
  
  // Create oscillator and gain nodes
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Configure oscillator
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  
  // Configure gain
  gainNode.gain.value = volume * 0.3; // Apply volume setting
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Start oscillator with delay
    const startTime = audioContext.currentTime + delay;
    oscillator.start(startTime);
  oscillator.stop(startTime + duration);
  
  // Store for cleanup
  activeAudioNodes.push(oscillator);
  activeAudioNodes.push(gainNode);
  
  // Cleanup when finished
  setTimeout(() => {
    const index = activeAudioNodes.indexOf(oscillator);
    if (index !== -1) activeAudioNodes.splice(index, 1);
    
    const gainIndex = activeAudioNodes.indexOf(gainNode);
    if (gainIndex !== -1) activeAudioNodes.splice(gainIndex, 1);
  }, (delay + duration) * 1000);
};

// Synthetic sound for X move
const playMoveXSound = () => {
  createOscillator(392, 'square', 0.1, volume, 0);
  createOscillator(523.25, 'square', 0.1, volume, 0.05);
};

// Synthetic sound for O move
const playMoveOSound = () => {
  createOscillator(261.63, 'sine', 0.1, volume, 0);
  createOscillator(329.63, 'sine', 0.1, volume, 0.05);
};

// Synthetic win sound
const playWinSound = () => {
  // Play a rising arpeggio for win sound
  createOscillator(261.63, 'triangle', 0.1, volume, 0);    // C4
  createOscillator(329.63, 'triangle', 0.1, volume, 0.1);  // E4
  createOscillator(392.00, 'triangle', 0.1, volume, 0.2);  // G4
  createOscillator(523.25, 'triangle', 0.2, volume, 0.3);  // C5
  
  // Add a final chord
  setTimeout(() => {
    createOscillator(261.63, 'triangle', 0.3, volume * 0.8, 0);
    createOscillator(329.63, 'triangle', 0.3, volume * 0.8, 0);
    createOscillator(392.00, 'triangle', 0.3, volume * 0.8, 0);
    createOscillator(523.25, 'triangle', 0.3, volume * 0.8, 0);
  }, 500);
};

// Synthetic draw sound
const playDrawSound = () => {
  // Play a neutral sound for draw
  createOscillator(349.23, 'sine', 0.2, volume, 0);    // F4
  createOscillator(293.66, 'sine', 0.2, volume, 0.2);  // D4
  createOscillator(261.63, 'sine', 0.3, volume, 0.4);  // C4
};

// Synthetic background music
const playSyntheticBackgroundMusic = () => {
  if (!soundEnabled || !audioContext) return;
  
  const playNote = (note: number, duration: number, delay: number) => {
    createOscillator(note, 'sine', duration, volume * 0.1, delay);
  };
  
  const notes = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
    523.25  // C5
  ];
  
  // Play a simple pattern that repeats
  let delay = 0;
  const patternDuration = 8;
  
  // We'll create a short looping pattern
  const playPattern = () => {
    notes.forEach((note, index) => {
      playNote(note, 0.2, delay);
      delay += 0.3;
    });
    
    // Reverse
    for (let i = notes.length - 2; i >= 0; i--) {
      playNote(notes[i], 0.2, delay);
      delay += 0.3;
    }
  };
  
  // Play pattern and repeat
  playPattern();
  
  // Loop it by repeatedly scheduling the pattern
  if (backgroundMusicPlaying) {
    setTimeout(() => playSyntheticBackgroundMusic(), patternDuration * 1000);
  }
};

// Synthetic click sound
const playClickSoundEffect = () => {
  createOscillator(880, 'square', 0.05, volume * 0.5, 0);
};

// Synthetic notification sound
const playNotificationSoundEffect = () => {
  createOscillator(523.25, 'sine', 0.1, volume, 0);
  createOscillator(659.25, 'sine', 0.1, volume, 0.1);
};

// Synthetic error sound
const playErrorSoundEffect = () => {
  createOscillator(195.995, 'square', 0.1, volume, 0);
  createOscillator(185.00, 'square', 0.1, volume, 0.1);
};

// Public methods for notification sounds
export const playNotificationSound = () => {
  playNotificationSoundEffect();
};

export const playErrorSound = () => {
  playErrorSoundEffect();
};