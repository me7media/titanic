import { game } from './state.js';

let oceanMesh;
export const icebergs = [];
let sceneRef;

export function initEnvironment(scene) {
    sceneRef = scene;

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

function spawnIceberg() {
    // Generate an irregular icy chunk using Dodecahedron
    const geo = new THREE.DodecahedronGeometry(10 + Math.random() * 20); 
    geo.scale(1, Math.random() * 2 + 1, 1); // Make it taller
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, 
        roughness: 0.2, 
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    
    // Spawn ahead of the ship (Bow is at +X)
    mesh.position.set(300, -5, (Math.random() - 0.5) * 150);
    // Add multiple chunks to make it look like a real iceberg
    for(let i=0; i<3; i++) {
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(5 + Math.random() * 10), mat);
        chunk.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, (Math.random()-0.5)*15);
        mesh.add(chunk);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    sceneRef.add(mesh);
    icebergs.push(mesh);
}

export function updateEnvironment(time) {
    if (!oceanMesh) return;
    
    // Ocean Waves Animation
    const positions = oceanMesh.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const vx = positions[i];
        const vy = positions[i+1];
        positions[i+2] = Math.sin(vx * 0.05 + time * 2) * 1.5 + Math.cos(vy * 0.05 + time * 1.5) * 1.5;
    }
    oceanMesh.geometry.attributes.position.needsUpdate = true;

    // Hide ocean inside rooms
    oceanMesh.visible = game.currentRoom === 'deck';

    if (!game.running || game.phase !== 'sailing') return;

    // Icebergs movement (only if sailing)
    if (Math.random() < 0.003) { // Spawn chance
        spawnIceberg();
    }
    
    for (let i = icebergs.length - 1; i >= 0; i--) {
        const ice = icebergs[i];
        ice.position.x -= game.ship.speed * 0.4; // move towards ship
        if (ice.position.x < -300) {
            sceneRef.remove(ice);
            icebergs.splice(i, 1);
        }
    }
    
    // Simple collision dummy - triggers sinking
    if (game.time > 15 && game.phase === 'sailing') {
         // Fake event to start sinking logic managed by main
    }
}
