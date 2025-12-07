// test.js - 무기 테스트 연습장

// Hex to RGBA 변환 헬퍼 함수
function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 게임 상태
let gameState = {
    running: true,
    paused: false
};

// 카메라
let camera = {
    x: 0,
    y: 0
};

// deltaTime
let lastTime = 0;
let deltaTime = 0;

// 게임 타이머 (5분 = 300초)
let gameTimer = 300;
let maxGameTime = 300;

// 몬스터 소환 타이머
let spawnTimer = 0;
let spawnInterval = 2.0; // 2초마다 소환

// 게임 오브젝트
let player = null;
let projectiles = [];
let fireZones = [];
let weaponPickups = [];
let expOrbs = []; // 경험치 오브

// 속성부여권 타이머 (1분마다 지급)
let attributeTicketTimer = 0;
let attributeTicketInterval = 60.0;

// 체력 감소 시스템 (시간 경과에 따라 증가)
let hpDrainTimer = 0;
let hpDrainInterval = 1.0; // 1초마다 체력 감소

// 버프 시스템
let playerBuffs = {
    damageMultiplier: 1.0,  // 공격력 배율
    speedBonus: 0,          // 속도 보너스
    lifestealMultiplier: 1.0, // 흡혈 배율
    enemySlowPercent: 0     // 적 둔화 비율 (0~1)
};

let buffTimers = {
    damage: 0,
    speed: 0,
    lifesteal: 0,
    enemySlow: 0
};

let enemies = []; // 테스트용 적들

// 입력 처리
let keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// 속성 UI 변수
let selectedWeaponForElement = null;

// E 키로 속성 UI 열기
window.addEventListener('keydown', (e) => {
    // ESC 키로 PAUSE 토글
    if (e.key === 'Escape') {
        togglePause();
        return;
    }
    
    if (e.key.toLowerCase() === 'e' && !gameState.paused) {
        if (player && player.weapons.length > 0 && (player.elementTickets || 0) > 0) {
            openElementPanel();
        }
    }
});

// 속성 패널 열기
function openElementPanel() {
    gameState.paused = true;
    const panel = document.getElementById('elementPanel');
    const step1 = document.getElementById('elementStep1');
    const step2 = document.getElementById('elementStep2');
    
    panel.classList.remove('hidden');
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    
    // 무기 목록 표시
    const weaponList = document.getElementById('weaponList');
    weaponList.innerHTML = '';
    
    player.weapons.forEach((weapon, index) => {
        const weaponDiv = document.createElement('div');
        weaponDiv.className = 'weapon-item';
        
        // 물리속성 목록
        const physicalElements = ['impact', 'pierce', 'slash'];
        const isPhysical = weapon.element && physicalElements.includes(weapon.element);
        
        // 원소속성만 표시 (물리속성은 표시하지 않음)
        if (weapon.element && !isPhysical) {
            weaponDiv.classList.add('has-element');
        }
        
        const elementText = (weapon.element && !isPhysical) ? 
            `<div class="weapon-element">속성: ${ELEMENT_DATA[weapon.element].name}</div>` : '';
        
        weaponDiv.innerHTML = `
            <div class="weapon-name">${weapon.name}</div>
            ${elementText}
        `;
        
        weaponDiv.addEventListener('click', () => selectWeaponForElement(index));
        weaponList.appendChild(weaponDiv);
    });
}

// 무기 선택
function selectWeaponForElement(weaponIndex) {
    selectedWeaponForElement = weaponIndex;
    const weapon = player.weapons[weaponIndex];
    
    const step1 = document.getElementById('elementStep1');
    const step2 = document.getElementById('elementStep2');
    
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    
    // 물리속성 목록
    const physicalElements = ['impact', 'pierce', 'slash'];
    const isPhysical = weapon.element && physicalElements.includes(weapon.element);
    
    document.getElementById('selectedWeaponName').textContent = weapon.name;
    document.getElementById('currentElement').textContent = 
        (weapon.element && !isPhysical) ? ELEMENT_DATA[weapon.element].name : '없음';
    
    // 속성 버튼 상태 업데이트
    updateElementButtons(weapon);
}

// 속성 버튼 상태 업데이트
function updateElementButtons(weapon) {
    const elementButtons = document.querySelectorAll('.element-btn');
    
    // 물리속성은 원소속성과 무관
    const physicalElements = ['impact', 'pierce', 'slash'];
    const currentElement = weapon.element && !physicalElements.includes(weapon.element) ? weapon.element : null;
    
    elementButtons.forEach(btn => {
        const elementType = btn.dataset.element;
        
        // 같은 속성은 비활성화
        if (currentElement === elementType) {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
        } else if (currentElement && ELEMENT_DATA[currentElement]) {
            // 현재 속성이 있을 경우, 합성 불가능한 속성 비활성화
            const canCombine = checkElementCombination(currentElement, elementType);
            if (!canCombine) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        } else {
            // 속성이 없으면 모두 활성화
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
}

// 속성 조합 가능 여부 확인
function checkElementCombination(element1, element2) {
    // 2차 속성 확인
    for (const [key, data] of Object.entries(ELEMENT_DATA)) {
        if (data.base && data.base.length === 2) {
            if ((data.base[0] === element1 && data.base[1] === element2) ||
                (data.base[0] === element2 && data.base[1] === element1)) {
                return true;
            }
        }
    }
    return false;
}

// 속성 버튼 이벤트
document.querySelectorAll('.element-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const elementType = btn.dataset.element;
        applyElementToSelectedWeapon(elementType);
    });
});

// 속성 적용
function applyElementToSelectedWeapon(elementType) {
    if (selectedWeaponForElement === null) return;
    
    // 티켓 확인
    if ((player.elementTickets || 0) <= 0) {
        alert('속성부여권이 부족합니다!');
        return;
    }
    
    const weapon = player.weapons[selectedWeaponForElement];
    
    // 물리속성 목록
    const physicalElements = ['impact', 'pierce', 'slash'];
    const currentElement = weapon.element && !physicalElements.includes(weapon.element) ? weapon.element : null;
    
    // 같은 원소속성 연속 부여 방지 (물리속성은 무시)
    if (currentElement === elementType) {
        alert('이미 동일한 속성이 적용되어 있습니다!');
        return;
    }
    
    const success = applyElementToWeapon(weapon, elementType);
    
    if (success) {
        // 티켓 소모
        player.elementTickets--;
        updateTicketUI();
        
        // 성공 메시지
        const elementName = ELEMENT_DATA[weapon.element].name;
        alert(`${weapon.name}에 ${elementName} 속성이 적용되었습니다!`);
        closeElementPanel();
    } else {
        alert('속성 적용에 실패했습니다. (조합 불가)');
    }
}

// 뒤로 버튼
document.getElementById('elementBackBtn').addEventListener('click', () => {
    const step1 = document.getElementById('elementStep1');
    const step2 = document.getElementById('elementStep2');
    
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
    selectedWeaponForElement = null;
});

// 닫기 버튼
document.getElementById('elementCloseBtn').addEventListener('click', () => {
    closeElementPanel();
});

function closeElementPanel() {
    const panel = document.getElementById('elementPanel');
    panel.classList.add('hidden');
    selectedWeaponForElement = null;
    gameState.paused = false;
}

// 승리 화면 표시
function showVictoryScreen() {
    gameState.paused = true;
    
    const victoryPanel = document.getElementById('victoryPanel');
    
    if (victoryPanel) {
        victoryPanel.classList.remove('hidden');
    } else {
        // 패널이 없으면 직접 생성
        const newPanel = document.createElement('div');
        newPanel.id = 'victoryPanel';
        newPanel.className = 'victory-panel';
        newPanel.innerHTML = `
            <div class="victory-content">
                <h1 style="color: #ffd700; font-size: 4em; margin: 20px 0; text-shadow: 0 0 20px #ffd700;">VICTORY!</h1>
                <p style="color: #fff; font-size: 2em; margin: 30px 0;">목표 시간을 달성했습니다!</p>
                <div style="margin-top: 40px;">
                    <button onclick="location.href='index.html'" class="victory-btn">메인화면으로</button>
                    <button onclick="location.reload()" class="victory-btn" style="background: #27ae60;">다시 시작</button>
                </div>
            </div>
        `;
        document.body.appendChild(newPanel);
    }
}

// 승리 화면 버튼 이벤트
document.getElementById('victoryMainMenuBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('victoryRestartBtn')?.addEventListener('click', () => {
    window.location.reload();
});

// 티켓 UI 업데이트
function updateTicketUI() {
    const ticketText = document.querySelector('.ticket-text');
    if (ticketText && player) {
        ticketText.textContent = `X ${player.elementTickets || 0}`;
    }
}

// 레벨업 카드 표시
function showLevelUpCards() {
    gameState.paused = true;
    const panel = document.getElementById('levelUpPanel');
    const container = document.getElementById('cardContainer');
    container.innerHTML = '';
    
    const weaponCount = player.weapons.length;
    
    if (weaponCount < 2) {
        // 무기가 2개 미만: 랜덤 무기 3종 표시
        const allWeapons = ['shuriken', 'machinegun', 'shotgun', 'boomerang', 'windBlade', 
                           'rocket', 'flameThrower', 'iceThrower', 'baseballBat', 'bomb', 
                           'fogGenerator', 'waveGenerator', 'laser', 'electricShield'];
        
        // 이미 보유한 무기 제외
        const availableWeapons = allWeapons.filter(w => !player.weapons.find(pw => pw.type === w));
        
        // 랜덤 3개 선택
        const randomWeapons = [];
        for (let i = 0; i < 3 && availableWeapons.length > 0; i++) {
            const idx = Math.floor(Math.random() * availableWeapons.length);
            randomWeapons.push(availableWeapons[idx]);
            availableWeapons.splice(idx, 1);
        }
        
        // 카드 생성
        randomWeapons.forEach((weaponType, index) => {
            const weaponData = WEAPON_DATA[weaponType];
            if (!weaponData) {
                return;
            }
            const card = document.createElement('div');
            card.className = 'level-up-card';
            card.innerHTML = `
                <h3>${weaponData.name}</h3>
                <p>새로운 무기</p>
            `;
            card.addEventListener('click', () => selectLevelUpCard('weapon', weaponType));
            container.appendChild(card);
        });
        
    } else {
        // 무기가 2개: 각 무기 레벨업 또는 버프 카드
        for (let i = 0; i < 2 && i < player.weapons.length; i++) {
            const weapon = player.weapons[i];
            if (!weapon) continue;
            
            if (weapon.level >= 5) {
                // 최대 레벨: 버프 카드 표시
                // 버프 종류: 공격력 200%, 속도 30%, 흡혈 2배, 적 둔화 50%
                const buffTypes = [
                    { type: 'damage', name: '공격력 강화', desc: '공격력 +200% (5초)' },
                    { type: 'speed', name: '이동속도 강화', desc: '이동속도 +30% (5초)' },
                    { type: 'lifesteal', name: '흡혈 강화', desc: '흡혈량 2배 (5초)' },
                    { type: 'enemySlow', name: '적 둔화', desc: '적 이동속도 -50% (5초)' }
                ];
                
                // 랜덤 버프 선택
                const randomBuff = buffTypes[Math.floor(Math.random() * buffTypes.length)];
                const card = document.createElement('div');
                card.className = 'level-up-card';
                card.innerHTML = `
                    <h3>${randomBuff.name}</h3>
                    <p>${randomBuff.desc}</p>
                `;
                card.addEventListener('click', () => selectLevelUpCard('buff', randomBuff.type));
                container.appendChild(card);
            } else {
                // 레벨업 카드
                const card = document.createElement('div');
                card.className = 'level-up-card';
                card.innerHTML = `
                    <h3>${weapon.name}</h3>
                    <p>레벨 ${weapon.level} → ${weapon.level + 1}</p>
                `;
                card.addEventListener('click', () => selectLevelUpCard('upgrade', i));
                container.appendChild(card);
            }
        }
        
        // HP 회복 카드
        const hpCard = document.createElement('div');
        hpCard.className = 'level-up-card';
        hpCard.innerHTML = `
            <h3>💚 HP 회복</h3>
            <p>체력 완전 회복</p>
        `;
        hpCard.addEventListener('click', () => selectLevelUpCard('heal', null));
        container.appendChild(hpCard);
    }
    
    panel.classList.remove('hidden');
}

// 레벨업 카드 선택
function selectLevelUpCard(type, data) {
    if (type === 'weapon') {
        // 새 무기 추가
        addWeaponToPlayer(player, data);
    } else if (type === 'upgrade') {
        // 무기 레벨업
        const weapon = player.weapons[data];
        upgradeWeapon(weapon);
    } else if (type === 'heal') {
        // HP 회복
        player.hp = player.maxHp;
    } else if (type === 'buff') {
        // 버프 적용
        applyBuff(data);
    }
    
    // 패널 닫기
    const panel = document.getElementById('levelUpPanel');
    panel.classList.add('hidden');
    gameState.paused = false;
}

// 버프 적용 함수
function applyBuff(buffType) {
    const duration = 5.0; // 5초
    
    switch(buffType) {
        case 'damage':
            playerBuffs.damageMultiplier = 3.0; // 200% 증가 = 3배
            buffTimers.damage = duration;
            break;
        case 'speed':
            playerBuffs.speedBonus = 0.3; // 30% 증가
            buffTimers.speed = duration;
            break;
        case 'lifesteal':
            playerBuffs.lifestealMultiplier = 2.0; // 2배
            buffTimers.lifesteal = duration;
            break;
        case 'enemySlow':
            playerBuffs.enemySlowPercent = 0.5; // 50% 둔화
            buffTimers.enemySlow = duration;
            break;
    }
}

// 버프 타이머 업데이트
function updateBuffTimers(dt) {
    // 각 버프 타이머 감소
    if (buffTimers.damage > 0) {
        buffTimers.damage -= dt;
        if (buffTimers.damage <= 0) {
            buffTimers.damage = 0;
            playerBuffs.damageMultiplier = 1.0;
        }
    }
    
    if (buffTimers.speed > 0) {
        buffTimers.speed -= dt;
        if (buffTimers.speed <= 0) {
            buffTimers.speed = 0;
            playerBuffs.speedBonus = 0;
        }
    }
    
    if (buffTimers.lifesteal > 0) {
        buffTimers.lifesteal -= dt;
        if (buffTimers.lifesteal <= 0) {
            buffTimers.lifesteal = 0;
            playerBuffs.lifestealMultiplier = 1.0;
        }
    }
    
    if (buffTimers.enemySlow > 0) {
        buffTimers.enemySlow -= dt;
        if (buffTimers.enemySlow <= 0) {
            buffTimers.enemySlow = 0;
            playerBuffs.enemySlowPercent = 0;
        }
    }
}

// 초기화
function init() {

    // 폭발 파티클 배열 초기화 (로켓, 폭죽, 폭발 속성 등에서 사용)
    window.firecrackerExplosions = [];
    

    // 플레이어 생성 (기본 ninja)
    player = createPlayer('ninja');
    player.weapons = []; // 무기 없이 시작
    player.hp = player.maxHp;
    player.invincible = false; // 무적 상태
    player.invincibleTimer = 0; // 무적 타이머
    player.knockbackVx = 0; // 넉백 속도 X
    player.knockbackVy = 0; // 넉백 속도 Y
    
    // 무기 픽업 아이템 제거
    weaponPickups = [];
    
    updateUI();
    updateTicketUI(); // 티켓 UI 초기화
    
    // PAUSE 버튼 설정
    setupPauseButton();
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// PAUSE 버튼 설정
function setupPauseButton() {
    const pauseBtn = document.getElementById('pauseBtn');
    const mainMenuBtn = document.getElementById('mainMenuBtn');
    const restartBtn = document.getElementById('restartBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    
    if (!pauseBtn) return;
    
    // PAUSE 버튼 클릭
    pauseBtn.addEventListener('click', togglePause);

    // 메인화면으로
    if (mainMenuBtn) {
        mainMenuBtn.addEventListener('click', () => {
            location.href = 'index.html';
        });
    }
    
    // 다시 시작
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            location.reload();
        });
    }
    
    // 계속하기
    if (resumeBtn) {
        resumeBtn.addEventListener('click', togglePause);
    }
}

// PAUSE 토글
function togglePause() {
    gameState.paused = !gameState.paused;
    const settingsPanel = document.getElementById('settingsPanel');
    
    if (!settingsPanel) return;
    
    if (gameState.paused) {
        settingsPanel.classList.remove('hidden');
        settingsPanel.classList.add('show');
    } else {
        settingsPanel.classList.remove('show');
        setTimeout(() => {
            settingsPanel.classList.add('hidden');
        }, 300);
    }
}

// 게임 오버 처리
function triggerGameOver() {
    gameState.paused = true;
    gameState.running = false;
    
    // 게임 오버 화면 표시
    setTimeout(() => {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'fixed';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.background = 'rgba(0, 0, 0, 0.9)';
        gameOverDiv.style.padding = '50px 80px';
        gameOverDiv.style.borderRadius = '20px';
        gameOverDiv.style.textAlign = 'center';
        gameOverDiv.style.zIndex = '3000';
        gameOverDiv.style.border = '5px solid #e74c3c';
        
        gameOverDiv.innerHTML = `
            <h1 style="color: #e74c3c; font-size: 4em; margin-bottom: 20px; font-family: 'OneStoreMobilePop', sans-serif;">GAME OVER</h1>
            <p style="color: #fff; font-size: 1.5em; margin-bottom: 30px; font-family: 'OneStoreMobilePop', sans-serif;">생존 시간: ${Math.floor(maxGameTime - gameTimer)}초</p>
            <button onclick="location.reload()" style="
                padding: 15px 40px;
                font-size: 1.5em;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-family: 'OneStoreMobilePop', sans-serif;
                margin: 10px;
            ">다시 시작</button>
            <button onclick="location.href='index.html'" style="
                padding: 15px 40px;
                font-size: 1.5em;
                background: #95a5a6;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-family: 'OneStoreMobilePop', sans-serif;
                margin: 10px;
            ">메인 메뉴</button>
        `;
        
        document.body.appendChild(gameOverDiv);
    }, 100);
}

// 몬스터 소환 함수
function spawnMonsters() {
    if (!player) return;
    
    const elapsedTime = maxGameTime - gameTimer; // 경과 시간
    let spawnCount = 0;
    let enemyTypes = [];
    
    // 시간대별 몬스터 타입 및 수량 결정
    if (elapsedTime < 90) {
        // 초반 (0~1분 30초): 일반 몹만 소환
        spawnCount = 5;
        enemyTypes = ['normal', 'normal', 'normal', 'normal', 'normal'];
    } else if (elapsedTime < 180) {
        // 중반 (1분 30초~3분): 일반 몹 줄이고 탱커 몹 추가
        spawnCount = 7;
        enemyTypes = ['normal', 'normal', 'normal', 'tanker', 'tanker', 'tanker', 'tanker'];
    } else if (elapsedTime < 270) {
        // 후반 (3분~4분 30초): 일반/탱커 동일, 강화 몹 추가
        spawnCount = 10;
        enemyTypes = ['normal', 'normal', 'normal', 'tanker', 'tanker', 'tanker', 'enhanced', 'enhanced', 'enhanced', 'enhanced'];
    } else {
        // 최후반 (4분 30초~5분): 강화 몹만 소환
        spawnCount = 12;
        enemyTypes = ['enhanced', 'enhanced', 'enhanced', 'enhanced', 'enhanced', 'enhanced', 
                      'enhanced', 'enhanced', 'enhanced', 'enhanced', 'enhanced', 'enhanced'];
    }
    
    // 몬스터 소환
    for (let i = 0; i < spawnCount; i++) {
        const enemyType = enemyTypes[i % enemyTypes.length];
        
        // 맵 경계 설정
        const mapWidth = 8000;
        const mapHeight = 6000;
        const mapLeft = -mapWidth / 2;
        const mapTop = -mapHeight / 2;
        const mapRight = mapWidth / 2;
        const mapBottom = mapHeight / 2;
        
        // 화면 밖 랜덤 위치에 소환 (맵 경계 내부에서)
        const spawnDistance = 800 + Math.random() * 400; // 800~1200px 거리
        const angle = Math.random() * Math.PI * 2; // 랜덤 각도
        let spawnX = player.x + Math.cos(angle) * spawnDistance;
        let spawnY = player.y + Math.sin(angle) * spawnDistance;
        
        // 맵 경계를 벗어나면 경계 내부로 제한
        spawnX = Math.max(mapLeft + 50, Math.min(mapRight - 50, spawnX));
        spawnY = Math.max(mapTop + 50, Math.min(mapBottom - 50, spawnY));
        
        const enemy = createEnemy(spawnX, spawnY, 1);
        enemy.type = enemyType;
        
        // 타입별 스탯 설정
        const typeData = ENEMY_TYPES[enemyType];
        enemy.color = typeData.color;
        enemy.size = typeData.size;
        enemy.maxHp = typeData.baseHp;
        enemy.hp = typeData.baseHp;
        enemy.maxArmor = typeData.baseArmor;
        enemy.armor = typeData.baseArmor;
        
        // 피해감소율 재계산
        const minPercent = typeData.minDefensePercent;
        const maxPercent = typeData.maxDefensePercent;
        const defensePercent = minPercent + Math.random() * (maxPercent - minPercent);
        enemy.defensePercent = defensePercent;
        
        enemies.push(enemy);
    }
}

// 게임 루프
function gameLoop(currentTime) {
    if (!gameState.running) return;
    
    deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    if (deltaTime > 0.1) deltaTime = 0.1;
    
    // 승리 조건 체크 (타이머 0 도달) - paused 여부와 관계없이 체크
    if (gameTimer <= 0 && player && !player.isDead && !document.getElementById('victoryPanel').classList.contains('hidden')) {
        // 이미 승리 화면이 떠 있으면 패스
    } else if (gameTimer <= 0 && player && !player.isDead) {
        showVictoryScreen();
        // 타이머를 0으로 고정
        gameTimer = 0;
    }
    
    if (!gameState.paused) {
        // 타이머 감소
        gameTimer = Math.max(0, gameTimer - deltaTime);
        
        update(deltaTime);
        
        // UI 업데이트
        updateGameUI();
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
}

// 게임 UI 업데이트
function updateGameUI() {
    if (!player) return;
    
    // 타이머 업데이트
    const minutes = Math.floor(gameTimer / 60);
    const seconds = Math.floor(gameTimer % 60);
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    }
    
    // EXP 바 업데이트
    const expPercent = (player.exp / player.expToNextLevel) * 100;
    const expBar = document.getElementById('expBar');
    if (expBar) {
        expBar.style.width = expPercent + '%';
    }
    
    // HP 바 업데이트
    const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    const hpBarBottom = document.getElementById('hpBarBottom');
    if (hpBarBottom) {
        hpBarBottom.style.width = hpPercent + '%';
    }
}

// 업데이트
function update(dt) {
    // 버프 타이머 업데이트
    updateBuffTimers(dt);
    
    // 플레이어 업데이트
    if (player && !player.isDead) {
        updatePlayer(player, dt, keys);
        
        // 넉백 속도 적용 및 감속
        if (player.knockbackVx !== 0 || player.knockbackVy !== 0) {
            player.x += player.knockbackVx * dt;
            player.y += player.knockbackVy * dt;
            
            // 마찰력으로 감속 (5배 빠르게 감속)
            const friction = 5;
            player.knockbackVx *= Math.pow(0.01, dt * friction);
            player.knockbackVy *= Math.pow(0.01, dt * friction);
            
            // 거의 0이면 완전히 멈춤
            if (Math.abs(player.knockbackVx) < 1) player.knockbackVx = 0;
            if (Math.abs(player.knockbackVy) < 1) player.knockbackVy = 0;
        }
        
        // 무적 타이머 감소
        if (player.invincible && player.invincibleTimer > 0) {
            player.invincibleTimer -= dt;
            if (player.invincibleTimer <= 0) {
                player.invincible = false;
                player.invincibleTimer = 0;
            }
        }
        
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
        
        // 몬스터 소환 로직
        spawnTimer += dt;
        if (spawnTimer >= spawnInterval) {
            spawnTimer = 0;
            spawnMonsters();
        }
    }
    
    // 적 업데이트
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        updateEnemy(enemy, player, dt);
        processElementEffects(enemy, dt, fireZones, enemies);
        
        if (enemy.isDead) {
            enemies.splice(i, 1);
        }
    }
    
    // 무기 픽업 충돌 체크
    weaponPickups.forEach(pickup => {
        if (!pickup.collected) {
            pickup.floatOffset += dt * 2;
            
            const dx = player.x - pickup.x;
            const dy = player.y - pickup.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < player.size + pickup.size) {
                // 무기 획득
                if (player.weapons.length < player.maxWeapons) {
                    const success = addWeaponToPlayer(player, pickup.type);
                    if (success) {
                        pickup.collected = true;
                    }
                }
            }
        }
    });
    
    // 경험치 오브 충돌 체크
    for (let i = expOrbs.length - 1; i >= 0; i--) {
        const orb = expOrbs[i];
        if (!orb.collected) {
            orb.floatOffset += dt * 2;
            
            const dx = player.x - orb.x;
            const dy = player.y - orb.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < player.size + orb.size) {
                // 경험치 획득
                player.exp += orb.expValue;
                
                // 레벨업 체크
                while (player.exp >= player.expToNextLevel) {
                    player.exp -= player.expToNextLevel;
                    player.level++;
                    // 경험치 요구량 공식 (1.3 지수)
                    player.expToNextLevel = Math.floor(10 * Math.pow(1.3, player.level - 1));
                    
                    // 레벨업 카드 표시 (게임 일시정지)
                    showLevelUpCards();
                }
                
                expOrbs.splice(i, 1);
            }
        }
    }
    
    // 속성부여권 1분마다 지급
    attributeTicketTimer += dt;
    if (attributeTicketTimer >= attributeTicketInterval) {
        attributeTicketTimer = 0;
        player.elementTickets = (player.elementTickets || 0) + 1;
        updateTicketUI();
    }
    
    // 체력 감소 시스템 (시간 경과에 따라 증가)
    hpDrainTimer += dt;
    if (hpDrainTimer >= hpDrainInterval) {
        hpDrainTimer = 0;
        
        // 경과 시간 계산 (0~300초)
        const elapsedTime = maxGameTime - gameTimer;
        const progress = elapsedTime / 240; // 240초(4분) 기준
        
        // 1부터 10까지 선형 증가
        const drainAmount = Math.floor(1 + progress * 9);
        
        player.hp = Math.max(0, player.hp - drainAmount);
        
        // 체력 0이면 게임 오버
        if (player.hp <= 0) {
            player.hp = 0;
            player.isDead = true;
            triggerGameOver();
        }
    }
    
    // 모든 무기 업데이트 (적들)
    if (player && !player.isDead) {
        if (player.weapons.length > 0) {
            updateAllWeapons(player, dt, enemies, projectiles, fireZones);
        } else {
            // 무기가 없을 때 기본 권총 발사
            if (!player.defaultWeaponTimer) player.defaultWeaponTimer = 0;
            player.defaultWeaponTimer -= dt;
            if (player.defaultWeaponTimer <= 0) {
                const pistolData = WEAPON_DATA.pistol;
                player.defaultWeaponTimer = pistolData.cooldown;
                
                // 가장 가까운 적 찾기
                let closestEnemy = null;
                let closestDist = Infinity;
                enemies.forEach(enemy => {
                    if (!enemy.isDead) {
                        const dx = enemy.x - player.x;
                        const dy = enemy.y - player.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestEnemy = enemy;
                        }
                    }
                });
                
                // 적이 있으면 발사
                if (closestEnemy) {
                    const dx = closestEnemy.x - player.x;
                    const dy = closestEnemy.y - player.y;
                    const angle = Math.atan2(dy, dx);
                    
                    const proj = {
                        x: player.x,
                        y: player.y,
                        vx: Math.cos(angle) * pistolData.projectileSpeed,
                        vy: Math.sin(angle) * pistolData.projectileSpeed,
                        damage: pistolData.damage,
                        size: pistolData.projectileSize,
                        color: pistolData.projectileColor,
                        rotation: angle,
                        projectileImage: pistolData.projectileImage,
                        pierce: false,
                        range: pistolData.range,
                        distanceTraveled: 0,
                        weaponType: 'pistol',
                        element: pistolData.element
                    };
                    projectiles.push(proj);
                }
            }
        }
    }
    
    // 발사체 업데이트
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        // 파동 업데이트
        if (proj.weaponType === 'wave') {
            proj.radius += proj.expandSpeed * dt;
            
            // 적 충돌 체크
            enemies.forEach(enemy => {
                if (!enemy.isDead && !proj.hitEnemies.includes(enemy)) {
                    const dx = enemy.x - proj.x;
                    const dy = enemy.y - proj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // 파동 테두리와 충돌 (두께 20)
                    if (Math.abs(dist - proj.radius) < 20) {
                        applyDamageToEnemy(enemy, proj.damage, player, proj.element, fireZones, enemies);
                        enemy.hitFlash = Math.max(enemy.hitFlash || 0, 0.3);
                        
                        proj.hitEnemies.push(enemy);
                        
                        if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                            enemy.isDead = true;
                        }
                    }
                }
            });
            
            // 최대 반경 도달 시 제거
            if (proj.radius >= proj.maxRadius) {
                projectiles.splice(i, 1);
            }
            continue;
        }
        
        // 부메랑 처리
        if (proj.weaponType === 'boomerang') {
            if (!proj.returning) {
                proj.x += proj.vx * dt;
                proj.y += proj.vy * dt;
                proj.distanceTraveled += Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * dt;
                proj.rotation = (proj.rotation || 0) + 10 * dt; // 회전 누적
                
                if (proj.distanceTraveled >= proj.maxDistance) {
                    proj.returning = true;
                }
            } else {
                const dx = player.x - proj.x;
                const dy = player.y - proj.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 20) {
                    projectiles.splice(i, 1);
                    continue;
                }
                
                proj.vx = (dx / dist) * 500;
                proj.vy = (dy / dist) * 500;
                proj.x += proj.vx * dt;
                proj.y += proj.vy * dt;
                proj.rotation = (proj.rotation || 0) + 10 * dt; // 회전 누적
            }
            
            enemies.forEach(enemy => {
                if (!enemy.isDead && checkCollision(proj, enemy) && !enemy.hitByBoomerang) {
                    applyDamageToEnemy(enemy, proj.damage, player, proj.element, fireZones, enemies);
                    enemy.hitFlash = 1;
                    enemy.hitByBoomerang = true;
                    
                    if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                        enemy.isDead = true;
                    }
                    
                    setTimeout(() => {
                        if (enemy) enemy.hitByBoomerang = false;
                    }, 100);
                }
            });
            
            continue;
        }
        
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.lifetime -= dt;
        
        // windBlade 방향 업데이트 (속도 방향을 바라봄)
        if (proj.weaponType === 'windBlade') {
            proj.rotation = Math.atan2(proj.vy, proj.vx);
        }
        
        // 총알(기관총/샷건) 방향 업데이트
        if (proj.weaponType === 'machinegun' || proj.weaponType === 'shotgun') {
            proj.rotation = Math.atan2(proj.vy, proj.vx);
        }
        
        // 로켓 호밍 기능 (적 추적 및 회전)
        if (proj.weaponType === 'rocket') {
            let closestEnemy = null;
            let closestDist = Infinity;
            
            enemies.forEach(enemy => {
                if (!enemy.isDead) {
                    const dx = enemy.x - proj.x;
                    const dy = enemy.y - proj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
            });
            
            if (closestEnemy) {
                const dx = closestEnemy.x - proj.x;
                const dy = closestEnemy.y - proj.y;
                const targetAngle = Math.atan2(dy, dx);
                
                // 부드럽게 회전
                let angleDiff = targetAngle - proj.rotation;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                const turnSpeed = 5 * dt;
                proj.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnSpeed);
                
                // 속도 방향 업데이트
                const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
                proj.vx = Math.cos(proj.rotation) * speed;
                proj.vy = Math.sin(proj.rotation) * speed;
            }
        }
        
        if (proj.trail) {
            proj.trail.push({ x: proj.x, y: proj.y, alpha: 1 });
            if (proj.trail.length > 10) proj.trail.shift();
            proj.trail.forEach(t => t.alpha -= dt * 2);
        }
        
        // 충돌 체크
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
            const target = enemies[j];
            if (!target.isDead && checkCollision(proj, target)) {
                // 적에게는 applyDamageToEnemy 사용
                if (target.type) { // 적은 type 속성 있음
                    applyDamageToEnemy(target, proj.damage, player, proj.element, fireZones, enemies);
                    
                    if (target.hp <= 0 && (target.armor || 0) <= 0) {
                        target.isDead = true;
                    }
                } else { // 더미는 직접 HP 감소
                    target.hp -= proj.damage;
                    
                    // 얼음 둔화
                    if (proj.weaponType === 'iceThrower') {
                        target.slowFactor = 0.5;
                        target.slowTimer = 2.0;
                    }
                }
                
                target.hitFlash = 1;
                
                // 로켓 폭발
                if (proj.weaponType === 'rocket') {
                    // 적들에게 폭발 피해 적용 (풀 데미지)
                    enemies.forEach(enemy => {
                        if (!enemy.isDead) {
                            const dx = enemy.x - proj.x;
                            const dy = enemy.y - proj.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < (proj.explosionRadius || 120)) {
                                applyDamageToEnemy(enemy, proj.damage, player, proj.element, fireZones, enemies);
                                if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                                    enemy.isDead = true;
                                }
                            }
                        }
                    });
                    
                    // 폭발 이펙트 생성 (범위 크기만큼)
                    fireZones.push({
                        x: proj.x,
                        y: proj.y,
                        radius: proj.explosionRadius || 120,
                        timer: 0.5,
                        duration: 0.5,
                        isExplosion: true,
                        damage: 0,
                        color: '#ff4757'
                    });
                    
                    // 로켓 폭발 파티클 이펙트 생성
                    if (window.firecrackerExplosions) {
                        const particleCount = Math.floor(Math.random() * 11) + 20;
                        const fireworkImages = [weaponImages.firework1, weaponImages.firework2, weaponImages.firework3];
                        const explosionRadius = proj.explosionRadius || 120;
                        const baseSpeed = explosionRadius * 2;
                        
                        for (let p = 0; p < particleCount; p++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = baseSpeed * (0.5 + Math.random() * 0.5);
                            
                            window.firecrackerExplosions.push({
                                x: proj.x,
                                y: proj.y,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed,
                                rotation: Math.random() * Math.PI * 2,
                                rotationSpeed: (Math.random() - 0.5) * 10,
                                size: 20 + Math.random() * 30,
                                maxLifetime: 1.0 + Math.random() * 0.5,
                                lifetime: 0,
                                image: fireworkImages[Math.floor(Math.random() * fireworkImages.length)],
                                color: '#ff4757'
                            });
                        }
                    }
                }
                
                hit = true;
                if (!proj.pierce) break;
            }
        }
        
        if (hit && !proj.pierce) {
            projectiles.splice(i, 1);
        } else if (proj.lifetime <= 0) {
            if (proj.weaponType === 'rocket') {
                // 적들에게 폭발 피해 적용
                enemies.forEach(enemy => {
                    if (!enemy.isDead) {
                        const dx = enemy.x - proj.x;
                        const dy = enemy.y - proj.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 100) {
                            applyDamageToEnemy(enemy, proj.damage * 0.5, player, proj.element, fireZones, enemies);
                            if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                                enemy.isDead = true;
                            }
                        }
                    }
                });
            }
            projectiles.splice(i, 1);
        }
    }
    
    // 화염 지대 업데이트
    for (let i = fireZones.length - 1; i >= 0; i--) {
        const fire = fireZones[i];
        
        // 안개 타입
        if (fire.isFog) {
            fire.timer -= dt;
            fire.damageTimer -= dt;
            
            if (fire.damageTimer <= 0) {
                fire.damageTimer = fire.damageInterval;
                
                enemies.forEach(enemy => {
                    if (!enemy.isDead) {
                        const dx = enemy.x - fire.x;
                        const dy = enemy.y - fire.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        // 도넛 모양: outerRadius 안에 있고 innerRadius 밖에 있으면 피해
                        if (dist < fire.outerRadius && dist > fire.innerRadius) {
                            // 가스 속성 아이콘 표시 (안개 안에 있는 동안)
                            if (enemy.elementEffects && fire.element === 'gas') {
                                enemy.elementEffects.gas.active = true;
                                enemy.elementEffects.gas.timer = 2.0; // 안개 안에 있으면 계속 갱신
                            }
                            
                            // fromFog = true 전달 (안개에서 온 피해이므로 새 안개 생성 안 함)
                            applyDamageToEnemy(enemy, fire.damage, player, fire.element, fireZones, enemies, true);
                            enemy.hitFlash = Math.max(enemy.hitFlash || 0, 0.3);
                            if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                                enemy.isDead = true;
                            }
                        }
                    }
                });
            }
            
            if (fire.timer <= 0) {
                fireZones.splice(i, 1);
            }
            continue;
        }
        
        // 폭발 타입인 경우
        if (fire.isExplosion) {
            fire.timer -= dt;
            
            if (fire.timer <= 0) {
                fireZones.splice(i, 1);
            }
            continue;
        }
        
        // 투척 타입인 경우 (화염방사기, 얼음방사기)
        if (!fire.exploded) {
            fire.x += fire.vx * dt;
            fire.y += fire.vy * dt;
            fire.z += fire.vz * dt;
            fire.vz -= fire.gravity * dt;
            
            if (fire.z <= 0) {
                fire.z = 0;
                fire.exploded = true;
                fire.timer = fire.duration;
            }
        } else {
            fire.timer -= dt;
            
            enemies.forEach(enemy => {
                if (!enemy.isDead) {
                    const dx = enemy.x - fire.x;
                    const dy = enemy.y - fire.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < fire.aoe) {
                        applyDamageToEnemy(enemy, fire.damage * dt, player, fire.element, fireZones, enemies);
                        enemy.hitFlash = Math.max(enemy.hitFlash || 0, 0.3);
                        if (enemy.hp <= 0 && (enemy.armor || 0) <= 0) {
                            enemy.isDead = true;
                        }
                    }
                }
            });
            
            if (fire.timer <= 0) {
                fireZones.splice(i, 1);
            }
        }
    }
    
    updateUI();
}

// 렌더링
function render() {
    // 배경 (메모장 밖 영역 - 어두운 회색)
    ctx.fillStyle = '#424242';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 맵 렌더링
    renderMap(ctx, camera);
    
    // 안내선
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    
    // 무기 진열 라인 1
    ctx.beginPath();
    ctx.moveTo(-camera.x, -250 - camera.y);
    ctx.lineTo(canvas.width - camera.x, -250 - camera.y);
    ctx.stroke();
    
    // 무기 진열 라인 2
    ctx.beginPath();
    ctx.moveTo(-camera.x, -100 - camera.y);
    ctx.lineTo(canvas.width - camera.x, -100 - camera.y);
    ctx.stroke();
    
    // 허수아비 라인
    ctx.beginPath();
    ctx.moveTo(-camera.x, 200 - camera.y);
    ctx.lineTo(canvas.width - camera.x, 200 - camera.y);
    ctx.stroke();
    
    ctx.restore();
    
    // 무기 픽업 렌더링
    weaponPickups.forEach(pickup => {
        if (!pickup.collected) {
            const screenX = pickup.x - camera.x;
            const screenY = pickup.y - camera.y + Math.sin(pickup.floatOffset) * 10;
            
            ctx.save();
            ctx.translate(screenX, screenY);
            
            // 발광 효과
            ctx.shadowBlur = 20;
            ctx.shadowColor = pickup.color;
            
            // 무기 아이콘 (육각형)
            ctx.fillStyle = pickup.color;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = Math.cos(angle) * pickup.size;
                const y = Math.sin(angle) * pickup.size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.restore();
            
            // 무기 이름
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(pickup.name, screenX, screenY + pickup.size + 20);
        }
    });
    
    // 화염 지대 렌더링
    fireZones.forEach(fire => {
        const screenX = fire.x - camera.x;
        const screenY = fire.y - camera.y;
        
        // 안개 렌더링 (도넛 모양)
        if (fire.isFog) {
            const alpha = fire.timer / fire.duration;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            
            // 도넛 모양 안개 (외부 원 - 내부 원)
            const gradient = ctx.createRadialGradient(screenX, screenY, fire.innerRadius, screenX, screenY, fire.outerRadius);
            
            // 색상 처리 (hex 또는 rgba 형식)
            let fogColor = fire.color;
            if (fire.color.startsWith('#')) {
                const fogColorRgba = hexToRgba(fire.color, 0.6);
                gradient.addColorStop(0, hexToRgba(fire.color, 0));
                gradient.addColorStop(0.3, fogColorRgba);
                gradient.addColorStop(0.7, fogColorRgba);
                gradient.addColorStop(1, hexToRgba(fire.color, 0));
            } else {
                gradient.addColorStop(0, fire.color.replace(/[\d\.]+\)$/, '0)'));
                gradient.addColorStop(0.3, fire.color);
                gradient.addColorStop(0.7, fire.color);
                gradient.addColorStop(1, fire.color.replace(/[\d\.]+\)$/, '0)'));
            }
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, fire.outerRadius, 0, Math.PI * 2);
            ctx.arc(screenX, screenY, fire.innerRadius, 0, Math.PI * 2, true);
            ctx.fill();
            
            ctx.restore();
            return;
        }
        
        // 폭발 타입 (로켓)
        if (fire.isExplosion) {
            const screenX = fire.x - camera.x;
            const screenY = fire.y - camera.y;
            const alpha = fire.timer / fire.duration;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            
            // 폭발 중심 효과 (3개 레이어)
            for (let layer = 0; layer < 3; layer++) {
                const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, fire.radius * (0.3 + layer * 0.35));
                gradient.addColorStop(0, `rgba(255, 100, 0, ${0.8 - layer * 0.2})`);
                gradient.addColorStop(0.5, `rgba(255, 150, 0, ${0.4 - layer * 0.1})`);
                gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenX, screenY, fire.radius * (0.3 + layer * 0.35), 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 폭발 범위 표시 (점선 원)
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(screenX, screenY, fire.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.restore();
        }
        // 투척 타입 (화염방사기, 얼음방사기)
        else if (fire.exploded) {
            const screenX = fire.x - camera.x;
            const screenY = fire.y - camera.y;
            
            ctx.save();
            ctx.globalAlpha = fire.timer / fire.duration;
            
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * fire.aoe;
                const x = screenX + Math.cos(angle) * dist;
                const y = screenY + Math.sin(angle) * dist;
                const size = 10 + Math.random() * 15;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
                gradient.addColorStop(0, fire.color);
                gradient.addColorStop(0.5, '#f7931e');
                gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        } else {
            const screenX = fire.x - camera.x;
            const screenY = fire.y - camera.y - fire.z;
            
            ctx.save();
            ctx.fillStyle = fire.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = fire.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, fire.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(fire.x - camera.x, fire.y - camera.y, fire.size * 0.8, fire.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    });
    
    // 적 렌더링
    enemies.forEach(enemy => {
        renderEnemy(ctx, enemy, camera);
    });
    
    // 경험치 오브 렌더링
    expOrbs.forEach(orb => {
        if (!orb.collected) {
            const screenX = orb.x - camera.x;
            const screenY = orb.y - camera.y + Math.sin(orb.floatOffset) * 5;
            
            ctx.save();
            if (weaponImages.exp && weaponImages.exp.complete) {
                ctx.drawImage(weaponImages.exp, screenX - orb.size, screenY - orb.size, orb.size * 2, orb.size * 2);
            } else {
                ctx.fillStyle = '#ffeb3b';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffeb3b';
                ctx.beginPath();
                ctx.arc(screenX, screenY, orb.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    });
    
    // 플레이어 렌더링
    if (player && !player.isDead) {
        renderPlayer(player, ctx, camera);
        
        // 플레이어 무기 렌더링
        player.weapons.forEach(weapon => {
            if (weapon.weaponType === 'orbit') {
                renderOrbitWeapon(weapon, player, ctx, camera);
            } else if (weapon.weaponType === 'rotating_laser') {
                renderRotatingLaser(weapon, player, ctx, camera);
            } else if (weapon.weaponType === 'melee') {
                renderMeleeWeapon(weapon, player, ctx, camera);
            } else if (weapon.weaponType === 'electric_shield') {
                renderElectricShield(weapon, player, ctx, camera);
            } else if (weapon.weaponType === 'firecracker') {
                renderFirecracker(weapon, ctx, camera);
            }
        });
    }
    
    // 발사체 렌더링
    projectiles.forEach(proj => {
        const screenX = proj.x - camera.x;
        const screenY = proj.y - camera.y;
        
        // 파동 렌더링
        if (proj.weaponType === 'wave') {
            ctx.save();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = proj.color;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, proj.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // 내부 원 (이중 테두리 효과)
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, Math.max(0, proj.radius - 10), 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
            return;
        }
        
        // Trail 렌더링 (파동이 아닌 경우만)
        if (proj.trail && proj.trail.length > 0 && proj.size) {
            ctx.save();
            proj.trail.forEach((t, idx) => {
                if (t.alpha > 0) {
                    ctx.globalAlpha = t.alpha * 0.5;
                    ctx.fillStyle = proj.color;
                    const size = proj.size * (0.5 + idx / proj.trail.length * 0.5);
                    ctx.beginPath();
                    ctx.arc(t.x - camera.x, t.y - camera.y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.restore();
        }
        
        ctx.save();
        ctx.translate(screenX, screenY);
        
        // 무기별 렌더링
        switch(proj.weaponType) {
            case 'boomerang':
                if (proj.image && proj.image.complete) {
                    // 이미지 사용 - 수리검처럼 회전
                    ctx.rotate(proj.rotation || 0); // update에서 이미 회전값 계산됨
                    
                    // 그림자 효과
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = proj.color;
                    
                    // 이미지 그대로 사용 (색상 틴팅 안 함)
                    ctx.drawImage(proj.image, -proj.size, -proj.size, proj.size * 2, proj.size * 2);
                } else {
                    // 기본 렌더링
                    ctx.rotate(proj.rotation || 0);
                    ctx.fillStyle = proj.color;
                    ctx.strokeStyle = '#2c3e50';
                    ctx.lineWidth = 2;
                    
                    ctx.beginPath();
                    ctx.ellipse(0, 0, proj.size, proj.size * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.ellipse(0, 0, proj.size * 0.3, proj.size, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                break;
                
            case 'windBlade':
                if (proj.image && proj.image.complete) {
                    // 이미지 사용 - 이미지의 오른쪽이 날아가는 방향을 바라봄
                    ctx.rotate(proj.rotation || 0); // 날아가는 방향으로 회전
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = proj.color;
                    
                    // 이미지 그대로 사용 (색상 틴팅 안 함)
                    ctx.drawImage(proj.image, -proj.size, -proj.size, proj.size * 2, proj.size * 2);
                } else {
                    // 기본 렌더링
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = proj.color;
                    ctx.fillStyle = proj.color;
                    
                    ctx.beginPath();
                    ctx.moveTo(proj.size, 0);
                    ctx.lineTo(-proj.size * 0.5, -proj.size * 0.8);
                    ctx.lineTo(-proj.size, 0);
                    ctx.lineTo(-proj.size * 0.5, proj.size * 0.8);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                break;
                
            case 'iceThrower':
                if (proj.image && proj.image.complete && proj.size && proj.rotation !== undefined) {
                    // 이미지 사용 - 크기 성장
                    proj.age = (proj.age || 0) + deltaTime;
                    const growthProgress = Math.min(proj.age * (proj.growthRate || 0), 1);
                    const initialScale = proj.scale || 1;
                    const maxScale = proj.maxScale || 1;
                    const currentScale = initialScale + (maxScale - initialScale) * growthProgress;
                    
                    // 안전한 scale 값 확인
                    if (!isNaN(currentScale) && currentScale > 0) {
                        ctx.rotate(proj.rotation + Math.PI / 2); // 오른쪽으로 90도 회전
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = proj.color;
                        ctx.scale(currentScale, currentScale);
                        
                        ctx.drawImage(proj.image, -proj.size, -proj.size, proj.size * 2, proj.size * 2);
                    }
                } else {
                    // 기본 렌더링
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = proj.color;
                    ctx.fillStyle = proj.color;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 / 6) * i;
                        const radius = i % 2 === 0 ? proj.size : proj.size * 0.6;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                break;
                
            case 'bounceBall':
                ctx.shadowBlur = 15;
                ctx.shadowColor = proj.color;
                
                const ballGradient = ctx.createRadialGradient(-proj.size * 0.3, -proj.size * 0.3, 0, 0, 0, proj.size);
                ballGradient.addColorStop(0, '#ffffff');
                ballGradient.addColorStop(0.3, proj.color);
                ballGradient.addColorStop(1, proj.color);
                ctx.fillStyle = ballGradient;
                
                ctx.beginPath();
                ctx.arc(0, 0, proj.size, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'rocket':
                if (proj.image && proj.image.complete) {
                    // 이미지 사용 - 적을 향해 회전
                    ctx.rotate(proj.rotation);
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = proj.color;
                    
                    ctx.drawImage(proj.image, -proj.size * 1.5, -proj.size, proj.size * 3, proj.size * 2);
                } else {
                    // 기본 렌더링
                    ctx.fillStyle = proj.color;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = proj.color;
                    
                    ctx.beginPath();
                    ctx.moveTo(proj.size, 0);
                    ctx.lineTo(-proj.size, -proj.size * 0.7);
                    ctx.lineTo(-proj.size * 0.5, 0);
                    ctx.lineTo(-proj.size, proj.size * 0.7);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = '#ffa502';
                    ctx.beginPath();
                    ctx.arc(-proj.size, 0, proj.size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            
            case 'flameThrower':
                if (proj.image && proj.image.complete && proj.size && proj.rotation !== undefined) {
                    // 이미지 사용 - 크기 성장
                    proj.age = (proj.age || 0) + deltaTime;
                    const growthProgress = Math.min(proj.age * (proj.growthRate || 0), 1);
                    const initialScale = proj.scale || 1;
                    const maxScale = proj.maxScale || 1;
                    const currentScale = initialScale + (maxScale - initialScale) * growthProgress;
                    
                    // 안전한 scale 값 확인
                    if (!isNaN(currentScale) && currentScale > 0) {
                        ctx.rotate(proj.rotation + Math.PI / 2); // 오른쪽으로 90도 회전
                        ctx.shadowBlur = 20;
                        ctx.shadowColor = proj.color;
                        ctx.scale(currentScale, currentScale);
                        
                        ctx.drawImage(proj.image, -proj.size, -proj.size, proj.size * 2, proj.size * 2);
                    }
                }
                break;
                
            default:
                // 기본 이미지가 있으면 사용
                if (proj.image && proj.image.complete) {
                    // 이미지의 위쪽이 공격 방향을 바라보도록 회전
                    if (proj.rotation !== undefined) {
                        ctx.rotate(proj.rotation + Math.PI / 2); // 이미지 위쪽이 방향을 가리키도록 90도 보정
                    }
                    
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = proj.color;
                    ctx.drawImage(proj.image, -proj.size, -proj.size, proj.size * 2, proj.size * 2);
                } else {
                    // 기본 원형 렌더링
                    ctx.fillStyle = proj.color || '#ffff00';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = proj.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, proj.size || 5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
        }
        
        ctx.restore();
    });
    
    // 폭죽 폭발 이펙트 렌더링 (파티클 시스템)
    if (window.firecrackerExplosions && Array.isArray(window.firecrackerExplosions)) {
        const dt = deltaTime || 0.016; // deltaTime이 없으면 기본값 사용
        window.firecrackerExplosions = window.firecrackerExplosions.filter(particle => {
            if (!particle) return false; // null/undefined 체크
            
            particle.lifetime = (particle.lifetime || 0) + dt;
            const progress = particle.lifetime / (particle.maxLifetime || 1);
            
            if (progress >= 1) return false;
            
            // 물리 업데이트 (중력 없이 퍼져나가기만)
            particle.x += (particle.vx || 0) * dt;
            particle.y += (particle.vy || 0) * dt;
            particle.rotation = (particle.rotation || 0) + (particle.rotationSpeed || 0) * dt;
            
            const screenX = particle.x - camera.x;
            const screenY = particle.y - camera.y;
            
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(particle.rotation);
            
            // 페이드 아웃
            ctx.globalAlpha = 1 - progress;
            
            if (particle.image && particle.image.complete) {
                // 이미지 사용
                ctx.drawImage(particle.image, -particle.size / 2, -particle.size / 2, particle.size, particle.size);
            } else {
                // 기본 렌더링
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            return true;
        });
    }
}

// UI 업데이트
function updateUI() {
    if (player) {
        // 무기 목록 표시
        const weaponListDisplay = document.getElementById('weaponListDisplay');
        if (weaponListDisplay) {
            if (player.weapons.length > 0) {
                weaponListDisplay.innerHTML = player.weapons.map(w => 
                    `<div class="weapon-slot">${w.name} (Lv.${w.level})</div>`
                ).join('');
            } else {
                weaponListDisplay.innerHTML = '<div class="weapon-slot">무기 없음</div>';
            }
        }
    }
}

// 충돌 체크
function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = (obj1.radius || obj1.size || 10) + (obj2.radius || obj2.size || 10);
    return distance < minDist;
}

// 폭발 데미지
function explodeBomb(x, y, radius, damage, targets) {
    targets.forEach(target => {
        if (!target.isDead) {
            const dx = target.x - x;
            const dy = target.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < radius + target.size) {
                target.hp -= damage;
                target.hitFlash = 1;
            }
        }
    });
}

// 게임 시작
init();
