# Sound Files for Tic-Tac-Toe Game

This directory contains sound files for the different sound packs in the game.

## Sound Pack Organization

Each sound pack has its own directory:
- `classic/`
- `arcade/`
- `minimal/`
- `nature/`
- `sci-fi/`

## Required Sound Files

Each sound pack directory should contain these files:
- `move-x.mp3` - Sound played when player X makes a move
- `move-o.mp3` - Sound played when player O makes a move
- `win.mp3` - Sound played when there's a winner
- `lose.mp3` - Sound played when the player loses
- `draw.mp3` - Sound played when the game ends in a draw
- `click.mp3` - UI click sound
- `hover.mp3` - Optional UI hover sound
- `background.mp3` - Background music (should be loopable)

## Sound Credits

The default sounds are sourced from Mixkit:
https://mixkit.co/free-sound-effects/game/

If you want to add your own sounds, make sure they follow the same file naming pattern and place them in the appropriate directory.

## Usage

The game will automatically load sounds from these directories based on the sound pack selected in the settings. 