# Game Design Document: Titanic: Legend of the Ocean

## 1. Overview
**Title:** Titanic: Legend of the Ocean  
**Genre:** 3D Cinematic Survival / Narrative Adventure  
**Target Audience:** General audience, fans of historical simulations and narrative storytelling.  
**Platform:** Web Browsers (Desktop & Mobile).

## 2. Core Gameplay Pillars
- **Care & Survival:** Managing the basic needs (hunger, warmth, energy, mood) of Jack and Rose.
- **Cinematic Immersion:** High-fidelity 3D environments with dynamic lighting, ocean waves, and dramatic camera angles.
- **Iconic Moments:** Recreation of legendary scenes, such as the "I'm flying" pose at the bow.
- **Tension & Rescue:** A physics-driven shift from sailing to sinking, culminating in a rescue mission via lifeboats.

## 3. Visual Style (Art Direction)
- **Aesthetic:** "Noir" cinematic style. Deep midnight blues, vibrant carmine red hull bottoms, and warm golden interiors.
- **Atmosphere:** Dynamic ocean swells, moonlight fog, and procedural smoke/foam effects.
- **Characters:** Stylized 3D models with procedural animations for complex interactions.

## 4. Game Mechanics
### A. Ship Control & Navigation
- **Sailing Phase:** Navigate the ship through icebergs. Dynamic tilting and yawing while steering.
- **Difficulty Modes:** 'Normal' for a relaxed experience, 'Double' for more iceberg frequency.
- **Mobile Controls:** Virtual joystick for movement; pinch-to-zoom and swipe-to-look for camera control.

### B. Interactive Environments (Stations)
- **Deck:** Main deck with multiple levels and the bow for the "Fly" scene.
- **Grand Dining Hall:** Area to restore Hunger.
- **Luxury Cabin:** Area to restore Energy through sleep.
- **Relaxation Lounge:** Area to restore Warmth and Mood near the fireplace.

### C. Proximity & Romance
- **Holding Hands / Protective Handoff:** Characters sync their poses when close.
- **"I'm Flying":** When Rose is at the bow and Jack is behind her, pressing 'L' triggers the iconic cinematic shot.

### D. The Sinking (The Crisis)
- Triggered by iceberg collision. 
- **Physics:** The ship tilts forward, eventually breaking in half dynamically.
- **Objective:** Navigate characters to the stern/deck edge to board the lifeboat.

## 5. Technical Requirements
- **Engine:** Three.js (WebGL).
- **Styling:** CSS3 Glassmorphism for UI; Vanilla CSS for mobile control overlays.
- **Input:** Unified Input Manager mapping Keyboard/Mouse and NippleJS (Mobile) to a shared game state.
- **Validation:** Automated test suite for cross-platform stability.

