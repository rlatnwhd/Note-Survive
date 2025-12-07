// player.js - 플레이어 생성, 업데이트, 렌더링

// 캐릭터 데이터
const CHARACTER_DATA = {
    ninja: {
        name: 'Ninja',
        maxHp: 100,
        speed: 250,
        size: 20,
        color: '#4a90e2',
        startWeapons: ['shuriken']
    },
    sniper: {
        name: 'Sniper',
        maxHp: 80,
        speed: 200,
        size: 18,
        color: '#e24a4a',
        startWeapons: ['sniper']
    },
    bomber: {
        name: 'Bomber',
        maxHp: 120,
        speed: 150,
        size: 22,
        color: '#4ae24a',
        startWeapons: ['bomb']
    }
};

// 플레이어 생성
function createPlayer(charType) {
    const data = CHARACTER_DATA[charType] || CHARACTER_DATA.ninja;
    
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: data.speed,
        size: data.size,
        radius: data.size,
        color: data.color,
        
        hp: data.maxHp,
        maxHp: data.maxHp,
        
        // 피격 누적 시스템
        hitCount: 0, // 피격 횟수
        
        level: 1,
        exp: 0,
        expToNextLevel: 10,
        
        // 무기 시스템 (여러 무기 동시 보유)
        weapons: [],
        maxWeapons: 2,
        
        // 속성부여권
        elementTickets: 0,
        
        // 기본 무기 (권총) - 무기가 없을 때만 사용
        defaultWeaponTimer: 0,
        
        isDead: false,
        
        // 애니메이션 상태
        animState: 'idle',
        animTimer: 0,
        animFrame: 0,
        facing: 1 // 1: 오른쪽, -1: 왼쪽
    };
}

// 플레이어 업데이트
function updatePlayer(player, dt, keys) {
    // 입력 처리
    let moveX = 0;
    let moveY = 0;
    
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    
    // 정규화
    if (moveX !== 0 || moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= len;
        moveY /= len;
    }
    
    // 이동 (deltaTime 기반)
    // 버프 속도 보너스 적용
    const speedMultiplier = (typeof playerBuffs !== 'undefined') ? (1 + playerBuffs.speedBonus) : 1;
    player.vx = moveX * player.speed * speedMultiplier;
    player.vy = moveY * player.speed * speedMultiplier;
    
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    
    // 맵 경계 제한 (8000x6000 맵)
    const mapWidth = 8000;
    const mapHeight = 6000;
    const mapLeft = -mapWidth / 2;
    const mapTop = -mapHeight / 2;
    const mapRight = mapWidth / 2;
    const mapBottom = mapHeight / 2;
    
    if (player.x - player.size < mapLeft) player.x = mapLeft + player.size;
    if (player.x + player.size > mapRight) player.x = mapRight - player.size;
    if (player.y - player.size < mapTop) player.y = mapTop + player.size;
    if (player.y + player.size > mapBottom) player.y = mapBottom - player.size;
    
    // 방향 설정
    if (moveX > 0) player.facing = 1;
    else if (moveX < 0) player.facing = -1;
    
    // 애니메이션 상태
    if (moveX !== 0 || moveY !== 0) {
        player.animState = 'run';
    } else {
        player.animState = 'idle';
    }
    
    // 애니메이션 타이머
    player.animTimer += dt;
    if (player.animTimer > 0.1) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 4;
    }
}

// 플레이어 렌더링
function renderPlayer(player, ctx, camera) {
    // 무적 상태일 때 깜빡임 효과 (0.1초마다 토글)
    if (player.invincible) {
        const blinkInterval = 0.1;
        const shouldShow = Math.floor(player.invincibleTimer / blinkInterval) % 2 === 0;
        if (!shouldShow) {
            return; // 안 보이는 프레임에서는 렌더링 안 함
        }
    }
    
    // 화면 중앙에 그리기
    const screenX = canvas.width / 2;
    const screenY = canvas.height / 2;
    
    ctx.save();
    
    // 위치 이동
    ctx.translate(screenX, screenY);
    
    // 좌우 반전 (이미지가 왼쪽을 보고 있으므로 오른쪽 볼 때 반전)
    if (player.facing > 0) {
        ctx.scale(-1, 1);
    }
    
    // 통통 튀는 효과 (y축 이동)
    let bounceY = 0;
    if (player.animState === 'run') {
        // 부드럽게 통통통 (속도를 느리게)
        bounceY = -Math.abs(Math.sin(player.animTimer * 3)) * 8;
    }
    
    ctx.translate(0, bounceY);
    
    // 플레이어 이미지 사용
    if (typeof weaponImages !== 'undefined' && weaponImages.player && weaponImages.player.complete) {
        const size = player.size * 2.5; // 이미지 크기
        ctx.drawImage(weaponImages.player, -size / 2, -size / 2, size, size);
    } else {
        // 이미지 로드 실패 시 기본 렌더링
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(0, 0, player.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 외곽선
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 눈 (방향 표시)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(player.size * 0.3, -player.size * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(player.size * 0.3, player.size * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    
    // 체력바 (플레이어 위로 더 올림)
    const hpBarWidth = 50;
    const hpBarHeight = 5;
    const hpPercent = player.hp / player.maxHp;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(screenX - hpBarWidth / 2, screenY - player.size - 35, hpBarWidth, hpBarHeight);
    
    ctx.fillStyle = hpPercent > 0.5 ? '#4ecdc4' : (hpPercent > 0.25 ? '#f7b731' : '#ee5a6f');
    ctx.fillRect(screenX - hpBarWidth / 2, screenY - player.size - 35, hpBarWidth * hpPercent, hpBarHeight);
}

// 플레이어에게 무기 추가
function addWeaponToPlayer(player, weaponType) {
    // 이미 보유한 무기인지 확인
    const existing = player.weapons.find(w => w.type === weaponType);
    
    if (existing) {
        // 레벨 5 이상이면 더 이상 레벨업 불가
        if (existing.level >= 5) {
            return false;
        }
        // 레벨업
        existing.level++;
        upgradeWeapon(existing);
        return true;
    } else {
        // 무기 최대 2개 제한
        if (player.weapons.length >= 2) {
            return false;
        }
        // 새 무기 추가
        const newWeapon = createWeapon(weaponType);
        newWeapon.level = 1;
        player.weapons.push(newWeapon);
        return true;
    }
}

// 무기 레벨업 시 스탯 강화
function upgradeWeapon(weapon) {
    // 최대 레벨 제한
    if (weapon.level >= 5) {
        return;
    }
    
    weapon.level = Math.min(weapon.level + 1, 5); // 레벨 증가 (최대 5)
    const maxLevel = 5; // 최종 레벨
    const level = weapon.level;
    
    switch(weapon.type) {
        case 'shuriken': // 회전 수리검(물리)
            // 레벨당 +2개, 최종 10개 (2 → 10), 공격력 +200%
            weapon.count = 2 + (level - 1) * 2;
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 2);
            break;
            
        case 'machinegun': // 기관총(물리)
            // 레벨당 공속 증가, 최종 300% (쿨다운 33%), 공격력 +200%
            const machinegunSpeedBonus = 1 + ((level - 1) / (maxLevel - 1)) * 2;
            weapon.cooldown = weapon.baseCooldown / machinegunSpeedBonus;
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 2);
            break;
            
        case 'shotgun': // 샷건(물리)
            // 레벨당 탄환 수 증가 (5 → 20), 공격력 +300%
            weapon.count = 5 + Math.floor(((level - 1) / (maxLevel - 1)) * 15);
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 3);
            break;
            
        case 'laser': // 회전 레이저(전기)
            // 레벨당 +1~2개, 최종 8개 (1 → 8), 공격력 +400%
            weapon.count = 1 + Math.floor(((level - 1) / (maxLevel - 1)) * 7);
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 4);
            break;
            
        case 'rocket': // 로켓(불)
            // 폭발 범위 +200% (3배), 공격력 +100% (2배)
            weapon.explosionRadius = weapon.baseExplosionRadius * (1 + ((level - 1) / (maxLevel - 1)) * 2);
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)));
            break;
            
        case 'windBlade': // 바람 칼날(물리)
            // 공격력 +700% (8배)
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 7);
            break;
            
        case 'boomerang': // 부메랑(물리)
            // 공격력 +400% (5배)
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 4);
            break;
            
        case 'baseballBat': // 야구 방망이(물리)
            // 공속 +100%, 공격력 +150%, 범위 +50%
            const batSpeedBonus = 1 + ((level - 1) / (maxLevel - 1));
            weapon.cooldown = weapon.baseCooldown / batSpeedBonus;
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 1.5);
            weapon.range = weapon.baseRange * (1 + ((level - 1) / (maxLevel - 1)) * 0.5);
            break;
            
        case 'iceThrower': // 냉기 방사기(얼음)
            // 탄환 수 증가로 범위 확장 (3 → 7), 샷건처럼 탄환만 추가
            weapon.count = 3 + (level - 1);
            break;
            
        case 'flameThrower': // 화염 방사기(불)
            // 사거리 +100% (2배), 탄환 수 증가로 범위 확장 (3 → 7), 샷건처럼 탄환만 추가
            weapon.range = weapon.baseRange * (1 + ((level - 1) / (maxLevel - 1)));
            weapon.count = 3 + (level - 1);
            break;
            
        case 'electricShield': // 전기 방어막(전기)
            // 범위 +200% (3배)
            weapon.radius = weapon.baseRadius * (1 + ((level - 1) / (maxLevel - 1)) * 2);
            break;
            
        case 'fogGenerator': // 안개 생성기(독)
            // 생성 주기 감소, 최종 2초 (10초 → 2초)
            weapon.cooldown = weapon.baseCooldown - ((level - 1) / (maxLevel - 1)) * 8;
            break;
            
        case 'waveGenerator': // 파동 생성기(물리)
            // 생성 주기 감소 최종 1초 (5초 → 1초), 공격력 +400% (5배)
            weapon.cooldown = weapon.baseCooldown - ((level - 1) / (maxLevel - 1)) * 4;
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 4);
            break;
            
        case 'bomb': // 폭죽(물리)
            // 생성 빈도 증가 (3초 → 1초), 공격력 +200% (3배), 범위 +100% (2배)
            weapon.cooldown = weapon.baseCooldown - ((level - 1) / (maxLevel - 1)) * 2; // 3초 → 1초
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)) * 2);
            weapon.explosionRadius = weapon.baseExplosionRadius * (1 + ((level - 1) / (maxLevel - 1)));
            break;
            
        default:
            // 기본 업그레이드
            weapon.damage = weapon.baseDamage * (1 + ((level - 1) / (maxLevel - 1)));
            break;
    }
}

