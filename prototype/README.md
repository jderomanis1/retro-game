# Dewgrid — Clickable Vibe Prototype

Night botanic greenhouse grown over living copper-green circuitry. Wet silicon. Dew as current.

## Open

Open `index.html` in a browser (local file or any static server).

## Screens

1. Attract  
2. Title  
3. How to Play  
4. Game  
5. Level up  
6. Life lost  
7. Game over  
8. Pause overlay  

## Dev skip (vibe review)

Press **1–8** on the keyboard to jump directly to each screen above.  
Useful for reviewing UI states without playing through.

## Play controls

- Move: Arrow keys / WASD / on-screen pad  
- Pause: P or Esc  
- Attract → Title: Enter  

## Design tokens

- `tokens.css` — CSS custom properties  
- `tokens.json` — machine-readable tokens + contrast ratios + dark/light theme maps  

Fonts: Fraunces (display wordmark), Spline Sans Mono (HUD/UI).

## High score

Saved in `localStorage` under key `dewgrid-hs` (3-letter tag).
