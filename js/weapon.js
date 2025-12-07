// weapon.js - 무기 시스템 (Vampire Survivors 스타일)

// 투사체 이미지 로드
const weaponImages = {};
const imageList = {
    boomerang: 'images/boomerang.png',
    windBlade: 'images/windBlade.png',
    rocket: 'images/rocket.png',
    fireball: 'images/fireball.png',
    frozenball: 'images/frozenball.png',
    bat: 'images/bat.png',
    shuriken: 'images/shuriken.png',
    fireworkObj: 'images/fireworkob.png',
    firework1: 'images/firework1.png',
    firework2: 'images/firework2.png',
    firework3: 'images/firework3.png',
    player: 'images/player.png',
    bullet: 'images/bullet.png',
    exp: 'images/exp.png',
    attribute: 'images/Attribute.png'
};

Object.entries(imageList).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    weaponImages[key] = img;
});

// Hex to RGBA 변환 헬퍼 함수
function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 속성 시스템
const ELEMENT_DATA = {
    // 1차 속성
    fire: { name: '불', color: '#ff4757', effect: 'burn' },
    ice: { name: '얼음', color: '#74b9ff', effect: 'slow' },
    electric: { name: '전기', color: '#feca57', effect: 'chain' },
    poison: { name: '독', color: '#26de81', effect: 'dot' },
    
    // 2차 속성 (조합)
    radiation: { name: '방사능', color: '#ff9f43', base: ['fire', 'electric'], effect: 'radiation' },
    magnetic: { name: '자성', color: '#95a5a6', base: ['ice', 'electric'], effect: 'pull' },
    corrosion: { name: '부식', color: '#27ae60', base: ['poison', 'electric'], effect: 'corrosion' },
    virus: { name: '바이러스', color: '#fd79a8', base: ['ice', 'poison'], effect: 'virus' },
    explosion: { name: '폭발', color: '#e74c3c', base: ['fire', 'ice'], effect: 'explosion' },
    gas: { name: '가스', color: '#a8e6cf', base: ['fire', 'poison'], effect: 'gas' },
    
    // 물리 속성
    impact: { name: '충격', color: '#34495e', effect: 'knockback' },
    pierce: { name: '관통', color: '#7f8c8d', effect: 'pierce' },
    slash: { name: '베기', color: '#95a5a6', effect: 'bleed' }
};

// 속성 조합 체크
function getElementCombination(element1, element2) {
    if (!element1 || !element2) return null;
    
    const combinations = {
        'fire_electric': 'radiation',
        'electric_fire': 'radiation',
        'ice_electric': 'magnetic',
        'electric_ice': 'magnetic',
        'poison_electric': 'corrosion',
        'electric_poison': 'corrosion',
        'ice_poison': 'virus',
        'poison_ice': 'virus',
        'fire_ice': 'explosion',
        'ice_fire': 'explosion',
        'fire_poison': 'gas',
        'poison_fire': 'gas'
    };
    
    const key = `${element1}_${element2}`;
    return combinations[key] || null;
}

// 무기에 속성 부여
function applyElementToWeapon(weapon, elementType) {
    if (!ELEMENT_DATA[elementType]) return false;
    
    // 2차 속성(조합 속성) 체크
    const secondaryElements = ['radiation', 'magnetic', 'corrosion', 'virus', 'explosion', 'gas'];
    const hasSecondaryElement = secondaryElements.includes(weapon.element);
    
    // 이미 2차 속성을 가진 무기는 더 이상 속성 변경 불가
    if (hasSecondaryElement) {
        return false;
    }
    
    // 물리 속성(impact, pierce, slash)은 항상 교체 가능
    const physicalElements = ['impact', 'pierce', 'slash'];
    const isPhysicalElement = physicalElements.includes(elementType);
    const hasPhysicalElement = physicalElements.includes(weapon.element);
    
    if (isPhysicalElement && hasPhysicalElement) {
        // 물리 속성끼리는 바로 교체
        weapon.element = elementType;
        weapon.elementColor = ELEMENT_DATA[elementType].color;
        return true;
    }
    
    // 물리 속성과 비물리 속성은 조합 불가
    if (isPhysicalElement && !hasPhysicalElement) {
        // 비물리 속성을 가진 무기에 물리 속성 추가 시도 - 불가
        return false;
    }
    
    if (!isPhysicalElement && hasPhysicalElement) {
        // 물리 속성을 가진 무기에 비물리 속성 추가 시도 - 물리 속성을 대체
        weapon.element = elementType;
        weapon.elementColor = ELEMENT_DATA[elementType].color;
        return true;
    }
    
    // 비물리 속성끼리 조합 체크
    if (weapon.element) {
        const combined = getElementCombination(weapon.element, elementType);
        if (combined) {
            // 조합 성공 - 2차 속성 생성
            weapon.element = combined;
            weapon.elementColor = ELEMENT_DATA[combined].color;
            return true;
        }
        // 조합 실패 시 새 속성으로 대체
        weapon.element = elementType;
        weapon.elementColor = ELEMENT_DATA[elementType].color;
        return true;
    }
    
    weapon.element = elementType;
    weapon.elementColor = ELEMENT_DATA[elementType].color;
    return true;
}

// 무기 데이터
const WEAPON_DATA = {
    shuriken: {
        name: '회전 수리검',
        weaponType: 'orbit',
        damage: 20,
        count: 2,
        orbitRadius: 200,
        orbitSpeed: 3,
        size: 40,
        color: '#4a90e2',
        element: 'slash',
        elementColor: '#95a5a6',
        projectileImage: weaponImages.shuriken // 수리검 이미지
    },
    fogGenerator: {
        name: '안개 생성기',
        weaponType: 'fog',
        damage: 8,
        cooldown: 10.0,
        duration: 7.0,
        innerRadius: 200,
        outerRadius: 450,
        damageInterval: 0.3,
        color: '#2ecc71',
        count: 1,
        element: 'poison',
        elementColor: '#26de81'
    },
    waveGenerator: {
        name: '파동 생성기',
        weaponType: 'wave',
        damage: 15,
        cooldown: 5.0,
        maxRadius: 700,
        expandSpeed: 180,
        slowDuration: 2.0,
        slowAmount: 0.5,
        color: '#3498db',
        count: 1,
        element: 'impact',
        elementColor: '#34495e'
    },
    bomb: {
        name: '폭죽',
        weaponType: 'firecracker',
        damage: 100,
        cooldown: 3.0, // 폭죽 생성 주기 (3초마다 1개)
        explosionRadius: 200,
        dropRadius: 400, // 플레이어 주변에 드롭되는 반경 (더 멀리)
        minDropRadius: 200, // 최소 거리 (플레이어에게 너무 가까이 안 생김)
        count: 1, // 한 번에 1개씩 생성
        duration: 10.0, // 폭죽이 필드에 존재하는 시간
        color: '#ff6b6b',
        glowColor: '#ffd93d',
        element: 'impact',
        elementColor: '#34495e',
        projectileImage: weaponImages.fireworkObj // 폭죽 객체 이미지
    },
    pistol: {
        name: '권총',
        weaponType: 'projectile',
        damage: 50,
        cooldown: 0.6,
        projectileSpeed: 600,
        projectileSize: 10,
        projectileColor: '#ffa502',
        projectileImage: weaponImages.bullet,
        pierce: false,
        range: 600,
        count: 1,
        element: 'impact',
        elementColor: '#34495e',
        isDefaultWeapon: true // 기본 무기 표시
    },
    machinegun: {
        name: '기관총',
        weaponType: 'projectile',
        damage: 15,
        cooldown: 0.15,
        projectileSpeed: 700,
        projectileSize: 10,
        projectileColor: '#ffa502',
        projectileImage: weaponImages.bullet,
        pierce: false,
        range: 600,
        count: 1,
        element: 'pierce',
        elementColor: '#7f8c8d'
    },
    shotgun: {
        name: '샷건',
        weaponType: 'projectile',
        damage: 25,
        cooldown: 0.7,
        projectileSpeed: 400,
        projectileSize: 10,
        projectileColor: '#ff6348',
        projectileImage: weaponImages.bullet,
        pierce: false,
        range: 400,
        count: 5,
        spread: 0.1,
        element: 'impact',
        elementColor: '#34495e'
    },
    laser: {
        name: '회전 레이저',
        weaponType: 'rotating_laser',
        damage: 10,
        damageInterval: 0.5, // 0.5초마다 공격
        length: 400,
        width: 8,
        rotationSpeed: 1.0,
        color: '#00d2d3',
        count: 1,
        renderBehindPlayer: true,
        element: 'electric',
        elementColor: '#feca57'
    },
    rocket: {
        name: '로켓',
        weaponType: 'projectile',
        damage: 80,
        cooldown: 2.0,
        projectileSpeed: 600,
        projectileSize: 20,
        projectileColor: '#ff4757',
        pierce: false,
        range: 800,
        count: 1,
        explosionRadius: 120,
        homing: true,
        renderAsCircle: true,
        element: 'fire',
        elementColor: '#ff4757',
        projectileImage: weaponImages.rocket // 로켓 이미지
    },
    boomerang: {
        name: '부메랑',
        weaponType: 'boomerang',
        damage: 35,
        cooldown: 2.5,
        speed: 800,
        returnSpeed: 400,
        maxDistance: 450,
        size: 25,
        color: '#ffa502',
        pierce: true,
        count: 1,
        attackOnlyInRange: true,
        element: 'slash',
        elementColor: '#95a5a6',
        projectileImage: weaponImages.boomerang // 부메랑 이미지
    },
    windBlade: {
        name: '바람 칼날',
        weaponType: 'boomerang',
        damage: 25,
        cooldown: 2.5,
        speed: 1800,
        returnSpeed: 400,
        maxDistance: 600,
        size: 40,
        color: '#7bed9f',
        pierce: true,
        count: 1,
        crescent: true,
        element: 'slash',
        elementColor: '#95a5a6',
        projectileImage: weaponImages.windBlade // 바람 칼날 이미지
    },
    baseballBat: {
        name: '야구 방망이',
        weaponType: 'melee',
        damage: 35,
        cooldown: 0.6,
        range: 150,
        knockback: 150,
        swingSpeed: 8,
        size: 40,
        color: '#8b4513',
        count: 1,
        element: 'impact',
        elementColor: '#34495e',
        projectileImage: weaponImages.bat // 야구 방망이 이미지
    },
    iceThrower: {
        name: '냉기 방사기',
        weaponType: 'projectile',
        damage: 1,
        cooldown: 1.5,
        burstCount: 4,
        burstDelay: 0.15,
        projectileSpeed: 450,
        projectileSize: 12,
        projectileColor: '#70a1ff',
        pierce: true,
        range: 450,
        count: 3,
        spread: 0.2,
        slowFactor: 0.5,
        slowDuration: 2.0,
        element: 'ice',
        elementColor: '#5f27cd',
        projectileImage: weaponImages.frozenball, // 냉기 방사기 이미지
        initialScale: 0.3, // 초기 작은 크기
        maxScale: 1.8, // 최대 크기
        growthRate: 2.0 // 빠르게 성장
    },
    flameThrower: {
        name: '화염 방사기',
        weaponType: 'projectile',
        damage: 0.5,
        cooldown: 0.08,
        projectileSpeed: 350,
        projectileSize: 15,
        projectileColor: '#ff6b35',
        pierce: true,
        range: 350,
        count: 3,
        spread: 0.2,
        element: 'fire',
        elementColor: '#ff4757',
        projectileImage: weaponImages.fireball, // 화염 방사기 이미지
        initialScale: 0.3, // 초기 작은 크기
        maxScale: 1.5, // 최대 크기
        growthRate: 3.0 // 빠르게 성장
    },
    electricShield: {
        name: '전기 방어막',
        weaponType: 'electric_shield',
        damage: 10,
        damageInterval: 0.5, // 0.5초마다 공격
        radius: 120,
        color: '#ffd93d',
        pulseSpeed: 1.5,
        count: 1,
        element: 'electric',
        elementColor: '#feca57'
    }
};

// 무기 생성
function createWeapon(weaponType) {
    const data = WEAPON_DATA[weaponType] || WEAPON_DATA.shuriken;
    
    const weapon = {
        type: weaponType,
        name: data.name,
        weaponType: data.weaponType,
        damage: data.damage,
        level: 1,
        cooldownTimer: 0,
        angle: 0
    };
    
    // 데이터 복사
    Object.keys(data).forEach(key => {
        if (!(key in weapon)) {
            weapon[key] = data[key];
        }
    });
    
    // 레벨업 계산용 기본 값 저장
    weapon.baseDamage = data.damage || 0;
    weapon.baseCooldown = data.cooldown || 0;
    weapon.baseRange = data.range || 0;
    weapon.baseAoe = data.aoe || 0;
    weapon.baseExplosionRadius = data.explosionRadius || 0;
    weapon.baseRadius = data.radius || 0;
    weapon.baseOrbitSpeed = data.orbitSpeed || 0;
    weapon.baseDuration = data.duration || 0;
    weapon.baseMaxRadius = data.maxRadius || 0;
    weapon.baseSpread = data.spread || 0;
    
    return weapon;
}

// 모든 무기 업데이트
function updateAllWeapons(player, dt, enemies, projectiles, fireZones) {
    player.weapons.forEach(weapon => {
        if (weapon.weaponType === 'orbit') {
            updateOrbitWeapon(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'projectile') {
            updateProjectileWeapon(weapon, dt, player, enemies, projectiles);
        } else if (weapon.weaponType === 'throwable') {
            updateThrowableWeapon(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'firecracker') {
            updateFirecracker(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'rotating_laser') {
            updateRotatingLaser(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'boomerang') {
            updateBoomerang(weapon, dt, player, enemies, projectiles);
        } else if (weapon.weaponType === 'melee') {
            updateMeleeWeapon(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'electric_shield') {
            updateElectricShield(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'fog') {
            updateFogGenerator(weapon, dt, player, enemies, fireZones);
        } else if (weapon.weaponType === 'wave') {
            updateWaveGenerator(weapon, dt, player, enemies, projectiles);
        }
    });
}

// 궤도 회전 무기 (수리검)
function updateOrbitWeapon(weapon, dt, player, enemies) {
    weapon.angle += weapon.orbitSpeed * dt;
    
    for (let i = 0; i < weapon.count; i++) {
        const angleOffset = (Math.PI * 2 / weapon.count) * i;
        const angle = weapon.angle + angleOffset;
        
        const shurikenX = player.x + Math.cos(angle) * weapon.orbitRadius;
        const shurikenY = player.y + Math.sin(angle) * weapon.orbitRadius;
        
        enemies.forEach(enemy => {
            if (!enemy.isDead && !enemy.hitByShuriken) {
                const dx = enemy.x - shurikenX;
                const dy = enemy.y - shurikenY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < weapon.size + enemy.size) {
                    applyDamageToEnemy(enemy, weapon.damage, player, weapon.element, [], enemies);
                    enemy.hitFlash = 1;
                    enemy.hitByShuriken = true;
                    
                    if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                        enemy.isDead = true;
                    }
                    
                    setTimeout(() => {
                        if (enemy) enemy.hitByShuriken = false;
                    }, 100);
                }
            }
        });
    }
}

// 발사체 무기
function updateProjectileWeapon(weapon, dt, player, enemies, projectiles) {
    weapon.cooldownTimer -= dt;
    
    // 냉기 방사기 버스트 처리
    if (weapon.type === 'iceThrower' && weapon.burstRemaining > 0) {
        weapon.burstTimer = (weapon.burstTimer || 0) - dt;
        if (weapon.burstTimer <= 0 && weapon.burstTarget) {
            fireProjectile(player, weapon, weapon.burstTarget, projectiles);
            weapon.burstRemaining--;
            weapon.burstTimer = weapon.burstDelay;
            if (weapon.burstRemaining <= 0) {
                weapon.burstTarget = null;
            }
        }
    }
    
    if (weapon.cooldownTimer <= 0 && enemies.length > 0) {
        let closestEnemy = null;
        let closestDist = Infinity;
        
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < closestDist && dist < weapon.range) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }
        
        if (closestEnemy) {
            // 냉기 방사기는 버스트 발사 시작
            if (weapon.type === 'iceThrower' && weapon.burstCount) {
                weapon.burstRemaining = weapon.burstCount;
                weapon.burstTimer = 0;
                weapon.burstTarget = closestEnemy;
                weapon.cooldownTimer = weapon.cooldown;
            } else {
                fireProjectile(player, weapon, closestEnemy, projectiles);
                weapon.cooldownTimer = weapon.cooldown;
            }
        }
    }
}

// 발사체 발사
function fireProjectile(player, weapon, target, projectiles) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    for (let i = 0; i < weapon.count; i++) {
        let spreadAngle = 0;
        if (weapon.spread) {
            spreadAngle = (i - (weapon.count - 1) / 2) * weapon.spread;
        }
        
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        
        const finalDirX = dirX * cos - dirY * sin;
        const finalDirY = dirX * sin + dirY * cos;
        
        const projectile = {
            x: player.x,
            y: player.y,
            vx: finalDirX * weapon.projectileSpeed,
            vy: finalDirY * weapon.projectileSpeed,
            damage: weapon.damage,
            size: weapon.projectileSize,
            radius: weapon.projectileSize,
            color: weapon.elementColor || weapon.projectileColor,
            pierce: weapon.pierce,
            lifetime: weapon.range / weapon.projectileSpeed,
            weaponType: weapon.type,
            trail: [],
            showPath: weapon.showPath,
            renderAsCircle: weapon.renderAsCircle,
            hitEnemies: weapon.trackHitEnemies ? [] : undefined,
            element: weapon.element,
            explosionRadius: weapon.explosionRadius, // 폭발 범위 전달
            image: weapon.projectileImage, // 투사체 이미지
            rotation: Math.atan2(finalDirY, finalDirX), // 투사체 회전
            scale: weapon.initialScale || 1, // 초기 크기
            maxScale: weapon.maxScale || 1, // 최대 크기
            growthRate: weapon.growthRate || 0, // 성장 속도
            age: 0 // 투사체 나이 (성장용)
        };
        
        projectiles.push(projectile);
    }
}

// 던지기 무기 (화염병)
function updateThrowableWeapon(weapon, dt, player, enemies, fireZones) {
    weapon.cooldownTimer -= dt;
    
    if (weapon.cooldownTimer <= 0 && enemies.length > 0) {
        let closestEnemy = null;
        let closestDist = Infinity;
        
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < closestDist && dist < weapon.range) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }
        
        if (closestEnemy) {
            throwBomb(player, weapon, closestEnemy, fireZones);
            weapon.cooldownTimer = weapon.cooldown;
        }
    }
}

// 폭탄 던지기
function throwBomb(player, weapon, target, fireZones) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    const bomb = {
        x: player.x,
        y: player.y,
        z: 20,
        targetX: target.x,
        targetY: target.y,
        vx: dirX * weapon.projectileSpeed,
        vy: dirY * weapon.projectileSpeed,
        vz: 200,
        gravity: 400,
        size: weapon.projectileSize,
        color: weapon.elementColor || weapon.projectileColor,
        damage: weapon.damage,
        aoe: weapon.aoe,
        duration: weapon.duration,
        weaponType: weapon.type,
        element: weapon.element,
        exploded: false,
        timer: 0
    };
    
    fireZones.push(bomb);
}

// 회전 레이저 업데이트
function updateRotatingLaser(weapon, dt, player, enemies, fireZones) {
    weapon.angle = (weapon.angle || 0) + weapon.rotationSpeed * dt;
    weapon.damageTimer = (weapon.damageTimer || 0) - dt;
    
    if (weapon.damageTimer <= 0) {
        weapon.damageTimer = weapon.damageInterval;
        
        const laserCount = weapon.count || 1;
        const angleStep = (Math.PI * 2) / laserCount;
        
        // 각 레이저마다 데미지 적용
        for (let i = 0; i < laserCount; i++) {
            const laserAngle = weapon.angle + angleStep * i;
            const laserCos = Math.cos(laserAngle);
            const laserSin = Math.sin(laserAngle);
            
            enemies.forEach(enemy => {
                if (enemy.isDead) return;
                
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > weapon.length) return;
                
                const perpDist = Math.abs(dx * laserSin - dy * laserCos);
                
                if (perpDist < weapon.width / 2 + enemy.size) {
                    const proj = dx * laserCos + dy * laserSin;
                    if (proj > 0 && proj < weapon.length) {
                        applyDamageToEnemy(enemy, weapon.damage, player, weapon.element, fireZones, enemies);
                        enemy.hitFlash = 1;
                        if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) enemy.isDead = true;
                    }
                }
            });
        }
    }
}

// 부메랑 업데이트
function updateBoomerang(weapon, dt, player, enemies, projectiles) {
    weapon.cooldownTimer -= dt;
    
    if (weapon.cooldownTimer <= 0 && enemies.length > 0) {
        let closestEnemy = null;
        let closestDist = Infinity;
        
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }
        
        if (closestEnemy) {
            const dx = closestEnemy.x - player.x;
            const dy = closestEnemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // attackOnlyInRange 체크 (부메랑, 바람 칼날)
            if (weapon.attackOnlyInRange && distance > weapon.maxDistance) {
                return;
            }
            
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            const boomerang = {
                x: player.x,
                y: player.y,
                vx: dirX * weapon.speed,
                vy: dirY * weapon.speed,
                damage: weapon.damage,
                size: weapon.size,
                radius: weapon.size,
                color: weapon.elementColor || weapon.color,
                pierce: weapon.pierce,
                weaponType: weapon.type,
                returning: false,
                distanceTraveled: 0,
                maxDistance: weapon.maxDistance,
                returnSpeed: weapon.returnSpeed || weapon.speed,
                playerX: player.x,
                playerY: player.y,
                element: weapon.element,
                rotation: 0,
                trail: [],
                image: weapon.projectileImage // 부메랑/바람칼날 이미지
            };
            
            projectiles.push(boomerang);
            weapon.cooldownTimer = weapon.cooldown;
        }
    }
}

// 근접 무기 (야구 방망이) 업데이트
function updateMeleeWeapon(weapon, dt, player, enemies, fireZones) {
    weapon.cooldownTimer = (weapon.cooldownTimer || 0) - dt;
    weapon.swingAngle = (weapon.swingAngle || 0);
    weapon.isSwinging = (weapon.isSwinging || false);
    weapon.swingDirection = weapon.swingDirection || 0; // 휘두르는 방향
    
    if (weapon.isSwinging) {
        weapon.swingAngle += weapon.swingSpeed * dt;
        
        if (weapon.swingAngle >= Math.PI) {
            weapon.isSwinging = false;
            weapon.swingAngle = 0;
        }
        
        const swingProgress = weapon.swingAngle / Math.PI;
        const swingRadius = weapon.range;
        const swingStartAngle = weapon.swingDirection - Math.PI / 2;
        const swingEndAngle = weapon.swingDirection + Math.PI / 2;
        const currentAngle = swingStartAngle + (swingEndAngle - swingStartAngle) * swingProgress;
        
        enemies.forEach(enemy => {
            if (enemy.isDead || enemy.hitByBat) return;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < swingRadius + enemy.size) {
                const enemyAngle = Math.atan2(dy, dx);
                let angleDiff = Math.abs(enemyAngle - currentAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                
                if (angleDiff < Math.PI / 6) {
                    applyDamageToEnemy(enemy, weapon.damage, player, weapon.element, fireZones, enemies);
                    enemy.hitFlash = 1;
                    enemy.hitByBat = true;
                    
                    const knockbackAngle = Math.atan2(dy, dx);
                    enemy.vx = (enemy.vx || 0) + Math.cos(knockbackAngle) * weapon.knockback;
                    enemy.vy = (enemy.vy || 0) + Math.sin(knockbackAngle) * weapon.knockback;
                    
                    if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) enemy.isDead = true;
                    
                    setTimeout(() => {
                        if (enemy) enemy.hitByBat = false;
                    }, 100);
                }
            }
        });
    } else if (weapon.cooldownTimer <= 0 && enemies.length > 0) {
        let closestEnemy = null;
        let closestDist = Infinity;
        
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < weapon.range + 50 && dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }
        
        if (closestEnemy) {
            // 가장 가까운 적 방향으로 휘두르기
            const dx = closestEnemy.x - player.x;
            const dy = closestEnemy.y - player.y;
            weapon.swingDirection = Math.atan2(dy, dx);
            weapon.isSwinging = true;
            weapon.swingAngle = 0;
            weapon.cooldownTimer = weapon.cooldown;
        }
    }
}

// 전기 방어막 업데이트
function updateElectricShield(weapon, dt, player, enemies, fireZones) {
    weapon.pulseTimer = (weapon.pulseTimer || 0) + dt;
    weapon.damageTimer = (weapon.damageTimer || 0) - dt;
    
    if (weapon.damageTimer <= 0) {
        weapon.damageTimer = weapon.damageInterval;
        
        enemies.forEach(enemy => {
            if (enemy.isDead) return;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < weapon.radius + enemy.size) {
                applyDamageToEnemy(enemy, weapon.damage, player, weapon.element, fireZones, enemies);
                enemy.hitFlash = 1;
                if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) enemy.isDead = true;
            }
        });
    }
}

// 안개 생성기 업데이트
function updateFogGenerator(weapon, dt, player, enemies, fireZones) {
    weapon.cooldownTimer = (weapon.cooldownTimer || 0) - dt;
    
    if (weapon.cooldownTimer <= 0) {
        // 안개 생성 (플레이어 위치에 고정)
        fireZones.push({
            x: player.x,
            y: player.y,
            innerRadius: weapon.innerRadius,
            outerRadius: weapon.outerRadius,
            damage: weapon.damage,
            damageInterval: weapon.damageInterval,
            timer: weapon.duration,
            duration: weapon.duration,
            color: weapon.elementColor || weapon.color,
            element: weapon.element,
            isFog: true,
            damageTimer: 0
        });
        
        weapon.cooldownTimer = weapon.cooldown;
    }
}

// 파동 생성기 업데이트
function updateWaveGenerator(weapon, dt, player, enemies, projectiles) {
    weapon.cooldownTimer = (weapon.cooldownTimer || 0) - dt;
    
    if (weapon.cooldownTimer <= 0) {
        // 파동 생성
        projectiles.push({
            x: player.x,
            y: player.y,
            radius: 0,
            maxRadius: weapon.maxRadius,
            expandSpeed: weapon.expandSpeed,
            damage: weapon.damage,
            slowDuration: weapon.slowDuration,
            slowAmount: weapon.slowAmount,
            color: weapon.elementColor || weapon.color,
            element: weapon.element,
            weaponType: 'wave',
            hitEnemies: []
        });
        
        weapon.cooldownTimer = weapon.cooldown;
    }
}

// 폭죽 업데이트
function updateFirecracker(weapon, dt, player, enemies, fireZones) {
    weapon.cooldownTimer = (weapon.cooldownTimer || 0) - dt;
    
    // 폭죽 배열 초기화
    if (!weapon.firecrackers) {
        weapon.firecrackers = [];
    }
    
    // 필드의 폭죽 수명 업데이트
    weapon.firecrackers = weapon.firecrackers.filter(fc => {
        fc.lifetime -= dt;
        fc.pulseTimer += dt;
        return fc.lifetime > 0;
    });
    
    // 새 폭죽 생성
    if (weapon.cooldownTimer <= 0) {
        for (let i = 0; i < weapon.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const minDist = weapon.minDropRadius || 200;
            const maxDist = weapon.dropRadius || 400;
            const distance = minDist + Math.random() * (maxDist - minDist);
            
            weapon.firecrackers.push({
                x: player.x + Math.cos(angle) * distance,
                y: player.y + Math.sin(angle) * distance,
                lifetime: weapon.duration,
                pulseTimer: 0,
                collected: false
            });
        }
        weapon.cooldownTimer = weapon.cooldown;
    }
    
    // 플레이어가 폭죽 습득 체크
    weapon.firecrackers.forEach(fc => {
        if (fc.collected) return;
        
        const dx = player.x - fc.x;
        const dy = player.y - fc.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 30) { // 습득 거리
            fc.collected = true;
            
            // 폭죽 터트리기!
            explodeFirecracker(fc.x, fc.y, weapon, player, enemies, fireZones);
        }
    });
}

// 폭죽 폭발
function explodeFirecracker(x, y, weapon, player, enemies, fireZones) {
    enemies.forEach(enemy => {
        if (enemy.isDead) return;
        
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < weapon.explosionRadius) {
            applyDamageToEnemy(enemy, weapon.damage, player, weapon.element, fireZones, enemies);
            enemy.hitFlash = 1;
            if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                enemy.isDead = true;
            }
        }
    });
    
    // 폭발 이펙트 생성 (범위 표시)
    fireZones.push({
        x: x,
        y: y,
        radius: weapon.explosionRadius,
        timer: 0.5,
        duration: 0.5,
        isExplosion: true,
        damage: 0,
        color: '#ff4757'
    });
    
    // 폭발 이펙트 생성 (파티클)
    createFirecrackerExplosion(x, y, weapon);
}

// 폭죽 폭발 이펙트
function createFirecrackerExplosion(x, y, weapon) {
    if (!window.firecrackerExplosions) {
        window.firecrackerExplosions = [];
    }
    
    // 파티클 20-30개 생성
    const particleCount = Math.floor(Math.random() * 11) + 20; // 20-30개
    const fireworkImages = [weaponImages.firework1, weaponImages.firework2, weaponImages.firework3];
    
    // 폭발 범위만큼 파티클 퍼짐 속도 계산
    const explosionRadius = weapon.explosionRadius || 200;
    const baseSpeed = explosionRadius * 2; // 범위에 비례한 속도
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = baseSpeed * (0.5 + Math.random() * 0.5); // 범위 기반 랜덤 속도
        
        window.firecrackerExplosions.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 10,
            size: 20 + Math.random() * 30, // 랜덤 크기
            maxLifetime: 1.0 + Math.random() * 0.5, // 1.0~1.5초
            lifetime: 0,
            image: fireworkImages[Math.floor(Math.random() * fireworkImages.length)],
            color: weapon.elementColor || weapon.color
        });
    }
}

// 회전 수리검 렌더링 (진짜 수리검 모양)
function renderOrbitWeapon(weapon, player, ctx, camera) {
    for (let i = 0; i < weapon.count; i++) {
        const angleOffset = (Math.PI * 2 / weapon.count) * i;
        const angle = weapon.angle + angleOffset;
        
        const worldX = player.x + Math.cos(angle) * weapon.orbitRadius;
        const worldY = player.y + Math.sin(angle) * weapon.orbitRadius;
        
        const screenX = worldX - camera.x;
        const screenY = worldY - camera.y;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(weapon.angle * 5);
        
        // 속성 색상 적용
        const weaponColor = weapon.elementColor || weapon.color;
        
        if (weapon.projectileImage && weapon.projectileImage.complete) {
            // 이미지 사용
            ctx.shadowBlur = 15;
            ctx.shadowColor = weaponColor;
            
            ctx.drawImage(weapon.projectileImage, -weapon.size, -weapon.size, weapon.size * 2, weapon.size * 2);
        } else {
            // 기본 렌더링
            ctx.fillStyle = weaponColor;
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = weaponColor;
            
            // 중앙 원
            ctx.beginPath();
            ctx.arc(0, 0, weapon.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 4개의 날
            for (let j = 0; j < 4; j++) {
                const bladeAngle = (Math.PI / 2) * j;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                
                // 날의 왼쪽 곡선
                const leftAngle = bladeAngle - Math.PI / 8;
                const leftX = Math.cos(leftAngle) * weapon.size;
                const leftY = Math.sin(leftAngle) * weapon.size;
                ctx.lineTo(leftX, leftY);
                
                // 날의 끝
                const tipX = Math.cos(bladeAngle) * weapon.size * 1.5;
                const tipY = Math.sin(bladeAngle) * weapon.size * 1.5;
                ctx.lineTo(tipX, tipY);
                
                // 날의 오른쪽 곡선
                const rightAngle = bladeAngle + Math.PI / 8;
                const rightX = Math.cos(rightAngle) * weapon.size;
                const rightY = Math.sin(rightAngle) * weapon.size;
                ctx.lineTo(rightX, rightY);
                
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

// 회전 레이저 렌더링
function renderRotatingLaser(weapon, player, ctx, camera) {
    const angle = weapon.angle || 0;
    const laserCount = weapon.count || 1;
    const angleStep = (Math.PI * 2) / laserCount;
    
    ctx.save();
    
    const weaponColor = weapon.elementColor || weapon.color;
    
    // 각 레이저 그리기
    for (let i = 0; i < laserCount; i++) {
        const laserAngle = angle + angleStep * i;
        const startX = player.x;
        const startY = player.y;
        const endX = startX + Math.cos(laserAngle) * weapon.length;
        const endY = startY + Math.sin(laserAngle) * weapon.length;
        
        const screenStartX = startX - camera.x;
        const screenStartY = startY - camera.y;
        const screenEndX = endX - camera.x;
        const screenEndY = endY - camera.y;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = weaponColor;
        ctx.strokeStyle = weaponColor;
        ctx.lineWidth = weapon.width;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(screenStartX, screenStartY);
        ctx.lineTo(screenEndX, screenEndY);
        ctx.stroke();
        
        // 내부 밝은 레이저
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = weapon.width * 0.3;
        ctx.stroke();
    }
    
    ctx.restore();
}

// 근접 무기 렌더링 (야구 방망이)
function renderMeleeWeapon(weapon, player, ctx, camera) {
    if (!weapon.isSwinging) return;
    
    const weaponColor = weapon.elementColor || weapon.color || '#8e44ad';
    
    const swingProgress = weapon.swingAngle / Math.PI;
    const swingStartAngle = weapon.swingDirection - Math.PI / 2;
    const swingEndAngle = weapon.swingDirection + Math.PI / 2;
    const currentAngle = swingStartAngle + (swingEndAngle - swingStartAngle) * swingProgress;
    
    const batLength = weapon.range;
    const endX = player.x + Math.cos(currentAngle) * batLength;
    const endY = player.y + Math.sin(currentAngle) * batLength;
    
    const screenStartX = player.x - camera.x;
    const screenStartY = player.y - camera.y;
    const screenEndX = endX - camera.x;
    const screenEndY = endY - camera.y;
    
    ctx.save();
    
    if (weapon.projectileImage && weapon.projectileImage.complete) {
        // 이미지 사용 - 손잡이가 플레이어 쪽
        
        // 속성 오라 효과 (방망이 주변)
        if (weapon.element) {
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
            ctx.strokeStyle = weaponColor;
            ctx.lineWidth = weapon.size * 0.8;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 30;
            ctx.shadowColor = weaponColor;
            ctx.beginPath();
            ctx.moveTo(screenStartX, screenStartY);
            ctx.lineTo(screenEndX, screenEndY);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // 잔상 효과 (범위 확장)
        const afterimageCount = Math.floor(weapon.range / 50); // 범위에 비례한 잔상 개수
        for (let a = 0; a < afterimageCount; a++) {
            const afterimageProgress = (swingProgress - 0.1 * a);
            if (afterimageProgress < 0 || afterimageProgress > 1) continue;
            
            const afterAngle = swingStartAngle + (swingEndAngle - swingStartAngle) * afterimageProgress;
            const afterEndX = player.x + Math.cos(afterAngle) * batLength;
            const afterEndY = player.y + Math.sin(afterAngle) * batLength;
            const afterScreenX = afterEndX - camera.x;
            const afterScreenY = afterEndY - camera.y;
            
ctx.save();
            ctx.translate(afterScreenX, afterScreenY);
            ctx.rotate(afterAngle - Math.PI / 2);
            ctx.globalAlpha = 0.2 * (1 - a / afterimageCount);
            ctx.drawImage(weapon.projectileImage, -weapon.size * 0.3, -batLength, weapon.size * 0.6, batLength);
            ctx.restore();
        }
        
        // 메인 방망이
        ctx.translate(screenEndX, screenEndY);
        ctx.rotate(currentAngle - Math.PI / 2);
        ctx.shadowBlur = 10;
        ctx.shadowColor = weaponColor;
        ctx.drawImage(weapon.projectileImage, -weapon.size * 0.3, -batLength, weapon.size * 0.6, batLength);
    } else {
        // 기본 렌더링
        ctx.strokeStyle = weaponColor;
        ctx.lineWidth = weapon.size * 0.3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(screenStartX, screenStartY);
        ctx.lineTo(screenEndX, screenEndY);
        ctx.stroke();
        
        // 방망이 끝 강조
        ctx.fillStyle = weaponColor;
        ctx.beginPath();
        ctx.arc(screenEndX, screenEndY, weapon.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// 전기 방어막 렌더링
function renderElectricShield(weapon, player, ctx, camera) {
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;
    const pulseScale = 1 + Math.sin((weapon.pulseTimer || 0) * weapon.pulseSpeed) * 0.05;
    const radius = weapon.radius * pulseScale;
    
    const weaponColor = weapon.elementColor || weapon.color || '#ffd93d';
    const rgbaColor = hexToRgba(weaponColor, 0.1);
    
    ctx.save();
    
    // 방어막 원 안쪽 색칠
    ctx.fillStyle = rgbaColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 방어막 원
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = weaponColor;
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 전기 효과 (랜덤 번개)
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + (weapon.pulseTimer || 0);
        const x = screenX + Math.cos(angle) * radius;
        const y = screenY + Math.sin(angle) * radius;
        
        ctx.strokeStyle = weaponColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX + Math.cos(angle) * (radius - 10), screenY + Math.sin(angle) * (radius - 10));
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    
    ctx.restore();
}

// 폭죽 렌더링
function renderFirecracker(weapon, ctx, camera) {
    if (!weapon.firecrackers) return;
    
    weapon.firecrackers.forEach(fc => {
        if (fc.collected) return;
        
        const screenX = fc.x - camera.x;
        const screenY = fc.y - camera.y;
        
        // 맥박 효과
        const pulse = Math.sin(fc.pulseTimer * 8) * 0.3 + 1;
        const size = 12 * pulse;
        
        ctx.save();
        
        if (weapon.projectileImage && weapon.projectileImage.complete) {
            // 이미지 사용
            ctx.shadowBlur = 25;
            ctx.shadowColor = weapon.glowColor;
            ctx.globalAlpha = 0.8 + Math.sin(fc.pulseTimer * 10) * 0.2;
            
            ctx.drawImage(weapon.projectileImage, screenX - size * 1.5, screenY - size * 1.5, size * 3, size * 3);
            
            // 심지 불꽃
            const sparkSize = 3 + Math.sin(fc.pulseTimer * 15) * 2;
            ctx.fillStyle = weapon.glowColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = weapon.glowColor;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.arc(screenX, screenY - size * 1.5, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 기본 렌더링
            ctx.shadowBlur = 25;
            ctx.shadowColor = weapon.glowColor;
            ctx.globalAlpha = 0.6;
            
            // 메인 폭죽 몸체 (육각형)
            ctx.fillStyle = weapon.color;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = screenX + Math.cos(angle) * size;
                const y = screenY + Math.sin(angle) * size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            // 심지 (작은 선)
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY - size);
            ctx.lineTo(screenX, screenY - size - 8);
            ctx.stroke();
            
            // 심지 불꽃
            const sparkSize = 3 + Math.sin(fc.pulseTimer * 15) * 2;
            ctx.fillStyle = weapon.glowColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = weapon.glowColor;
            ctx.beginPath();
            ctx.arc(screenX, screenY - size - 8, sparkSize, 0, Math.PI * 2);
            ctx.fill();
            
            // 중앙 하이라이트
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = weapon.glowColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            // 반짝이는 별 (4개)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = Math.sin(fc.pulseTimer * 10) * 0.5 + 0.5;
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 2) * i + fc.pulseTimer;
                const dist = size * 0.6;
                ctx.beginPath();
                ctx.moveTo(screenX + Math.cos(angle) * dist * 0.7, screenY + Math.sin(angle) * dist * 0.7);
                ctx.lineTo(screenX + Math.cos(angle) * dist * 1.3, screenY + Math.sin(angle) * dist * 1.3);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    });
}
