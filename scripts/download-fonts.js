const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'src', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    name: 'Inter-Regular.ttf',
    url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_400Regular.ttf'
  },
  {
    name: 'Inter-Bold.ttf',
    url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_700Bold.ttf'
  },
  {
    name: 'Inter-Black.ttf',
    url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_900Black.ttf'
  },
  {
    name: 'NotoSansSymbols2-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf'
  }
];

async function download(font) {
  const dest = path.join(fontsDir, font.name);
  console.log(`Downloading ${font.name} from ${font.url}...`);
  try {
    const response = await fetch(font.url);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(`Saved ${font.name} to ${dest} (${buffer.length} bytes)`);
  } catch (e) {
    console.error(`Error fetching ${font.name}:`, e.message || e);
    throw e;
  }
}

async function main() {
  for (const font of fonts) {
    try {
      await download(font);
    } catch (err) {
      process.exit(1);
    }
  }
  console.log('All fonts downloaded successfully!');
}

main();
