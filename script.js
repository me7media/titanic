/**
 * Titanic 3D: Cinematic Noir Realism (WebGL Edition)
 * A true 3D survival experience built with Three.js
 */

// DOM Elements
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const modeIndicator = document.getElementById('current-mode');
const messageDisplay = document.getElementById('message-display');
const container = document.getElementById('game-container');

// Three.js Globals
let scene, camera, renderer;
let shipGroup, oceanMesh, moonLight;
let jackMesh, roseMesh;

// Global Game State
const ROOM_ORDER = ["deck", "dining", "cabin", "lounge", "corridor"];
let game = {
    running: false,
    phase: 'sailing', // 'sailing', 'sinking', 'gameover'
    controlMode: 'ship',
    currentRoom: 'deck',
    time: 0,
    waterLevel: 0,
    ship: {
        x: 0, z: 0, tilt: 0, sinkY: 0, speed: 1.2
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

// ==========================================
// 1. INITIALIZE THREE.JS ENGINE
// ==========================================
function init3D() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050a);
    scene.fog = new THREE.FogExp2(0x02050a, 0.003); // Lighter fog so we can see

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 150);
    camera.lookAt(0, 10, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping to brighten colors
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.insertBefore(renderer.domElement, document.getElementById('ui-overlay'));

    // Lighting (Brighter for visibility)
    const ambientLight = new THREE.AmbientLight(0x405060, 1.5); // Brighter cold ambient
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x050d1a, 0.8);
    scene.add(hemiLight);

    moonLight = new THREE.DirectionalLight(0xddeeff, 1.8);
    moonLight.position.set(-50, 100, 50); // Move moon light to front-left
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.left = -80;
    moonLight.shadow.camera.right = 80;
    moonLight.shadow.camera.top = 80;
    moonLight.shadow.camera.bottom = -80;
    scene.add(moonLight);

    createEnvironment();
    createTitanic();
    createInteriors(); // 3D Rooms
    createCharacters();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', e => game.keys[e.key] = true);
    window.addEventListener('keyup', e => game.keys[e.key] = false);

    startBtn.addEventListener('click', startGame);

    renderer.setAnimationLoop(gameLoop);
}

// ==========================================
// 2. PROCEDURAL 3D ASSETS
// ==========================================
function createEnvironment() {
    // Ocean Plane
    const oceanGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
    const oceanMat = new THREE.MeshStandardMaterial({
        color: 0x010308,
        roughness: 0.2,
        metalness: 0.8,
        wireframe: false
    });
    oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 1500; i++) {
        starPos.push(
            (Math.random() - 0.5) * 400,
            Math.random() * 200 + 20,
            (Math.random() - 0.5) * 400 - 100
        );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffee, size: 0.7, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
}

function createTitanic() {
    shipGroup = new THREE.Group();

    // Noir/Historical Materials
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.3 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x5a1b1b, roughness: 0.9, metalness: 0.1 }); // Deep Red
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfffcf0, roughness: 0.6 }); // Cream white
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    const funnelMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, roughness: 0.7 }); // Buff/Gold
    const funnelTopMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 }); // Rigging

    // ======= HULL =======
    const hullGeo = new THREE.CylinderGeometry(15, 15, 140, 32);
    hullGeo.rotateZ(Math.PI / 2);
    hullGeo.scale(1, 1, 0.5); // Increase width slightly

    const mainHull = new THREE.Mesh(hullGeo, hullMat);
    mainHull.position.y = 10; // Top of hull is at Y=25
    mainHull.castShadow = true; mainHull.receiveShadow = true;
    shipGroup.add(mainHull);

    // Red Underbelly
    const bottomGeo = new THREE.CylinderGeometry(14.8, 14.8, 138, 32);
    bottomGeo.rotateZ(Math.PI / 2); bottomGeo.scale(1, 1, 0.5);
    const bottomHull = new THREE.Mesh(bottomGeo, bottomMat);
    bottomHull.position.y = -1;
    shipGroup.add(bottomHull);

    // Deck Surface (Wood)
    const deckGeo = new THREE.BoxGeometry(132, 0.5, 11);
    const mainDeck = new THREE.Mesh(deckGeo, woodMat);
    mainDeck.position.y = 25; // Flush with hull top
    mainDeck.receiveShadow = true;
    shipGroup.add(mainDeck);

    // ======= SUPERSTRUCTURE =======
    const buildTier = (w, baseH, depth, yLevel) => {
        const geo = new THREE.BoxGeometry(w, baseH, depth);
        const mesh = new THREE.Mesh(geo, whiteMat);
        mesh.position.y = yLevel;
        mesh.castShadow = true; mesh.receiveShadow = true;
        shipGroup.add(mesh);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, depth), woodMat);
        roof.position.y = yLevel + (baseH / 2);
        shipGroup.add(roof);
    };

    // Build stacks on top of deck
    buildTier(80, 4, 10, 27);   // C Deck
    buildTier(70, 4, 9, 31);    // B Deck
    buildTier(60, 3, 8.5, 34.5); // A Deck / Boat Deck (Y=36 top)
    buildTier(45, 2, 8, 37);    // Officers quarters

    // ======= FUNNELS =======
    const RAKE = -0.15;
    const funnelObjGeo = new THREE.CylinderGeometry(1.6, 1.6, 12, 16);
    const funnelCapGeo = new THREE.CylinderGeometry(1.65, 1.65, 2.5, 16);
    
    const funnelPositions = [];
    for (let i = 0; i < 4; i++) {
        const cx = 22 - (i * 16);
        const cy = 44; // Raised relative to new superstructure
        funnelPositions.push(new THREE.Vector3(cx, cy, 0));

        const funnel = new THREE.Mesh(funnelObjGeo, funnelMat);
        funnel.position.set(cx, cy, 0);
        funnel.rotation.z = RAKE;
        funnel.castShadow = true;
        
        const fTop = new THREE.Mesh(funnelCapGeo, funnelTopMat);
        fTop.position.set(cx - 1.0, cy + 6, 0);
        fTop.rotation.z = RAKE;
        
        shipGroup.add(funnel);
        shipGroup.add(fTop);
    }

    // ======= MASTS & RIGGING =======
    const mastGeo = new THREE.CylinderGeometry(0.3, 0.5, 45, 8);
    const foremast = new THREE.Mesh(mastGeo, woodMat);
    foremast.position.set(55, 40, 0);
    foremast.rotation.z = RAKE;
    shipGroup.add(foremast);
    
    const mainmast = new THREE.Mesh(mastGeo, woodMat);
    mainmast.position.set(-60, 40, 0);
    mainmast.rotation.z = RAKE;
    shipGroup.add(mainmast);
    // Simple rigging line
    const createWire = (v1, v2) => {
        const points = [v1, v2];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, wireMat);
        shipGroup.add(line);
    };

    // Rig wires
    createWire(new THREE.Vector3(55, 62, 0), funnelPositions[0]);
    createWire(new THREE.Vector3(-60, 62, 0), funnelPositions[3]);
    createWire(new THREE.Vector3(55, 62, 0), new THREE.Vector3(70, 25, 0));

    // Portholes
    const portGeo = new THREE.CircleGeometry(0.3, 8);
    const portMat = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    for (let i = -50; i < 50; i += 3) {
        if (Math.random() > 0.2) {
            const p = new THREE.Mesh(portGeo, portMat);
            p.position.set(i, 20, 7) // Positioned slightly above water
            shipGroup.add(p);
            const p2 = p.clone();
            p2.position.set(i, 20, -7);
            p2.rotation.y = Math.PI;
            shipGroup.add(p2);
        }
    }

    scene.add(shipGroup);
}

// Global dictionary for room base Y positions to keep them separated
const ROOM_Y_POSITIONS = { 'deck': 0, 'dining': -200, 'cabin': -400, 'lounge': -600, 'corridor': -800 };

function createInteriors() {
    // We create isolated 3D dioramas below the ocean map per room
    const rooms = ['dining', 'cabin', 'lounge', 'corridor'];
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, side: THREE.BackSide, roughness: 0.9 }); // Wood panelling inside
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b1414, roughness: 1.0 }); // Red Carpet
    
    rooms.forEach(room => {
        const yBase = ROOM_Y_POSITIONS[room];
        
        // Structure Room Box (Inverse size)
        const roomBox = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 30), wallMat);
        roomBox.position.set(0, yBase + 7.5, 0);
        roomBox.receiveShadow = true;
        scene.add(roomBox);

        // Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, yBase, 0);
        floor.receiveShadow = true;
        scene.add(floor);

        // Warm Interior Ambient Light
        const pLight = new THREE.PointLight(0xffddaa, 1.5, 60);
        pLight.position.set(0, yBase + 10, 0);
        pLight.castShadow = true;
        scene.add(pLight);
    });
}

function buildHuman(type) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({color: 0xffdcb1, roughness: 0.6});
    
    // Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 3.5;
    head.castShadow = true;
    group.add(head);
    
    if (type === 'jack') {
        // Jack's Hair (Blonde)
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), new THREE.MeshStandardMaterial({color: 0xcdaa55, roughness: 0.8}));
        hair.position.y = 4.0;
        hair.castShadow = true;
        group.add(hair);
        
        // Torso (White shirt)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.6), new THREE.MeshStandardMaterial({color: 0xdddddd, roughness: 0.9}));
        torso.position.y = 2.2;
        torso.castShadow = true;
        group.add(torso);
        
        // Pants (Dark blue)
        const pants = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.5, 0.65), new THREE.MeshStandardMaterial({color: 0x223344}));
        pants.position.y = 0.75;
        pants.castShadow = true;
        group.add(pants);
        
        // Arms
        const armGeo = new THREE.BoxGeometry(0.4, 1.5, 0.4);
        const armL = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({color: 0xdddddd}));
        armL.position.set(-0.8, 2.2, 0); armL.castShadow = true;
        group.add(armL);
        const armR = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({color: 0xdddddd}));
        armR.position.set(0.8, 2.2, 0); armR.castShadow = true;
        group.add(armR);
    } else {
        // Rose's Hair (Red)
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 0.9), new THREE.MeshStandardMaterial({color: 0xaa2211, roughness: 0.8}));
        hair.position.y = 3.6; hair.castShadow = true;
        group.add(hair);
        
        // Dress Torso
        const dressTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.6), new THREE.MeshStandardMaterial({color: 0x8b0000}));
        dressTop.position.y = 2.2; dressTop.castShadow = true;
        group.add(dressTop);
        
        // Dress Skirt (Cone)
        const skirtGeo = new THREE.CylinderGeometry(0.6, 1.4, 2.0, 8);
        const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({color: 0x8b0000}));
        skirt.position.y = 1.0; skirt.castShadow = true;
        group.add(skirt);
        
        // Arms
        const armGeo = new THREE.BoxGeometry(0.3, 1.4, 0.3);
        const armL = new THREE.Mesh(armGeo, skinMat);
        armL.position.set(-0.7, 2.2, 0); armL.castShadow = true;
        group.add(armL);
        const armR = new THREE.Mesh(armGeo, skinMat);
        armR.position.set(0.7, 2.2, 0); armR.castShadow = true;
        group.add(armR);
    }
    
    // Scale down a bit to match the hull
    group.scale.set(0.8, 0.8, 0.8);
    return group;
}

function createCharacters() {
    jackMesh = buildHuman('jack');
    jackMesh.position.set(game.players.jack.x, 38, game.players.jack.z);
    scene.add(jackMesh);

    roseMesh = buildHuman('rose');
    roseMesh.position.set(game.players.rose.x, 38, game.players.rose.z);
    scene.add(roseMesh);
}

// ==========================================
// 3. CORE GAME LOGIC
// ==========================================
function startGame() {
    initAudio();
    startScreen.classList.add('fade-out');
    setTimeout(() => { startScreen.style.display = 'none'; }, 800);
    game.phase = 'sailing';
    game.running = true;
    showMessage("🚢 Прямуємо до Нью-Йорка...");
}

function showMessage(msg) {
    messageDisplay.textContent = msg;
    setTimeout(() => messageDisplay.textContent = '', 4000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// 4. ANIMATION & UPDATE LOOP
// ==========================================
function update() {
    if (!game.running) return;
    
    game.time += 0.016; // Approx delta time

    // Mode Switching
    if (game.keys['1']) game.controlMode = 'ship';
    if (game.keys['2']) game.controlMode = 'jack';
    if (game.keys['3']) game.controlMode = 'rose';

    // UI Update
    modeIndicator.textContent = game.controlMode === 'ship' ? 'Корабель' : game.players[game.controlMode].name;

    // Room Switching Logic (Keys 'M' or mouse)
    if (game.keys['m'] || game.keys['M']) {
        game.keys['m'] = false; // debounce
        const idx = ROOM_ORDER.indexOf(game.currentRoom);
        game.currentRoom = ROOM_ORDER[(idx + 1) % ROOM_ORDER.length];
        showMessage(`Кімната: ${game.currentRoom.toUpperCase()}`);
    }

    // Render Layer Visibility Context
    const yOffset = ROOM_Y_POSITIONS[game.currentRoom];
    const isInterior = game.currentRoom !== 'deck';
    oceanMesh.visible = !isInterior;
    shipGroup.visible = !isInterior;

    // Control Logic
    if (game.controlMode === 'ship' && !isInterior) {
        if (game.keys['ArrowUp'] || game.keys['w']) game.ship.speed = Math.min(3, game.ship.speed + 0.02);
        if (game.keys['ArrowDown'] || game.keys['s']) game.ship.speed = Math.max(0.5, game.ship.speed - 0.02);
    } else if (game.controlMode !== 'ship') {
        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        if (game.keys['ArrowLeft'] || game.keys['a']) activeMesh.position.x -= 0.4;
        if (game.keys['ArrowRight'] || game.keys['d']) activeMesh.position.x += 0.4;
        if (game.keys['ArrowUp'] || game.keys['w']) activeMesh.position.z -= 0.4;
        if (game.keys['ArrowDown'] || game.keys['s']) activeMesh.position.z += 0.4;

        // Bounding
        if (isInterior) {
            activeMesh.position.x = Math.max(-18, Math.min(activeMesh.position.x, 18));
            activeMesh.position.z = Math.max(-13, Math.min(activeMesh.position.z, 13));
            activeMesh.position.y = yOffset + 2.25; // Floor + cylinder half-height
        } else {
            activeMesh.position.x = Math.max(-28, Math.min(activeMesh.position.x, 28));
            activeMesh.position.z = Math.max(-5, Math.min(activeMesh.position.z, 5));
            // Keep on deck, accounting for ship tilt
            const shipRot = shipGroup.rotation.z;
            // Rough mapping to follow the angle of the deck
            activeMesh.position.y = 38 + game.ship.sinkY + (activeMesh.position.x * Math.sin(-shipRot)); 
        }
    }

    // Inactive Character stays in current room
    const otherMesh = game.controlMode === 'jack' ? roseMesh : jackMesh;
    // Just force the other mesh down to floor if it isn't moving
    if (isInterior && otherMesh.position.y > -50) { 
        otherMesh.position.y = yOffset + 2.25; 
    } else if (!isInterior && otherMesh.position.y < -50) {
        otherMesh.position.y = 38 + game.ship.sinkY + (otherMesh.position.x * Math.sin(-shipGroup.rotation.z));
    }



    // Ship Sinking Physics (Mockup over time)
    if (game.time > 10) {
        if (game.phase === 'sailing') {
            game.phase = 'sinking';
            showMessage("⚠ АЙСБЕРГ! Корабель тоне!");
        }
        
        // Gentle tilt physics
        game.ship.tilt = Math.min(0.3, game.ship.tilt + 0.0001);
        game.ship.sinkY -= 0.005;
        
        // Apply to 3D Group
        shipGroup.rotation.z = game.ship.tilt;
        shipGroup.position.y = game.ship.sinkY;
    }

    // Ocean Waves Animation
    const positions = oceanMesh.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        // Deform Z strictly based on X/Y to create waves
        const vx = positions[i];
        const vy = positions[i+1];
        positions[i+2] = Math.sin(vx * 0.05 + game.time * 2) * 1.5 + Math.cos(vy * 0.05 + game.time * 1.5) * 1.5;
    }
    oceanMesh.geometry.attributes.position.needsUpdate = true;

    // Dynamic Camera
    if (isInterior) {
        // Look around inside the 3D diorama box
        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        camera.position.lerp(new THREE.Vector3(0, yOffset + 12, 12), 0.05);
        camera.lookAt(new THREE.Vector3(0, yOffset, 0));
    } else {
        if (game.controlMode === 'ship') {
            const camX = Math.sin(game.time * 0.1) * 120; // Orbit wider
            const camZ = 100 + Math.cos(game.time * 0.1) * 40;
            camera.position.lerp(new THREE.Vector3(camX, 40, camZ), 0.02);
            camera.lookAt(0, 15, 0);
        } else {
            // Follow Character on Deck
            const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
            const worldPos = new THREE.Vector3();
            activeMesh.getWorldPosition(worldPos);
            
            // Placed behind and slightly above the character
            camera.position.lerp(new THREE.Vector3(worldPos.x, worldPos.y + 15, worldPos.z + 40), 0.05);
            camera.lookAt(worldPos);
        }
    }
}

function gameLoop() {
    update();
    renderer.render(scene, camera);
}

// ==========================================
// 5. AUDIO SYSTEM (Synthesized)
// ==========================================
function initAudio() {
    if (game.audio.active) return;
    try {
        game.audio.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // White Noise for Ocean
        const bufferSize = 4096;
        const noiseNode = game.audio.ctx.createScriptProcessor(bufferSize, 1, 1);
        let lastOut = 0;
        noiseNode.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise
                lastOut = output[i];
                output[i] *= 4.0;
            }
        };

        const oceanFilter = game.audio.ctx.createBiquadFilter();
        oceanFilter.type = 'lowpass';
        oceanFilter.frequency.value = 400;

        const mainGain = game.audio.ctx.createGain();
        mainGain.gain.value = 0.5;

        noiseNode.connect(oceanFilter);
        oceanFilter.connect(mainGain);
        mainGain.connect(game.audio.ctx.destination);

        game.audio.active = true;
    } catch (e) {
        console.warn('Audio Init Error:', e);
    }
}

// Ignite the engine
window.onload = init3D;
