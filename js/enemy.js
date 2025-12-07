// enemy.js - 적 생성, AI, 렌더링

// 몬스터 이미지 로드
const enemyImages = {
    normal: new Image(),
    enhanced: new Image(),
    tanker: new Image()
};

enemyImages.normal.src = 'images/normal.png';
enemyImages.enhanced.src = 'images/enchance.png';
enemyImages.tanker.src = 'images/tank.png';

// 속성 아이콘 이미지 로드 (실제 파일명에 맞춤)
const elementIcons = {};
// 실제 속성 이름 → 이미지 파일명 매핑
const iconMapping = {
    poison: 'poiz',
    fire: 'fire',
    ice: 'froz',
    electric: 'elec',
    radiation: 'radioactivity',
    magnetic: 'magne',
    corrosion: 'corr',
    virus: 'virus',
    gas: 'gas',
    explosion: 'explo'
};

Object.entries(iconMapping).forEach(([elementType, fileName]) => {
    const img = new Image();
    img.src = `images/${fileName}.png`;
    elementIcons[elementType] = img;
});

// 적 타입 데이터
const ENEMY_TYPES = {
    normal: {
        name: '일반 몬스터',
        baseHp: 100,
        baseArmor: 50,
        minDefensePercent: 0,    // 0% 피해 감소
        maxDefensePercent: 50,   // 50% 피해 감소
        speed: 80,
        size: 20,  // 이미지 크기에 맞게 조정
        damage: 10,
        color: '#ff6b6b',
        expValue: 1,
        spawnChance: 0.96 // 96%
    },
    enhanced: {
        name: '강화 몬스터',
        baseHp: 200,
        baseArmor: 50,
        minDefensePercent: 95,   // 95% 피해 감소 (고정)
        maxDefensePercent: 95,   // 95% 피해 감소 (고정)
        speed: 80,
        size: 22,  // 이미지 크기에 맞게 조정
        damage: 15,
        color: '#ffd93d',
        expValue: 3,
        spawnChance: 0.02 // 2%
    },
    tanker: {
        name: '탱커 몬스터',
        baseHp: 100,
        baseArmor: 300, // 방어구 4배
        minDefensePercent: 0,    // 0% 피해 감소
        maxDefensePercent: 50,   // 50% 피해 감소
        speed: 60,
        size: 22,  // 이미지 크기에 맞게 조정
        damage: 20,
        color: '#4a69bd',
        expValue: 5,
        spawnChance: 0.02 // 2%
    }
};

// 적 생성
function createEnemy(x, y, wave) {
    // 타입 결정 (확률 기반)
    let type = 'normal';
    const rand = Math.random();
    
    if (rand < 0.02) {
        type = 'enhanced';
    } else if (rand < 0.04) {
        type = 'tanker';
    }
    
    const data = ENEMY_TYPES[type];
    
    // 웨이브에 따른 스탯 증가
    const waveMultiplier = wave;
    const maxHp = data.baseHp * waveMultiplier;
    const maxArmor = data.baseArmor * waveMultiplier;
    
    // 피해 감소율 계산 (% 기반)
    const minPercent = data.minDefensePercent;
    const maxPercent = data.maxDefensePercent;
    const defensePercent = minPercent + Math.random() * (maxPercent - minPercent);
    
    return {
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        speed: data.speed,
        size: data.size,
        radius: data.size,
        color: data.color,
        
        hp: maxHp,
        maxHp: maxHp,
        armor: maxArmor,
        maxArmor: maxArmor,
        defensePercent: defensePercent, // 피해 감소율 (0~100)
        damage: data.damage,
        expValue: data.expValue,
        
        type: type,
        isDead: false,
        
        // 속성 효과
        elementEffects: {
            fire: { active: false, timer: 0, damage: 0 },
            ice: { active: false, timer: 0, slowFactor: 0 },
            poison: { active: false, timer: 0 },
            electric: { active: false, timer: 0, stunDuration: 0 },
            radiation: { active: false, timer: 0, stacks: 0, damageMultiplier: 1.0 },
            magnetic: { active: false, timer: 0, stacks: 0 },
            corrosion: { active: false, timer: 0, stacks: 0, defenseReduction: 0 },
            virus: { active: false, timer: 0 },
            gas: { active: false, timer: 0, chance: 0.5, cooldown: 0 },
            explosion: { active: false, timer: 0 }
        },
        
        // AI 상태
        state: 'chase',
        attackCooldown: 0,
        attackRange: 30,
        attackDelay: 1.0,
        
        // 애니메이션
        animTimer: 0,
        animFrame: 0,
        hitFlash: 0,
        
        // 둔화
        slowTimer: 0,
        slowFactor: 1.0
    };
}

// 데미지 적용 함수
function applyDamageToEnemy(enemy, baseDamage, player, element, fireZones, enemiesArray, fromFog = false) {
    if (enemy.isDead) return 0;
    
    // 버프 시스템의 공격력 배율 적용
    const damageMultiplier = (typeof playerBuffs !== 'undefined') ? playerBuffs.damageMultiplier : 1.0;
    baseDamage *= damageMultiplier;
    
    // 더미는 단순 처리
    if (!enemy.elementEffects) {
        enemy.hp -= baseDamage;
        enemy.hitFlash = 1;
        return baseDamage;
    }
    
    let actualDamage = baseDamage;
    
    // 방사능 효과로 인한 데미지 증가 (1.5 ~ 3배)
    if (enemy.elementEffects.radiation.stacks > 0) {
        const multiplier = 1.5 + (enemy.elementEffects.radiation.stacks / 10) * 1.5; // 1스택당 0.15배, 최대 10스택 = 3배
        actualDamage *= multiplier;
    }
    
    // 독 속성은 방어구만 무시 (피해감소율은 적용됨)
    const isPoison = (element === 'poison');
    
    // 1. 방어구 적용
    if (!isPoison && enemy.armor > 0) {
        const armorDamage = Math.min(actualDamage, enemy.armor);
        enemy.armor = Math.max(0, enemy.armor - armorDamage);
        actualDamage -= armorDamage;
    }
    
    // 2. 피해 감소율 적용 - actualDamage가 남아있을 때만
    if (actualDamage > 0) {
        let effectiveDefensePercent = enemy.defensePercent || 0;
        
        // 부식 효과로 피해감소율 감소 (20% * 스택, 최대 4스택 = 80%, 최소 20% 남음)
        if (enemy.elementEffects.corrosion.stacks > 0) {
            const reduction = enemy.elementEffects.corrosion.stacks * 20;
            effectiveDefensePercent = Math.max(0, effectiveDefensePercent - reduction);
        }
        
        const beforeDefense = actualDamage;
        // 피해감소율 적용 (예: 50% 감소 = 데미지 * 0.5)
        actualDamage = actualDamage * (1 - effectiveDefensePercent / 100);
    }
    
    // 3. HP 감소
    if (actualDamage > 0) {
        enemy.hp = Math.max(0, enemy.hp - actualDamage);
    }
    enemy.hitFlash = 1;
    
    // 4. 속성 효과 적용 (fromFog 전달)
    if (element) {
        applyElementEffect(enemy, element, player, fireZones, enemiesArray, fromFog);
    }
    
    // 5. 사망 처리
    if (enemy.hp <= 0) {
        enemy.isDead = true;
        handleEnemyDeath(enemy, element, player, fireZones, enemiesArray);
    }
    
    return actualDamage;
}

// 속성 효과 적용
function applyElementEffect(enemy, element, player, fireZones, enemiesArray, fromFog = false) {
    if (!element || !enemy.elementEffects) return;
    
    switch(element) {
        case 'fire':
            // 불: 초당 최대체력의 10% 피해 (방어구 관통 아님, 방어력 관통도 아님)
            enemy.elementEffects.fire.active = true;
            enemy.elementEffects.fire.timer = 2.0;
            enemy.elementEffects.fire.damageTimer = 1.0; // 1초마다 틱
            break;
            
        case 'ice':
            // 얼음: 둔화
            enemy.elementEffects.ice.active = true;
            enemy.elementEffects.ice.timer = 2.0;
            enemy.elementEffects.ice.slowFactor = 0.5;
            enemy.slowTimer = 2.0;
            enemy.slowFactor = 0.5;
            break;
            
        case 'poison':
            // 독: 초당 10 피해 (방어구 무시, 방어력 반영)
            enemy.elementEffects.poison.active = true;
            enemy.elementEffects.poison.timer = 2.0;
            enemy.elementEffects.poison.damageTimer = 1.0; // 1초마다 틱
            break;
            
        case 'electric':
            // 전기: 0.3초 쇼크 (기절) + 2초 아이콘 표시용
            enemy.elementEffects.electric.active = true;
            enemy.elementEffects.electric.timer = 2.0; // 아이콘 표시를 위해 2초
            enemy.elementEffects.electric.stunDuration = 0.3; // 실제 기절 시간은 0.3초
            break;
            
        case 'radiation':
            // 방사능: 피격마다 데미지 증가 (1.5 ~ 3배)
            enemy.elementEffects.radiation.active = true;
            enemy.elementEffects.radiation.timer = 2.0;
            enemy.elementEffects.radiation.stacks = Math.min(enemy.elementEffects.radiation.stacks + 1, 10);
            break;
            
        case 'magnetic':
            // 자성: 20% 확률로 보호막 파괴 + 2초 아이콘 표시
            enemy.elementEffects.magnetic.active = true;
            enemy.elementEffects.magnetic.timer = 2.0;
            if (Math.random() < 0.2) {
                enemy.armor = 0;
            }
            break;
            
        case 'corrosion':
            // 부식: 방어력 20~100% 감소 (피격마다 20%씩 상승, 최대 4스택) - 영구 지속
            enemy.elementEffects.corrosion.active = true;
            enemy.elementEffects.corrosion.timer = 999999; // 영구 표시
            enemy.elementEffects.corrosion.stacks = Math.min(enemy.elementEffects.corrosion.stacks + 1, 4);
            break;
            
        case 'virus':
            // 바이러스: 초당 최대 체력의 20% 피해 (방어구+방어력 무시)
            enemy.elementEffects.virus.active = true;
            enemy.elementEffects.virus.timer = 2.0;
            enemy.elementEffects.virus.damageTimer = 1.0; // 1초마다 틱
            break;
            
        case 'gas':
            // 가스: 50% 확률로 가스 안개 생성 (1초 쿨타임) + 2초 아이콘 표시
            // fromFog가 true면 안개에서 온 피해이므로 새 안개 생성 안 함
            enemy.elementEffects.gas.active = true;
            enemy.elementEffects.gas.timer = 2.0;
            
            // 안개에서 온 피해가 아닐 때만 새 안개 생성
            if (!fromFog && (!enemy.elementEffects.gas.cooldown || enemy.elementEffects.gas.cooldown <= 0)) {
                if (Math.random() < 0.5 && fireZones) {
                    fireZones.push({
                        x: enemy.x,
                        y: enemy.y,
                        innerRadius: 0,
                        outerRadius: 150,
                        timer: 5.0,
                        duration: 5.0,
                        damage: 50, // 초당 50 피해
                        damageInterval: 1.0, // 1초마다 틱
                        damageTimer: 1.0,
                        isFog: true,
                        color: '#a8e6cf',
                        element: 'gas'
                    });
                    enemy.elementEffects.gas.cooldown = 1.0; // 1초 쿨타임
                }
            }
            break;
            
        case 'explosion':
            // 폭발: 2초 아이콘 표시
            enemy.elementEffects.explosion.active = true;
            enemy.elementEffects.explosion.timer = 2.0;
            break;
    }
}

// 속성 효과 처리 (매 프레임)
function processElementEffects(enemy, dt, fireZones, enemiesArray) {
    if (!enemy.elementEffects) return;
    
    const effects = enemy.elementEffects;
    
    // 불: 1초마다 최대체력의 10% 피해 (틱 방식)
    if (effects.fire.active && effects.fire.timer > 0) {
        effects.fire.timer -= dt;
        effects.fire.damageTimer = (effects.fire.damageTimer || 1.0) - dt;
        
        if (effects.fire.damageTimer <= 0) {
            effects.fire.damageTimer = 1.0; // 1초 간격
            const fireDamage = enemy.maxHp * 0.1;
            
            // 방어구 먼저 깎기
            if (enemy.armor > 0) {
                const armorDamage = Math.min(fireDamage, enemy.armor);
                enemy.armor -= armorDamage;
                const remainingDamage = fireDamage - armorDamage;
                
                if (remainingDamage > 0) {
                    // 피해감소율 적용 (부식 효과 반영)
                    let effectiveDefensePercent = enemy.defensePercent || 0;
                    if (effects.corrosion.stacks > 0) {
                        const reduction = effects.corrosion.stacks * 20;
                        effectiveDefensePercent = Math.max(0, effectiveDefensePercent - reduction);
                    }
                    
                    const actualDamage = remainingDamage * (1 - effectiveDefensePercent / 100);
                    enemy.hp = Math.max(0, enemy.hp - actualDamage);
                }
            } else {
                // 피해감소율 적용 (부식 효과 반영)
                let effectiveDefensePercent = enemy.defensePercent || 0;
                if (effects.corrosion.stacks > 0) {
                    const reduction = effects.corrosion.stacks * 20;
                    effectiveDefensePercent = Math.max(0, effectiveDefensePercent - reduction);
                }
                
                const actualDamage = fireDamage * (1 - effectiveDefensePercent / 100);
                enemy.hp = Math.max(0, enemy.hp - actualDamage);
            }
        }
        
        if (effects.fire.timer <= 0) {
            effects.fire.active = false;
        }
    }
    
    // 얼음: 둔화 (slowTimer와 동기화)
    if (effects.ice.active) {
        // slowTimer가 있으면 그것과 동기화
        if (enemy.slowTimer > 0) {
            effects.ice.timer = enemy.slowTimer; // slowTimer와 동일하게 유지
        } else {
            // slowTimer가 끝나면 ice도 종료
            effects.ice.active = false;
            effects.ice.timer = 0;
        }
    }
    
    // 독: 1초마다 10 피해 (틱 방식)
    if (effects.poison.active && effects.poison.timer > 0) {
        effects.poison.timer -= dt;
        effects.poison.damageTimer = (effects.poison.damageTimer || 1.0) - dt;
        
        if (effects.poison.damageTimer <= 0) {
            effects.poison.damageTimer = 1.0; // 1초 간격
            const poisonDamage = 10;
            
            // 피해감소율 적용 (부식 효과 반영)
            let effectiveDefensePercent = enemy.defensePercent || 0;
            if (effects.corrosion.stacks > 0) {
                const reduction = effects.corrosion.stacks * 20;
                effectiveDefensePercent = Math.max(0, effectiveDefensePercent - reduction);
            }
            
            const actualDamage = poisonDamage * (1 - effectiveDefensePercent / 100);
            enemy.hp = Math.max(0, enemy.hp - actualDamage);
        }
        
        if (effects.poison.timer <= 0) {
            effects.poison.active = false;
        }
    }
    
    // 전기: 쇼크 (stunDuration으로 기절, timer는 아이콘 표시용)
    if (effects.electric.active && effects.electric.timer > 0) {
        effects.electric.timer -= dt;
        if (effects.electric.stunDuration > 0) {
            effects.electric.stunDuration -= dt;
        }
        if (effects.electric.timer <= 0) {
            effects.electric.active = false;
        }
    }
    
    // 바이러스: 1초마다 최대 체력의 20% 피해 (틱 방식, 완전 무시)
    if (effects.virus.active && effects.virus.timer > 0) {
        effects.virus.timer -= dt;
        effects.virus.damageTimer = (effects.virus.damageTimer || 1.0) - dt;
        
        if (effects.virus.damageTimer <= 0) {
            effects.virus.damageTimer = 1.0; // 1초 간격
            const virusDamage = enemy.maxHp * 0.2;
            
            // 방어구와 방어력 모두 무시
            enemy.hp = Math.max(0, enemy.hp - virusDamage);
        }
        
        if (effects.virus.timer <= 0) {
            effects.virus.active = false;
        }
    }
    
    // 부식 타이머 (영구 지속이므로 타이머만 감소, 스택은 유지)
    if (effects.corrosion.active && effects.corrosion.timer > 0) {
        effects.corrosion.timer -= dt;
        // 타이머가 끝나도 active는 유지 (영구 지속)
    }
    
    // 방사능 타이머 감소
    if (effects.radiation.active && effects.radiation.timer > 0) {
        effects.radiation.timer -= dt;
        if (effects.radiation.timer <= 0) {
            effects.radiation.active = false;
            effects.radiation.stacks = 0;
        }
    }
    
    // 자성 타이머 감소
    if (effects.magnetic.active && effects.magnetic.timer > 0) {
        effects.magnetic.timer -= dt;
        if (effects.magnetic.timer <= 0) {
            effects.magnetic.active = false;
        }
    }
    
    // 가스 타이머 및 쿨타임 감소
    if (effects.gas.active && effects.gas.timer > 0) {
        effects.gas.timer -= dt;
        if (effects.gas.timer <= 0) {
            effects.gas.active = false;
        }
    }
    if (effects.gas.cooldown > 0) {
        effects.gas.cooldown -= dt;
    }
    
    // 폭발 타이머 감소
    if (effects.explosion.active && effects.explosion.timer > 0) {
        effects.explosion.timer -= dt;
        if (effects.explosion.timer <= 0) {
            effects.explosion.active = false;
        }
    }
    
    // 사망 체크
    if (enemy.hp <= 0 && !enemy.isDead) {
        enemy.isDead = true;
    }
}

// 적 사망 처리
function handleEnemyDeath(enemy, element, player, fireZones, enemiesArray) {
    // 플레이어 체력 회복 (10 HP)
    // 흡혈 버프 적용
    if (player && !player.isDead) {
        const lifestealMultiplier = (typeof playerBuffs !== 'undefined') ? playerBuffs.lifestealMultiplier : 1.0;
        const healAmount = 10 * lifestealMultiplier;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
    }
    
    // 경험치 오브 생성
    if (typeof expOrbs !== 'undefined') {
        const expValue = enemy.expValue || 1;
        expOrbs.push({
            x: enemy.x,
            y: enemy.y,
            expValue: expValue,
            size: 15,
            collected: false,
            floatOffset: 0
        });
    }
    
    // 폭발 속성으로 처치 시 범위 피해
    if (element === 'explosion' && enemiesArray) {
        const explosionRadius = 150;
        const explosionDamage = 50;
        
        enemiesArray.forEach(otherEnemy => {
            if (otherEnemy !== enemy && !otherEnemy.isDead) {
                const dx = otherEnemy.x - enemy.x;
                const dy = otherEnemy.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < explosionRadius) {
                    // 폭발 속성 아이콘 표시
                    if (otherEnemy.elementEffects) {
                        otherEnemy.elementEffects.explosion.active = true;
                        otherEnemy.elementEffects.explosion.timer = 2.0;
                    }
                    
                    // 폭발 피해는 방어구와 방어력 모두 적용
                    let damage = explosionDamage;
                    
                    if (otherEnemy.armor > 0) {
                        const armorDamage = Math.min(damage, otherEnemy.armor);
                        otherEnemy.armor = Math.max(0, otherEnemy.armor - armorDamage);
                        damage -= armorDamage;
                    }
                    
                    if (damage > 0) {
                        damage = Math.max(0, damage - (otherEnemy.defense || 0));
                        otherEnemy.hp = Math.max(0, otherEnemy.hp - damage);
                        otherEnemy.hitFlash = 1;
                        
                        if (otherEnemy.hp <= 0) {
                            otherEnemy.isDead = true;
                        }
                    }
                }
            }
        });
        
        // 폭발 이펙트 생성
        if (fireZones) {
            fireZones.push({
                x: enemy.x,
                y: enemy.y,
                radius: explosionRadius,
                timer: 0.5,
                duration: 0.5,
                isExplosion: true,
                damage: 0,
                color: '#ff4757'
            });
            
            // 폭발 속성 사망 시 파티클 이펙트 생성
            if (window.firecrackerExplosions && typeof weaponImages !== 'undefined') {
                const particleCount = Math.floor(Math.random() * 11) + 20;
                const fireworkImages = [weaponImages.firework1, weaponImages.firework2, weaponImages.firework3];
                const baseSpeed = explosionRadius * 2;
                
                for (let p = 0; p < particleCount; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = baseSpeed * (0.5 + Math.random() * 0.5);
                    
                    window.firecrackerExplosions.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 10,
                        size: 20 + Math.random() * 30,
                        maxLifetime: 1.0 + Math.random() * 0.5,
                        lifetime: 0,
                        image: fireworkImages[Math.floor(Math.random() * fireworkImages.length)],
                        color: '#e74c3c'
                    });
                }
            }
        }
    }
}

// 적 업데이트
function updateEnemy(enemy, player, dt) {
    if (enemy.isDead || !player) return;
    
    // 속성 효과 처리
    processElementEffects(enemy, dt);
    
    // 넉백 처리
    if (enemy.vx || enemy.vy) {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        enemy.vx *= 0.9;
        enemy.vy *= 0.9;
        if (Math.abs(enemy.vx) < 1) enemy.vx = 0;
        if (Math.abs(enemy.vy) < 1) enemy.vy = 0;
    }
    
    // 둔화 효과 처리 (얼음만)
    let speedMultiplier = 1;
    if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        speedMultiplier = enemy.slowFactor || 0.5;
    }
    
    // 버프 시스템의 적 둔화 효과 적용
    if (typeof playerBuffs !== 'undefined' && playerBuffs.enemySlowPercent > 0) {
        speedMultiplier *= (1 - playerBuffs.enemySlowPercent);
    }
    
    // 전기 쇼크 체크 (기절 = 이동 불가, stunDuration만 체크)
    const isStunned = enemy.elementEffects && enemy.elementEffects.electric.active && enemy.elementEffects.electric.stunDuration > 0;
    
    // 플레이어 방향 계산
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 공격 쿨다운 감소
    if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= dt;
    }
    
    // AI 상태에 따른 행동
    if (enemy.state === 'chase') {
        // 플레이어 추적
        if (distance > enemy.attackRange) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // 기절 상태가 아닐 때만 이동
            if (!isStunned) {
                enemy.vx = dirX * enemy.speed * speedMultiplier;
                enemy.vy = dirY * enemy.speed * speedMultiplier;
                
                enemy.x += enemy.vx * dt;
                enemy.y += enemy.vy * dt;
            } else {
                enemy.vx = 0;
                enemy.vy = 0;
            }
        } else {
            // 공격 범위 내
            enemy.vx = 0;
            enemy.vy = 0;
            
            // 공격
            if (enemy.attackCooldown <= 0) {
                enemy.state = 'attack';
                enemy.attackCooldown = enemy.attackDelay;
            }
        }
    } else if (enemy.state === 'attack') {
        // 공격 모션
        if (player && distance < enemy.attackRange + 10) {
            // 플레이어 무적 시간이 아닐 때만 피해
            if (!player.invincible && !player.isDead) {
                // 피격 횟수 증가 및 누적 데미지 계산
                player.hitCount = (player.hitCount || 0) + 1;
                const bonusDamage = player.hitCount * 5;
                const totalDamage = enemy.damage + bonusDamage;
                
                player.hp -= totalDamage;
                
                // 체력 0 이하로 떨어지지 않도록 제한
                if (player.hp <= 0) {
                    player.hp = 0;
                    player.isDead = true;
                    triggerGameOver();
                } else {
                    player.invincible = true;
                    player.invincibleTimer = 1.0; // 1초 무적
                    
                    // 적과 반대 방향으로 넓백 속도 부여 (부드러운 애니메이션)
                    const knockbackSpeed = 600; // 초기 속도
                    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    player.knockbackVx = Math.cos(angle) * knockbackSpeed;
                    player.knockbackVy = Math.sin(angle) * knockbackSpeed;
                }
            }
        }
        
        // 추적으로 복귀
        if (distance > enemy.attackRange + 20) {
            enemy.state = 'chase';
        }
    }
    
    // 피격 플래시 효과 감소
    if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt * 5;
    }
    
    // 애니메이션
    enemy.animTimer += dt;
    if (enemy.animTimer > 0.15) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % 3;
    }
}

// 적 렌더링
function renderEnemy(ctx, enemy, camera) {
    const screenX = enemy.x - camera.x;
    const screenY = enemy.y - camera.y;
    
    // 화면 밖이면 렌더링 스킵
    if (screenX < -50 || screenX > canvas.width + 50 || 
        screenY < -50 || screenY > canvas.height + 50) {
        return;
    }
    
    ctx.save();
    
    // 피격 효과
    if (enemy.hitFlash > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(enemy.hitFlash * 20) * 0.5;
    }
    
    // 애니메이션 효과
    const pulse = 1 + Math.sin(enemy.animFrame * Math.PI / 1.5) * 0.05;
    
    ctx.translate(screenX, screenY);
    
    // 이동 방향에 따른 flip 처리
    // normal 몹: 왼쪽을 바라보고 있으므로 오른쪽 이동 시 flip
    // enhanced, tanker: 오른쪽을 바라보고 있으므로 왼쪽 이동 시 flip
    let flipScale = 1;
    if (enemy.type === 'normal') {
        // normal은 기본이 왼쪽 향함, vx > 0이면 오른쪽으로 이동 중 = flip 필요
        if (enemy.vx > 0.1) {
            flipScale = -1;
        }
    } else {
        // enhanced, tanker는 기본이 오른쪽 향함, vx < 0이면 왼쪽으로 이동 중 = flip 필요
        if (enemy.vx < -0.1) {
            flipScale = -1;
        }
    }
    
    ctx.scale(flipScale * pulse, pulse);
    
    // 몬스터 이미지 그리기
    const enemyImg = enemyImages[enemy.type];
    if (enemyImg && enemyImg.complete) {
        const imgSize = enemy.size * 2.5; // 이미지 크기 (약간 크게)
        ctx.drawImage(enemyImg, -imgSize/2, -imgSize/2, imgSize, imgSize);
    } else {
        // 이미지 로딩 안됐을 때 대비용 (기존 도형)
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 외곽선
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    ctx.restore();
    
    // 통합 체력바 (방어구 + HP)
    const barWidth = enemy.size * 2;
    const barHeight = 4;
    
    // 전체 체력 = 현재방어구 + 현재HP
    const totalCurrent = (enemy.armor || 0) + enemy.hp;
    // 최대 체력 = 최대방어구 + 최대HP
    const totalMax = (enemy.maxArmor || 0) + enemy.maxHp;
    
    if (totalCurrent < totalMax) {
        // 배경 (검정)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX - barWidth / 2, screenY - enemy.size - 10, barWidth, barHeight);
        
        // 방어구 비율 계산
        const armorRatio = Math.max(0, Math.min(1, (enemy.armor || 0) / totalMax));
        const hpRatio = Math.max(0, Math.min(1, enemy.hp / totalMax));
        
        // 방어구 부분 (하늘색)
        if (armorRatio > 0) {
            ctx.fillStyle = '#4a69bd';
            ctx.fillRect(screenX - barWidth / 2 + barWidth * hpRatio, screenY - enemy.size - 10, barWidth * armorRatio, barHeight);
        }
        
        // HP 부분 (피해감소율 있으면 진한 노랑, 없으면 빨강)
        if (hpRatio > 0) {
            // 실제 피해감소율 계산 (부식 효과 반영)
            let effectiveDefensePercent = enemy.defensePercent || 0;
            if (enemy.elementEffects && enemy.elementEffects.corrosion.stacks > 0) {
                const reduction = enemy.elementEffects.corrosion.stacks * 20; // 스택당 20% 감소
                effectiveDefensePercent = Math.max(0, effectiveDefensePercent - reduction);
            }
            
            const hpColor = effectiveDefensePercent > 0 ? '#ffd93d' : '#ff6b6b';
            ctx.fillStyle = hpColor;
            ctx.fillRect(screenX - barWidth / 2, screenY - enemy.size - 10, barWidth * hpRatio, barHeight);
        }
    }
    
    // 속성 아이콘 렌더링
    if (enemy.elementEffects) {
        const iconSize = 16; // 작은 아이콘 크기
        const iconSpacing = 18; // 아이콘 간격
        let activeIconCount = 0;
        
        // 활성화된 속성들을 배열로 수집
        const activeElements = [];
        for (const [type, effect] of Object.entries(enemy.elementEffects)) {
            if (effect.active && effect.timer > 0 && elementIcons[type]) {
                activeElements.push(type);
            }
        }
        
        // 아이콘이 있을 때만 렌더링
        if (activeElements.length > 0) {
            const totalWidth = activeElements.length * iconSpacing - (iconSpacing - iconSize);
            const startX = screenX - totalWidth / 2;
            const iconY = screenY - enemy.size - 30; // HP바 위쪽으로 충분히 띄움
            
            activeElements.forEach((type, index) => {
                const icon = elementIcons[type];
                if (icon && icon.complete) { // 이미지 존재 및 로드 완료 확인
                    const iconX = startX + index * iconSpacing;
                    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
                }
            });
        }
    }
}
