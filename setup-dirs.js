#!/usr/bin/env node
/**
 * Setup script to create necessary directory structure
 * Run with: node setup-dirs.js
 */

import fs from 'fs';
import path from 'path';

const directories = [
  'src',
  'src/js',
  'src/js/utils',
  'src/js/views',
  'src/css',
  'src/assets',
  'src/assets/icons',
  'tests',
  'tests/unit',
  'tests/e2e',
  'docs'
];

console.log('Creating directory structure...');

directories.forEach(dir => {
  const fullPath = path.resolve(dir);
  try {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error(`✗ Failed to create ${dir}:`, error.message);
    } else {
      console.log(`✓ Exists: ${dir}`);
    }
  }
});

console.log('Directory structure setup complete!');