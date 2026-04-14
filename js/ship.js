import { game } from './state.js';

let shipGroup;

export function initShip(scene) {
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
        const cy = 44; 
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

    const createWire = (v1, v2) => {
        const points = [v1, v2];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, wireMat);
        shipGroup.add(line);
    };

    createWire(new THREE.Vector3(55, 62, 0), funnelPositions[0]); // front mast to funnel 1
    createWire(new THREE.Vector3(-60, 62, 0), funnelPositions[3]);// rear mast to funnel 4
    createWire(new THREE.Vector3(55, 62, 0), new THREE.Vector3(70, 25, 0)); // Bow hook

    // ======= LIFEBOATS =======
    // Requirement: Add lifeboats to the Boat Deck (Y=36 top of A deck, so y=37)
    const boatGeo = new THREE.BoxGeometry(3, 1, 1.5);
    const boatMat = new THREE.MeshStandardMaterial({color: 0xeeeeee});
    for(let side=-1; side<=1; side+=2) {
        for(let j=0; j<8; j++) {
            const bx = 15 - (j * 4.5);
            const boat = new THREE.Mesh(boatGeo, boatMat);
            boat.position.set(bx, 36.5, side * 4.5);
            shipGroup.add(boat);
        }
    }

    // ======= PORTHOLES =======
    const portGeo = new THREE.CircleGeometry(0.3, 8);
    const portMat = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    for (let i = -50; i < 50; i += 3) {
        if (Math.random() > 0.2) {
            const p = new THREE.Mesh(portGeo, portMat);
            p.position.set(i, 20, 7)
            shipGroup.add(p);
            const p2 = p.clone();
            p2.position.set(i, 20, -7);
            p2.rotation.y = Math.PI;
            shipGroup.add(p2);
        }
    }

    scene.add(shipGroup);
    return shipGroup;
}

export function updateShip(group) {
    if (!group) return;
    
    group.visible = game.currentRoom === 'deck';
    
    if (game.phase === 'sinking') {
        game.ship.tilt = Math.min(0.3, game.ship.tilt + 0.0001);
        game.ship.sinkY -= 0.005;
        group.rotation.z = game.ship.tilt;
        group.position.y = game.ship.sinkY;
    }
}
