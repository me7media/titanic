import { game } from './state.js';
import { shipGroup } from './ship.js';

let oceanMesh;
export const icebergs = [];
let sceneRef;
const wakes = [];
const wakeGeo = new THREE.PlaneGeometry(15, 15);

let foamGeo, foamLives;

/**
 * Initializes the global world environment: Ocean, Stars, and Wake effects.
 * @param {THREE.Scene} scene - The main game scene.
 */
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
    // Add to shipGroup so it follows steering Z
    if (shipGroup) shipGroup.add(foam);
    else scene.add(foam);

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

/**
 * Spawns a unique, multi-chunk iceberg ahead of the ship.
 * Generates random silhouettes by adding child-meshes to the base iceberg.
 */
function spawnIceberg() {
    // Random base size

    const size = 4 + Math.random() * 8;
    const geo = new THREE.DodecahedronGeometry(size); 
    
    // Random proportions (some sharp/tall, some flat/wide)
    const scaleX = 0.8 + Math.random() * 1.5;
    const scaleY = 0.5 + Math.random() * 2.5;
    const scaleZ = 0.8 + Math.random() * 1.5;
    geo.scale(scaleX, scaleY, scaleZ);
    
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    
    // Spawn across the whole visible ocean Z-span (-250 to 250)
    const zPos = (Math.random() - 0.5) * 500;
    mesh.position.set(400, -size * 0.4, zPos); // partially submerged
    
    // Add 2-4 sub-chunks for more complex silhouettes
    const chunkCount = 2 + Math.floor(Math.random() * 3);
    for(let i=0; i < chunkCount; i++) {
        const cSize = size * (0.4 + Math.random() * 0.6);
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(cSize), mat);
        chunk.position.set((Math.random()-0.5)*size*1.2, (Math.random()-0.5)*size, (Math.random()-0.5)*size*1.2);
        chunk.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        mesh.add(chunk);
    }
    mesh.castShadow = true; mesh.receiveShadow = true;
    sceneRef.add(mesh);
    icebergs.push(mesh);
}
// Expose for diagnostics
window.spawnIceberg = spawnIceberg;

/**
 * Updates all environment animations: waves, stars (if moving), wakes, and icebergs.
 * @param {number} time - Global game time for wave synchronization.
 */
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

    // Icebergs logic based on T toggle pattern (Spawns after 20 seconds)
    let spawnChance = game.icebergMode === 'double' ? 0.03 : 0.01;
    if (time > 20 && game.icebergMode !== 'off' && Math.random() < spawnChance && game.phase === 'sailing') {
        spawnIceberg();
    }
    
    // Ship Wake Trail Logic
    if (game.phase === 'sailing' && game.ship && game.ship.speed > 0.05) {
        if (Math.random() < 0.4) {
            const wakeMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.6});
            const wake = new THREE.Mesh(wakeGeo, wakeMat);
            wake.rotation.x = -Math.PI / 2;
            const zSpread = (Math.random() - 0.5) * 45; // Wider spread for 32 hull
            // Relative to ship center (Now at -110 for 220 length)
            wake.position.set(-110, 0.5, zSpread); 
            if (shipGroup) shipGroup.add(wake);
            else sceneRef.add(wake);
            wakes.push(wake);
        }
    }
    
    // Update Wakes
    for (let i = wakes.length - 1; i >= 0; i--) {
        let w = wakes[i];
        w.position.x -= game.ship.speed * 2.5; 
        w.scale.set(w.scale.x + 0.05, w.scale.y + 0.05, 1);
        w.material.opacity -= 0.01;
        if (w.material.opacity <= 0) {
            sceneRef.remove(w);
            w.material.dispose();
            wakes.splice(i, 1);
        }
    }

    if (!game.running) return;

    // Ship Wake Physics Integration
    const foamPosArr = foamGeo.attributes.position.array;
    const dz = game.ship.zPos - (game.ship.lastZ || 0);

    if (oceanMesh.visible) {
        for (let i = 0; i < 400; i++) {
            let idx = i * 3;
            if (foamLives[i] <= 0) {
                if (game.phase === 'sailing' && Math.random() < 0.2 * game.ship.speed) { 
                    foamPosArr[idx] = 100 + Math.random() * 10; // Moved to new bow (110)
                    const side = Math.random() > 0.5 ? 1 : -1;
                    // Spawn at the edge of the 32-width hull (radius 16)
                    foamPosArr[idx+2] = game.ship.zPos + side * (15 + Math.random() * 5); 
                    foamPosArr[idx+1] = 0; 
                    foamLives[i] = 1.0;
                }
            } else {
                foamPosArr[idx] -= game.ship.speed * 0.8; 
                // Apply ship lateral displacement to follow steering
                foamPosArr[idx+2] += dz; 
                // Spread out in V-shape relative to ship center
                const relativeZ = foamPosArr[idx+2] - game.ship.zPos;
                foamPosArr[idx+2] += Math.sign(relativeZ) * 0.1 * game.ship.speed; 
                
                foamLives[i] -= 0.015; 
                
                const vx = foamPosArr[idx];
                const vz = foamPosArr[idx+2];
                const w1 = Math.sin(vx * 0.05 + time * 2) * 1.5;
                const w2 = Math.cos(vz * 0.05 + time * 1.5) * 1.5;
                const w3 = Math.sin(vx * 0.15 - time * 3) * 0.5;
                const w4 = Math.cos(vz * 0.15 + time * 2.5) * 0.5;
                
                if (foamLives[i] <= 0) foamPosArr[idx+1] = -100;
                else foamPosArr[idx+1] = w1 + w2 + w3 + w4 + 0.5;
            }
        }
        foamGeo.attributes.position.needsUpdate = true;
    }
    game.ship.lastZ = game.ship.zPos;

    // Icebergs physical movement and collision logic
    if (Math.random() < 0.0003) spawnIceberg(); // Spawn rate 10x less
    for (let i = icebergs.length - 1; i >= 0; i--) {
        const ice = icebergs[i];
        ice.position.x -= game.ship.speed * 0.4;
        
        // Very simple arcade hit-box suited for the newly scaled 280-length ship
        if (game.phase === 'sailing' && ice.position.x < 150 && ice.position.x > 80) {
            // Check lateral collision (Z axis bounds ~25 radius)
            let shipZ = game.ship && game.ship.zPos ? game.ship.zPos : 0;
            if (Math.abs(ice.position.z - shipZ) < 30) {
                game.phase = 'sinking';
                game.ship.speed = 0; // Stop propulsion immediately
                game.ship.sinkStartTime = game.time;
                
                // Clear all current wakes/traces
                wakes.forEach(w => {
                    if (w.parent) w.parent.remove(w);
                });
                wakes.length = 0;
                
                // Clear foam immediately
                for (let j = 0; j < 400; j++) {
                    foamLives[j] = 0;
                    foamPosArr[j * 3 + 1] = -100;
                }
                foamGeo.attributes.position.needsUpdate = true;
                
                console.warn('HIT ICEBERG!');
            }
        }
        
        if (ice.position.x < -300) {
            sceneRef.remove(ice);
            icebergs.splice(i, 1);
        }
    }
}
