import { game, ROOM_ORDER, ROOM_Y_POSITIONS, STATIONS } from './state.js';
import { initAudio } from './audio.js';
import { initEnvironment, updateEnvironment } from './environment.js';
import { initShip, updateShip, buildDetailedLifeboat } from './ship.js';
import { initCharacters, updateCharacterPose } from './characters.js';
import { initInteriors } from './interiors.js';
import { bowGroup, shipGroup, sternGroup } from './ship.js';

let scene, camera, renderer;
let jackMesh, roseMesh, rescueBoat;

// Global lights that should be dimmed indoors
let ambientLight, hemiLight, moonLight;

// Unscaled Deck Metrics (WIDENED proportions)
const DECK_LEVELS = [
    { y: 27.35, minX: -68, maxX: 68, zMax: 13 }, // Main Deck
    { y: 31.75, minX: -39, maxX: 34, zMax: 10.5 },   // C-Deck
    { y: 35.75, minX: -34, maxX: 29, zMax: 9.5 },   // B-Deck
    { y: 39.25, minX: -29, maxX: 24, zMax: 8.5 },   // A-Deck
    { y: 41.75, minX: -19, maxX: 14, zMax: 6.5 }    // Bridge Roof
];

function init() {
    const container = document.getElementById('game-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2b42); // Moonlight moody blue
    scene.fog = new THREE.FogExp2(0x1a2b42, 0.0025);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 150);
    camera.lookAt(0, 10, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping to brighten colors
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const uiOverlay = document.getElementById('ui-overlay');
    if (container && uiOverlay) {
        container.insertBefore(renderer.domElement, uiOverlay);
    } else if (container) {
        container.appendChild(renderer.domElement);
    }

    // Lighting (Starts Evening, shifts to Night)
    ambientLight = new THREE.AmbientLight(0xffccaa, 2.0); // Warm evening initially
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xffbb88, 0x080820, 1.2);
    scene.add(hemiLight);

    moonLight = new THREE.DirectionalLight(0xffa060, 2.0);
    // Behind and to the left: -X, +Y, -Z
    moonLight.position.set(-150, 100, -100);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    scene.add(moonLight);

    // Visible Moon in the sky
    const moon = new THREE.Mesh(
        new THREE.CircleGeometry(25, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }) // Immune to fog
    );
    moon.position.set(-600, 450, 600);
    moon.lookAt(0, 0, 0);
    scene.add(moon);

    // Init Modules
    initEnvironment(scene);
    initShip(scene);
    initInteriors(scene);

    const chars = initCharacters(scene);
    jackMesh = chars.jackMesh;
    roseMesh = chars.roseMesh;

    rescueBoat = buildDetailedLifeboat();
    // Start beside the ship relative to its initial path
    rescueBoat.position.set(10, 0.8, 18);
    rescueBoat.visible = false;
    scene.add(rescueBoat);

    renderer.setAnimationLoop(gameLoop);
}

// Global Event Listeners - Moved to top level for better testability and immediate responsiveness
window.addEventListener('resize', onWindowResize);
window.addEventListener('keydown', e => {
    if (e.repeat) return;
    game.keys[e.key] = true;

    // Single-action Toggles
    if (e.key === '1') { game.controlMode = 'ship'; showMessage("Керування: Корабель"); }
    if (e.key === '2') { game.controlMode = 'jack'; showMessage("Керування: Джек"); }
    if (e.key === '3') { game.controlMode = 'rose'; showMessage("Керування: Роуз"); }

    if (e.key.toLowerCase() === 't') {
        if (game.icebergMode === 'off') { game.icebergMode = 'normal'; showMessage('Айсберги: Обережно (x1)'); }
        else if (game.icebergMode === 'normal') { game.icebergMode = 'double'; showMessage('Айсберги: Збільшено (x2)'); }
        else { game.icebergMode = 'off'; showMessage('Айсберги: Вимкнено'); }
    }

    if (e.key.toLowerCase() === 'k') {
        const idx = ROOM_ORDER.indexOf(game.currentRoom);
        game.currentRoom = ROOM_ORDER[(idx + 1) % ROOM_ORDER.length];
        showMessage(`Кімната: ${game.currentRoom.toUpperCase()}`);
    }

    if (e.key.toLowerCase() === 'p') {
        game.controlMode = 'freecam';
        showMessage("Режим: Вільна Камера (Літати на стрілочках)");
    }

    if (e.key.toLowerCase() === 'h') {
        const helpMenu = document.getElementById('help-menu');
        if (helpMenu) helpMenu.classList.toggle('hidden');
    }

    // Action Keys
    const isInteriorNow = game.currentRoom !== 'deck';
    if (e.key.toLowerCase() === 'q' && !isInteriorNow) {
        if (game.players[game.controlMode]) {
            game.players[game.controlMode].deckLevel = Math.max(0, (game.players[game.controlMode].deckLevel || 0) - 1);
            showMessage("Спуск на палубу нижче");
        }
    }
    if (e.key.toLowerCase() === 'e' && !isInteriorNow) {
        if (game.players[game.controlMode]) {
            game.players[game.controlMode].deckLevel = Math.min(4, (game.players[game.controlMode].deckLevel || 0) + 1);
            showMessage("Підйом на палубу вище");
        }
    }
});
    window.addEventListener('keyup', e => game.keys[e.key] = false);

    // Dynamic Camera Peek & Zoom logic
    window.addEventListener('mousemove', e => {
        game.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        game.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
    window.addEventListener('wheel', e => {
        game.camDist = Math.max(10, Math.min(200, (game.camDist || 40) + e.deltaY * 0.1));
    });

// Init check for Start UI
window.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);

    const closeHelpMenu = document.getElementById('close-help');
    if (closeHelpMenu) {
        closeHelpMenu.addEventListener('click', () => {
            const helpMenu = document.getElementById('help-menu');
            if (helpMenu) helpMenu.classList.add('hidden');
        });
    }
});


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function showMessage(text) {
    const msgBox = document.getElementById('message-display');
    if (!msgBox) return; // fail-safe
    const oldHtml = msgBox.innerHTML;
    msgBox.innerHTML = `<span style="color:#ccaa55; font-size:16px;">${text}</span>`;
    setTimeout(() => { if (msgBox.innerHTML.includes(text)) msgBox.innerHTML = oldHtml; }, 2000);
}

function startGame() {
    initAudio();
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.opacity = 0;
        setTimeout(() => {
            startScreen.style.display = 'none';
            game.running = true;
            showMessage("Гра розпочата. Натискай '1', '2', '3' для керування. 'K' для кімнат.");
        }, 800);
    } else {
        game.running = true;
    }
}

function updateCamera() {
    const isInterior = game.currentRoom !== 'deck';
    const yOffset = ROOM_Y_POSITIONS[game.currentRoom];

    if (isInterior) {
        scene.fog = null; // No fog indoors
        // Dim global exterior lights so interior point lights stand out
        if (ambientLight) ambientLight.intensity = 0.1;
        if (hemiLight) hemiLight.intensity = 0.1;
        if (moonLight) moonLight.intensity = 0.0;

        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        if (!activeMesh) return; // fail-safe для тестів

        // Float tracking camera (third person interior view)
        camera.position.lerp(new THREE.Vector3(activeMesh.position.x * 0.4, yOffset + 12, activeMesh.position.z + 16), 0.05);
        camera.lookAt(new THREE.Vector3(activeMesh.position.x * 0.8, yOffset + 4, activeMesh.position.z - 8));
    } else {
        scene.fog = new THREE.FogExp2(0x08101a, 0.0025); // Bring fog back outdoors
        // Restore bright global moonlight
        if (ambientLight) ambientLight.intensity = 2.0;
        if (hemiLight) hemiLight.intensity = 1.2;
        if (moonLight) moonLight.intensity = 2.0;


        if (game.controlMode === 'ship') {
            const isSteering = game.keys['ArrowUp'] || game.keys['w'] ||
                game.keys['ArrowDown'] || game.keys['s'] ||
                game.keys['ArrowLeft'] || game.keys['a'] ||
                game.keys['ArrowRight'] || game.keys['d'];

            const dist = game.camDist || 100;
            if (isSteering) {
                // Focus View: Lock behind with mouse influence
                const targetCam = new THREE.Vector3(-dist * 1.5, 45 + (game.mouseY * 10), game.ship.zPos + (game.mouseX * 20));
                camera.position.lerp(targetCam, 0.08);
                camera.lookAt(50, 10, game.ship.zPos);
            } else {
                // Cinematic Orbit: Slow move with mouse peek
                const orbitSpeed = game.time * 0.1;
                const camX = Math.sin(orbitSpeed) * dist;
                const camZ = game.ship.zPos + Math.cos(orbitSpeed) * dist * 0.7;
                const peekX = game.mouseX * 15;
                const peekY = -game.mouseY * 10;
                camera.position.lerp(new THREE.Vector3(camX + peekX, 35 + peekY, camZ), 0.02);
                camera.lookAt(0, 15, game.ship.zPos);
            }
        } else if (game.controlMode === 'freecam') {
            const spd = 2;
            if (game.keys['ArrowUp'] || game.keys['w']) camera.position.z -= spd;
            if (game.keys['ArrowDown'] || game.keys['s']) camera.position.z += spd;
            if (game.keys['ArrowLeft'] || game.keys['a']) camera.position.x -= spd;
            if (game.keys['ArrowRight'] || game.keys['d']) camera.position.x += spd;
            // Freecam looks where you "tilt" the mouse
            camera.lookAt(game.mouseX * 100, 10 - game.mouseY * 50, -100);
        } else {
            const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
            if (!activeMesh) return;
            const worldPos = new THREE.Vector3();
            activeMesh.getWorldPosition(worldPos);
            
            // Third Person Follow with "Over the Shoulder" mouse peek
            const dist = game.camDist || 40;
            const targetCam = new THREE.Vector3(
                worldPos.x + (game.mouseX * 10), 
                worldPos.y + (dist * 0.4) - (game.mouseY * 5), 
                worldPos.z + dist
            );
            camera.position.lerp(targetCam, 0.06);
            camera.lookAt(worldPos.x, worldPos.y + 4, worldPos.z - 10);
        }
    }
}

function updateGameplay() {
    const isInterior = game.currentRoom !== 'deck';
    const yOffset = ROOM_Y_POSITIONS[game.currentRoom];

    if (game.phase === 'sinking') {
        if (rescueBoat) {
            rescueBoat.visible = true;
            if (!game.ship.boatPositioned) {
                // Sync boat Z with ship's last Z to make sure it's nearby
                rescueBoat.position.z = game.ship.zPos || 0;
                game.ship.boatPositioned = true;
            }
        }
    }

    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator) {
        modeIndicator.textContent = game.controlMode === 'ship' ? 'Корабель' : (game.controlMode === 'freecam' ? 'Вільна Камера' : game.players[game.controlMode].name);
    }

    // Move Logic
    if (game.controlMode === 'ship' && !isInterior) {
        if (game.phase === 'sailing') {
            if (game.keys['ArrowUp'] || game.keys['w']) game.ship.speed = Math.min(3, game.ship.speed + 0.02);
            if (game.keys['ArrowDown'] || game.keys['s']) game.ship.speed = Math.max(0, game.ship.speed - 0.02);

            // Allow Ship Steering (A/D)
            game.ship.zPos = game.ship.zPos || 0;
            if (game.keys['ArrowLeft'] || game.keys['a']) game.ship.zPos += 0.8;
            if (game.keys['ArrowRight'] || game.keys['d']) game.ship.zPos -= 0.8;
        } else {
            game.ship.speed = 0; // Stop moving forward after hit
        }
    } else if (game.controlMode === 'jack' || game.controlMode === 'rose') {
        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        
        if (activeMesh) {
            activeMesh.userData = activeMesh.userData || { dirX: 0, dirZ: 0 };
            
            let spd = (game.keys['Shift'] ? 0.45 : 0.25) * (game.currentRoom === 'deck' ? 1.0 : 0.7);
            
            const playerState = game.players[game.controlMode];
            // Gameplay Penalties:
            if (playerState.mood < 30) spd *= 0.5; // Slow down if sad
            if (playerState.hunger < 10) spd = 0.25; // Cannot run if starving
            if (playerState.energy < 20) spd *= 0.8; // Fatigue penalty
            
    
            // Movement bounds (Deck vs Interior)
            let cx = activeMesh.position.x;
            let cz = activeMesh.position.z;
    
            let targetX = cx, targetZ = cz;
            let isMoving = false;
    
            if (game.keys['ArrowUp'] || game.keys['w']) { targetZ -= spd; isMoving = true; activeMesh.userData.dirX = 0; activeMesh.userData.dirZ = -1; }
            if (game.keys['ArrowDown'] || game.keys['s']) { targetZ += spd; isMoving = true; activeMesh.userData.dirX = 0; activeMesh.userData.dirZ = 1; }
            if (game.keys['ArrowLeft'] || game.keys['a']) { targetX -= spd; isMoving = true; activeMesh.userData.dirX = -1; activeMesh.userData.dirZ = 0; }
            if (game.keys['ArrowRight'] || game.keys['d']) { targetX += spd; isMoving = true; activeMesh.userData.dirX = 1; activeMesh.userData.dirZ = 0; }
    
            if (isMoving) {
                // Apply Movement directly (constraints handled safely by physics map downstream)
                activeMesh.position.x = targetX;
                activeMesh.position.z = targetZ;
    
                // Face movement direction
                const tgtRot = Math.atan2(-activeMesh.userData.dirZ, activeMesh.userData.dirX);
                activeMesh.rotation.y += (tgtRot - activeMesh.rotation.y) * 0.2;
            }
        }
    }

    // Global Survival & UI logic for all characters
    const isMovingNow = (game.keys['w'] || game.keys['s'] || game.keys['a'] || game.keys['d'] ||
        game.keys['ArrowUp'] || game.keys['ArrowDown'] || game.keys['ArrowLeft'] || game.keys['ArrowRight']);

    ['jack', 'rose'].forEach(p => {

        const player = game.players[p];
        const isPlayerInterior = game.currentRoom !== 'deck' || player.saved;
        const mesh = p === 'jack' ? jackMesh : roseMesh;

        // 1. Interactive Zones Proximity Check
        const station = STATIONS[game.currentRoom];
        let currentStationType = null;
        if (station) {
            const px = mesh ? mesh.position.x : player.x;
            const pz = mesh ? mesh.position.z : player.z;
            const distToStation = Math.hypot(px - station.x, pz - station.z);
            if (distToStation < station.radius) {
                currentStationType = station.type;
                // Passive Area Effects (e.g. Lounge Fireplace)
                if (currentStationType === 'heat') {
                    player.warmth = Math.min(100, player.warmth + 1);
                    player.mood = Math.min(100, player.mood + 0.5);
                }
            }
        }

        // 2. Survival degradation
        if (game.time % 2 < 0.02) {
            player.hunger = Math.max(0, player.hunger - (player.pose === 'lie' ? 0.05 : 0.2));

            // Warmth drops fast outdoors, especially if sinking
            let dropWarmth = isPlayerInterior ? 0.05 : 0.5;
            if (game.phase === 'sinking' && !isPlayerInterior) dropWarmth *= 4; // CRITICAL COLD IN WATER/DECK
            player.warmth = Math.max(0, player.warmth - dropWarmth);

            // Energy drops if hunger/warmth are low
            if (player.hunger < 20 || player.warmth < 20) {
                player.energy = Math.max(0, player.energy - 1.0);
            } else if (player.pose === 'lie') {
                player.energy = Math.min(100, player.energy + 2.0);
            } else if (player.pose === 'sit') {
                player.energy = Math.min(100, player.energy + 1.0);
            } else {
                player.energy = Math.max(0, player.energy - 0.2); // natural standing drain
            }

            const avgStatus = (player.hunger + player.warmth + player.energy) / 3;
            player.mood += (avgStatus - player.mood) * 0.1;
        }

        // 3. Status Alerts (Atmospheric callouts)
        if (player.warmth < 15 && Math.random() < 0.01) showMessage(`${player.name}: Я замерзаю...`);
        if (player.hunger < 15 && Math.random() < 0.01) showMessage(`${player.name}: Потрібно поїсти...`);
        if (player.energy < 15 && Math.random() < 0.01) showMessage(`${player.name}: Сил більше немає...`);

        // Interaction overrides (Only if controlled)
        if (game.controlMode === p) {
            const mesh = p === 'jack' ? jackMesh : roseMesh;
            if (game.keys['f'] || game.keys['F']) {
                if (currentStationType === 'food') {
                    player.pose = 'eat';
                    player.hunger = Math.min(100, player.hunger + 1.0);
                } else if (game.time % 1 < 0.1) {
                    showMessage("Потрібно підійти до столу щоб поїсти");
                }
            } else if (game.keys['x'] || game.keys['X']) {
                game.keys['x'] = false; game.keys['X'] = false;
                if (currentStationType === 'sleep') {
                    player.pose = player.pose === 'lie' ? 'stand' : 'lie';
                } else {
                    showMessage("Відпочивати можна лише у каюті біля ліжка");
                }
            } else if (game.keys['c'] || game.keys['C']) {
                game.keys['c'] = false; game.keys['C'] = false;
                player.pose = player.pose === 'bow' ? 'stand' : 'bow';
            } else if (game.keys['z'] || game.keys['Z']) {
                game.keys['z'] = false; game.keys['Z'] = false;
                player.pose = player.pose === 'sit' ? 'stand' : 'sit';
            } else if (p === 'rose' && (game.keys['l'] || game.keys['L'])) {
                const dist = Math.hypot(game.players.jack.x - game.players.rose.x, game.players.jack.z - game.players.rose.z);
                if (dist < 8) {
                    player.pose = 'fly';
                    player.mood = 100;
                    game.players.jack.pose = 'fly';
                } else {
                    player.pose = 'stand';
                }
            } else {
                if (player.pose === 'eat' || player.pose === 'fly') player.pose = 'stand';
                if (isMovingNow && ['sit', 'lie', 'bow'].includes(player.pose)) player.pose = 'stand';
            }
            if (mesh) {
                player.x = mesh.position.x;
                player.z = mesh.position.z;
            }
        }

        // Visual fly sync
        if (p === 'jack' && game.players.rose.pose === 'fly') {
            const dist = Math.hypot(game.players.jack.x - game.players.rose.x, game.players.jack.z - game.players.rose.z);
            if (dist < 8) player.pose = 'fly';
        }

        // Update UI
        const bars = {
            hunger: document.getElementById(p + '-hunger'),
            warmth: document.getElementById(p + '-warmth'),
            energy: document.getElementById(p + '-energy'),
            mood: document.getElementById(p + '-mood')
        };
        
        Object.entries(bars).forEach(([stat, el]) => {
            if (!el) return;
            const val = player[stat];
            el.style.width = val + '%';
            
            // Color Coding: Red (<25), Orange (<50), Greenish (>50)
            if (val < 25) el.style.background = '#ff4444';
            else if (val < 50) el.style.background = '#ffaa44';
            else {
                // Restore defaults
                if (stat === 'energy') el.style.background = '#4af';
                else if (stat === 'mood') el.style.background = '#f4a';
                else el.style.background = 'linear-gradient(90deg, #8a6d2b, #c9a240)';
            }
        });
    });

    // Apply updated animations to mesh
    if (jackMesh) updateCharacterPose(jackMesh, game.players.jack.pose);
    if (roseMesh) updateCharacterPose(roseMesh, game.players.rose.pose);


    // Physics mapping for both characters
    ['jack', 'rose'].forEach(key => {
        const mesh = key === 'jack' ? jackMesh : roseMesh;
        if (!mesh) return; // fail-safe for tests
        const playerState = game.players[key];
        if (playerState.saved) return; // Keep them sitting in the lifeboat

        if (isInterior) {
            if (mesh.parent !== scene) { scene.add(mesh); }
            mesh.position.x = Math.max(-28, Math.min(mesh.position.x, 28));
            mesh.position.z = Math.max(-18, Math.min(mesh.position.z, 18));
            mesh.position.y = yOffset + 2.25;
            if (mesh.userData && (mesh.userData.dirX !== 0 || mesh.userData.dirZ !== 0)) {
                mesh.rotation.y = Math.atan2(mesh.userData.dirX, mesh.userData.dirZ);
            }
        } else {
            // Outdoor Deck Rules: Characters become physical children of the tumbling ship parts
            let target = shipGroup;
            if (game.ship.isBroken) {
                target = mesh.position.x < 0 ? sternGroup : bowGroup;
            }
            if (mesh.parent !== target) { target.add(mesh); }

            const dLevel = playerState.deckLevel || 0;
            const bounds = DECK_LEVELS[dLevel];

            mesh.position.x = Math.max(bounds.minX, Math.min(mesh.position.x, bounds.maxX));
            mesh.position.z = Math.max(-bounds.zMax, Math.min(mesh.position.z, bounds.zMax));
            mesh.position.y = bounds.y;

            if (mesh.userData && (mesh.userData.dirX !== 0 || mesh.userData.dirZ !== 0)) {
                mesh.rotation.y = Math.atan2(mesh.userData.dirX, mesh.userData.dirZ);
            }

            // Lifeboat Rescue Jump trigger (Jump off when at edge of deck near X=10)
            if (game.phase === 'sinking' && rescueBoat) {
                rescueBoat.visible = true;
                // Dynamically keep lifeboat beside the ship's current steering position
                rescueBoat.position.z = game.ship.zPos + 18;
                
                // Allow jump if at railing (z > zMax-1) and near boat's X
                if (mesh.position.z > bounds.zMax - 1 && Math.abs(mesh.position.x - 10) < 15) {
                    playerState.saved = true;
                    rescueBoat.add(mesh);
                    mesh.position.set(key === 'jack' ? -1 : 1, 0.4, 0); // Position inside boat
                    showMessage(`Ура! ${playerState.name} у безпеці в шлюпці!`);
                }
            }
        }
    });
}

function gameLoop() {
    if (game.running) {
        game.time += 0.016;
        updateEnvironment(game.time);
        updateShip(shipGroup);
        updateGameplay();
        updateCamera();
    }
    renderer.render(scene, camera);
}

export { updateGameplay, init };

// Window load init (only if game container exists)
if (document.getElementById('game-container')) {
    init();
}
