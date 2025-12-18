import { StackLayerData } from '../types';

export const generateShareableImage = async (layer: StackLayerData, originalQuery?: string): Promise<Blob | null> => {

    const WIDTH = 1200;
    const PADDING = 60;

    // --- MEASUREMENT PASS ---
    // We need to calculate the required height before creating the final canvas.
    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = WIDTH;
    const measureCtx = measureCanvas.getContext('2d');

    if (!measureCtx) return null;

    // Font settings must match drawing pass for accurate measurement
    measureCtx.font = 'italic 500 36px Arial, sans-serif';
    const displayText = originalQuery
        ? `"${originalQuery}"`
        : `"${layer.title.replace(/^Result:\s*/i, '').replace(/^The claim:\s*/i, '')}"`;

    const titleHeight = measureWrappedText(measureCtx, displayText, WIDTH - PADDING * 2, 48);

    // Reasoning Points Measurement
    const points = layer.content
        .split(/<\/?point>/)
        .filter((p: string) => p.trim().length > 0)
        .slice(0, 3);

    measureCtx.font = '24px Arial, sans-serif';
    let reasoningHeight = 0;
    points.forEach((point: string) => {
        const text = `•  ${point.replace(/^\d+\.\s*/, '').trim()}`;
        reasoningHeight += measureWrappedText(measureCtx, text, WIDTH - PADDING * 2, 34);
        reasoningHeight += 16; // Spacing
    });

    // Calculate Total Height
    // Header (80) + Title Block (210 start + titleHeight) + Gap (60) + Reasoning (reasoningHeight) + Bottom Padding (60)
    const contentBottom = 210 + 40 + titleHeight + 60 + reasoningHeight + 60;
    const HEIGHT = Math.max(675, contentBottom);

    // --- DRAWING PASS ---
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // 1. Background
    // Fill with dark base
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Try to load Unsplash image
    const verdictLower = layer.title.toLowerCase();
    let accentColor = '#3b82f6'; // Blue
    let verdictText = "VERIFIED";
    let bgUrl = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop";

    if (verdictLower.includes('false') || verdictLower.includes('debunk') || verdictLower.includes('fake')) {
        accentColor = '#ef4444'; // Red
        verdictText = "DEBUNKED";
        bgUrl = "https://images.unsplash.com/photo-1590059390240-7815dcecce89?q=80&w=1200&auto=format&fit=crop";
    } else if (verdictLower.includes('true')) {
        accentColor = '#22c55e'; // Green
        verdictText = "CONFIRMED";
    }

    // Draw background image if possible
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = bgUrl;
        });

        // Draw and dim the image - scale to cover new height
        // Calculate aspect ratio to cover
        const imgAspect = img.width / img.height;
        const canvasAspect = WIDTH / HEIGHT;
        let drawW, drawH, drawX, drawY;

        if (canvasAspect > imgAspect) {
            drawW = WIDTH;
            drawH = WIDTH / imgAspect;
            drawX = 0;
            drawY = (HEIGHT - drawH) / 2;
        } else {
            drawH = HEIGHT;
            drawW = HEIGHT * imgAspect;
            drawY = 0;
            drawX = (WIDTH - drawW) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Overlay Gradient (Darken)
        const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        gradient.addColorStop(0, `${accentColor}44`); // 44 = low opacity hex
        gradient.addColorStop(0.6, '#000000dd');
        gradient.addColorStop(1, '#000000ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

    } catch (e) {
        console.warn("Could not load BG image, using fallback gradient");
        const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        gradient.addColorStop(0, '#18181b');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    // 2. Header
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TRUTH STACK', PADDING + 40, PADDING + 10);

    // Icon placeholder
    ctx.fillStyle = accentColor;
    ctx.fillRect(PADDING, PADDING - 15, 30, 30);

    ctx.font = '20px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('AI FORENSIC ANALYSIS', WIDTH - PADDING, PADDING + 10);
    ctx.textAlign = 'left'; // Reset

    // 3. Verdict Stamp
    ctx.save();
    ctx.translate(WIDTH - 200, 150);
    ctx.rotate(-5 * Math.PI / 180);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(-150, -40, 300, 80);

    ctx.font = '900 60px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(verdictText, 0, 0);
    ctx.restore();

    // 4. Claim Text
    ctx.font = 'italic 500 36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';

    // Label
    const claimLabelY = 210;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.fillText('CLAIM INVESTIGATION', PADDING, claimLabelY);

    ctx.font = 'italic 500 36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    const claimStartY = claimLabelY + 40;

    // Draw Claim and get end Y
    const claimEndY = wrapText(ctx, displayText, PADDING, claimStartY, WIDTH - PADDING * 2, 48);

    // 5. Reasoning Points
    let currentY = claimEndY + 60;

    // Align to at least 450px if content is short, but respect dynamic growth
    if (currentY < 450 && HEIGHT === 675) currentY = 450;

    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#e4e4e7';

    points.forEach((point: string) => {
        const text = `•  ${point.replace(/^\d+\.\s*/, '').trim()}`;
        currentY = wrapText(ctx, text, PADDING, currentY, WIDTH - PADDING * 2, 34);
        currentY += 16;
    });

    // 6. Return Blob
    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
    });
};

// Helper: Measure Height ONLY
function measureWrappedText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let totalHeight = lineHeight; // Start with one line

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            line = words[n] + ' ';
            totalHeight += lineHeight;
        } else {
            line = testLine;
        }
    }
    return totalHeight;
}

// Helper: Draw and Return End Y
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
    return y + lineHeight;
}
