// main.js - 메인 메뉴 화면

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 카메라
let camera = {
    x: 0,
    y: 0
};

// deltaTime
let lastTime = 0;
let deltaTime = 0;

// 플레이어
let player = null;

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

// 버튼 정의 (월드 좌표 - 맵 고정)
const buttons = [
    {
        text: 'Game Start',
        x: -450,  // 월드 좌표 (맵에 고정)
        y: 200,
        width: 400,
        height: 100,
        action: () => {
            window.location.href = 'test.html';
        }
    },
    {
        text: 'Description',
        x: 450,  // 월드 좌표 (맵에 고정)
        y: 200,
        width: 400,
        height: 100,
        action: () => {
            showDescriptionPopup();
        }
    }
];

// 조작키 안내 위치 (월드 좌표)
const controlHints = [
    {
        text: 'MOVE : WASD / ←↑↓→',
        x: -300,
        y: -50
    },
    {
        text: 'CHOOSE : SPACE',
        x: 300,
        y: -50
    }
];

// 버튼과 충돌 체크 (월드 좌표)
function checkButtonCollision(player, button, camera) {
    const dx = player.x - button.x;
    const dy = player.y - button.y;
    const halfWidth = button.width / 2;
    const halfHeight = button.height / 2;
    
    return Math.abs(dx) < halfWidth + player.size && 
           Math.abs(dy) < halfHeight + player.size;
}

// 초기화
function init() {
    // 플레이어 생성 (ninja)
    player = createPlayer('ninja');
    player.x = 0;
    player.y = 0;
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// 게임 루프
function gameLoop(currentTime) {
    deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    if (deltaTime > 0.1) deltaTime = 0.1;
    
    update(deltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

// 업데이트
function update(dt) {
    if (player) {
        updatePlayerMain(player, dt, keys);
        
        // 카메라가 플레이어를 따라가도록
        camera.x = player.x;
        camera.y = player.y;
        
        // 버튼 충돌 체크 및 스페이스바 입력
        buttons.forEach(button => {
            const isColliding = checkButtonCollision(player, button, camera);
            button.isHovered = isColliding;
            
            if (isColliding && keys[' ']) {
                keys[' '] = false; // 중복 실행 방지
                button.action();
            }
        });
    }
}

// 플레이어 업데이트 (메인 메뉴용 - 체력 제외)
function updatePlayerMain(player, dt, keys) {
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
    
    // 이동
    player.vx = moveX * player.speed;
    player.vy = moveY * player.speed;
    
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    
    // 맵 경계 제한 (1600x900 - 작은 맵)
    const mapWidth = 1600;
    const mapHeight = 900;
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

// 렌더링
function render() {
    // 배경 (맵 밖 영역)
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 맵 렌더링
    renderMainMap(ctx, camera);
    
    // 제목 렌더링 (맵에 고정)
    renderTitle(ctx, camera);
    
    // 버튼 렌더링 (맵에 고정)
    renderButtons(ctx, camera);
    
    // 조작키 안내 렌더링 (맵에 고정)
    renderControlHints(ctx, camera);
    
    // 플레이어 렌더링 (화면 중앙 고정)
    if (player) {
        renderPlayerMain(player, ctx, camera);
    }
}

// 메인 맵 렌더링
function renderMainMap(ctx, camera) {
    const mapWidth = 1600;
    const mapHeight = 900;
    const mapLeft = -mapWidth / 2;
    const mapTop = -mapHeight / 2;
    
    // 월드 좌표를 화면 좌표로 변환
    const screenX = mapLeft - camera.x + canvas.width / 2;
    const screenY = mapTop - camera.y + canvas.height / 2;
    
    // 메모장 배경 (노란색)
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(screenX, screenY, mapWidth, mapHeight);
    
    // 메모장 상단 빨간 줄
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(screenX, screenY, mapWidth, 30);
    
    // 줄무늬 (가로선)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    for (let y = mapTop + 80; y < mapTop + mapHeight; y += 40) {
        ctx.beginPath();
        ctx.moveTo(screenX, y - camera.y + canvas.height / 2);
        ctx.lineTo(screenX + mapWidth, y - camera.y + canvas.height / 2);
        ctx.stroke();
    }
}

// 제목 렌더링 (맵에 고정 - 월드 좌표)
function renderTitle(ctx, camera) {
    const titleWorldY = -280; // 맵 상단
    const titleScreenX = 0 - camera.x + canvas.width / 2;
    const titleScreenY = titleWorldY - camera.y + canvas.height / 2;
    
    ctx.save();
    
    // 제목 텍스트만
    ctx.font = "bold 80px 'OneStoreMobilePop', sans-serif";
    ctx.fillStyle = '#ff7b00ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('Note Survive', titleScreenX, titleScreenY);
    
    ctx.restore();
}

// 버튼 렌더링 (맵에 고정 - 월드 좌표)
function renderButtons(ctx, camera) {
    buttons.forEach(button => {
        // 월드 좌표를 화면 좌표로 변환
        const screenX = button.x - camera.x + canvas.width / 2;
        const screenY = button.y - camera.y + canvas.height / 2;
        
        ctx.save();
        
        // 텍스트만 렌더링
        ctx.font = "bold 48px 'OneStoreMobilePop', sans-serif";
        ctx.fillStyle = button.isHovered ? '#ffa500' : '#000000'; // 호버 시 주황색
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.text, screenX, screenY);
        
        ctx.restore();
    });
}

// 조작키 안내 렌더링 (맵에 고정 - 월드 좌표)
function renderControlHints(ctx, camera) {
    controlHints.forEach(hint => {
        // 월드 좌표를 화면 좌표로 변환
        const screenX = hint.x - camera.x + canvas.width / 2;
        const screenY = hint.y - camera.y + canvas.height / 2;
        
        ctx.save();
        
        // OngleIpSeaBreeze 폰트 사용
        ctx.font = "32px 'OngleIpSeaBreeze', sans-serif";
        ctx.fillStyle = '#555555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hint.text, screenX, screenY);
        
        ctx.restore();
    });
}

// 플레이어 렌더링 (메인 메뉴용 - 체력바 제외)
function renderPlayerMain(player, ctx, camera) {
    const screenX = canvas.width / 2;
    const screenY = canvas.height / 2;
    
    ctx.save();
    
    ctx.translate(screenX, screenY);
    
    // 좌우 반전
    if (player.facing > 0) {
        ctx.scale(-1, 1);
    }
    
    // 통통 튀는 효과
    let bounceY = 0;
    if (player.animState === 'run') {
        bounceY = -Math.abs(Math.sin(player.animTimer * 3)) * 8;
    }
    
    ctx.translate(0, bounceY);
    
    // 플레이어 이미지
    if (typeof weaponImages !== 'undefined' && weaponImages.player && weaponImages.player.complete) {
        const size = player.size * 2.5;
        ctx.drawImage(weaponImages.player, -size / 2, -size / 2, size, size);
    } else {
        // 기본 렌더링
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(0, 0, player.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    ctx.restore();
}

// 게임 시작
init();

// 설명 팝업 열기
function showDescriptionPopup() {
    document.getElementById('descriptionPopup').classList.add('show');
    document.getElementById('overlay').classList.add('show');
}

// 설명 팝업 닫기
function closeDescriptionPopup() {
    document.getElementById('descriptionPopup').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
}
