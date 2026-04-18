/**
 * Input Module — abstracts Desktop keyboard + Mobile touch into game.keys
 * Uses nipplejs for virtual joystick (loaded via CDN in index.html)
 */
import { game, ROOM_ORDER } from './state.js';

let joystickManager = null;
let showMessageFn = null; // will be injected from main.js

/**
 * Detects if the current device supports touch interactions.
 * @returns {boolean} True if touch is supported.
 */
export function isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}


/**
 * Initialize all input listeners.
 * @param {Function} showMsg - reference to showMessage from main.js
 */
export function initInput(showMsg) {
    showMessageFn = showMsg;

    // ─── Desktop: Keyboard ───
    window.addEventListener('keydown', e => {
        if (e.repeat) return;
        game.keys[e.key] = true;
        handleToggleKey(e.key);
    });
    window.addEventListener('keyup', e => game.keys[e.key] = false);

    // ─── Desktop: Mouse ───
    window.addEventListener('mousemove', e => {
        game.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        game.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
    window.addEventListener('wheel', e => {
        game.camDist = Math.max(10, Math.min(200, (game.camDist || 40) + e.deltaY * 0.1));
    });

    // ─── Mobile: Touch Controls ───
    if (isMobile()) {
        initMobileControls();
    }
}

/**
 * Handles single-press toggle actions shared between keyboard and mobile buttons.
 * @param {string} key - The key identifier (e.g., '1', 't', 'k').
 */
export function handleToggleKey(key) {
    const k = key.toLowerCase();


    if (key === '1') { game.controlMode = 'ship'; showMessageFn?.("Керування: Корабель"); updateMobileContext(); }
    if (key === '2') { game.controlMode = 'jack'; showMessageFn?.("Керування: Джек"); updateMobileContext(); }
    if (key === '3') { game.controlMode = 'rose'; showMessageFn?.("Керування: Роуз"); updateMobileContext(); }

    if (k === 't') {
        if (game.icebergMode === 'off') { game.icebergMode = 'normal'; showMessageFn?.('Айсберги: Обережно (x1)'); }
        else if (game.icebergMode === 'normal') { game.icebergMode = 'double'; showMessageFn?.('Айсберги: Збільшено (x2)'); }
        else { game.icebergMode = 'off'; showMessageFn?.('Айсберги: Вимкнено'); }
    }

    if (k === 'k') {
        const idx = ROOM_ORDER.indexOf(game.currentRoom);
        game.currentRoom = ROOM_ORDER[(idx + 1) % ROOM_ORDER.length];
        showMessageFn?.(`Кімната: ${game.currentRoom.toUpperCase()}`);
        updateMobileContext();
    }

    if (k === 'p') {
        game.controlMode = 'freecam';
        showMessageFn?.("Режим: Вільна Камера");
    }

    if (k === 'h') {
        const helpMenu = document.getElementById('help-menu');
        if (helpMenu) helpMenu.classList.toggle('hidden');
    }

    // Deck level changes
    const isInteriorNow = game.currentRoom !== 'deck';
    if (k === 'q' && !isInteriorNow && game.players[game.controlMode]) {
        game.players[game.controlMode].deckLevel = Math.max(0, (game.players[game.controlMode].deckLevel || 0) - 1);
        showMessageFn?.("Спуск на палубу нижче");
    }
    if (k === 'e' && !isInteriorNow && game.players[game.controlMode]) {
        game.players[game.controlMode].deckLevel = Math.min(4, (game.players[game.controlMode].deckLevel || 0) + 1);
        showMessageFn?.("Підйом на палубу вище");
    }
}

// ════════════════════════════════════════════
// MOBILE TOUCH CONTROLS
// ════════════════════════════════════════════

/**
 * Initializes mobile-specific UI elements: Virtual Joystick, Camera Swipes, and Action Buttons.
 */
function initMobileControls() {
    const container = document.getElementById('mobile-controls');
    if (!container) return;
    container.classList.remove('hidden');

    // Hide desktop hints
    const desktopHints = document.getElementById('controls-hint');
    if (desktopHints) desktopHints.style.display = 'none';

    // ─── 1. Virtual Joystick (nipplejs) ───
    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone && typeof nipplejs !== 'undefined') {
        joystickManager = nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            size: 120,
            color: 'rgba(201, 162, 64, 0.5)',
            restOpacity: 0.6
        });

        joystickManager.on('move', (evt, data) => {
            // Reset directional keys
            game.keys['w'] = false;
            game.keys['a'] = false;
            game.keys['s'] = false;
            game.keys['d'] = false;

            if (data.distance > 15) { // Dead zone
                const angle = data.angle.degree;
                // Up: 45-135, Right: 315-45, Down: 225-315, Left: 135-225
                if (angle > 45 && angle <= 135) game.keys['w'] = true;
                if (angle > 135 && angle <= 225) game.keys['a'] = true;
                if (angle > 225 && angle <= 315) game.keys['s'] = true;
                if (angle > 315 || angle <= 45) game.keys['d'] = true;

                // Diagonal combinations
                if (angle > 45 && angle <= 90) { game.keys['w'] = true; game.keys['d'] = true; }
                if (angle > 90 && angle <= 135) { game.keys['w'] = true; game.keys['a'] = true; }
                if (angle > 135 && angle <= 180) { game.keys['a'] = true; game.keys['w'] = true; }
                if (angle > 180 && angle <= 225) { game.keys['a'] = true; game.keys['s'] = true; }
                if (angle > 225 && angle <= 270) { game.keys['s'] = true; game.keys['a'] = true; }
                if (angle > 270 && angle <= 315) { game.keys['s'] = true; game.keys['d'] = true; }
            }
        });

        joystickManager.on('end', () => {
            game.keys['w'] = false;
            game.keys['a'] = false;
            game.keys['s'] = false;
            game.keys['d'] = false;
        });
    }

    // ─── 2. Camera Swipe (Right side of screen) ───
    let lastTouchX = 0, lastTouchY = 0;
    let cameraTouch = null;
    const canvas = document.querySelector('#game-container canvas');

    if (canvas) {
        canvas.addEventListener('touchstart', e => {
            // Only track touches on the right 60% of screen (joystick occupies left)
            const touch = [...e.touches].find(t => t.clientX > window.innerWidth * 0.35);
            if (touch) {
                cameraTouch = touch.identifier;
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', e => {
            if (cameraTouch === null) return;
            const touch = [...e.touches].find(t => t.identifier === cameraTouch);
            if (touch) {
                const dx = (touch.clientX - lastTouchX) / window.innerWidth;
                const dy = (touch.clientY - lastTouchY) / window.innerHeight;
                game.mouseX = Math.max(-1, Math.min(1, (game.mouseX || 0) + dx * 3));
                game.mouseY = Math.max(-1, Math.min(1, (game.mouseY || 0) + dy * 3));
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        }, { passive: true });

        canvas.addEventListener('touchend', e => {
            const remaining = [...e.touches].find(t => t.identifier === cameraTouch);
            if (!remaining) cameraTouch = null;
        }, { passive: true });
    }

    // ─── 3. Pinch to Zoom ───
    let lastPinchDist = 0;
    document.addEventListener('touchmove', e => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (lastPinchDist > 0) {
                const delta = (lastPinchDist - dist) * 0.5;
                game.camDist = Math.max(10, Math.min(200, (game.camDist || 40) + delta));
            }
            lastPinchDist = dist;
        }
    }, { passive: true });
    document.addEventListener('touchend', () => { lastPinchDist = 0; });

    // ─── 4. Action Buttons ───
    setupActionButton('btn-action-f', 'f');
    setupActionButton('btn-action-x', 'x');
    setupActionButton('btn-action-z', 'z');
    setupActionButton('btn-action-c', 'c');
    setupActionButton('btn-action-l', 'l');

    // Toggle buttons (single press)
    setupToggleButton('btn-mode-ship', '1');
    setupToggleButton('btn-mode-jack', '2');
    setupToggleButton('btn-mode-rose', '3');
    setupToggleButton('btn-room', 'k');
    setupToggleButton('btn-deck-up', 'e');
    setupToggleButton('btn-deck-down', 'q');

    // Sprint button (hold)
    setupActionButton('btn-sprint', 'Shift');

    // Initialize context
    updateMobileContext();
}

/**
 * Hold-style button: sets game.keys while pressed
 */
function setupActionButton(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => {
        e.preventDefault();
        game.keys[key] = true;
        btn.classList.add('active');
    });
    btn.addEventListener('touchend', e => {
        e.preventDefault();
        game.keys[key] = false;
        btn.classList.remove('active');
    });
    btn.addEventListener('touchcancel', () => {
        game.keys[key] = false;
        btn.classList.remove('active');
    });
}

/**
 * Toggle-style button: fires handleToggleKey once on tap
 */
function setupToggleButton(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', e => {
        e.preventDefault();
        btn.classList.add('active');
        handleToggleKey(key);
    });
    btn.addEventListener('touchend', e => {
        e.preventDefault();
        btn.classList.remove('active');
    });
}

/**
 * Updates the visibility of mobile action buttons based on the current game mode and room.
 * This ensures only relevant buttons (e.g., 'Eat' in Dining Room) are shown.
 */
function updateMobileContext() {
    const btns = {
        f: document.getElementById('btn-action-f'),
        x: document.getElementById('btn-action-x'),
        z: document.getElementById('btn-action-z'),
        c: document.getElementById('btn-action-c'),
        l: document.getElementById('btn-action-l'),
        deckUp: document.getElementById('btn-deck-up'),
        deckDown: document.getElementById('btn-deck-down'),
    };

    // Hide all first
    Object.values(btns).forEach(b => { if (b) b.style.display = 'none'; });

    // Show context-sensitive buttons
    const room = game.currentRoom;
    const mode = game.controlMode;

    if (mode === 'ship') {
        // No character actions in ship mode
        return;
    }

    if (room === 'deck') {
        if (btns.deckUp) btns.deckUp.style.display = 'flex';
        if (btns.deckDown) btns.deckDown.style.display = 'flex';
        if (btns.z) btns.z.style.display = 'flex';
    } else if (room === 'dining') {
        if (btns.f) btns.f.style.display = 'flex';
        if (btns.z) btns.z.style.display = 'flex';
    } else if (room === 'cabin') {
        if (btns.x) btns.x.style.display = 'flex';
        if (btns.z) btns.z.style.display = 'flex';
    } else if (room === 'lounge') {
        if (btns.z) btns.z.style.display = 'flex';
        if (btns.c) btns.c.style.display = 'flex';
        if (btns.l) btns.l.style.display = 'flex';
    }
}
