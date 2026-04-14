import { game } from './state.js';

let oceanMesh;
export const icebergs = [];
let sceneRef;

let foamGeo, foamLives;

export function initEnvironment(scene) {
    sceneRef = scene;

    // Ocean Plane (Higher vertex count for complex waves)
    const oceanGeo = new THREE.PlaneGeometry(1200, 1200, 128, 128);
    const oceanMat = new THREE.MeshStandardMaterial({
        color: 0x081526, // Darker, deep sea blue
        roughness: 0.15,
        metalness: 0.9,
        flatShading: true
    });
    oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // Ship Wake (Foam Particles)
    foamGeo = new THREE.BufferGeometry();
    const foamPos = [];
    foamLives = [];
    for (let i = 0; i < 400; i++) {
        foamPos.push(0, -100, 0); // Hide initially
        foamLives.push(0);
    }
    foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(foamPos, 3));
    const foamMat = new THREE.PointsMaterial({ color: 0xeef5ff, size: 2.0, transparent: true, opacity: 0.6 });
    const foam = new THREE.Points(foamGeo, foamMat);
    scene.add(foam);

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
    // Make icebergs ~3x smaller
    const geo = new THREE.DodecahedronGeometry(5 + Math.random() * 5); 
    geo.scale(1, Math.random() * 2 + 1, 1);
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(300, -5, (Math.random() - 0.5) * 150);
    for(let i=0; i<3; i++) {
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(5 + Math.random() * 10), mat);
        chunk.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, (Math.random()-0.5)*15);
        mesh.add(chunk);
    }
    mesh.castShadow = true; mesh.receiveShadow = true;
    sceneRef.add(mesh);
    icebergs.push(mesh);
}

export function updateEnvironment(time) {
    if (!oceanMesh) return;
    
    // Complex Ocean Waves Animation
    const positions = oceanMesh.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const vx = positions[i];
        const vy = positions[i+1];
        // 4 layered sine/cosine frequencies for organic ocean swells
        const wave1 = Math.sin(vx * 0.05 + time * 2) * 1.5;
        const wave2 = Math.cos(vy * 0.05 + time * 1.5) * 1.5;
        const wave3 = Math.sin(vx * 0.15 - time * 3) * 0.5;
        const wave4 = Math.cos(vy * 0.15 + time * 2.5) * 0.5;
        positions[i+2] = wave1 + wave2 + wave3 + wave4;
    }
    oceanMesh.geometry.attributes.position.needsUpdate = true;

    oceanMesh.visible = game.currentRoom === 'deck';

    if (!game.running || game.phase !== 'sailing') return;

    // Ship Wake Physics Integration
    if (oceanMesh.visible) {
        const foamPosArr = foamGeo.attributes.position.array;
        for (let i = 0; i < 400; i++) {
            let idx = i * 3;
            if (foamLives[i] <= 0) {
                if (Math.random() < 0.2 * game.ship.speed) { // Spawn rate scales with speed
                    foamPosArr[idx] = 60 + Math.random() * 10; // Bow X position
                    const side = Math.random() > 0.5 ? 1 : -1;
                    foamPosArr[idx+2] = side * (5 + Math.random() * 5); // Width Z
                    foamPosArr[idx+1] = 0; // Float on Y
                    foamLives[i] = 1.0;
                }
            } else {
                foamPosArr[idx] -= game.ship.speed * 0.8; // Move backwards relative to ship
                foamPosArr[idx+2] += Math.sign(foamPosArr[idx+2]) * 0.1 * game.ship.speed; // Spread out V-shape
                foamLives[i] -= 0.015; // Fade out timeframe
                
                // Bob on the new complex waves exactly where it is
                const vx = foamPosArr[idx];
                const vz = foamPosArr[idx+2]; // corresponding to ocean 'vy'
                const w1 = Math.sin(vx * 0.05 + time * 2) * 1.5;
                const w2 = Math.cos(vz * 0.05 + time * 1.5) * 1.5;
                const w3 = Math.sin(vx * 0.15 - time * 3) * 0.5;
                const w4 = Math.cos(vz * 0.15 + time * 2.5) * 0.5;
                
                if (foamLives[i] <= 0) foamPosArr[idx+1] = -100; // hide
                else foamPosArr[idx+1] = w1 + w2 + w3 + w4 + 0.5; // Float slightly above wave
            }
        }
        foamGeo.attributes.position.needsUpdate = true;
    }

    // Icebergs physical movement and collision logic
    if (Math.random() < 0.0003) spawnIceberg(); // Spawn rate 10x less
    for (let i = icebergs.length - 1; i >= 0; i--) {
        const ice = icebergs[i];
        ice.position.x -= game.ship.speed * 0.4;
        
        // Very simple arcade hit-box: Ship is located at X ~ 60 to -60, Z depends on game.ship.zPos
        // Iceberg is at ice.position
        if (game.phase === 'sailing' && ice.position.x < 75 && ice.position.x > 30) {
            // Check lateral collision (Z axis bounds)
            if (Math.abs(ice.position.z - game.ship.zPos) < 22) {
                game.phase = 'sinking';
                game.ship.sinkStartTime = game.time;
                console.warn('HIT ICEBERG!');
            }
        }
        
        if (ice.position.x < -300) {
            sceneRef.remove(ice);
            icebergs.splice(i, 1);
        }
    }
}
