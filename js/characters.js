import { game } from './state.js';

let jackMesh, roseMesh;

function buildHuman(type) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({color: 0xffdcb1, roughness: 0.6});
    
    // Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 3.5;
    head.castShadow = true;
    group.add(head);
    
    if (type === 'jack') {
        // Jack's Hair (Iconic floppy Leo cut)
        const hairMat = new THREE.MeshStandardMaterial({color: 0xcdaa55, roughness: 0.9});
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), hairMat);
        hair.position.set(0, 4.0, -0.05); hair.castShadow = true; group.add(hair);
        // Floppy bang
        const bang = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.2), hairMat);
        bang.position.set(0.2, 3.8, 0.4); bang.rotation.z = -0.2; bang.castShadow = true; group.add(bang);
        
        // Dark brown/black shirt
        const shirtMat = new THREE.MeshStandardMaterial({color: 0x332b2b, roughness: 0.9});
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.6), shirtMat);
        torso.position.y = 2.2; torso.castShadow = true; group.add(torso);
        
        // Light Tan Suspender straps
        const suspMat = new THREE.MeshStandardMaterial({color: 0xd2b48c});
        const suspL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.55, 0.65), suspMat);
        suspL.position.set(-0.35, 2.2, 0); group.add(suspL);
        const suspR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.55, 0.65), suspMat);
        suspR.position.set(0.35, 2.2, 0); group.add(suspR);

        // Tan Corduroy Pants
        const pants = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, 0.65), new THREE.MeshStandardMaterial({color: 0x8b7355, roughness: 1.0}));
        pants.position.y = 0.85; pants.castShadow = true; group.add(pants);
        
        // Dark Work Boots
        const boots = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.8), new THREE.MeshStandardMaterial({color: 0x111111}));
        boots.position.set(0, 0.15, 0.05); boots.castShadow = true; group.add(boots);
        
        // Shirt sleeves (Arms) & Hands
        const armGeo = new THREE.BoxGeometry(0.4, 1.4, 0.4);
        const handGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        
        const armL = new THREE.Mesh(armGeo, shirtMat);
        armL.position.set(-0.8, 2.2, 0); armL.castShadow = true; group.add(armL);
        const handL = new THREE.Mesh(handGeo, skinMat); 
        handL.position.set(-0.8, 1.35, 0); group.add(handL);
        
        const armR = new THREE.Mesh(armGeo, shirtMat);
        armR.position.set(0.8, 2.2, 0); armR.castShadow = true; group.add(armR);
        const handR = new THREE.Mesh(handGeo, skinMat); 
        handR.position.set(0.8, 1.35, 0); group.add(handR);
    } else {
        // Elegant Updo Hair
        const hairMat = new THREE.MeshStandardMaterial({color: 0xa52a2a, roughness: 0.7});
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.95), hairMat);
        hair.position.set(0, 3.8, -0.05); hair.castShadow = true; group.add(hair);
        // Bun in the back
        const bun = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), hairMat);
        bun.position.set(0, 3.7, -0.5); bun.castShadow = true; group.add(bun);
        
        // Iconic Beaded Dining Dress (Dark Burgundy/Blackish)
        const dressMat = new THREE.MeshStandardMaterial({color: 0x2b0d12, roughness: 0.7, metalness: 0.2});
        const dressTop = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.5, 0.55), dressMat);
        dressTop.position.y = 2.2; dressTop.castShadow = true; group.add(dressTop);
        
        // "Heart of the Ocean" Necklace
        const jewelMat = new THREE.MeshStandardMaterial({color: 0x0044ff, roughness: 0.1, metalness: 0.9});
        const necklace = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), jewelMat);
        necklace.position.set(0, 2.65, 0.3); group.add(necklace);
        
        // Flowing Skirt
        const skirtGeo = new THREE.CylinderGeometry(0.55, 1.4, 2.0, 16);
        const skirt = new THREE.Mesh(skirtGeo, dressMat);
        skirt.position.y = 1.0; skirt.castShadow = true; group.add(skirt);
        
        // Arms with Long White Formal Gloves
        const gloveMat = new THREE.MeshStandardMaterial({color: 0xeeeeee, roughness: 0.9});
        const armGeo = new THREE.BoxGeometry(0.35, 1.4, 0.35);
        
        // Left Arm (Gloves) and exposed Shoulder
        const armL = new THREE.Mesh(armGeo, gloveMat);
        armL.position.set(-0.7, 1.95, 0); armL.castShadow = true; group.add(armL);
        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
        shoulderL.position.set(-0.7, 2.8, 0); group.add(shoulderL);
        
        // Right Arm (Gloves) and exposed Shoulder
        const armR = new THREE.Mesh(armGeo, gloveMat);
        armR.position.set(0.7, 1.95, 0); armR.castShadow = true; group.add(armR);
        const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
        shoulderR.position.set(0.7, 2.8, 0); group.add(shoulderR);
    }
    
    group.scale.set(0.8, 0.8, 0.8);
    return group;
}

export function initCharacters(scene) {
    jackMesh = buildHuman('jack');
    jackMesh.position.set(game.players.jack.x, 38, game.players.jack.z);
    scene.add(jackMesh);

    roseMesh = buildHuman('rose');
    roseMesh.position.set(game.players.rose.x, 38, game.players.rose.z);
    scene.add(roseMesh);

    return { jackMesh, roseMesh };
}
