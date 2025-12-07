// exp.js - 경험치 오브 시스템

// XP 오브 생성
function dropExp(x, y, value) {
    const orb = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        value: value,
        size: 6 + value * 2,
        radius: 6 + value * 2,
        color: '#4ecdc4',
        
        // 흡수 관련
        magnetRange: 150,
        magnetSpeed: 300,
        isBeingAbsorbed: false,
        
        // 애니메이션
        animTimer: 0,
        pulse: 0
    };
    
    expOrbs.push(orb);
}

// XP 오브 업데이트
function updateExpOrb(orb, dt, player) {
    if (!player) return;
    
    // 플레이어와의 거리
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 자석 효과 (플레이어 근처에 있으면 끌려감)
    if (distance < orb.magnetRange) {
        orb.isBeingAbsorbed = true;
        
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // 플레이어에게 가속
        const magnetForce = orb.magnetSpeed * (1 - distance / orb.magnetRange);
        orb.vx += dirX * magnetForce * dt;
        orb.vy += dirY * magnetForce * dt;
    } else {
        // 감속
        orb.vx *= Math.pow(0.1, dt);
        orb.vy *= Math.pow(0.1, dt);
    }
    
    // 위치 업데이트
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    
    // 애니메이션
    orb.animTimer += dt;
    orb.pulse = Math.sin(orb.animTimer * 5) * 0.3 + 1;
}

// XP 오브 렌더링
function renderExpOrb(orb, ctx, camera) {
    const screenX = orb.x - camera.x;
    const screenY = orb.y - camera.y;
    
    // 화면 밖이면 렌더링 스킵
    if (screenX < -50 || screenX > canvas.width + 50 || 
        screenY < -50 || screenY > canvas.height + 50) {
        return;
    }
    
    ctx.save();
    
    ctx.translate(screenX, screenY);
    ctx.scale(orb.pulse, orb.pulse);
    
    // 외부 글로우
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, orb.size * 1.5);
    gradient.addColorStop(0, orb.color);
    gradient.addColorStop(0.5, orb.color + '88');
    gradient.addColorStop(1, orb.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, orb.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // 코어
    ctx.fillStyle = orb.color;
    ctx.beginPath();
    ctx.arc(0, 0, orb.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 하이라이트
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-orb.size * 0.3, -orb.size * 0.3, orb.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}
