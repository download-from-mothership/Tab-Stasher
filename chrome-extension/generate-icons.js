#!/usr/bin/env node

/**
 * Icon Generator for Tab Stasher Chrome Extension
 * 
 * This script generates the required PNG icons for the Chrome extension
 * from the existing logo.jpg file.
 * 
 * Requirements:
 * - Node.js
 * - sharp package (npm install sharp)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  console.error('Error: sharp package is required to generate icons.');
  console.error('Please install it with: npm install sharp');
  console.error('');
  console.error('Alternatively, you can:');
  console.error('1. Open chrome-extension/generate-icons.html in your browser');
  console.error('2. Right-click each icon and save as PNG');
  console.error('3. Place the PNG files in chrome-extension/icons/');
  process.exit(1);
}

const sizes = [16, 32, 48, 128];
const inputFile = path.join(__dirname, 'icons', 'logo.jpg');
const outputDir = path.join(__dirname, 'icons');

async function generateIcons() {
  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Logo file not found at ${inputFile}`);
      console.error('Please make sure logo.jpg exists in the chrome-extension/icons/ folder');
      process.exit(1);
    }

    console.log('Generating Chrome extension icons...');
    console.log(`Input file: ${inputFile}`);
    console.log(`Output directory: ${outputDir}`);
    console.log('');

    // Generate icons for each size
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon${size}.png`);
      
      try {
        await sharp(inputFile)
          .resize(size, size, {
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toFile(outputFile);
        
        console.log(`✓ Generated icon${size}.png (${size}x${size})`);
      } catch (error) {
        console.error(`✗ Failed to generate icon${size}.png:`, error.message);
      }
    }

    console.log('');
    console.log('Icon generation complete!');
    console.log('');
    console.log('Generated files:');
    sizes.forEach(size => {
      const filePath = path.join(outputDir, `icon${size}.png`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`  - icon${size}.png (${Math.round(stats.size / 1024)}KB)`);
      }
    });

  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the script
generateIcons();
