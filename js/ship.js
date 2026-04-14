import { game } from './state.js';

export let shipGroup, bowGroup, sternGroup, unifiedHullsGroup;
export const splitHulls = [];

export function initShip(scene) {
    shipGroup = new THREE.Group();
    bowGroup = new THREE.Group();
    sternGroup = new THREE.Group();
    unifiedHullsGroup = new THREE.Group();
    
    shipGroup.add(unifiedHullsGroup);
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

    // Generator for split halves (invisible until broken)
    function createSplitHull(width, length, topY, bottomY, mat, isStern) {
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
        mesh.visible = false;
        splitHulls.push(mesh);
        (isStern ? sternGroup : bowGroup).add(mesh);
    }
    
    // Generator for unified (seamless) initial hulls
    function createUnifiedHull(width, length, topY, bottomY, mat) {
        const height = topY - bottomY;
        const geo = new THREE.BoxGeometry(length, height, width, 64, 8, 16);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i) + (topY + bottomY) / 2;
            let z = pos.getZ(i);
            const actualZ = getHullZ(x, y, (z > 0 ? width/2 : -width/2));
            pos.setXYZ(i, x, y - (topY + bottomY) / 2, actualZ);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = (topY + bottomY) / 2;
        mesh.castShadow = true; mesh.receiveShadow = true;
        unifiedHullsGroup.add(mesh);
    }

    // Create both sets
    createSplitHull(15, 140, 25, 10, hullMat, false);
    createSplitHull(15, 140, 25, 10, hullMat, true);
    createSplitHull(14.8, 138, 10, -10, bottomMat, false);
    createSplitHull(14.8, 138, 10, -10, bottomMat, true);
    
    createUnifiedHull(15, 140, 25, 10, hullMat);
    createUnifiedHull(14.8, 138, 10, -10, bottomMat);

    // Decks
    function generateDeckVerts(geo, length, offsetX) {
        const pos = geo.attributes.position;
        for(let i=0; i<pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let z = pos.getY(i);
            const actualZ = getHullZ(globalX, 25, z);
            pos.setY(i, actualZ);
        }
        geo.computeVertexNormals();
    }

    // Split decks
    const splitDeck1 = new THREE.PlaneGeometry(70, 15, 32, 16); generateDeckVerts(splitDeck1, 140, 35);
    const m1 = new THREE.Mesh(splitDeck1, woodMat); m1.rotation.x = -Math.PI / 2; m1.position.set(35, 25.1, 0); m1.receiveShadow = true; m1.visible = false; splitHulls.push(m1); bowGroup.add(m1);
    
    const splitDeck2 = new THREE.PlaneGeometry(70, 15, 32, 16); generateDeckVerts(splitDeck2, 140, -35);
    const m2 = new THREE.Mesh(splitDeck2, woodMat); m2.rotation.x = -Math.PI / 2; m2.position.set(-35, 25.1, 0); m2.receiveShadow = true; m2.visible = false; splitHulls.push(m2); sternGroup.add(m2);

    // Unified deck
    const unifiedDeck = new THREE.PlaneGeometry(140, 15, 64, 16); generateDeckVerts(unifiedDeck, 140, 0);
    const m3 = new THREE.Mesh(unifiedDeck, woodMat); m3.rotation.x = -Math.PI / 2; m3.position.set(0, 25.1, 0); m3.receiveShadow = true; unifiedHullsGroup.add(m3);

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

    // Propellers (Tucked mostly under the center stern)
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
    buildPropeller(-64, -1, 3.5, 0.8); // Much closer to hull center
    buildPropeller(-64, -1, -3.5, 0.8); // Much closer to hull center

    scene.add(shipGroup);
    return shipGroup;
}

export function updateShip(group) {
    if (!group) return;
    group.visible = game.currentRoom === 'deck';
    
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
            unifiedHullsGroup.visible = false;
            splitHulls.forEach(m => m.visible = true);
            console.warn("SHIP_BROKEN_IN_HALF_DYNAMICALLY");
        }

        if (game.ship.isBroken) {
            // Bow group plunges down wildly
            bowGroup.rotation.z = Math.min(1.5, bowGroup.rotation.z + 0.02);
            bowGroup.position.y -= 0.5;
            
            // Stern group raises its ass (propellers) high into the air and bobs like a cork
            game.ship.sternTilt = game.ship.sternTilt || 0;
            game.ship.sternTilt += (1.0 - game.ship.sternTilt) * 0.005; 
            sternGroup.rotation.z = game.ship.sternTilt;

            game.ship.sternY = game.ship.sternY === undefined ? 0 : game.ship.sternY;
            game.ship.sternY -= 0.02; // Very slow sink
            
            // Bobbing formula 
            sternGroup.position.y = game.ship.sternY + (Math.sin(timeSinceHit * 2) * 0.5); 
        }
    }
}
