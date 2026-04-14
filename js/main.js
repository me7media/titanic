import { game, ROOM_ORDER, ROOM_Y_POSITIONS } from './state.js';
import { initAudio } from './audio.js';
import { initEnvironment, updateEnvironment } from './environment.js';
import { initShip, updateShip } from './ship.js';
import { initCharacters } from './characters.js';
import { initInteriors } from './interiors.js';

let scene, camera, renderer;
let shipGroup;
let jackMesh, roseMesh;

function init() {
    const container = document.getElementById('game-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050a); // Deep Noir Sky
    scene.fog = new THREE.FogExp2(0x02050a, 0.003); // Lighter mist

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

    // Global Lighting
    const ambientLight = new THREE.AmbientLight(0x405060, 1.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x050d1a, 0.8);
    scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0xddeeff, 1.8);
    moonLight.position.set(-50, 100, 50);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.left = -80;
    moonLight.shadow.camera.right = 80;
    moonLight.shadow.camera.top = 80;
    moonLight.shadow.camera.bottom = -80;
    scene.add(moonLight);

    // Init Modules
    initEnvironment(scene);
    shipGroup = initShip(scene);
    initInteriors(scene);
    
    const chars = initCharacters(scene);
    jackMesh = chars.jackMesh;
    roseMesh = chars.roseMesh;

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', e => game.keys[e.key] = true);
    window.addEventListener('keyup', e => game.keys[e.key] = false);

    document.getElementById('start-btn').addEventListener('click', startGame);

    renderer.setAnimationLoop(gameLoop);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function showMessage(text) {
    const devParams = document.getElementById('dev-params');
    const oldHtml = devParams.innerHTML;
    devParams.innerHTML = `<span style="color:#ccaa55; font-size:16px;">${text}</span>`;
    setTimeout(() => { devParams.innerHTML = oldHtml; }, 2000);
}

function startGame() {
    initAudio();
    document.getElementById('start-screen').style.opacity = 0;
    setTimeout(() => {
        document.getElementById('start-screen').style.display = 'none';
        game.running = true;
        showMessage("Гра розпочата. Натискай '1', '2', '3' для керування. 'M' для кімнат.");
    }, 800);
}

function updateCamera() {
    const isInterior = game.currentRoom !== 'deck';
    const yOffset = ROOM_Y_POSITIONS[game.currentRoom];
    
    if (isInterior) {
        camera.position.lerp(new THREE.Vector3(0, yOffset + 12, 12), 0.05);
        camera.lookAt(new THREE.Vector3(0, yOffset, 0));
    } else {
        if (game.controlMode === 'ship') {
            const camX = Math.sin(game.time * 0.1) * 120;
            const camZ = 100 + Math.cos(game.time * 0.1) * 40;
            camera.position.lerp(new THREE.Vector3(camX, 40, camZ), 0.02);
            camera.lookAt(0, 15, 0);
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

    document.getElementById('mode-indicator').textContent = game.controlMode === 'ship' ? 'Корабель' : game.players[game.controlMode].name;

    if (game.keys['m'] || game.keys['M']) {
        game.keys['m'] = false; 
        const idx = ROOM_ORDER.indexOf(game.currentRoom);
        game.currentRoom = ROOM_ORDER[(idx + 1) % ROOM_ORDER.length];
        showMessage(`Кімната: ${game.currentRoom.toUpperCase()}`);
    }

    // Move Logic
    if (game.controlMode === 'ship' && !isInterior) {
        if (game.keys['ArrowUp'] || game.keys['w']) game.ship.speed = Math.min(3, game.ship.speed + 0.02);
        if (game.keys['ArrowDown'] || game.keys['s']) game.ship.speed = Math.max(0.5, game.ship.speed - 0.02);
    } else if (game.controlMode !== 'ship') {
        const activeMesh = game.controlMode === 'jack' ? jackMesh : roseMesh;
        if (game.keys['ArrowLeft'] || game.keys['a']) activeMesh.position.x -= 0.4;
        if (game.keys['ArrowRight'] || game.keys['d']) activeMesh.position.x += 0.4;
        if (game.keys['ArrowUp'] || game.keys['w']) activeMesh.position.z -= 0.4;
        if (game.keys['ArrowDown'] || game.keys['s']) activeMesh.position.z += 0.4;

        if (isInterior) {
            activeMesh.position.x = Math.max(-18, Math.min(activeMesh.position.x, 18));
            activeMesh.position.z = Math.max(-13, Math.min(activeMesh.position.z, 13));
            activeMesh.position.y = yOffset + 2.25;
        } else {
            activeMesh.position.x = Math.max(-28, Math.min(activeMesh.position.x, 28));
            activeMesh.position.z = Math.max(-5, Math.min(activeMesh.position.z, 5));
            activeMesh.position.y = 38 + game.ship.sinkY + (activeMesh.position.x * Math.sin(-shipGroup.rotation.z));
        }
    }

    // Adjust inactive player
    const otherMesh = game.controlMode === 'jack' ? roseMesh : jackMesh;
    if (isInterior && otherMesh.position.y > -50) { 
        otherMesh.position.y = yOffset + 2.25; 
    } else if (!isInterior && otherMesh.position.y < -50) {
        otherMesh.position.y = 38 + game.ship.sinkY + (otherMesh.position.x * Math.sin(-shipGroup.rotation.z));
    }
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

// Window load init
init();
