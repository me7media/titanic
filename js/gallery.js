import { game, ROOM_Y_POSITIONS } from './state.js';
import { initEnvironment } from './environment.js';
import { initShip, buildDetailedLifeboat } from './ship.js';
import { initCharacters } from './characters.js';
import { initInteriors } from './interiors.js';

let scene, camera, renderer, currentObject;
let azimuth = 0, polar = 1, distance = 100;
let isDragging = false, lastMouseX, lastMouseY;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a14);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Basic Studio Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(amb);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 100, 50);
    scene.add(sun);

    setupControls();
    setupButtons();
    
    // Default view
    showView('ship');
    animate();
}

function setupControls() {
    window.addEventListener('mousedown', e => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; document.body.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { isDragging = false; document.body.style.cursor = 'grab'; });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        azimuth -= dx * 0.01;
        polar = Math.max(0.1, Math.min(Math.PI - 0.1, polar + dy * 0.01));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    window.addEventListener('wheel', e => {
        distance = Math.max(2, Math.min(500, distance + e.deltaY * 0.1));
    });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function clearGallery() {
    if (currentObject) {
        scene.remove(currentObject);
        currentObject = null;
    }
    // Clean up auxiliary interior rooms
    scene.children.forEach(child => {
        if (child.userData && child.userData.galleryItem) {
            scene.remove(child);
        }
    });
}

function showView(type) {
    clearGallery();
    
    switch(type) {
        case 'ship':
            distance = 200; azimuth = -0.5; polar = 1.2;
            currentObject = initShip(scene); 
            break;
        case 'boat':
            distance = 15; azimuth = 0.5; polar = 1.0;
            currentObject = buildDetailedLifeboat();
            scene.add(currentObject);
            break;
        case 'chars':
            distance = 10; azimuth = 0; polar = 1.5;
            const grp = new THREE.Group();
            const { jackMesh, roseMesh } = initCharacters(grp);
            jackMesh.position.set(-2, 0, 0);
            roseMesh.position.set(2, 0, 0);
            currentObject = grp;
            scene.add(currentObject);
            break;
        case 'dining':
        case 'cabin':
        case 'lounge':
            distance = 40; azimuth = 0.5; polar = 1.2;
            const roomGroup = new THREE.Group();
            initInteriors(roomGroup);
            // We want to isolate specific room. Interiors creates all at y positions.
            // We shift the camera to the room's height or shift the room to 0.
            const roomY = ROOM_Y_POSITIONS[type === 'dining' ? 'dining' : (type === 'cabin' ? 'jack' : 'lounge')];
            roomGroup.position.y = -roomY;
            currentObject = roomGroup;
            scene.add(currentObject);
            break;
    }
    
    if (currentObject) currentObject.userData.galleryItem = true;
}


function setupButtons() {
    const btns = {
        'show-ship': 'ship',
        'show-boat': 'boat',
        'show-chars': 'chars',
        'show-dining': 'dining',
        'show-cabin': 'cabin',
        'show-lounge': 'lounge'
    };
    Object.keys(btns).forEach(id => {
        document.getElementById(id).addEventListener('click', e => {
            document.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            showView(btns[id]);
        });
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update camera orbit
    camera.position.x = Math.sin(azimuth) * Math.sin(polar) * distance;
    camera.position.z = Math.cos(azimuth) * Math.sin(polar) * distance;
    camera.position.y = Math.cos(polar) * distance;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

init();
