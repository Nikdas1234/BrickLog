// Draws the BrickLog logo and writes the source pictures for all icons:
//   public/icon.svg   icon of the web app (the PNG sizes come from pwa-assets-generator)
//   assets/*.png      launcher icon and splash screen of the Android app
//                     (all sizes come from `npx capacitor-assets generate --android`)
// Run `npm run icons` after changing the logo. A new launcher icon only reaches the
// phone with a new APK, so raise "nativeVersion" in package.json as well.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const BACKGROUND = '#1d3557';
const BRICK = '#f4b942';
const BRICK_SHADE = '#dd9f24';

// The logo on a 1024 x 1024 canvas: a brick seen from the side, with two knobs on top
// and a darker band at the bottom. It keeps clear of the outer edge, because Android
// launchers cut the icon into a circle or a rounded square.
const LOGO = `
  <rect x="232" y="452" width="560" height="290" rx="26" fill="${BRICK}"/>
  <rect x="293.600" y="382.600" width="156.800" height="75.400" rx="19" fill="${BRICK}"/>
  <rect x="573.600" y="382.600" width="156.800" height="75.400" rx="19" fill="${BRICK}"/>
  <rect x="232" y="652" width="560" height="90" rx="26" fill="${BRICK_SHADE}"/>
  <rect x="232" y="652" width="560" height="40" fill="${BRICK_SHADE}"/>`;

const icon = (background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${
    background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''
  }${LOGO}</svg>`;

// Splash screen: the logo in the middle of a plain page in the app's background colour.
const splash = (pageColor) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
    <rect width="2732" height="2732" fill="${pageColor}"/>
    <svg x="966" y="966" width="800" height="800" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" rx="230" fill="${BACKGROUND}"/>${LOGO}
    </svg>
  </svg>`;

writeFileSync('public/icon.svg', icon(BACKGROUND).replace(' width="1024" height="1024"', '') + '\n');
console.log('public/icon.svg');

const pictures = {
  // Full icon for old Android versions.
  'icon-only.png': icon(BACKGROUND),
  // Adaptive icon: Android combines these two layers and cuts them to shape.
  'icon-foreground.png': icon(null),
  'icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BACKGROUND}"/></svg>`,
  'splash.png': splash('#f1f3f8'),
  'splash-dark.png': splash('#0b1320'),
};

mkdirSync('assets', { recursive: true });
for (const [name, source] of Object.entries(pictures)) {
  await sharp(Buffer.from(source)).png().toFile(`assets/${name}`);
  console.log(`assets/${name}`);
}
