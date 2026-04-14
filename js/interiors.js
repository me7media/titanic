import { ROOM_Y_POSITIONS } from './state.js';

export function initInteriors(scene) {
    const rooms = ['dining', 'cabin', 'lounge', 'corridor'];
    
    // Materials
    const woodWall = new THREE.MeshStandardMaterial({ color: 0x4a2a11, side: THREE.BackSide, roughness: 0.9 });
    const whiteWall = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, side: THREE.BackSide, roughness: 1.0 });
    const redCarpet = new THREE.MeshStandardMaterial({ color: 0x6b1414, roughness: 1.0 });
    const richCarpet = new THREE.MeshStandardMaterial({ color: 0x223366, roughness: 0.9 }); // Lounge uses blue
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
    const whiteCloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    
    rooms.forEach(room => {
        const yBase = ROOM_Y_POSITIONS[room];
        const group = new THREE.Group();
        group.position.set(0, yBase, 0);
        
        // Structure
        const wMat = room === 'corridor' ? whiteWall : woodWall;
        const fMat = room === 'lounge' ? richCarpet : redCarpet;

        const roomBox = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 30), wMat);
        roomBox.position.set(0, 7.5, 0);
        roomBox.receiveShadow = true;
        group.add(roomBox);

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), fMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        group.add(floor);

        // Furnish based on room type
        switch(room) {
            case 'dining':
                buildDining(group, woodMat, whiteCloth);
                break;
            case 'cabin':
                buildCabin(group, woodMat, whiteCloth);
                break;
            case 'lounge':
                buildLounge(group, woodMat);
                break;
            case 'corridor':
                buildCorridor(group, woodMat);
                break;
        }

        scene.add(group);
    });
}

// FURNITURE BUILDERS
function buildDining(group, woodMat, clothMat) {
    // 3 Long Tables
    const tGeo = new THREE.BoxGeometry(10, 0.2, 4);
    const legGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
    
    for(let t=0; t<3; t++) {
        const zPos = -8 + (t * 8);
        
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

    // Grand Chandelier
    const mainLight = new THREE.PointLight(0xffeedd, 1.5, 50);
    mainLight.position.set(0, 14, 0);
    group.add(mainLight);
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
    group.add(new THREE.PointLight(0xddddff, 0.5, 40).position.set(0, 10, 0));
}

function buildLounge(group, woodMat) {
    // Velvet Couches around a fireplace
    const couchMat = new THREE.MeshStandardMaterial({color: 0x226633, roughness: 0.9}); // Green velvet
    const couchGeo = new THREE.BoxGeometry(6, 1.5, 2);
    const backGeo = new THREE.BoxGeometry(6, 2, 0.5);

    [-1, 1].forEach(dir => {
        const c = new THREE.Mesh(couchGeo, couchMat);
        c.position.set(0, 0.75, dir * 5);
        group.add(c);
        
        const b = new THREE.Mesh(backGeo, couchMat);
        b.position.set(0, 2.5, dir * 6);
        group.add(b);
    });

    // Fireplace logic (Using simple glowing light to avoid particle code complexity)
    const fireGeo = new THREE.BoxGeometry(8, 6, 2);
    const fireplace = new THREE.Mesh(fireGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
    fireplace.position.set(-19, 3, 0); // Side wall
    group.add(fireplace);

    const fire = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.5), new THREE.MeshBasicMaterial({color: 0xff5500}));
    fire.position.set(-18.5, 1.5, 0);
    group.add(fire);

    const pLight = new THREE.PointLight(0xff5500, 2, 30);
    pLight.position.set(-15, 3, 0);
    group.add(pLight);
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
