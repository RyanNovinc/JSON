// Simple script to generate app icon using canvas
// Run with: node scripts/generateIcon.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// Create 1024x1024 canvas for app icon
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Fill with black background
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 1024, 1024);

// Create a simple dumbbell icon using shapes
const iconSize = 1024 * 0.6; // 60% of canvas size
const centerX = 512;
const centerY = 512;
const barWidth = iconSize * 0.6;
const barHeight = iconSize * 0.08;
const weightRadius = iconSize * 0.12;

// Set icon color
ctx.fillStyle = '#22d3ee';

// Draw dumbbell bar (horizontal rectangle)
ctx.fillRect(centerX - barWidth/2, centerY - barHeight/2, barWidth, barHeight);

// Draw left weight (circle)
ctx.beginPath();
ctx.arc(centerX - barWidth/2, centerY, weightRadius, 0, Math.PI * 2);
ctx.fill();

// Draw right weight (circle)
ctx.beginPath();
ctx.arc(centerX + barWidth/2, centerY, weightRadius, 0, Math.PI * 2);
ctx.fill();

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./assets/icon.png', buffer);

console.log('Generated app icon at ./assets/icon.png');

// Generate smaller sizes for various uses
const sizes = [180, 120, 80, 60, 40];
sizes.forEach(size => {
  const smallCanvas = createCanvas(size, size);
  const smallCtx = smallCanvas.getContext('2d');
  
  // Scale down the original design
  const scale = size / 1024;
  
  // Black background
  smallCtx.fillStyle = '#000000';
  smallCtx.fillRect(0, 0, size, size);
  
  // Icon elements scaled down
  const scaledIconSize = iconSize * scale;
  const scaledCenterX = size / 2;
  const scaledCenterY = size / 2;
  const scaledBarWidth = scaledIconSize * 0.6;
  const scaledBarHeight = scaledIconSize * 0.08;
  const scaledWeightRadius = scaledIconSize * 0.12;
  
  smallCtx.fillStyle = '#22d3ee';
  
  // Bar
  smallCtx.fillRect(scaledCenterX - scaledBarWidth/2, scaledCenterY - scaledBarHeight/2, scaledBarWidth, scaledBarHeight);
  
  // Weights
  smallCtx.beginPath();
  smallCtx.arc(scaledCenterX - scaledBarWidth/2, scaledCenterY, scaledWeightRadius, 0, Math.PI * 2);
  smallCtx.fill();
  
  smallCtx.beginPath();
  smallCtx.arc(scaledCenterX + scaledBarWidth/2, scaledCenterY, scaledWeightRadius, 0, Math.PI * 2);
  smallCtx.fill();
  
  const smallBuffer = smallCanvas.toBuffer('image/png');
  fs.writeFileSync(`./assets/icon-${size}.png`, smallBuffer);
});

console.log('Generated additional icon sizes');