(function() {
  const OUTLINE = '#111';
  
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fillStroke(ctx, color, lineWidth) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = lineWidth || 3;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }

  function drawBean(ctx, x, y, color, hat, name) {
    ctx.save();
    ctx.translate(x, y);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 30, 0, 0, Math.PI * 2);
    fillStroke(ctx, color, 3);
    
    ctx.beginPath();
    ctx.ellipse(10, -5, 12, 8, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#88ccff', 3);
    
    if (hat && hat !== 'none') drawHat(ctx, hat, 0, -30);
    
    if (name) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'black';
      ctx.strokeText(name, 0, -50);
      ctx.fillText(name, 0, -50);
    }
    ctx.restore();
  }

  function drawHat(ctx, hat, x, y) {
    ctx.save();
    ctx.translate(x, y);
    switch(hat) {
      case 'crown':
        ctx.beginPath();
        ctx.moveTo(-15, 0); ctx.lineTo(-10, -15); ctx.lineTo(0, -5); ctx.lineTo(10, -15); ctx.lineTo(15, 0);
        ctx.closePath(); fillStroke(ctx, '#ffd700', 3); break;
      case 'cap':
        ctx.beginPath(); ctx.arc(0, 0, 15, Math.PI, 0); ctx.lineTo(15, 5); ctx.lineTo(-15, 5);
        ctx.closePath(); fillStroke(ctx, '#ff4444', 3); break;
      case 'antenna':
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -20, 5, 0, Math.PI * 2); fillStroke(ctx, '#00ff88', 3); break;
    }
    ctx.restore();
  }

  function drawStar(ctx, x, y, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * size, -Math.sin((18 + i * 72) * Math.PI / 180) * size);
      ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * size * 0.5, -Math.sin((54 + i * 72) * Math.PI / 180) * size * 0.5);
    }
    ctx.closePath(); fillStroke(ctx, color, 2); ctx.restore();
  }

  function buildMap(ctx, width, height) {
    ctx.fillStyle = '#0f3460'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#1a1a2e'; ctx.strokeStyle = '#e94560'; ctx.lineWidth = 4;
    
    rr(ctx, 50, 50, 200, 150, 10); ctx.fill(); ctx.stroke();
    rr(ctx, 350, 50, 200, 150, 10); ctx.fill(); ctx.stroke();
    ctx.fillRect(250, 100, 100, 50); ctx.strokeRect(250, 100, 100, 50);
    rr(ctx, 50, 300, 200, 150, 10); ctx.fill(); ctx.stroke();
    rr(ctx, 350, 300, 200, 150, 10); ctx.fill(); ctx.stroke();
    ctx.fillRect(250, 350, 100, 50); ctx.strokeRect(250, 350, 100, 50);
    ctx.fillRect(130, 200, 50, 100); ctx.strokeRect(130, 200, 50, 100);
    ctx.fillRect(430, 200, 50, 100); ctx.strokeRect(430, 200, 50, 100);
    
    drawStar(ctx, 100, 100, 15, '#00ff88');
    drawStar(ctx, 400, 100, 15, '#00ff88');
    drawStar(ctx, 100, 350, 15, '#00ff88');
    drawStar(ctx, 400, 350, 15, '#00ff88');
  }

  window.Art = { drawBean, drawHat, drawStar, buildMap, rr };
})();
