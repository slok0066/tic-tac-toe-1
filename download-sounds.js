// download-sounds.js
// A simple script to download the sound files needed for the game
// Run with: node download-sounds.js

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sound URLs using freely available sounds from freesound.org and pixabay
const soundUrls = {
  classic: {
    click: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cbd83e96c.mp3?filename=click-button-140881.mp3',
    moveX: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c19614.mp3?filename=interface-124464.mp3',
    moveO: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_bb630cc097.mp3?filename=interface-1-126517.mp3',
    win: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3865f.mp3?filename=success-1-6297.mp3',
    draw: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_d3bd4743de.mp3?filename=interface-124470.mp3',
    background: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_fae6ccbb27.mp3?filename=happy-and-fun-background-music-126517.mp3'
  },
  arcade: {
    click: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f8b1689.mp3?filename=retro-game-coin-pickup-38299.mp3',
    moveX: 'https://cdn.pixabay.com/download/audio/2022/03/22/audio_2dde218a05.mp3?filename=blip-131856.mp3',
    moveO: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_456e8d7dac.mp3?filename=plop-6408.mp3',
    win: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_10f75edc4c.mp3?filename=winfantasia-6912.mp3',
    draw: 'https://cdn.pixabay.com/download/audio/2022/03/19/audio_942a041b07.mp3?filename=arcade-game-over-2-142097.mp3',
    background: 'https://cdn.pixabay.com/download/audio/2022/01/21/audio_73b0c507e5.mp3?filename=8bit-music-for-game-68698.mp3'
  },
  minimal: {
    click: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_82aca72dde.mp3?filename=click-21156.mp3',
    moveX: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c3a31588.mp3?filename=pop-39222.mp3',
    moveO: 'https://cdn.pixabay.com/download/audio/2022/04/21/audio_9177a49071.mp3?filename=wood-hit-1-46429.mp3',
    win: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_ae1b3a2ceb.mp3?filename=success-fanfare-trumpets-6185.mp3',
    draw: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_681a38da52.mp3?filename=negative-beeps-6008.mp3',
    background: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe52a49.mp3?filename=relaxing-mountains-157666.mp3'
  },
  nature: {
    click: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_cb15c75075.mp3?filename=drip-2-46737.mp3',
    moveX: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1da2a04b5e.mp3?filename=bird-chirp-6341.mp3',
    moveO: 'https://cdn.pixabay.com/download/audio/2022/03/13/audio_7ccf7b91eb.mp3?filename=birds-singing-03-79569.mp3',
    win: 'https://cdn.pixabay.com/download/audio/2022/03/22/audio_eacf3e2c3d.mp3?filename=musical-birds-01-6552.mp3',
    draw: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_1a886aaf36.mp3?filename=river-creek-spring-nature-58132.mp3',
    background: 'https://cdn.pixabay.com/download/audio/2022/01/20/audio_d03e008a01.mp3?filename=forest-with-small-river-birds-and-nature-field-recording-6735.mp3'
  },
  'sci-fi': {
    click: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1c45a2c0ed.mp3?filename=click-124467.mp3',
    moveX: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_a4857296e9.mp3?filename=beep-6-96243.mp3',
    moveO: 'https://cdn.pixabay.com/download/audio/2022/11/17/audio_f1b7483e66.mp3?filename=sci-fi-scan-3-186839.mp3',
    win: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_12f214d797.mp3?filename=game-bonus-144751.mp3',
    draw: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_dfb9ac0527.mp3?filename=negative-beeps-6008.mp3',
    background: 'https://cdn.pixabay.com/download/audio/2022/05/31/audio_bbb584a833.mp3?filename=scifi-dreams-background-music-61426.mp3'
  }
};

// Function to download a file
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filePath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if download failed
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if there was an error
      reject(err);
    });
  });
}

// Main function to download all sound files
async function downloadAllSounds() {
  const baseDir = path.join(process.cwd(), 'public', 'sounds');
  
  console.log('Starting download of sound files...');
  
  for (const [pack, sounds] of Object.entries(soundUrls)) {
    console.log(`\nDownloading ${pack} sound pack...`);
    
    for (const [sound, url] of Object.entries(sounds)) {
      const fileName = sound === 'moveX' ? 'move-x.mp3' : 
                       sound === 'moveO' ? 'move-o.mp3' : 
                       `${sound}.mp3`;
                       
      const filePath = path.join(baseDir, pack, fileName);
      
      try {
        await downloadFile(url, filePath);
      } catch (error) {
        console.error(`Error downloading ${filePath}: ${error.message}`);
      }
    }
  }
  
  console.log('\nAll sound downloads completed!');
  console.log('\nYou may need to refresh your browser or restart the app to load the new sounds.');
}

// Start the download process
downloadAllSounds().catch(err => {
  console.error('Download process failed:', err);
}); 