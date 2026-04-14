import { game } from './state.js';

export let shipGroup, bowGroup, sternGroup;

export function initShip(scene) {
    shipGroup = new THREE.Group();
    bowGroup = new THREE.Group();
    sternGroup = new THREE.Group();
    shipGroup.add(bowGroup);
    shipGroup.add(sternGroup);

    // Noir/Historical Materials
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.3 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x5a1b1b, roughness: 0.9, metalness: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfffcf0, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    const funnelMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, roughness: 0.7 });
    const funnelTopMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });
    const propMat = new THREE.MeshStandardMaterial({color: 0xccaa33, metalness: 0.8, roughness: 0.2});

    function getHullZ(x, y, maxZ) {
        let z = maxZ;
        const ny = Math.max(0, Math.min(1, (y + 10) / 35));
        if (x > 20) z *= Math.max(0.01, 1 - Math.pow((x - 20) / 50, 1.2));
        if (x < -40) z *= Math.max(0.3, 1 - Math.pow((-x - 40) / 30, 2) * 0.7);
        z *= (0.1 + 0.9 * Math.pow(ny, 0.4));
        return z;
    }

    function createHullMesh(width, length, topY, bottomY, mat, isStern) {
        const height = topY - bottomY;
        const halfLen = length / 2;
        const geo = new THREE.BoxGeometry(halfLen, height, width, 32, 8, 16);
        const pos = geo.attributes.position;
        const offsetX = isStern ? -halfLen / 2 : halfLen / 2;

        for (let i = 0; i < pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let y = pos.getY(i) + (topY + bottomY) / 2;
            let z = pos.getZ(i);
            
            const actualZ = getHullZ(globalX, y, (z > 0 ? width/2 : -width/2));
            pos.setXYZ(i, localX, y - (topY + bottomY) / 2, actualZ);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(offsetX, (topY + bottomY) / 2, 0);
        mesh.castShadow = true; mesh.receiveShadow = true;
        (isStern ? sternGroup : bowGroup).add(mesh);
    }

    // Main Hull & Bottom
    createHullMesh(15, 140, 25, 10, hullMat, false);
    createHullMesh(15, 140, 25, 10, hullMat, true);
    createHullMesh(14.8, 138, 10, -10, bottomMat, false);
    createHullMesh(14.8, 138, 10, -10, bottomMat, true);

    // Decks
    function createDeckMesh(length, isStern) {
        const halfLen = length / 2;
        const deckGeo = new THREE.PlaneGeometry(halfLen, 15, 32, 16);
        const pos = deckGeo.attributes.position;
        const offsetX = isStern ? -halfLen / 2 : halfLen / 2;
        for(let i=0; i<pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let z = pos.getY(i);
            const actualZ = getHullZ(globalX, 25, z);
            pos.setY(i, actualZ);
        }
        deckGeo.computeVertexNormals();
        const mesh = new THREE.Mesh(deckGeo, woodMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(offsetX, 25.1, 0);
        mesh.receiveShadow = true;
        (isStern ? sternGroup : bowGroup).add(mesh);
    }
    createDeckMesh(140, false);
    createDeckMesh(140, true);

    // Superstructures
    const buildTier = (minX, maxX, baseH, depth, yLevel) => {
        if (minX < 0 && maxX > 0) {
            buildTier(minX, -0.2, baseH, depth, yLevel); // Stern portion
            buildTier(0.2, maxX, baseH, depth, yLevel);  // Bow portion
            return;
        }
        const w = maxX - minX;
        const cx = (minX + maxX) / 2;
        const targetGroup = cx < 0 ? sternGroup : bowGroup;

        const geo = new THREE.BoxGeometry(w, baseH, depth);
        const mesh = new THREE.Mesh(geo, whiteMat);
        mesh.position.set(cx, yLevel + (baseH / 2), 0);
        mesh.castShadow = true; mesh.receiveShadow = true;
        targetGroup.add(mesh);
        
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, depth + 0.4), woodMat);
        roof.position.set(cx, yLevel + baseH, 0);
        targetGroup.add(roof);

        const wndGeo = new THREE.PlaneGeometry(0.8, 1.2);
        for(let x = minX + 2; x < maxX - 2; x += 2.5) {
            if(Math.random() > 0.2) {
                const w1 = new THREE.Mesh(wndGeo, windowMat);
                w1.position.set(x, yLevel + baseH/2, depth/2 + 0.05); targetGroup.add(w1);
                const w2 = new THREE.Mesh(wndGeo, windowMat);
                w2.position.set(x, yLevel + baseH/2, -depth/2 - 0.05); w2.rotation.y = Math.PI; targetGroup.add(w2);
            }
        }
    };

    buildTier(-42.5, 42.5, 4, 12, 25.5);   // C Deck
    buildTier(-37.5, 37.5, 4, 11, 29.5);   // B Deck
    buildTier(-32.5, 32.5, 3.5, 10, 33.5); // A Deck
    buildTier(-22.5, 22.5, 2.5, 8, 37);    // Roof

    // Bridge 
    const bridgeFront = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 10), woodMat);
    bridgeFront.position.set(22.5, 38.5, 0);
    bowGroup.add(bridgeFront);
    buildTier(12.5, 22.5, 3, 10, 37);

    // Funnels
    const RAKE = -0.15;
    const funnelObjGeo = new THREE.CylinderGeometry(1.6, 1.6, 12, 16);
    const funnelCapGeo = new THREE.CylinderGeometry(1.65, 1.65, 2.5, 16);
    for (let i = 0; i < 4; i++) {
        const cx = 22 - (i * 16);
        const cy = 44; 
        const tg = cx < 0 ? sternGroup : bowGroup;

        const funnel = new THREE.Mesh(funnelObjGeo, funnelMat);
        funnel.position.set(cx, cy, 0);
        funnel.rotation.z = RAKE;
        funnel.castShadow = true;
        tg.add(funnel);
        
        const fTop = new THREE.Mesh(funnelCapGeo, funnelTopMat);
        fTop.position.set(cx - 1.0, cy + 6, 0);
        fTop.rotation.z = RAKE;
        tg.add(fTop);

        const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, 15);
        if (i < 3) {
            for(let side of [1.6, -1.6]) {
                const p = new THREE.Mesh(pipeGeo, whiteMat);
                p.position.set(cx + 1.2, cy, side);
                p.rotation.z = RAKE;
                tg.add(p);
            }
        }
    }

    // Masts
    const mastGeo = new THREE.CylinderGeometry(0.3, 0.5, 45, 8);
    const foremast = new THREE.Mesh(mastGeo, woodMat);
    foremast.position.set(55, 40, 0);
    foremast.rotation.z = RAKE;
    bowGroup.add(foremast);
    
    const mainmast = new THREE.Mesh(mastGeo, woodMat);
    mainmast.position.set(-60, 40, 0);
    mainmast.rotation.z = RAKE;
    sternGroup.add(mainmast);

    // Lifeboats
    const boatGeo = new THREE.BoxGeometry(3, 1, 1.5);
    const boatMat = new THREE.MeshStandardMaterial({color: 0xeeeeee});
    for(let side=-1; side<=1; side+=2) {
        for(let j=0; j<8; j++) {
            const bx = 15 - (j * 4.5);
            const boat = new THREE.Mesh(boatGeo, boatMat);
            boat.position.set(bx, 36.5, side * 4.5);
            (bx < 0 ? sternGroup : bowGroup).add(boat);
        }
    }

    // Propellers
    function buildPropeller(x, y, z, scale) {
        const p = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2), propMat);
        hub.rotation.z = Math.PI/2; p.add(hub);
        const bladeGeo = new THREE.BoxGeometry(0.2, 3, 1);
        for(let i=0; i<3; i++) {
            const blade = new THREE.Mesh(bladeGeo, propMat);
            const angle = (Math.PI * 2 / 3) * i;
            blade.rotation.x = angle;
            blade.position.y = Math.cos(angle) * 1.5;
            blade.position.z = Math.sin(angle) * 1.5;
            p.add(blade);
        }
        p.position.set(x, y, z); p.scale.set(scale, scale, scale);
        sternGroup.add(p);
    }
    buildPropeller(-68, -3, 0, 1.2); 
    buildPropeller(-63, -1, 5, 0.9); 
    buildPropeller(-63, -1, -5, 0.9);

    scene.add(shipGroup);
    return shipGroup;
}

export function updateShip(group) {
    if (!group) return;
    group.visible = game.currentRoom === 'deck';
    
    // Apply lateral steering from the user input
    group.position.z = game.ship.zPos;
    // Visually lean into turns
    group.rotation.x = -game.ship.zPos * 0.002; 
    
    if (game.phase === 'sinking') {
        const timeSinceHit = game.time - game.ship.sinkStartTime;
        
        // Tilt the global group slightly, increasing rapidly over time
        game.ship.tilt = Math.min(0.8, (timeSinceHit / 60) * 0.4); 
        game.ship.sinkY -= 0.005; // Drop entire ship down
        
        group.rotation.z = game.ship.tilt;
        group.position.y = game.ship.sinkY;

        // The Break Event (~60 seconds in)
        if (timeSinceHit > 60 && !game.ship.isBroken) {
            game.ship.isBroken = true;
            // Provide dramatic visual snap
            console.warn("SHIP_BROKEN_IN_HALF");
        }

        if (game.ship.isBroken) {
            // Bow group plunges down violently
            bowGroup.rotation.z = Math.min(1.5, bowGroup.rotation.z + 0.02);
            bowGroup.position.y -= 0.5;
            
            // Stern group snaps back level momentarily, then plummets
            sternGroup.rotation.z = Math.max(-0.5, sternGroup.rotation.z - 0.01);
            sternGroup.position.y -= 0.1;
        }
    }
}
