import { game } from './state.js';

export let shipGroup, bowGroup, sternGroup, unifiedHullsGroup;
export const splitHulls = [];

/**
 * Initializes the titanic ship model, materials, and groups.
 * Handles procedural hull generation for both unified and split (sinking) versions.
 * @param {THREE.Scene} scene - The main game scene.
 * @returns {THREE.Group} The main ship group.
 */
export function initShip(scene) {
    shipGroup = new THREE.Group();

    bowGroup = new THREE.Group();
    sternGroup = new THREE.Group();
    unifiedHullsGroup = new THREE.Group();

    // Regular Unscaled Groups
    const bowModelGroup = bowGroup;
    const sternModelGroup = sternGroup;
    const unifiedModelGroup = unifiedHullsGroup;

    shipGroup.add(unifiedHullsGroup);
    shipGroup.add(bowGroup);
    shipGroup.add(sternGroup);

    // Noir/Historical Materials - Deep Pitch Black Top, Vibrant Carmine Red Bottom
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.7, metalness: 0.2 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x6D201A, roughness: 0.7, metalness: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfffcf0, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2A1B12, roughness: 0.9 });
    const funnelMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, roughness: 0.7 });
    const funnelTopMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });
    const propMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.8, roughness: 0.2 });

    /**
     * Procedural Hull Z-depth calculation
     * Shapes the beam of the ship based on X/Y position to create realistic bow/stern tapers.
     * @param {number} x - Horizontal position.
     * @param {number} y - Vertical position.
     * @param {number} maxZ - Maximum width (beam).
     * @returns {number} The calculated Z depth.
     */
    function getHullZ(x, y, maxZ) {
        let z = maxZ;
        const ny = Math.max(0, Math.min(1, (y + 2) / 27));
        
        // Bow Taper (Front: Sharp and pointed)
        if (x > 20) {
            const t = (x - 20) / 50; 
            z *= Math.max(0, 1 - Math.pow(t, 1.4));
        }
        
        // Stern Taper (Back: Rounded Cruiser Stern)
        if (x < -20) {
            const t = (-x - 20) / 50; // starts earlier but curves elliptically
            // Elliptical curve: stays wider longer, then rounds off
            z *= Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.5)));
        }
        
        // V-Shape Vertical Taper
        z *= (0.1 + 0.9 * Math.pow(ny, 0.4));
        return z;
    }


    // Generator for split halves (invisible until broken)
    const createSplitHull = (width, length, topY, bottomY, mat, isStern) => {
        const height = topY - bottomY;
        const halfLen = length / 2;
        const geo = new THREE.BoxGeometry(halfLen, height, width, 64, 8, 24); // More segments for rounding
        const pos = geo.attributes.position;
        const offsetX = isStern ? -halfLen / 2 : halfLen / 2;

        for (let i = 0; i < pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let y = pos.getY(i) + (topY + bottomY) / 2;
            let z = pos.getZ(i);

            const actualZ = getHullZ(globalX, y, (z > 0 ? width / 2 : -width / 2));
            pos.setXYZ(i, localX, y - (topY + bottomY) / 2, actualZ);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(offsetX, (topY + bottomY) / 2, 0);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.visible = false;
        splitHulls.push(mesh);
        (isStern ? sternModelGroup : bowModelGroup).add(mesh);
    }

    // Generator for unified (seamless) initial hulls
    function createUnifiedHull(width, length, topY, bottomY, mat) {
        const height = topY - bottomY;
        const geo = new THREE.BoxGeometry(length, height, width, 128, 8, 24); // Higher res
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i) + (topY + bottomY) / 2;
            let z = pos.getZ(i);
            const actualZ = getHullZ(x, y, (z > 0 ? width / 2 : -width / 2));
            pos.setXYZ(i, x, y - (topY + bottomY) / 2, actualZ);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = (topY + bottomY) / 2;
        mesh.castShadow = true; mesh.receiveShadow = true;
        unifiedModelGroup.add(mesh);
    }

    // Create both sets (Width 27)
    createSplitHull(27, 140, 25, 10, hullMat, false);
    createSplitHull(27, 140, 25, 10, hullMat, true);
    createSplitHull(26.6, 138, 10, -2, bottomMat, false);
    createSplitHull(26.6, 138, 10, -2, bottomMat, true);

    createUnifiedHull(27, 140, 25, 10, hullMat);
    createUnifiedHull(26.6, 138, 10, -2, bottomMat);

    // Add glowing blue portholes along the hull sides
    const portMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, side: THREE.DoubleSide });
    const portGeo = new THREE.CircleGeometry(0.22, 12);
    
    function addPort(x, y) {
        if (Math.abs(x) < 1.0) return; // avoid middle seam
        const group = x < 0 ? sternModelGroup : bowModelGroup;
        const hullZ = getHullZ(x, y, 13.5);
        
        // Exact normal calculation so portholes don't clip into curved bow/stern
        const z1 = getHullZ(x - 0.5, y, 13.5);
        const z2 = getHullZ(x + 0.5, y, 13.5);
        const angle = Math.atan2(z1 - z2, 1.0); 
        
        const p1 = new THREE.Mesh(portGeo, portMat);
        p1.position.set(x, y, hullZ + 0.05);
        p1.rotation.y = angle;
        group.add(p1);
        
        const p2 = new THREE.Mesh(portGeo, portMat);
        p2.position.set(x, y, -hullZ - 0.05);
        p2.rotation.y = Math.PI - angle;
        group.add(p2);
    }

    // Top tier: Groups of 3 (gap on every 4th)
    let pCount = 0;
    for (let x = -60; x <= 60; x += 1.2) {
        if (pCount++ % 4 !== 3) addPort(x, 22.5);
    }
    
    // Middle tier: Continual spaced line
    for (let x = -58; x <= 58; x += 1.6) addPort(x, 19.5);
    
    // Bottom tier: Widely spaced
    for (let x = -56; x <= 56; x += 4.5) addPort(x, 16.0);

    // Decks
    function generateDeckVerts(geo, length, offsetX) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let z = pos.getY(i);
            const actualZ = getHullZ(globalX, 25, z);
            pos.setY(i, actualZ);
        }
        geo.computeVertexNormals();
    }

    // Split decks
    const splitDeck1 = new THREE.PlaneGeometry(70, 27, 64, 24); generateDeckVerts(splitDeck1, 140, 35);
    const m1 = new THREE.Mesh(splitDeck1, woodMat); m1.rotation.x = -Math.PI / 2; m1.position.set(35, 25.1, 0); m1.receiveShadow = true; m1.visible = false; splitHulls.push(m1); bowModelGroup.add(m1);

    const splitDeck2 = new THREE.PlaneGeometry(70, 27, 64, 24); generateDeckVerts(splitDeck2, 140, -35);
    const m2 = new THREE.Mesh(splitDeck2, woodMat); m2.rotation.x = -Math.PI / 2; m2.position.set(-35, 25.1, 0); m2.receiveShadow = true; m2.visible = false; splitHulls.push(m2); sternModelGroup.add(m2);

    // Unified deck
    const unifiedDeck = new THREE.PlaneGeometry(140, 27, 128, 24); generateDeckVerts(unifiedDeck, 140, 0);
    const m3 = new THREE.Mesh(unifiedDeck, woodMat); m3.rotation.x = -Math.PI / 2; m3.position.set(0, 25.1, 0); m3.receiveShadow = true; unifiedModelGroup.add(m3);

    // Superstructures
    const buildTier = (minX, maxX, baseH, depth, yLevel) => {
        const createSegment = (sX, eX) => {
            if (sX >= eX) return;
            const w = eX - sX;
            const cx = (sX + eX) / 2;
            const targetGroup = cx < 0 ? sternModelGroup : bowModelGroup;

            // Geometry with more segments along X and Z to allow for curvature
            const geo = new THREE.BoxGeometry(w, baseH, depth, 16, 1, 8);
            const pos = geo.attributes.position;
            
            for (let i = 0; i < pos.count; i++) {
                let localX = pos.getX(i);
                let localZ = pos.getZ(i);
                let globalX = localX + cx;
                
                // Determine the hull width at this exact X and Y
                const hullZ = getHullZ(globalX, yLevel, depth / 2);
                
                // Scale the vertex Z to fit within the hull taper
                // If localZ is max (depth/2), it should become hullZ
                const zRatio = localZ / (depth/2);
                pos.setZ(i, zRatio * hullZ);
            }
            geo.computeVertexNormals();

            const mesh = new THREE.Mesh(geo, whiteMat);
            mesh.position.set(cx, yLevel + (baseH / 2), 0);
            mesh.castShadow = true; mesh.receiveShadow = true;
            targetGroup.add(mesh);

            // Roof also needs to be tapered
            const rGeo = new THREE.BoxGeometry(w, 0.2, depth + 0.4, 16, 1, 8);
            const rPos = rGeo.attributes.position;
            for (let i = 0; i < rPos.count; i++) {
                let globalX = rPos.getX(i) + cx;
                let zRatio = rPos.getZ(i) / ((depth + 0.4) / 2);
                const hullZ = getHullZ(globalX, yLevel + baseH, (depth + 0.4) / 2);
                rPos.setZ(i, zRatio * hullZ);
            }
            rGeo.computeVertexNormals();
            const roof = new THREE.Mesh(rGeo, woodMat);
            roof.position.set(cx, yLevel + baseH, 0);
            targetGroup.add(roof);

            const wndGeo = new THREE.PlaneGeometry(0.8, 1.2);
            for (let x = sX + 2; x < eX - 2; x += 3.0) {
                if (Math.random() > 0.2) {
                    const hZ = getHullZ(x, yLevel + baseH / 2, depth / 2) + 0.05;
                    const w1 = new THREE.Mesh(wndGeo, windowMat);
                    w1.position.set(x, yLevel + baseH / 2, hZ); targetGroup.add(w1);
                    const w2 = new THREE.Mesh(wndGeo, windowMat);
                    w2.position.set(x, yLevel + baseH / 2, -hZ); w2.rotation.y = Math.PI; targetGroup.add(w2);
                }
            }

            // Front Facing Windows (Only for true end pieces)
            if (eX === 69 || eX === 30 || eX === 25 || eX === 20 || eX === 15) {
                const endHullZ = getHullZ(eX, yLevel, depth/2);
                for (let z = -endHullZ + 1; z <= endHullZ - 1; z += 2.0) {
                    const fw = new THREE.Mesh(wndGeo, windowMat);
                    fw.position.set(eX + 0.05, yLevel + baseH / 2, z);
                    fw.rotation.y = Math.PI / 2;
                    targetGroup.add(fw);
                }
            }
        };

        if (minX < 0 && maxX > 0) {
            createSegment(minX, 0); 
            createSegment(0, maxX);  
        } else {
            createSegment(minX, maxX);
        }
    };

    // Superstructures (Heights +5%, Y shifted to stack correctly)
    buildTier(-42, 30, 4.73, 18, 25.1); // C-Deck
    buildTier(-35, 25, 4.2, 16, 29.83);  // B-Deck
    buildTier(-30, 20, 3.68, 13, 34.03); // A-Deck
    buildTier(-20, 15, 2.63, 11, 37.71); // Boat Deck
    
    // Poop Deck (Raised stern, smaller and more rounded)
    buildTier(-69, -55, 3.8, 12, 25.1); 
    
    // Forecastel Deck (Raised bow, sharp and powerful)
    buildTier(45, 69, 3.8, 13, 25.1);

    // Bridge & Wings
    const bridgeFront = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 10), woodMat);
    bridgeFront.position.set(22.5, 38.5, 0);
    bowModelGroup.add(bridgeFront);

    // Bridge wing overhangs
    const bridgeWing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 14), whiteMat);
    bridgeWing.position.set(22.0, 38.0, 0);
    bowModelGroup.add(bridgeWing);

    buildTier(12.5, 22.5, 3, 10, 37);

    // Forward Cargo Cranes (Derricks)
    function buildCrane(x, z) {
        const cGrp = new THREE.Group();
        const crBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3), whiteMat);
        crBase.position.y = 1.5; cGrp.add(crBase);
        const crArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8), whiteMat);
        crArm.position.set(2.5, 4, 0); crArm.rotation.z = Math.PI / 3; cGrp.add(crArm);
        cGrp.position.set(x, 25.1, z);
        bowModelGroup.add(cGrp);
    }
    buildCrane(48, 2.5);
    buildCrane(48, -2.5);
    buildCrane(52, 0);

    // Funnels
    if (!shipGroup.userData) shipGroup.userData = {};
    shipGroup.userData.funnels = [];
    const RAKE = 0.15; // Positive rake tilts towards the stern (-X)
    const funnelObjGeo = new THREE.CylinderGeometry(1.6, 1.6, 12, 16);
    const funnelCapGeo = new THREE.CylinderGeometry(1.65, 1.65, 2.5, 16);
    for (let i = 0; i < 4; i++) {
        const cx = 22 - (i * 16);
        const cy = 44;
        const tg = cx < 0 ? sternModelGroup : bowModelGroup;

        shipGroup.userData.funnels.push({ x: cx, y: cy + 5, z: 0 });

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
            for (let side of [1.6, -1.6]) {
                const p = new THREE.Mesh(pipeGeo, whiteMat);
                p.position.set(cx + 1.2, cy, side);
                p.rotation.z = RAKE;
                tg.add(p);
            }
        }

        // Funnel Rigging Cables tying to the deck
        const createCable = (vx, vy, vz) => {
            const geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(cx, cy + 5, 0),
                new THREE.Vector3(vx, vy, vz)
            ]);
            tg.add(new THREE.Line(geo, wireMat));
        };
        createCable(cx + 6, 38.5, 5);
        createCable(cx + 6, 38.5, -5);
        createCable(cx - 6, 38.5, 5);
        createCable(cx - 6, 38.5, -5);
    }

    // Masts
    const mastGeo = new THREE.CylinderGeometry(0.3, 0.5, 45, 8);
    const foremast = new THREE.Mesh(mastGeo, woodMat);
    foremast.position.set(55, 40, 0);
    foremast.rotation.z = RAKE;
    bowModelGroup.add(foremast);

    const mainmast = new THREE.Mesh(mastGeo, woodMat);
    mainmast.position.set(-60, 40, 0);
    mainmast.rotation.z = RAKE;
    sternModelGroup.add(mainmast);

    // Marconi Antennas (Long cables between tilted masts)
    const antennaCount = 4;
    const mastH = 45;
    const offX = -Math.sin(RAKE) * (mastH / 2); // ~ -3.35 (towards stern)
    const offY = Math.cos(RAKE) * (mastH / 2);  // ~ 22.2
    
    // Tips are at: Fore(55 + offX, 40 + offY), Main(-60 + offX, 40 + offY)
    for (let i = 0; i < antennaCount; i++) {
        const offsetZ = (i - (antennaCount-1)/2) * 0.8;
        const antennaGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(55 + offX, 40 + offY - 1, offsetZ),
            new THREE.Vector3(-60 + offX, 40 + offY - 1, offsetZ)
        ]);
        shipGroup.add(new THREE.Line(antennaGeo, wireMat));
    }
    
    // Standing Rigging for Masts (Fixed attachment points)
    for (let side of [-1, 1]) {
        // Foremast stays (to tip)
        const fTip = new THREE.Vector3(55 + offX, 40 + offY, 0);
        bowModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([fTip, new THREE.Vector3(45, 25, side * 12)]), wireMat));
        bowModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([fTip, new THREE.Vector3(65, 25, side * 8)]), wireMat));
        
        // Mainmast stays (to tip)
        const mTip = new THREE.Vector3(-60 + offX, 40 + offY, 0);
        sternModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([mTip, new THREE.Vector3(-50, 25, side * 12)]), wireMat));
        sternModelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([mTip, new THREE.Vector3(-70, 25, side * 6)]), wireMat));
    }

    // Detailed Lifeboats
    const davitMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }); // Dark Iron
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0xcca578 }); // Tan canvas

    function buildDetailedLifeboat() {
        const boatGrp = new THREE.Group();
        const hullGeo = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        hullGeo.scale(1.5, 0.5, 3.0);
        const b = new THREE.Mesh(hullGeo, whiteMat);
        b.rotation.x = Math.PI; // upside down so flat is top
        b.position.y = 0.5;
        boatGrp.add(b);

        // Wooden rim for contrast
        const rim = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.1, 5.9), woodMat);
        rim.position.y = 0.5;
        boatGrp.add(rim);

        // Canvas cover
        const cover = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 5.8), canvasMat);
        cover.position.y = 0.55;
        boatGrp.add(cover);

        // Davits (arms holding the boat) - Now Dark Iron so they stand out
        const davGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5);
        const lDavit = new THREE.Mesh(davGeo, davitMat); lDavit.position.set(0, -0.5, 2.8); lDavit.rotation.x = 0.4; boatGrp.add(lDavit);
        const rDavit = new THREE.Mesh(davGeo, davitMat); rDavit.position.set(0, -0.5, -2.8); rDavit.rotation.x = -0.4; boatGrp.add(rDavit);

        return boatGrp;
    }

    for (let side = -1; side <= 1; side += 2) {
        for (let j = 0; j < 8; j++) {
            const bx = 15 - (j * 4.5);
            const boat = buildDetailedLifeboat();
            boat.position.set(bx, 37.0, side * 4.2);
            boat.rotation.y = side === 1 ? 0 : Math.PI;
            (bx < 0 ? sternModelGroup : bowModelGroup).add(boat);
        }
    }

    // Roof Details (Skylights and Ventilation Cowls)
    function createVent(x, z, scale, dir) {
        const grp = new THREE.Group();
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3), whiteMat);
        pipe.position.y = 1.5; grp.add(pipe);
        const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.9), whiteMat);
        cowl.position.set(dir * 0.5, 3, 0); grp.add(cowl);
        grp.position.set(x, 38.25, z);
        grp.scale.set(scale, scale, scale);
        (x < 0 ? sternModelGroup : bowModelGroup).add(grp);
    }

    function createSkylight(x, z, w, l) {
        const grp = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, l), whiteMat);
        base.position.y = 0.4; grp.add(base);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, l - 0.4), new THREE.MeshBasicMaterial({ color: 0x4488ff }));
        glass.rotation.x = -Math.PI / 2; glass.position.y = 0.81; grp.add(glass);
        grp.position.set(x, 38.25, z);
        (x < 0 ? sternModelGroup : bowModelGroup).add(grp);
    }

    createSkylight(10, 0, 4, 3);
    createSkylight(-10, 0, 5, 4);
    createSkylight(-20, 0, 3, 3);

    createVent(8, 2, 0.8, 1);
    createVent(8, -2, 0.8, -1);
    createVent(-5, 2.5, 1.2, 1);
    createVent(-5, -2.5, 1.2, -1);

    // Deck Chairs 
    function buildDeckChair() {
        const c = new THREE.Group();
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), woodMat);
        back.position.set(0, 0.6, -0.4); back.rotation.x = -0.4; c.add(back);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 1.2), woodMat);
        seat.position.set(0, 0.2, 0); c.add(seat);
        return c;
    }
    for (let side = -1; side <= 1; side += 2) {
        // A-Deck Chairs
        for (let j = 0; j < 15; j++) {
            const charX = 20 - (j * 3);
            if (Math.random() > 0.4) {
                const chair = buildDeckChair();
                chair.position.set(charX, 33.6, side * 3.7);
                chair.rotation.y = side === 1 ? Math.PI : 0;
                (charX < 0 ? sternModelGroup : bowModelGroup).add(chair);
            }
        }
    }

    // Propellers (Tucked mostly under the center stern)
    function buildPropeller(x, y, z, scale) {
        const p = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2), propMat);
        hub.rotation.z = Math.PI / 2; p.add(hub);
        const bladeGeo = new THREE.BoxGeometry(0.2, 3, 1);
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.Mesh(bladeGeo, propMat);
            const angle = (Math.PI * 2 / 3) * i;
            blade.rotation.x = angle;
            blade.position.y = Math.cos(angle) * 1.5;
            blade.position.z = Math.sin(angle) * 1.5;
            p.add(blade);
        }
        p.position.set(x, y, z); p.scale.set(scale, scale, scale);
        sternModelGroup.add(p);
    }
    buildPropeller(-68, -3, 0, 1.2);
    buildPropeller(-64, -1, 3.5, 0.8);
    buildPropeller(-64, -1, -3.5, 0.8);

    scene.add(shipGroup);
    return shipGroup;
}

/**
 * Updates ship physics and sinking animations.
 * @param {THREE.Group} shipGroup - The main ship mesh group.
 */
export function updateShip(shipGroup) {
    if (!game.running) return;


    shipGroup.visible = game.currentRoom === 'deck';

    // Lateral Steering Physics & Visuals!
    if (game.phase === 'sailing' && game.ship.zPos !== undefined) {
        // Slide ship sideways slowly
        shipGroup.position.z += (game.ship.zPos - shipGroup.position.z) * 0.05;

        // Add realistic tilt/yaw while turning
        const targetYaw = (game.ship.zPos - shipGroup.position.z) * 0.02; // Twist left/right
        shipGroup.rotation.y += (targetYaw - shipGroup.rotation.y) * 0.1;

        // Bank (roll) slightly 
        const targetRoll = (game.ship.zPos - shipGroup.position.z) * 0.005;
        shipGroup.rotation.x += (targetRoll - shipGroup.rotation.x) * 0.1;
    }

    if (game.phase === 'sinking') {
        const timeSinceHit = game.time - game.ship.sinkStartTime;

        // Tilt the global group slightly, increasing rapidly over time
        game.ship.tilt = Math.min(0.8, (timeSinceHit / 60) * 0.4);
        game.ship.sinkY -= 0.005; // Drop entire ship down

        shipGroup.rotation.z = game.ship.tilt;
        shipGroup.position.y = game.ship.sinkY;

        // The Break Event (~60 seconds in)
        if (timeSinceHit > 60 && !game.ship.isBroken) {
            game.ship.isBroken = true;
            unifiedHullsGroup.visible = false;
            splitHulls.forEach(m => m.visible = true);
            console.warn("SHIP_BROKEN_IN_HALF_DYNAMICALLY");
        }

        if (game.ship.isBroken) {
            // Bow group (+X) tip must plunge DOWN, so it requires negative Z rotation!
            bowGroup.rotation.z = Math.max(-1.5, bowGroup.rotation.z - 0.004);
            bowGroup.position.y -= 0.1;

            // Stern group needs to rotate its -X tail UPWARD, which means negative Z rotation!
            game.ship.sternTilt = game.ship.sternTilt || 0;
            const targetTilt = -1.2; // roughly 70 degrees up into the air
            game.ship.sternTilt += (targetTilt - game.ship.sternTilt) * 0.001;
            sternGroup.rotation.z = game.ship.sternTilt;

            // Sink base 10x slower than previous (from 0.0005 to 0.00005)
            game.ship.sternBase = game.ship.sternBase === undefined ? 12 : game.ship.sternBase - 0.00005;
            game.ship.sternY = game.ship.sternY === undefined ? 0 : game.ship.sternY;
            game.ship.sternY += (game.ship.sternBase - game.ship.sternY) * 0.002;

            // Bobbing formula 
            sternGroup.position.y = game.ship.sternY + (Math.sin(timeSinceHit * 1.5) * 0.3);
        }
    }

    if (!shipGroup.userData.smokes) shipGroup.userData.smokes = [];
    const smokes = shipGroup.userData.smokes;

    if (game.phase === 'sinking' && !game.ship.smokeCleared) {
        smokes.forEach(s => shipGroup.remove(s));
        smokes.length = 0;
        game.ship.smokeCleared = true;
    }

    if (game.phase === 'sailing' && game.ship.speed > 0.1) {
        if (Math.random() < 0.3 && shipGroup.userData.funnels) {
            shipGroup.userData.funnels.forEach((f, idx) => {
                const sMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.8 });
                const s = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), sMat);
                s.position.set(f.x, f.y, f.z);
                shipGroup.add(s);
                smokes.push(s);
            });
        }
    }
    for (let i = smokes.length - 1; i >= 0; i--) {
        let s = smokes[i];
        s.position.x -= 0.8; // Blow backwards
        s.position.y += 0.3; // Rise Up
        s.scale.setScalar(s.scale.x + 0.06);
        s.material.opacity -= 0.015;
        if (s.material.opacity <= 0) {
            s.parent.remove(s);
            s.material.dispose();
            smokes.splice(i, 1);
        }
    }
}

/**
 * Factory function for a highly detailed life-boat model based on historical blueprints.
 * @returns {THREE.Group} The lifeboat mesh group.
 */
export function buildDetailedLifeboat() {
    const boatGrp = new THREE.Group();

    
    // Materials based on museum replica
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
    const interiorMat = new THREE.MeshStandardMaterial({ color: 0xe3c28b, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xa67c52, roughness: 0.7 });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    // 1. Smooth Curved Hull (Sphere scaled)
    const hullGeo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    hullGeo.scale(1.4, 0.8, 3.8);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.rotation.x = Math.PI; 
    hull.position.y = 0.8;
    boatGrp.add(hull);

    // 2. Stem and Sternpost (Sharp vertical ends)
    const postGeo = new THREE.BoxGeometry(0.1, 0.8, 0.2);
    const stem = new THREE.Mesh(postGeo, hullMat);
    stem.position.set(0, 0.4, 3.75);
    boatGrp.add(stem);
    const sternPost = stem.clone();
    sternPost.position.z = -3.75;
    boatGrp.add(sternPost);

    // 3. Smooth Interior Lining (Slightly smaller sphere)
    const intGeo = new THREE.SphereGeometry(0.98, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    intGeo.scale(1.35, 0.75, 3.75);
    const interior = new THREE.Mesh(intGeo, interiorMat);
    interior.rotation.x = Math.PI;
    interior.position.y = 0.82;
    boatGrp.add(interior);

    // 4. Tan Rim (Gunwale - using Torus for smooth curvature)
    const rimGeo = new THREE.TorusGeometry(3.65, 0.1, 8, 48);
    rimGeo.scale(0.38, 1.05, 1);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.82;
    boatGrp.add(rim);

    // 5. Thwarts (Seats - Tan Wood)
    for (let z = -2.5; z <= 2.5; z += 1.25) {
        const thwart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.4), rimMat);
        thwart.position.y = 0.6;
        thwart.position.z = z;
        boatGrp.add(thwart);
    }

    // 6. Oarlocks (Small vertical pins)
    const oarlockGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2);
    for (let side of [-1, 1]) {
        for (let z = -2.8; z <= 2.8; z += 1.4) {
            const oarlock = new THREE.Mesh(oarlockGeo, detailMat);
            const wX = 1.35 * Math.sin(Math.acos(z / 4)); // Calculate width at Z
            oarlock.position.set(side * wX, 0.85, z);
            boatGrp.add(oarlock);
        }
    }

    return boatGrp;
}
