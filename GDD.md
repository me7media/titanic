# Game Design Document: Titanic: Legend of the Ocean

## 1. Overview
**Title:** Titanic: Legend of the Ocean  
**Genre:** 2D Survival / Narrative Adventure (Kid-Friendly)  
**Target Audience:** Children (under 10) and family.  
**Platform:** Web / Desktop Browser.

## 2. Core Gameplay Pillars
- **Care & Survival:** Managing the basic needs (hunger and warmth) of Jack and Rose in a luxury setting.
- **Narrative Immersion:** Beautiful, "cinematic" interior recreations with film grain and vignette effects.
- **Social Synergy:** Jack and Rose can hold hands to share body heat, emphasizing their connection.
- **Tension & Rescue:** A dramatic shift from luxury travel to survival after colliding with an iceberg.

## 3. Visual Style (Art Direction)
- **Aesthetic:** High-contrast 2D graphics with a "premium" feel. Use of mahogany, gold accents, and velvet textures.
- **Atmosphere:** Deep ocean blues vs. warm golden interior lighting.
- **Characters:** Stylized but recognizable avatars of Jack and Rose with fluid animations.

## 4. Game Mechanics
### A. Ship Control & Pacing
- Navigate the Titanic through a sea of icebergs.
- Simplified steering for children (Up/Down).
- Pacing adjusted for kids: slower iceberg spawn and manageable survival stat depletion.

### B. Interior Exploration
- Cycle through 5 iconic locations: Deck, Grand Dining Hall, Luxury Cabin, Relaxation Lounge, and Main Corridor.
- High-fidelity renders with period-accurate details and actor likeness for Jack and Rose.
- Each room serves a specific purpose (Dining = Hunger, Cabin/Lounge = Warmth).

### C. Social & Survival
- **Holding Hands:** Characters recovering warmth faster when standing close together.
- **Lifeboat Boarding:** Progressive loading bar for boarding the lifeboat, creating a "rescue mission" feel.

### C. The Sinking (The Crisis)
- Triggered by collision. The ship tilts, music (if added) shifts, and water levels rise.
- Objective: Guide both characters to the Lifeboat.

## 5. Technical Requirements
- **Engine:** Vanilla JavaScript / HTML5 Canvas.
- **Styling:** CSS3 for UI and atmospheric overlays.
- **Logic:** State-driven architecture for seamless transitions between rooms and game phases.
