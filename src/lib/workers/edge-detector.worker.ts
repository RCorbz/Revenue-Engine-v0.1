
self.onmessage = function(e) {
    const { imageData, width, height } = e.data;
    if (!imageData) return;

    // 1. Focus Check (Laplacian Variance)
    // We sample the center area (200x200) for focus to save CPU
    const focusScore = calculateFocus(imageData, width, height);

    // 2. Edge Detection (Simple Contrast Delta in Corners)
    // We check for high-contrast edges near the 4 guidance corners
    const edgesDetected = detectCornerEdges(imageData, width, height);

    self.postMessage({
        focusScore,
        edgesDetected,
        isStable: focusScore > 10.0 && edgesDetected // Thresholds for "Lock"
    });
};

function calculateFocus(data, width, height) {
    const sampleSize = 200;
    const startX = Math.floor((width - sampleSize) / 2);
    const startY = Math.floor((height - sampleSize) / 2);
    
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    // Laplacian Kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
    for (let y = startY + 1; y < startY + sampleSize - 1; y++) {
        for (let x = startX + 1; x < startX + sampleSize - 1; x++) {
            const idx = (y * width + x) * 4;
            const center = data[idx]; // Green channel is often sharpest
            
            const up = data[((y - 1) * width + x) * 4];
            const down = data[((y + 1) * width + x) * 4];
            const left = data[(y * width + (x - 1)) * 4];
            const right = data[(y * width + (x + 1)) * 4];
            
            const laplacian = (4 * center) - up - down - left - right;
            sum += laplacian;
            sumSq += laplacian * laplacian;
            count++;
        }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    return variance;
}

function detectCornerEdges(data, width, height) {
    // Check 4 zones (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
    const zoneSize = 40;
    const threshold = 30; // Contrast delta threshold
    
    const zones = [
        { x: 50, y: 50 }, // TL
        { x: width - 50 - zoneSize, y: 50 }, // TR
        { x: 50, y: height - 50 - zoneSize }, // BL
        { x: width - 50 - zoneSize, y: height - 50 - zoneSize } // BR
    ];

    let zonesWithEdges = 0;

    for (const zone of zones) {
        let maxDelta = 0;
        for (let y = zone.y; y < zone.y + zoneSize; y += 4) {
            for (let x = zone.x; x < zone.x + zoneSize; x += 4) {
                const idx = (y * width + x) * 4;
                const current = data[idx];
                const next = data[(y * width + (x + 1)) * 4];
                maxDelta = Math.max(maxDelta, Math.abs(current - next));
            }
        }
        if (maxDelta > threshold) zonesWithEdges++;
    }

    return zonesWithEdges >= 3; // Lock if 3 out of 4 corners show contrast (edge)
}
