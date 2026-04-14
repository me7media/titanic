export const ROOM_ORDER = ["deck", "dining", "cabin", "lounge"];
export const ROOM_Y_POSITIONS = { 'deck': 0, 'dining': -200, 'cabin': -400, 'lounge': -600 };

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
        tilt: 0,
        sinkY: 0,
        sinkStartTime: 0,
        isBroken: false
    },
    players: {
        jack: { name: 'Джек', x: 10, z: 2, alive: true },
        rose: { name: 'Роуз', x: 20, z: -2, alive: true }
    },
    audio: {
        ctx: null, active: false
    },
    keys: {}
};
