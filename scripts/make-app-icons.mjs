// Renders the source pictures for the Android launcher icon and splash screen into
// assets/. Afterwards `npx capacitor-assets generate --android` turns them into all the
// sizes Android needs. Only has to be run again when the icon changes.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const RED = '#c8442b';
const BRICK = '#e2664d';
const STUD = '#f4a08d';

// The brick seen from above; `size` is the edge of the square it is drawn into.
function brick(size, x, y) {
  const s = size / 280;
  const stud = (cx, cy) => `<circle cx="${x + cx * s}" cy="${y + cy * s}" r="${46 * s}" fill="${STUD}"/>`;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${28 * s}" fill="${BRICK}"/>
    ${stud(76, 76)}${stud(204, 76)}${stud(76, 204)}${stud(204, 204)}`;
}

const svg = (edge, background, content) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${edge}" height="${edge}" viewBox="0 0 ${edge} ${edge}">
      ${background ? `<rect width="${edge}" height="${edge}" fill="${background}"/>` : ''}${content}</svg>`,
  );

const files = {
  // Full icon for old Android versions.
  'icon-only.png': svg(1024, RED, brick(560, 232, 232)),
  // Adaptive icon: launchers cut this into a circle or squircle, so the brick keeps its distance to the edge.
  'icon-foreground.png': svg(1024, null, brick(560, 232, 232)),
  'icon-background.png': svg(1024, RED, ''),
  'splash.png': svg(2732, '#f6f3ee', brick(480, 1126, 1126)),
  'splash-dark.png': svg(2732, '#151517', brick(480, 1126, 1126)),
};

mkdirSync('assets', { recursive: true });
for (const [name, source] of Object.entries(files)) {
  await sharp(source).png().toFile(`assets/${name}`);
  console.log(`assets/${name}`);
}
