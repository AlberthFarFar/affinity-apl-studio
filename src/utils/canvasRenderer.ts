import { BlueprintSlide, ProjectData } from '../types';

export interface RenderOptions {
  sceneUrl: string;
  slide: BlueprintSlide;
  project: ProjectData;
  logoUrl?: string | null;
  headlineFont?: 'cormorant' | 'cinzel' | 'playfair' | 'jakarta';
  headlineColor?: string;
  overlayGradient?: boolean;
}

export async function renderPosterToDataUrl(options: RenderOptions): Promise<string> {
  const {
    sceneUrl,
    slide,
    project,
    logoUrl,
    headlineFont = 'cormorant',
    headlineColor = '#ffffff',
    overlayGradient = true,
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    // High-resolution Instagram portrait 4:5 ratio (1080 x 1350)
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const sceneImg = new Image();
    sceneImg.crossOrigin = 'anonymous';

    sceneImg.onload = () => {
      // 1. Draw background image cover
      const scale = Math.max(width / sceneImg.width, height / sceneImg.height);
      const x = width / 2 - (sceneImg.width / 2) * scale;
      const y = height / 2 - (sceneImg.height / 2) * scale;
      ctx.drawImage(sceneImg, x, y, sceneImg.width * scale, sceneImg.height * scale);

      // 2. Subtle Cinematic Top & Bottom Vignette Gradients for readability
      if (overlayGradient) {
        // Top subtle dark gradient
        const topGrad = ctx.createLinearGradient(0, 0, 0, 320);
        topGrad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
        topGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, width, 320);

        // Bottom dark gradient for text and contact bar
        const bottomGrad = ctx.createLinearGradient(0, height - 520, 0, height);
        bottomGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
        bottomGrad.addColorStop(0.35, 'rgba(15, 23, 42, 0.4)');
        bottomGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, height - 520, width, 520);
      }

      // 3. Top Branding / Project Name
      const brandTop = (project.name || 'HUNIAN EKSKLUSIF').toUpperCase();
      ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '6px';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(brandTop, width / 2, 95);
      ctx.letterSpacing = '0px';

      if (slide.subtext) {
        ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(slide.subtext.toUpperCase(), width / 2, 125);
      }

      // Optional Logo at Top Right or Left
      if (logoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          const lHeight = 75;
          const lScale = lHeight / logoImg.height;
          const lWidth = logoImg.width * lScale;
          ctx.shadowBlur = 4;
          ctx.drawImage(logoImg, 70, 60, lWidth, lHeight);
          finishTextRendering();
        };
        logoImg.onerror = () => {
          finishTextRendering();
        };
        logoImg.src = logoUrl;
      } else {
        finishTextRendering();
      }

      function finishTextRendering() {
        if (!ctx) return;
        const marginX = 80;
        const maxWidth = width - marginX * 2;

        // Font selection for Headline
        let fontFace = '"Cormorant Garamond", serif';
        if (headlineFont === 'cinzel') fontFace = '"Cinzel", serif';
        if (headlineFont === 'playfair') fontFace = '"Playfair Display", serif';
        if (headlineFont === 'jakarta') fontFace = '"Plus Jakarta Sans", sans-serif';

        // 4. Headline (Big Editorial Display)
        ctx.textAlign = 'left';
        ctx.fillStyle = headlineColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        // Adjust font size based on text length
        const headline = slide.headline || project.name;
        const fontSize = headline.length > 25 ? 68 : 82;
        ctx.font = `700 ${fontSize}px ${fontFace}`;

        const headlineLines = wrapText(ctx, headline, maxWidth);
        let startY = height - 340 - (headlineLines.length - 1) * (fontSize * 1.05);

        for (let i = 0; i < headlineLines.length; i++) {
          ctx.fillText(headlineLines[i], marginX, startY + i * (fontSize * 1.05));
        }

        // 5. Body Copy / Benefit
        const copyY = startY + headlineLines.length * (fontSize * 1.05) + 15;
        ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.shadowBlur = 8;
        const copyLines = wrapText(ctx, slide.copy || '', maxWidth);
        for (let i = 0; i < Math.min(copyLines.length, 3); i++) {
          ctx.fillText(copyLines[i], marginX, copyY + i * 36);
        }

        // 6. Badges (e.g. Free PPN 100%, Serah Terima 2026, Free BPHTB)
        const badgeY = height - 120;
        const badges = [
          'FREE PPN 100%',
          'FREE BPHTB',
          'FREE AJB',
          'SERAH TERIMA 2026',
        ];

        let badgeX = marginX;
        ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.letterSpacing = '1px';
        ctx.fillStyle = '#ffffff';

        for (let i = 0; i < badges.length; i++) {
          const text = badges[i];
          ctx.fillText(text, badgeX, badgeY);
          badgeX += ctx.measureText(text).width + 30;
          if (badgeX > width - marginX - 100) break;
        }
        ctx.letterSpacing = '0px';

        // 7. Footer Bar (Website, WhatsApp, and APL Living in Style)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(marginX, height - 80, maxWidth, 1);

        // Website on left
        const webText = project.website || 'www.agungpodomoro.com';
        ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(webText, marginX, height - 42);

        // Contact info in middle
        const phoneText = `WA: ${project.contactPhone || '0811-9460-988'}`;
        ctx.textAlign = 'center';
        ctx.fillText(phoneText, width / 2, height - 42);

        // Developer branding on right
        ctx.textAlign = 'right';
        ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText('AGUNG PODOMORO LAND', width - marginX, height - 50);
        ctx.font = 'italic 400 13px "Cormorant Garamond", serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('Living in Style', width - marginX, height - 34);

        // Output high-quality data URL
        const finalDataUrl = canvas.toDataURL('image/jpeg', 0.94);
        resolve(finalDataUrl);
      }
    };

    sceneImg.onerror = (err) => {
      reject(err);
    };

    sceneImg.src = sceneUrl;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
