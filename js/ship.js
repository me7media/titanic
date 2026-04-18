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

    bowGroup = new THREE.Group(); bowGroup.name = "bowModelGroup";
    sternGroup = new THREE.Group(); sternGroup.name = "sternModelGroup";

    shipGroup.add(bowGroup);
    shipGroup.add(sternGroup);

    const bowModelGroup = bowGroup;
    const sternModelGroup = sternGroup;

    // Noir/Historical Materials - Deep Pitch Black Top, Vibrant Carmine Red Bottom
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.7, metalness: 0.2 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: 0x6D201A, roughness: 0.7, metalness: 0.1 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfffcf0, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2A1B12, roughness: 0.9 });
    const funnelMat = new THREE.MeshStandardMaterial({ color: 0xcc9933, roughness: 0.7 });
    const funnelTopMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x88bbff });
    const propMat = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.8, roughness: 0.2 });

    /**
     * Procedural Hull Z-depth calculation (Beam width shaping)
     * Refined using parametric taper formulas for a sleek 1:9.5 ratio profile.
     */
    function getHullZ(x, y, maxZ) {
        let z = maxZ;
        const ny = Math.max(0, Math.min(1, (y + 5) / 25)); // Adjusted for 18-height hull
        const uShape = 0.5 + 0.5 * Math.pow(ny, 0.4); 
        z *= uShape;

        // Nose Taper (Sharp Power Function for 220 length)
        if (x > 35) {
            const t = (x - 35) / 75; // spans to 110
            z *= Math.max(0, 1 - Math.pow(t, 2.2));
        }
        
        // Stern Taper (Elliptical Power Function for 220 length)
        if (x < -30) {
            const t = (-x - 30) / 80; // spans to -110
            z *= Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.5)));
        }
        return z;
    }

    function getSheer(x) {
        if (x < 20) return 0;
        const t = (x - 20) / 90;
        return Math.pow(t, 2) * 5.5; 
    }
    shipGroup._getSheer = getSheer; // Export for physics


    // Generator for split halves
    const createSplitHull = (width, length, topY, bottomY, mat, isStern) => {
        const height = topY - bottomY;
        const halfLen = length / 2;
        const geo = new THREE.BoxGeometry(halfLen, height, width, 64, 8, 24); // More segments for rounding
        const pos = geo.attributes.position;
        const offsetX = isStern ? -halfLen / 2 : halfLen / 2;

        for (let i = 0; i < pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let yGlobal = pos.getY(i) + (topY + bottomY) / 2;
            let sheer = getSheer(globalX);
            let z = pos.getZ(i);

            const actualZ = getHullZ(globalX, yGlobal, (z > 0 ? width / 2 : -width / 2));
            pos.setXYZ(i, localX, yGlobal - (topY + bottomY) / 2 + sheer, actualZ);
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(offsetX, (topY + bottomY) / 2, 0);
        mesh.castShadow = true; mesh.receiveShadow = true;
        (isStern ? sternGroup : bowGroup).add(mesh);
    }

    // Create halves (Width 32, Length 220, Height 18)
    createSplitHull(32, 220, 18, 10, hullMat, false);
    createSplitHull(32, 220, 18, 10, hullMat, true);
    createSplitHull(31.6, 218, 10, -8, bottomMat, false);
    createSplitHull(31.6, 218, 10, -8, bottomMat, true);

    // Add glowing blue portholes along the hull sides
    const portMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, side: THREE.DoubleSide });
    const portGeo = new THREE.CircleGeometry(0.22, 12);
    
    function addPort(x, y) {
        if (Math.abs(x) < 1.0) return; 
        const group = x < 0 ? sternModelGroup : bowModelGroup;
        const sheer = getSheer(x);
        const hullZ = getHullZ(x, y + sheer, 16.0); // 16.0 is half of 32
        
        const p1 = new THREE.Mesh(portGeo, portMat);
        p1.position.set(x, y + sheer, hullZ + 0.05);
        group.add(p1);
        
        const p2 = new THREE.Mesh(portGeo, portMat);
        p2.position.set(x, y + sheer, -hullZ - 0.05);
        group.add(p2);
    }

    // Top tier: Groups of 3 (gap on every 4th)
    let pCount = 0;
    for (let x = -85; x <= 85; x += 1.2) {
        if (pCount++ % 4 !== 3) addPort(x, 15.5);
    }
    for (let x = -82; x <= 82; x += 1.6) addPort(x, 12.5);
    for (let x = -80; x <= 80; x += 4.5) addPort(x, 9.0);

    // Decks
    /**
     * Parabolic Camber (Transverse deck curve for water runoff)
     * Highest in center (z=0), lowest at railings.
     */
    function getCamber(z, width) {
        return 0.15 * (1 - Math.pow((2 * z) / width, 2));
    }

    function generateDeckVerts(geo, length, offsetX, width) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let localX = pos.getX(i);
            let globalX = localX + offsetX;
            let currentPlaneY = pos.getY(i); // This is local Z (width)
            let sheer = getSheer(globalX);
            let camber = getCamber(currentPlaneY, width);
            const actualWidthZ = getHullZ(globalX, 25, currentPlaneY);
            pos.setXYZ(i, localX, actualWidthZ, -(sheer + camber));
        }
        geo.computeVertexNormals();
    }

    // Split decks
    const splitDeck1 = new THREE.PlaneGeometry(70, 21, 64, 24); generateDeckVerts(splitDeck1, 140, 35, 21);
    const m1 = new THREE.Mesh(splitDeck1, woodMat); m1.rotation.x = -Math.PI / 2; m1.position.set(35, 25.1, 0); m1.receiveShadow = true; m1.visible = true; bowModelGroup.add(m1);

    const splitDeck2 = new THREE.PlaneGeometry(70, 21, 64, 24); generateDeckVerts(splitDeck2, 140, -35, 21);
    const m2 = new THREE.Mesh(splitDeck2, woodMat); m2.rotation.x = -Math.PI / 2; m2.position.set(-35, 25.1, 0); m2.receiveShadow = true; m2.visible = true; sternModelGroup.add(m2);


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
                let sheer = getSheer(globalX);
                let camber = getCamber(localZ, depth);
                
                // Scale the vertex Z and apply sheer/camber to Y
                const hullZ = getHullZ(globalX, yLevel + sheer, depth / 2);
                const zRatio = localZ / (depth/2);
                pos.setXYZ(i, localX, pos.getY(i) + sheer + camber, zRatio * hullZ);
            }
            geo.computeVertexNormals();

            const mesh = new THREE.Mesh(geo, whiteMat);
            mesh.position.set(cx, yLevel + (baseH / 2), 0);
            mesh.castShadow = true; mesh.receiveShadow = true;
            targetGroup.add(mesh);

            // Roof (More camber on top roofs)
            const rGeo = new THREE.BoxGeometry(w, 0.2, depth + 0.4, 16, 1, 8);
            const rPos = rGeo.attributes.position;
            for (let i = 0; i < rPos.count; i++) {
                let rLocalX = rPos.getX(i);
                let rLocalZ = rPos.getZ(i);
                let globalX = rLocalX + cx;
                let sheer = getSheer(globalX);
                let camber = getCamber(rLocalZ, depth + 0.4);
                let zRatio = rLocalZ / ((depth + 0.4) / 2);
                const hullZ = getHullZ(globalX, yLevel + baseH + sheer, (depth + 0.4) / 2);
                rPos.setXYZ(i, rLocalX, rPos.getY(i) + sheer + camber, zRatio * hullZ);
            }
            rGeo.computeVertexNormals();
            const roof = new THREE.Mesh(rGeo, woodMat);
            roof.position.set(cx, yLevel + baseH, 0);
            targetGroup.add(roof);

            // Forward Facing Windows (Add detail to the front walls of tiers)
            const winGeo = new THREE.PlaneGeometry(0.8, 1.2);
            for (let j = -depth / 2 + 2; j <= depth / 2 - 2; j += 2.5) {
                const win = new THREE.Mesh(winGeo, windowMat);
                // Position at the front face (+X end of the tier block)
                win.position.set(cx + w / 2 + 0.05, yLevel + baseH / 2, j);
                win.rotation.y = Math.PI / 2;
                targetGroup.add(win);
            }

            const wndGeo = new THREE.PlaneGeometry(0.8, 1.2);
            for (let x = sX + 2; x < eX - 2; x += 3.0) {
                if (Math.random() > 0.2) {
                    const sheer = getSheer(x);
                    const hZ = getHullZ(x, yLevel + baseH / 2 + sheer, depth / 2) + 0.05;
                    const w1 = new THREE.Mesh(wndGeo, windowMat);
                    w1.position.set(x, yLevel + baseH / 2 + sheer, hZ); targetGroup.add(w1);
                    const w2 = new THREE.Mesh(wndGeo, windowMat);
                    w2.position.set(x, yLevel + baseH / 2 + sheer, -hZ); w2.rotation.y = Math.PI; targetGroup.add(w2);
                }
            }

            // Front Facing Windows (Only for true end pieces - updated for dynamic deck lengths)
            if (eX === 69 || eX === 33.6 || eX === 30 || eX === 29 || eX === 28 || eX === 25 || eX === 20 || eX === 15) {
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

    // Superstructures (Heights adjusted for better scale)
    // Superstructures (Widened and Adjusted)
    buildTier(-80, 70, 4.2, 30, 18.1); // C-Deck
    buildTier(-70, 50, 4.0, 28, 22.3); // B-Deck
    buildTier(-60, 55, 3.5, 24, 26.3); // A-Deck
    buildTier(-40, 30, 2.5, 18, 29.8); // Boat Deck

    // Bridge & Wings (Lowered to 32.3)
    const bridgeFront = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 10), woodMat);
    bridgeFront.position.set(30, 32.3 + 1.5, 0); // Positioned at the front of Boat Deck
    bowModelGroup.add(bridgeFront);


    // Propellers (Triple Shaft Setup with High-Fidelity Blades)
    const buildPropeller = (x, y, z, scale) => {
        const propGrp = new THREE.Group();
        // Hub
        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 12, 12), propMat);
        propGrp.add(hub);
        
        // 3 Blades (Parametric pitch)
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5 * scale, 1.2 * scale), propMat);
            blade.rotation.x = (i * Math.PI * 2) / 3;
            blade.position.y = 1.2 * scale;
            propGrp.add(blade);
        }
        
        // Shaft (Bronze cylinder)
        const shaftLen = 15;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, shaftLen), propMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.x = shaftLen / 2;
        propGrp.add(shaft);

        propGrp.position.set(x, y, z);
        
        // Historical Outboard Angle (2.5 degrees)
        if (z !== 0) {
            propGrp.rotation.y = (z > 0 ? 0.043 : -0.043);
        }

        sternModelGroup.add(propGrp);
        if (!shipGroup.userData.props) shipGroup.userData.props = [];
        shipGroup.userData.props.push(propGrp);
    };

    buildPropeller(-68.5, -3.5, 0, 1.2);    // Center (Straight)
    buildPropeller(-64.5, -2, 5.0, 1.0);    // Port (Angled)
    buildPropeller(-64.5, -2, -5.0, 1.0);   // Starboard (Angled)

    // Rudder (NACA 0012-like Profile)
    const rudderGeo = new THREE.BoxGeometry(3, 8, 0.6);
    const rudder = new THREE.Mesh(rudderGeo, hullMat);
    rudder.position.set(-71, 3, 0);
    sternModelGroup.add(rudder);

    // Forward Cargo Cranes (Derricks)
    function buildCrane(x, z) {
        const cGrp = new THREE.Group();
        const crBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3), whiteMat);
        crBase.position.y = 1.5; cGrp.add(crBase);
        const crArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10), whiteMat);
        crArm.position.set(3, 4, 0); crArm.rotation.z = Math.PI / 3; cGrp.add(crArm);
        const s = getSheer(x);
        cGrp.position.set(x, 18.1 + s, z); // Anchored to dynamic Main Deck height
        bowModelGroup.add(cGrp);
    }
    buildCrane(85, 4);
    buildCrane(85, -4);
    buildCrane(92, 0);

    // Funnels
    if (!shipGroup.userData) shipGroup.userData = {};
    shipGroup.userData.funnels = [];
    const RAKE = 0.165; // 9.46 degrees (1:6)
    const funnelObjGeo = new THREE.CylinderGeometry(1.6, 1.6, 12, 16);
    const funnelCapGeo = new THREE.CylinderGeometry(1.65, 1.65, 2.5, 16);
    for (let i = 0; i < 4; i++) {
        const cx = 40 - (i * 25);
        const cy = 34; // Lowered to match new deck heights
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

        // Funnel Rigging Cables (Anchored to deck at 32.3)
        const createCable = (vx, vy, vz) => {
            const geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(cx, cy + 5, 0),
                new THREE.Vector3(vx, vy, vz)
            ]);
            tg.add(new THREE.Line(geo, wireMat));
        };
        createCable(cx + 6, 32.3, 5);
        createCable(cx + 6, 32.3, -5);
        createCable(cx - 6, 32.3, 5);
        createCable(cx - 6, 32.3, -5);
    }

    // Masts (Moved to edges of 220-length hull)
    const mastGeo = new THREE.CylinderGeometry(0.3, 0.5, 45, 8);
    const foremast = new THREE.Mesh(mastGeo, woodMat);
    foremast.position.set(95, 30, 0); // Fore
    foremast.rotation.z = RAKE;
    bowModelGroup.add(foremast);

    const mainmast = new THREE.Mesh(mastGeo, woodMat);
    mainmast.position.set(-95, 26, 0); // Aft
    mainmast.rotation.z = RAKE;
    sternModelGroup.add(mainmast);

    // Marconi Antennas (Catenary curve between tilted masts)
    const antennaCount = 4;
    const mastH = 45;
    const offX_fore = -Math.sin(RAKE) * (mastH / 2); 
    const offX_main = Math.sin(RAKE) * (mastH / 2); // Tilt towards center
    const offY_tip = Math.cos(RAKE) * (mastH / 2);  
    
    // Accurate anchor points at mast tops
    const pFore = new THREE.Vector3(95 + offX_fore, 30 + offY_tip, 0);
    const pMain = new THREE.Vector3(-95 + offX_main, 26 + offY_tip, 0);
    
    shipGroup.userData.antennas = [];
    for (let i = 0; i < antennaCount; i++) {
        const offsetZ = (i - (antennaCount-1)/2) * 0.8;
        const pts = [];
        const dist = pFore.x - pMain.x;
        for (let t = 0; t <= 1; t += 0.02) { // More segments for smooth curve
            const tx = pMain.x + t * dist;
            // Catenary-like sag: hyperbolic cosine offset
            const mid = (t - 0.5) * 2; // -1 to 1
            const sag = (Math.cosh(mid) - 1.54) * 4.5; // Deeper, more atmospheric sag
            pts.push(new THREE.Vector3(tx, pFore.y + sag, offsetZ));
        }
        const antennaGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const aLine = new THREE.Line(antennaGeo, wireMat);
        shipGroup.userData.antennas.push(aLine);
        shipGroup.add(aLine);
    }

    // Mast Guy-Wires (Rigging connecting to dynamic deck & tapering hull)
    function buildMastRigging(mx, my, tg) {
        const tiltX = (mx > 0 ? -1 : 1) * Math.sin(RAKE) * (mastH / 2);
        const top = new THREE.Vector3(mx + tiltX, my + offY_tip, 0);
        const sideOffsets = [
            { x: 14, zSide: 1 }, { x: 14, zSide: -1 },
            { x: -14, zSide: 1 }, { x: -14, zSide: -1 }
        ];
        sideOffsets.forEach(off => {
            const anchorX = mx + off.x;
            const anchorY = 18.1 + getSheer(anchorX); 
            // Calculate actual hull width at this X point to avoid flying cables
            const anchorZ = getHullZ(anchorX, anchorY, 16.0) * off.zSide; 
            
            const geo = new THREE.BufferGeometry().setFromPoints([
                top,
                new THREE.Vector3(anchorX, anchorY, anchorZ)
            ]);
            tg.add(new THREE.Line(geo, wireMat));
        });
    }
    buildMastRigging(95, 30, bowModelGroup);
    buildMastRigging(-95, 26, sternModelGroup);
    
    // Deck Details (Vents, Skylights, Hatches, and Pool)
    const buildVent = (x, y, z) => {
        const v = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5), whiteMat);
        base.position.y = 0.75; v.add(base);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), whiteMat);
        top.position.y = 1.5; v.add(top);
        v.position.set(x, y, z);
        (x < 0 ? sternModelGroup : bowModelGroup).add(v);
    };

    const buildHatch = (x, y, z, w, d) => {
        const h = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), woodMat);
        h.position.set(x, y + 0.4, z);
        (x < 0 ? sternModelGroup : bowModelGroup).add(h);
    };

    const buildSkylight = (x, y, z, w, d) => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), whiteMat);
        s.position.set(x, y + 0.25, z);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.2, d - 0.4), windowMat);
        glass.position.y = 0.35; s.add(glass);
        (x < 0 ? sternModelGroup : bowModelGroup).add(s);
    };

    // Pool / Tank (The blue rectangle from screenshot)
    const buildPool = (x, y, z) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 4), whiteMat);
        p.position.set(x, y + 0.25, z);
        const water = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), portMat);
        water.rotation.x = -Math.PI / 2; water.position.y = 0.3; p.add(water);
        (x < 0 ? sternModelGroup : bowModelGroup).add(p);
    };

    // Placement of Details (Corrected Y to 32.3 for Boat Deck surface)
    buildHatch(85, 18.2, 0, 8, 8); 
    buildHatch(-85, 18.2, 0, 8, 8); 
    buildPool(-2, 32.3, 0); 

    // Vents and Skylights along the Boat Deck (Corrected Y to 32.3)
    for (let i = 0; i < 5; i++) {
        const vx = 25 - (i * 12);
        if (vx < 30 && vx > -40) {
            buildVent(vx, 32.3, 4.5);
            buildVent(vx, 32.3, -4.5);
            buildSkylight(vx - 5, 32.3, 0, 4.5, 4);
        }
    }

    // Detailed Lifeboats
    const davitMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 }); 
    const boatBodyMat = new THREE.MeshStandardMaterial({ color: 0xfffcf0 });
    const coverMat = new THREE.MeshStandardMaterial({ color: 0xcca578 }); 
    
    function buildLifeboat(x, z) {
        const boatGrp = new THREE.Group();
        const L = 7.5; // Longer for realism
        const W = 2.4; 
        const H = 1.2;

        // 1. Solid Curved Hull (Double-sided for white interior)
        const hullGeo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        hullGeo.scale(L/2, H, W/2);
        const intHullMat = whiteMat.clone(); intHullMat.side = THREE.DoubleSide;
        const hull = new THREE.Mesh(hullGeo, intHullMat);
        hull.rotation.x = Math.PI; // Invert to make it a bowl
        hull.position.y = H;
        boatGrp.add(hull);

        // 2. Interior Floor (Elliptical floor following hull shape)
        const floorGeo = new THREE.BoxGeometry(L * 0.9, 0.1, W * 0.8, 16, 1, 8);
        const fPos = floorGeo.attributes.position;
        for (let i = 0; i < fPos.count; i++) {
            let lx = fPos.getX(i); let lz = fPos.getZ(i);
            const t = (2 * lx) / (L * 0.9);
            const maxWidth = Math.sqrt(Math.max(0, 1 - t * t));
            fPos.setZ(i, lz * maxWidth);
        }
        floorGeo.computeVertexNormals();
        const floor = new THREE.Mesh(floorGeo, woodMat);
        floor.position.y = H - 0.22;
        boatGrp.add(floor);

        // 3. Benches (Thwarts) - Dynamically sized to fit hull taper
        for (let bx = -L/2 + 1; bx <= L/2 - 1; bx += L/5) {
            const t = (2 * bx) / L;
            const currentWidth = W * 0.9 * Math.sqrt(Math.max(0, 1 - t * t));
            const thwart = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, currentWidth), woodMat);
            thwart.position.set(bx, H - 0.1, 0);
            boatGrp.add(thwart);
        }

        // 4. Davits (Durable Iron Arms)
        const davGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5);
        for (let dx of [-L/2 + 0.5, L/2 - 0.5]) {
            const dav = new THREE.Mesh(davGeo, davitMat);
            dav.position.set(dx, H + 0.8, (z > 0 ? 0.6 : -0.6));
            dav.rotation.z = (dx > 0 ? -0.4 : 0.4);
            boatGrp.add(dav);
            
            // Suspension Ropes (Falls)
            const pts = [
                new THREE.Vector3(dx, H + 2.5, (z > 0 ? 0.6 : -0.6)), 
                new THREE.Vector3(dx, H - 0.2, 0)
            ];
            const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
            boatGrp.add(rope);
        }
        
        const sheerPos = getSheer(x);
        boatGrp.position.set(x, 29.2 + sheerPos, z);
        (x < 0 ? sternModelGroup : bowModelGroup).add(boatGrp);
    }
    
    for (let side of [-1, 1]) {
        for (let i = 0; i < 8; i++) {
            const bx = 28 - (i * 9); // Space out boats
            if (bx > -38) buildLifeboat(bx, side * 9.5); // Wider for 32 hull
        }
    }

    scene.add(shipGroup);
    return shipGroup;
}

export function updateShip(shipGroup) {
    if (!game.running) return;
    shipGroup.visible = game.currentRoom === 'deck';

    // Lateral Steering Physics & Visuals!
    if (game.phase === 'sailing' && game.ship.zPos !== undefined) {
        shipGroup.position.z += (game.ship.zPos - shipGroup.position.z) * 0.05;
        const targetYaw = (game.ship.zPos - shipGroup.position.z) * 0.02;
        shipGroup.rotation.y += (targetYaw - shipGroup.rotation.y) * 0.1;
        const targetRoll = (game.ship.zPos - shipGroup.position.z) * 0.005;
        shipGroup.rotation.x += (targetRoll - shipGroup.rotation.x) * 0.1;
    }

    if (game.phase === 'sinking') {
        const timeSinceHit = game.time - game.ship.sinkStartTime;

        // Phase 1: Heavy Bow Dip (Tilt up to ~30 degrees)
        game.ship.tilt = Math.min(0.5, (timeSinceHit / 60) * 0.4); 
        game.ship.sinkY -= 0.003; 
        shipGroup.rotation.z = -game.ship.tilt; // Bow (+X) goes DOWN
        shipGroup.position.y = game.ship.sinkY;

        // The Break Event (~60 seconds in)
        if (timeSinceHit > 60 && !game.ship.isBroken) {
            game.ship.isBroken = true;
            console.warn("SHIP_FRACTURE_EVENT_TRIGGERED");

            // Snapped Antennas disappear
            if (shipGroup.userData.antennas) {
                shipGroup.userData.antennas.forEach(a => a.visible = false);
            }

            // Stern 'splashes' back after break
            game.ship.sternBase = 2.0; 
            game.ship.sternY = 0;
        }

        if (game.ship.isBroken) {
            // Bow (+X part of model) plunges more slowly
            bowGroup.rotation.z = Math.max(-1.5, bowGroup.rotation.z - 0.002);
            bowGroup.position.y -= 0.05;
            bowGroup.position.x += 0.04; // Slower slip away

            // Stern rises to vertical 90 degrees EXACTLY relative to horizon
            game.ship.sternTilt = game.ship.sternTilt || 0;
            const targetTilt = -1.57 - shipGroup.rotation.z; 
            game.ship.sternTilt += (targetTilt - game.ship.sternTilt) * 0.001; 
            sternGroup.rotation.z = game.ship.sternTilt;
            
            // Stern sinks into the abyss TWICE as fast now as requested
            game.ship.sternBase = game.ship.sternBase === undefined ? 8 : game.ship.sternBase - 0.01; 
            game.ship.sternY += (game.ship.sternBase - game.ship.sternY) * 0.01;
            
            // Realistic ocean bobbing (Heavy)
            sternGroup.position.y = game.ship.sternY + (Math.sin(timeSinceHit * 1.5) * 0.4);
        }
    }

    // Smoke cleanup
    if (!shipGroup.userData.smokes) shipGroup.userData.smokes = [];
    const smokes = shipGroup.userData.smokes;
    if (game.phase === 'sinking') {
        smokes.forEach(s => { s.material.opacity *= 0.95; if (s.material.opacity < 0.05) { s.parent.remove(s); s.material.dispose(); } });
    }

    if (game.phase === 'sailing' && game.ship.speed > 0.1) {
        if (Math.random() < 0.3 && shipGroup.userData.funnels) {
            shipGroup.userData.funnels.forEach(f => {
                const s = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.8 }));
                s.position.set(f.x, f.y, f.z); shipGroup.add(s); smokes.push(s);
            });
        }
    }
    for (let i = smokes.length - 1; i >= 0; i--) {
        let s = smokes[i]; if (!s.parent) { smokes.splice(i, 1); continue; }
        s.position.x -= 0.8; s.position.y += 0.3; s.scale.setScalar(s.scale.x + 0.06); s.material.opacity -= 0.015;
        if (s.material.opacity <= 0) { s.parent.remove(s); s.material.dispose(); smokes.splice(i, 1); }
    }
}

export function buildDetailedLifeboat() {
    const boatGrp = new THREE.Group();
    const L = 7.5; const W = 2.4; const H = 1.2;
    
    // Materials (Local to factory)
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfffcf0 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });

    // 1. Solid Curved Hull (Double-sided white interior)
    const hullGeo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    hullGeo.scale(L/2, H, W/2);
    const intHullMat = whiteMat.clone(); intHullMat.side = THREE.DoubleSide;
    const hull = new THREE.Mesh(hullGeo, intHullMat);
    hull.rotation.x = Math.PI; 
    hull.position.y = H;
    boatGrp.add(hull);

    // 2. Interior Floor (Elliptical)
    const floorGeo = new THREE.BoxGeometry(L * 0.9, 0.1, W * 0.8, 16, 1, 8);
    const fPos = floorGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
        let lx = fPos.getX(i); let lz = fPos.getZ(i);
        const t = (2 * lx) / (L * 0.9);
        const maxWidth = Math.sqrt(Math.max(0, 1 - t * t));
        fPos.setZ(i, lz * maxWidth);
    }
    floorGeo.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeo, woodMat);
    floor.position.y = H - 0.22;
    boatGrp.add(floor);

    // 3. Benches (Dynamic width)
    for (let bx = -L/2 + 1; bx <= L/2 - 1; bx += L/5) {
        const t = (2 * bx) / L;
        const currentWidth = W * 0.9 * Math.sqrt(Math.max(0, 1 - t * t));
        const thwart = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, currentWidth), woodMat);
        thwart.position.set(bx, H - 0.1, 0);
        boatGrp.add(thwart);
    }

    return boatGrp;
}
