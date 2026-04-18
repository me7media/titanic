/**
 * Navigation sequence for inter-room movement (K key or Mobile Tab).
 * @type {string[]}
 */
export const ROOM_ORDER = ["deck", "dining", "cabin", "lounge"];

/**
 * Vertical Y coordinates for different interior scenes.
 * @type {Object<string, number>}
 */
export const ROOM_Y_POSITIONS = { 'deck': 0, 'dining': -200, 'cabin': -400, 'lounge': -600 };


/**
 * Interactive Station Definitions
 * Maps current rooms to coordinate-based action zones (e.g., Dining Table, Cabin Bed).
 */
export const STATIONS = {
    'dining': { type: 'food', x: 0, z: 0, radius: 15, label: 'Стіл (Клавіша F)' },
    'cabin': { type: 'sleep', x: -10, z: -5, radius: 5, label: 'Ліжко (Клавіша X)' },
    'lounge': { type: 'heat', x: -20, z: 0, radius: 10, label: 'Камін (Тепло)' }
};


/**
 * Global Game State (Source of Truth)
 * Shared across all modules to ensure synchronized gameplay, physics, and rendering.
 * @type {Object}
 */
export const game = {
    running: false,
    /** Current phase: 'sailing' (standard), 'sinking' (disaster), 'gameover' */
    phase: 'sailing', 
    /** Target of player input: 'ship', 'jack', 'rose', or 'freecam' */
    controlMode: 'ship',
    currentRoom: 'deck',
    time: 0,
    waterLevel: 0,
    ship: {
        speed: 1.0,
        zPos: 0, // Lateral steering position
        lastZ: 0, // Used for wake syncing
        tilt: 0,
        sinkY: 0,
        sinkStartTime: 0,
        isBroken: false
    },
    /** Iceberg difficulty: 'off', 'normal', 'double' */
    icebergMode: 'normal', 
    players: {
        jack: { name: 'Джек', x: 0, z: 0, alive: true, energy: 100, mood: 100, hunger: 100, warmth: 100, pose: 'stand' },
        rose: { name: 'Роуз', x: 10, z: -2, alive: true, energy: 100, mood: 100, hunger: 100, warmth: 100, pose: 'stand' }
    },
    audio: {
        ctx: null, active: false
    },
    /** Map of active keys/buttons: e.g., { 'w': true } */
    keys: {}
};
