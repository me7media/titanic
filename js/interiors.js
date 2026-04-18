import { ROOM_Y_POSITIONS } from './state.js';

export function initInteriors(scene, singleRoom = null) {
    // Rooms are placed deep underground to avoid intersecting with Ship/Ocean
    const rooms = singleRoom ? [singleRoom] : ['dining', 'cabin', 'lounge'];
    
    // Materials
    const woodWall = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, side: THREE.DoubleSide, roughness: 0.8 }); // Brightened mahogany
    const whiteWall = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, side: THREE.DoubleSide, roughness: 1.0 });
    const redCarpet = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 1.0 });
    const softBlueCarpet = new THREE.MeshStandardMaterial({ color: 0x88d8d0, roughness: 0.8 }); // Light turquoise / 'Coral Sea' blue
    const richCarpet = new THREE.MeshStandardMaterial({ color: 0x223366, roughness: 0.9 }); 
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
    const whiteCloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    
    rooms.forEach(room => {
        const yBase = singleRoom ? 0 : (ROOM_Y_POSITIONS[room] || 0);
        const group = new THREE.Group();
        group.position.set(0, yBase, 0);
        
        // Structure
        const wMat = room === 'corridor' ? whiteWall : woodWall;
        const fMat = richCarpet;

        // Floor - position 0.05 relative to the group (yBase is already on group)
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(59.8, 39.8), fMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0.05, 0); 
        floor.receiveShadow = true;
        group.add(floor);
        
        // Light is handled by chandeliers or the main scene


        // Furnish based on room type
        switch(room) {
            case 'dining':
                buildPanelling(group, woodMat);
                buildDining(group, woodMat, whiteCloth);
                break;
            case 'cabin':
                buildPanelling(group, woodMat); 
                buildCabin(group, woodMat, whiteCloth);
                break;
            case 'lounge':
                buildPanelling(group, woodMat);
                buildGrandStaircase(group, woodMat, redCarpet); // Red for iconic staircase
                buildLounge(group, woodMat);
                break;
            case 'corridor':
                buildCorridor(group, woodMat);
                break;
        }

        scene.add(group);
    });
}

// ==========================================
// PROCEDURAL ARCHITECTURE BUILDERS
// ==========================================

function buildPanelling(group, woodMat) {
    // Add elaborate vertical mahogany pillars to the walls
    const pillarGeo = new THREE.BoxGeometry(0.6, 15, 0.6);
    for(let x=-18; x<=18; x+=6) {
        const p1 = new THREE.Mesh(pillarGeo, woodMat);
        p1.position.set(x, 7.5, -14.8); group.add(p1);
        const p2 = new THREE.Mesh(pillarGeo, woodMat);
        p2.position.set(x, 7.5, 14.8); group.add(p2);
    }
}

function buildGrandStaircase(group, woodMat, carpetMat) {
    const stairQ = new THREE.Group();
    // Build iconic majestic staircase (Corrected direction: ascends backwards towards -Z)
    for(let i=0; i<16; i++) {
        // Wood Base
        const step = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 1.0), woodMat);
        step.position.set(0, i * 0.6 + 0.3, -2 - i * 1.0);
        stairQ.add(step);
        // Red Carpet overlay
        const carpet = new THREE.Mesh(new THREE.BoxGeometry(8, 0.65, 1.02), carpetMat);
        carpet.position.set(0, i * 0.6 + 0.3, -2 - i * 1.0);
        stairQ.add(carpet);
    }
    // Wooden Railings
    const railingGeo = new THREE.BoxGeometry(0.3, 3.0, 1.0);
    for(let i=0; i<16; i++) {
        const railL = new THREE.Mesh(railingGeo, woodMat);
        railL.position.set(-6.8, i * 0.6 + 2.0, -2 - i * 1.0);
        stairQ.add(railL);
        const railR = new THREE.Mesh(railingGeo, woodMat);
        railR.position.set(6.8, i * 0.6 + 2.0, -2 - i * 1.0);
        stairQ.add(railR);
    }
    // Wall clock carved panel at the landing
    const clockPanel = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 0.3), woodMat);
    clockPanel.position.set(0, 14, -18.5);
    stairQ.add(clockPanel);
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 16), new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0x444433}));
    clock.rotation.x = Math.PI / 2;
    clock.position.set(0, 15, -18.3);
    stairQ.add(clock);

    group.add(stairQ);
}

function buildArmchair(woodMat, fabricMat) {
    const chair = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), woodMat);
    base.position.y = 0.25; chair.add(base);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), fabricMat);
    seat.position.y = 0.7; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 0.4), fabricMat);
    back.position.set(0, 1.4, -0.6); chair.add(back);
    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 0.8, 1.5);
    const armL = new THREE.Mesh(armGeo, woodMat); armL.position.set(-0.7, 1.1, 0); chair.add(armL);
    const armR = new THREE.Mesh(armGeo, woodMat); armR.position.set(0.7, 1.1, 0); chair.add(armR);
    return chair;
}

// FURNITURE BUILDERS
function buildDining(group, woodMat, clothMat) {
    // Grand Chandelier
    const mainLight = new THREE.PointLight(0xffeedd, 1.5, 50);
    mainLight.position.set(0, 14, 0);
    group.add(mainLight);

    // 3 Long Tables
    const tGeo = new THREE.BoxGeometry(10, 0.2, 4);
    const legGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    const chairBackGeo = new THREE.BoxGeometry(1.2, 2.5, 0.2);
    const chairSeatGeo = new THREE.BoxGeometry(1.2, 0.2, 1.2);
    const plateGeo = new THREE.CircleGeometry(0.5, 16);
    const foodGeo = new THREE.SphereGeometry(0.2, 8, 8);
    
    for(let t=0; t<3; t++) {
        const zPos = -10 + (t * 10);
        
        // Table top
        const table = new THREE.Mesh(tGeo, clothMat);
        table.position.set(0, 2.6, zPos);
        table.castShadow = table.receiveShadow = true;
        group.add(table);
        
        // 4 Legs
        [[-4.5, 1.5], [4.5, 1.5], [-4.5, -1.5], [4.5, -1.5]].forEach(pos => {
            const leg = new THREE.Mesh(legGeo, woodMat);
            leg.position.set(pos[0], 1.25, zPos + pos[1]);
            group.add(leg);
        });

        // Plates and Food on table
        for(let x=-4; x<=4; x+=2) {
            // Plates
            const plate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({color: 0xffffff}));
            plate.rotation.x = -Math.PI / 2;
            plate.position.set(x, 2.71, zPos - 1.2);
            group.add(plate);
            const plate2 = plate.clone();
            plate2.position.z = zPos + 1.2;
            group.add(plate2);

            // Food items (Fruits/Bread)
            if (Math.random() > 0.3) {
                const food = new THREE.Mesh(foodGeo, new THREE.MeshStandardMaterial({color: Math.random() > 0.5 ? 0xffcc00 : 0xaa2222}));
                food.position.set(x, 2.9, zPos + (Math.random() > 0.5 ? 1.2 : -1.2));
                group.add(food);
            }
        }

        // Chairs along both sides (fewer chairs, further back)
        for(let x=-4; x<=4; x+=3) {
            // Side 1: Facing towards positive Z
            const c1 = new THREE.Group();
            const seat1 = new THREE.Mesh(chairSeatGeo, woodMat); seat1.position.y = 1.2; c1.add(seat1);
            const back1 = new THREE.Mesh(chairBackGeo, woodMat); back1.position.set(0, 2.3, -0.6); c1.add(back1);
            c1.position.set(x, 0, zPos - 3.5);
            group.add(c1);

            // Side 2: Facing towards negative Z
            const c2 = new THREE.Group();
            const seat2 = new THREE.Mesh(chairSeatGeo, woodMat); seat2.position.y = 1.2; c2.add(seat2);
            const back2 = new THREE.Mesh(chairBackGeo, woodMat); back2.position.set(0, 2.3, 0.6); c2.add(back2);
            c2.position.set(x, 0, zPos + 3.5);
            group.add(c2);
        }

        // 2 Candles on table
        [-3, 3].forEach(cx => {
            const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5), new THREE.MeshBasicMaterial({color: 0xffffff}));
            candle.position.set(cx, 2.9, zPos);
            group.add(candle);
            
            const pLight = new THREE.PointLight(0xffcc88, 0.8, 15);
            pLight.position.set(cx, 3.2, zPos);
            group.add(pLight);
        });
    }
}

function buildCabin(group, woodMat, clothMat) {
    // Massive Bed
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 8), woodMat);
    bedFrame.position.set(-10, 0.75, -5);
    group.add(bedFrame);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.4, 7.8), clothMat);
    mattress.position.set(-10, 1.7, -5);
    group.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 1.5), new THREE.MeshStandardMaterial({color: 0xeeeeff}));
    pillow.position.set(-10, 2.0, -8);
    group.add(pillow);

    // Bedstand + lamp
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1.5), woodMat);
    stand.position.set(-5, 1, -8);
    group.add(stand);

    const pLight = new THREE.PointLight(0xffaa55, 1.2, 20);
    pLight.position.set(-5, 3, -8);
    group.add(pLight);
    
    // Main soft light
    const softLight = new THREE.PointLight(0xddddff, 0.5, 40);
    softLight.position.set(0, 10, 0);
    group.add(softLight);
}

function buildLounge(group, woodMat) {
    const couchMat = new THREE.MeshStandardMaterial({color: 0x226633, roughness: 0.9}); // Green velvet
    const fancyMat = new THREE.MeshStandardMaterial({color: 0x5a1b1b, roughness: 0.8}); // Rich red armchair fabric
    
    // Add multiple richly detailed armchairs
    const chair1 = buildArmchair(woodMat, fancyMat);
    chair1.position.set(-5, 0.05, 5); chair1.rotation.y = Math.PI / 4; group.add(chair1);
    
    const chair2 = buildArmchair(woodMat, fancyMat);
    chair2.position.set(5, 0.05, 5); chair2.rotation.y = -Math.PI / 4; group.add(chair2);

    const chair3 = buildArmchair(woodMat, fancyMat);
    chair3.position.set(-5, 0.05, -5); chair3.rotation.y = (Math.PI / 4) * 3; group.add(chair3);

    const chair4 = buildArmchair(woodMat, fancyMat);
    chair4.position.set(5, 0.05, -5); chair4.rotation.y = (-Math.PI / 4) * 3; group.add(chair4);

    // Central elegant round table
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 16), woodMat);
    tableTop.position.set(0, 1.5, 0); group.add(tableTop);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8), woodMat);
    tableLeg.position.set(0, 0.75, 0); group.add(tableLeg);

    // Fireplace Logic at the side wall
    const fireGeo = new THREE.BoxGeometry(8, 6, 2);
    const fireplace = new THREE.Mesh(fireGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
    fireplace.position.set(-19, 3, 0); // Side wall
    group.add(fireplace);

    const fire = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.5), new THREE.MeshBasicMaterial({color: 0xff5500}));
    fire.position.set(-18.5, 1.5, 0);
    group.add(fire);

    const pLight = new THREE.PointLight(0xff5500, 2.5, 40);
    pLight.position.set(-15, 3, 0);
    group.add(pLight);

    // Grand Chandelier
    const chandelier = new THREE.PointLight(0xffddaa, 2.0, 50);
    chandelier.position.set(0, 12, 0);
    group.add(chandelier);
}

function buildCorridor(group, woodMat) {
    // Series of doors alone the walls
    const doorGeo = new THREE.BoxGeometry(0.2, 6, 3);
    for(let d=-10; d<=10; d+=6) {
        const doorL = new THREE.Mesh(doorGeo, woodMat);
        doorL.position.set(-19.8, 3, d);
        group.add(doorL);

        const doorR = new THREE.Mesh(doorGeo, woodMat);
        doorR.position.set(19.8, 3, d);
        group.add(doorR);
    }

    // Ceiling lights
    for(let z=-10; z<=10; z+=10) {
        const light = new THREE.PointLight(0xffffcc, 0.8, 20);
        light.position.set(0, 14, z);
        group.add(light);
    }
}
