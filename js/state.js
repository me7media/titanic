export const ROOM_ORDER = ["deck", "dining", "cabin", "lounge"];
export const ROOM_Y_POSITIONS = { 'deck': 0, 'dining': -200, 'cabin': -400, 'lounge': -600 };

export const STATIONS = {
    'dining': { type: 'food', x: 0, z: 0, radius: 15, label: 'Стіл (Клавіша F)' },
    'cabin': { type: 'sleep', x: -10, z: -5, radius: 5, label: 'Ліжко (Клавіша X)' },
    'lounge': { type: 'heat', x: -20, z: 0, radius: 10, label: 'Камін (Тепло)' }
};

export const game = {
    running: false,
    phase: 'sailing', // 'sailing', 'sinking', 'gameover'
    controlMode: 'ship',
    currentRoom: 'deck',
    time: 0,
    waterLevel: 0,
    ship: {
        speed: 1.0,
        zPos: 0,
        lastZ: 0,
        tilt: 0,
        sinkY: 0,
        sinkStartTime: 0,
        isBroken: false
    },
    icebergMode: 'normal', // 'off', 'normal', 'double'
    players: {
        jack: { name: 'Джек', x: 10, z: 2, alive: true, energy: 100, mood: 100, hunger: 100, warmth: 100, pose: 'stand' },
        rose: { name: 'Роуз', x: 20, z: -2, alive: true, energy: 100, mood: 100, hunger: 100, warmth: 100, pose: 'stand' }
    },
    audio: {
        ctx: null, active: false
    },
    keys: {}
};
