import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const VERSION = JSON.parse(fs.readFileSync('./package.json')).version || '1.0.0';
const DIST_DIR = './dist';
const SITE_DIR = './dist_site';

console.log(`🚀 Starting Production Build v${VERSION}...`);

// 1. Ensure directories exist
[DIST_DIR, SITE_DIR, path.join(SITE_DIR, 'dist'), path.join(SITE_DIR, 'js')].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Bundle JS using esbuild
console.log('📦 Bundling scripts...');
try {
    execSync(`npx esbuild js/main.js --bundle --minify --outfile=${SITE_DIR}/dist/main.bundle.js`);
    execSync(`npx esbuild js/gallery.js --bundle --minify --outfile=${SITE_DIR}/dist/gallery.bundle.js`);
} catch (err) {
    console.error('❌ Bundling failed:', err.message);
    process.exit(1);
}

// 3. Copy Static Assets
console.log('📂 Copying static assets...');
const assets = ['style.css', 'js/three.min.js', 'js/nipplejs.min.js'];
assets.forEach(asset => {
    if (fs.existsSync(asset)) {
        fs.copyFileSync(asset, path.join(SITE_DIR, asset));
    }
});

// 4. Inject versioning and save to SITE_DIR as index.html
console.log('🏷️  Injecting versioning into HTML...');
const htmlFiles = ['index.html', 'gallery.html'];
htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace script tags with versioned bundles
    if (file === 'index.html') {
        content = content.replace(
            /<script type="module" src="js\/main\.js"><\/script>/,
            `<script type="module" src="dist/main.bundle.js?v=${VERSION}"></script>`
        );
    } else {
        content = content.replace(
            /<script type="module" src="js\/gallery\.js"><\/script>/,
            `<script type="module" src="dist/gallery.bundle.js?v=${VERSION}"></script>`
        );
    }
    
    fs.writeFileSync(path.join(SITE_DIR, file), content);
    console.log(`   Optimized ${file}`);
});

console.log('\n✨ Build finished successfully! ✨');
console.log('   Use the .prod.html files for production deployment.');
