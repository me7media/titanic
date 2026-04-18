import { game, ROOM_ORDER, ROOM_Y_POSITIONS } from './state.js';
import { initAudio } from './audio.js';
import { initEnvironment, updateEnvironment } from './environment.js';
import { initShip, updateShip } from './ship.js';
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
    container.insertBefore(renderer.domElement, document.getElementById('ui-overlay'));

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
        new THREE.MeshBasicMaterial({color: 0xffffff, fog: false}) // Immune to fog
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

    // Rescue Lifeboat in the water
    rescueBoat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({color: 0xdddddd});
    const woodMat = new THREE.MeshStandardMaterial({color: 0x5a3311});

    // Main hull
    const sHull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 8), hullMat);
    sHull.position.y = 0.6;
    rescueBoat.add(sHull);
    
    // Tapered bow and stern using 3-sided cylinders
    const bow = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.2, 3), hullMat);
    bow.position.set(0, 0.6, 4);
    bow.rotation.y = Math.PI / 6;
    rescueBoat.add(bow);
    
    const stern = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.2, 3), hullMat);
    stern.position.set(0, 0.6, -4);
    stern.rotation.y = -Math.PI / 6 + Math.PI;
    rescueBoat.add(stern);

    // Wooden seats
    for(let z = -3.5; z <= 3.5; z += 1.7) {
        let seatWidth = 3.6;
        if (Math.abs(z) > 2) seatWidth = 2.4;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(seatWidth, 0.1, 0.8), woodMat);
        seat.position.set(0, 1.2, z);
        rescueBoat.add(seat);
    }
    
    // Set position and default visibility
    rescueBoat.position.set(10, 0.5, 12);
    rescueBoat.visible = false;
    scene.add(rescueBoat);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', e => game.keys[e.key] = true);
    window.addEventListener('keyup', e => game.keys[e.key] = false);

    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // Add event listener for close button on Help Menu
    const closeHelpMenu = document.getElementById('close-help');
    if (closeHelpMenu) {
        closeHelpMenu.addEventListener('click', () => {
            document.getElementById('help-menu').classList.add('hidden');
        });
    }

    renderer.setAnimationLoop(gameLoop);
}

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
    setTimeout(() => { if(msgBox.innerHTML.includes(text)) msgBox.innerHTML = oldHtml; }, 2000);
}

function startGame() {
    initAudio();
    document.getElementById('start-screen').style.opacity = 0;
    setTimeout(() => {
        document.getElementById('start-screen').style.display = 'none';
        game.running = true;
        showMessage("Гра розпочата. Натискай '1', '2', '3' для керування. 'K' для кімнат.");
    }, 800);
}

function updateCamera() {
    const isInterior = game.currentRoom !== 'deck';
    const yOffset = ROOM_Y_POSITIONS[game.currentRoom];
    
    if (isInterior) {
        scene.fog = null; // No fog indoors
        // Dim global exterior lights so interior point lights stand out
        ambientLight.intensity = 0.1;
        hemiLight.intensity = 0.1;
        moonLight.intensity = 0.0;
        
        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        // Float tracking camera (third person interior view)
        camera.position.lerp(new THREE.Vector3(activeMesh.position.x * 0.4, yOffset + 12, activeMesh.position.z + 16), 0.05);
        camera.lookAt(new THREE.Vector3(activeMesh.position.x * 0.8, yOffset + 4, activeMesh.position.z - 8));
    } else {
        scene.fog = new THREE.FogExp2(0x08101a, 0.0025); // Bring fog back outdoors
        // Restore bright global moonlight
        ambientLight.intensity = 2.0;
        hemiLight.intensity = 1.2;
        moonLight.intensity = 2.0;
        
        if (game.controlMode === 'ship') {
            const isSteering = game.keys['ArrowUp'] || game.keys['w'] || 
                               game.keys['ArrowDown'] || game.keys['s'] || 
                               game.keys['ArrowLeft'] || game.keys['a'] || 
                               game.keys['ArrowRight'] || game.keys['d'];
                               
            if (isSteering) {
                // Tactical steering view: lock tightly behind stern (-150X) looking strictly ahead (+50X)
                const targetCam = new THREE.Vector3(-150, 45, game.ship.zPos);
                camera.position.lerp(targetCam, 0.08); // Responsive snap
                camera.lookAt(50, 10, game.ship.zPos);
            } else {
                // Cinematic slow orbit
                const camX = Math.sin(game.time * 0.1) * 110;
                const camZ = game.ship.zPos + Math.cos(game.time * 0.1) * 70;
                camera.position.lerp(new THREE.Vector3(camX, 35, camZ), 0.01);
                camera.lookAt(0, 15, game.ship.zPos);
            }
        } else if (game.controlMode === 'freecam') {
            if (game.keys['ArrowUp'] || game.keys['w']) camera.position.z -= 1.5;
            if (game.keys['ArrowDown'] || game.keys['s']) camera.position.z += 1.5;
            if (game.keys['ArrowLeft'] || game.keys['a']) camera.position.x -= 1.5;
            if (game.keys['ArrowRight'] || game.keys['d']) camera.position.x += 1.5;
            camera.lookAt(0, 10, 0);
        } else {
            const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
            const worldPos = new THREE.Vector3();
            activeMesh.getWorldPosition(worldPos);
            camera.position.lerp(new THREE.Vector3(worldPos.x, worldPos.y + 15, worldPos.z + 40), 0.05);
            camera.lookAt(worldPos);
        }
    }
}

function updateGameplay() {
    const isInterior = game.currentRoom !== 'deck';
    const yOffset = ROOM_Y_POSITIONS[game.currentRoom];

    // Inputs
    if (game.keys['1']) { game.controlMode = 'ship'; showMessage("Керування: Корабель"); }
    if (game.keys['2']) { game.controlMode = 'jack'; showMessage("Керування: Джек"); }
    if (game.keys['3']) { game.controlMode = 'rose'; showMessage("Керування: Роуз"); }
    
    if (game.keys['p'] || game.keys['P']) {
        game.keys['p'] = false; game.keys['P'] = false;
        game.controlMode = 'freecam';
        showMessage("Режим: Вільна Камера (Літати на стрілочках)");
    }
    
    if (game.keys['t'] || game.keys['T']) {
        game.keys['t'] = false; game.keys['T'] = false;
        if (game.icebergMode === 'off') { game.icebergMode = 'normal'; showMessage('Айсберги: Обережно (x1)'); }
        else if (game.icebergMode === 'normal') { game.icebergMode = 'double'; showMessage('Айсберги: Збільшено (x2)'); }
        else { game.icebergMode = 'off'; showMessage('Айсберги: Вимкнено'); }
    }

    document.getElementById('mode-indicator').textContent = game.controlMode === 'ship' ? 'Корабель' : (game.controlMode === 'freecam' ? 'Вільна Камера' : game.players[game.controlMode].name);

    if (game.keys['k'] || game.keys['K']) {
        game.keys['k'] = false; game.keys['K'] = false;
        const idx = ROOM_ORDER.indexOf(game.currentRoom);
        game.currentRoom = ROOM_ORDER[(idx + 1) % ROOM_ORDER.length];
        showMessage(`Кімната: ${game.currentRoom.toUpperCase()}`);
    }
    
    if (game.keys['h'] || game.keys['H']) {
        game.keys['h'] = false; game.keys['H'] = false;
        const helpMenu = document.getElementById('help-menu');
        if (helpMenu) helpMenu.classList.toggle('hidden');
    }
    
    if (game.keys['q'] || game.keys['Q']) {
        game.keys['q'] = false;
        if (!isInterior) {
            game.players[game.controlMode].deckLevel = Math.max(0, (game.players[game.controlMode].deckLevel || 0) - 1);
            showMessage("Спуск на палубу нижче");
        }
    }
    if (game.keys['e'] || game.keys['E']) {
        game.keys['e'] = false;
        if (!isInterior) {
            game.players[game.controlMode].deckLevel = Math.min(4, (game.players[game.controlMode].deckLevel || 0) + 1);
            showMessage("Підйом на палубу вище");
        }
    }

    // Move Logic
    if (game.controlMode === 'ship' && !isInterior) {
        if (game.keys['ArrowUp'] || game.keys['w']) game.ship.speed = Math.min(3, game.ship.speed + 0.02);
        if (game.keys['ArrowDown'] || game.keys['s']) game.ship.speed = Math.max(0, game.ship.speed - 0.02);
        
        // Allow Ship Steering (A/D)
        game.ship.zPos = game.ship.zPos || 0;
        if (game.keys['ArrowLeft'] || game.keys['a']) game.ship.zPos += 0.8; 
        if (game.keys['ArrowRight'] || game.keys['d']) game.ship.zPos -= 0.8;
    } else if (game.controlMode === 'jack' || game.controlMode === 'rose') {
        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        activeMesh.userData = activeMesh.userData || { dirX: 0, dirZ: 0 };
        const spd = (game.keys['Shift'] ? 0.45 : 0.25) * (game.currentRoom === 'deck' ? 1.0 : 0.7);

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

        // Gameplay Actions & Energy System
        ['jack', 'rose'].forEach(p => {
            const player = game.players[p];
            
            // Survival degradation
            if (game.time % 2 < 0.02) { // tick roughly every 2 seconds
                player.hunger = Math.max(0, player.hunger - (player.pose === 'lie' ? 0.05 : 0.2));
                
                // Warmth drops fast outdoors, especially if sinking
                let dropWarmth = isInterior ? 0.05 : 0.5;
                if (game.phase === 'sinking') dropWarmth *= 2;
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
                
                // Mood reflects aggregate state
                const avgStatus = (player.hunger + player.warmth + player.energy) / 3;
                player.mood += (avgStatus - player.mood) * 0.1;
            }
            
            // Interaction overrides (Toggles)
            if (game.controlMode === p) {
                if (game.keys['f'] || game.keys['F']) { 
                    player.pose = 'eat';
                    player.hunger = Math.min(100, player.hunger + 1.0);
                    player.energy = Math.min(100, player.energy + 0.5);
                } else if (game.keys['x'] || game.keys['X']) { 
                    game.keys['x'] = false; game.keys['X'] = false;
                    player.pose = player.pose === 'lie' ? 'stand' : 'lie';
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
                    // Release F or L reverts to stand, others are strict toggles
                    if (player.pose === 'eat' || player.pose === 'fly') player.pose = 'stand';
                    // Auto-release from lay/sit/bow if user moves!
                    if (isMoving && ['sit', 'lie', 'bow'].includes(player.pose)) player.pose = 'stand';
                }
                
                // Breaking bounds update global state
                player.x = activeMesh.position.x;
                player.z = activeMesh.position.z;
            }
            
            // Visual logic overrides (Jack handles fly sync manually based on distance)
            if (p === 'jack' && game.players.rose.pose === 'fly') {
                const dist = Math.hypot(game.players.jack.x - game.players.rose.x, game.players.jack.z - game.players.rose.z);
                if (dist < 8) player.pose = 'fly';
            }

            // Update UI dynamically
            const hBar = document.getElementById(p + '-hunger');
            const wBar = document.getElementById(p + '-warmth');
            const eBar = document.getElementById(p + '-energy');
            const mBar = document.getElementById(p + '-mood');
            if(hBar) hBar.style.width = player.hunger + '%';
            if(wBar) wBar.style.width = player.warmth + '%';
            if(eBar) eBar.style.width = player.energy + '%';
            if(mBar) mBar.style.width = player.mood + '%';
        });

        // Apply updated animations to mesh
        updateCharacterPose(jackMesh, game.players.jack.pose);
        updateCharacterPose(roseMesh, game.players.rose.pose);
    }

    // Physics mapping for both characters
    ['jack', 'rose'].forEach(key => {
        const mesh = key === 'jack' ? jackMesh : roseMesh;
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
            if (game.phase === 'sinking') {
                rescueBoat.visible = true;
                if (mesh.position.z > bounds.zMax - 2 && Math.abs(mesh.position.x - 10) < 15) {
                    playerState.saved = true;
                    rescueBoat.add(mesh);
                    mesh.position.set(key === 'jack' ? -2 : 2, 0.5, 0); // Position inside boat
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

// Window load init (only if not in test mode)
if (!(window.location.pathname.includes('test.html'))) {
    init();
}
