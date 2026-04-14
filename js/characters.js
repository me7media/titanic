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
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), new THREE.MeshStandardMaterial({color: 0xcdaa55, roughness: 0.8}));
        hair.position.y = 4.0;
        hair.castShadow = true;
        group.add(hair);
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.6), new THREE.MeshStandardMaterial({color: 0xdddddd, roughness: 0.9}));
        torso.position.y = 2.2;
        torso.castShadow = true;
        group.add(torso);
        
        const pants = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.5, 0.65), new THREE.MeshStandardMaterial({color: 0x223344}));
        pants.position.y = 0.75;
        pants.castShadow = true;
        group.add(pants);
        
        const armGeo = new THREE.BoxGeometry(0.4, 1.5, 0.4);
        const armL = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({color: 0xdddddd}));
        armL.position.set(-0.8, 2.2, 0); armL.castShadow = true;
        group.add(armL);
        const armR = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({color: 0xdddddd}));
        armR.position.set(0.8, 2.2, 0); armR.castShadow = true;
        group.add(armR);
    } else {
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 0.9), new THREE.MeshStandardMaterial({color: 0xaa2211, roughness: 0.8}));
        hair.position.y = 3.6; hair.castShadow = true;
        group.add(hair);
        
        const dressTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.6), new THREE.MeshStandardMaterial({color: 0x8b0000}));
        dressTop.position.y = 2.2; dressTop.castShadow = true;
        group.add(dressTop);
        
        const skirtGeo = new THREE.CylinderGeometry(0.6, 1.4, 2.0, 8);
        const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({color: 0x8b0000}));
        skirt.position.y = 1.0; skirt.castShadow = true;
        group.add(skirt);
        
        const armGeo = new THREE.BoxGeometry(0.3, 1.4, 0.3);
        const armL = new THREE.Mesh(armGeo, skinMat);
        armL.position.set(-0.7, 2.2, 0); armL.castShadow = true;
        group.add(armL);
        const armR = new THREE.Mesh(armGeo, skinMat);
        armR.position.set(0.7, 2.2, 0); armR.castShadow = true;
        group.add(armR);
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
