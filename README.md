# Titanic: Legend of the Ocean 🚢🌊

A cinematic 3D simulation of the Titanic's last voyage, built with Three.js. Experience iconic moments, explore detailed 3D interiors, and survive the disaster.

## 🚀 How to Run

### Option 1: Live Demo (GitHub Pages)
You can play the game directly in your browser without downloading anything:
1. Go to your repository **Settings**.
2. Navigate to the **Pages** section in the left sidebar.
3. Under **Build and deployment > Branch**, select `master` and folder `/root`.
4. Click **Save**.
5. After a minute, your game will be live at: `https://<your-username>.github.io/titanic/`

### Option 2: Local Development
If you have the code on your computer:
1. Open your terminal in the project folder.
2. Run a local server:
   ```bash
   npx serve
   ```
3. Open `http://localhost:3000` in your browser.

## 🎮 Controls

### Desktop
- **1, 2, 3**: Switch control (Ship, Jack, Rose).
- **W, A, S, D / Arrows**: Move / Steer.
- **K**: Cycle through Rooms (Deck, Dining, Cabin, Lounge).
- **L**: Trigger the "I'm flying" cinematic (at the bow, Jack & Rose proximity required).
- **Shift**: Sprint.
- **F**: Eat (at Dining Table).
- **X**: Sleep/Rest (in Cabin).
- **T**: Toggle Icebergs (Off / Normal / Double).

### Mobile
- **Virtual Joystick**: Move character/ship.
- **Swipe (Right Side)**: Rotate camera.
- **Pinch**: Zoom in/out.
- **Context Buttons**: Appear at the bottom for actions like "Fly", "Eat", or "Room change".

## 🛠 Features
- **3D Ocean Physics**: Dynamic swells and procedural wake.
- **Cinematic Camera**: Smooth follow and specialized "shot" angles.
- **Survival System**: Manage hunger, warmth, energy, and mood.
- **Dynamic Sinking**: Progressive hull tilting and realistic breakage.
- **Automated Tests**: Built-in validation at `/test.html`.

## 📂 Project Structure
- `index.html`: Main game entry point.
- `js/main.js`: Main engine and logic.
- `js/input.js`: Unified input (Mobile/Desktop).
- `js/ship.js`: 3D Ship model and sinking physics.
- `test.html`: Automated test suite.

---
## 🏗️ Збірка та Продакшн

Проект підтримує автоматичну збірку (Bundling) та мініфікацію за допомогою **esbuild**. 

### Як зібрати проект:
1. Виконайте команду для встановлення залежностей:
   ```bash
   npm install
   ```
2. Запустіть скрипт збірки:
   ```bash
   npm run build
   ```
3. Після завершення у папці `dist/` з'являться мініфіковані скрипти, а в корені — файли `index.prod.html` та `gallery.prod.html` з підтримкою версіонування (`?v=1.0.1`).

*Created with cinematic passion for history.*
