const sharp = require('sharp');
const fs = require('fs');

const logoPath = './src/assets/Habynex-logo.jpeg';
const outDir = './public';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
if (!fs.existsSync(logoPath)) {
  console.error('Logo non trouvé:', logoPath);
  process.exit(1);
}

async function create(size, name) {
  const pad = Math.round(size * 0.15);
  const imgSize = size - pad * 2;
  
  const img = await sharp(logoPath)
    .resize(imgSize, imgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 253, g: 251, b: 247, alpha: 1 } }
  })
    .composite([{ input: img, top: pad, left: pad }])
    .png()
    .toFile(`${outDir}/${name}`);
  
  console.log(`✓ ${name}`);
}

(async () => {
  await create(16, 'favicon-16x16.png');
  await create(32, 'favicon-32x32.png');
  await create(192, 'android-chrome-192x192.png');
  await create(512, 'android-chrome-512x512.png');
  await create(180, 'apple-touch-icon.png');
  await create(150, 'mstile-150x150.png');
  
  // Copier 32x32 comme favicon.ico
  fs.copyFileSync(`${outDir}/favicon-32x32.png`, `${outDir}/favicon.ico`);
  console.log('✓ favicon.ico');
  
  // SVG simple
  fs.writeFileSync(`${outDir}/safari-pinned-tab.svg`, 
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="40" r="28" fill="none" stroke="#F97316" stroke-width="5"/>
      <path d="M38 68 Q50 80 62 68" fill="none" stroke="#F97316" stroke-width="5" stroke-linecap="round"/>
      <line x1="42" y1="75" x2="58" y2="75" stroke="#F97316" stroke-width="5" stroke-linecap="round"/>
      <line x1="44" y1="82" x2="56" y2="82" stroke="#F97316" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 48 Q62 40 66 52 Q70 60 58 64 Q50 68 50 56" fill="#F97316"/>
    </svg>`
  );
  console.log('✓ safari-pinned-tab.svg');
  
  console.log('\n✅ Favicons générés !');
})();