// map.js - 맵 렌더링 (노란 메모장 스타일)

function renderMap(ctx, camera) {
    // 메모장 설정
    const mapWidth = 8000;  // 매우 큰 맵
    const mapHeight = 6000;
    const mapLeft = -mapWidth / 2;
    const mapTop = -mapHeight / 2;
    const mapRight = mapWidth / 2;
    const mapBottom = mapHeight / 2;
    
    // 책 표지 (흰색 테두리) - 메모장보다 크게
    const bookPadding = 100;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(
        mapLeft - bookPadding - camera.x,
        mapTop - bookPadding - camera.y,
        mapWidth + bookPadding * 2,
        mapHeight + bookPadding * 2
    );
    
    // 책 그림자 효과
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // 메모장 배경 (노란색)
    ctx.fillStyle = '#fff9c4'; // 연한 노란색 메모장
    ctx.fillRect(
        mapLeft - camera.x,
        mapTop - camera.y,
        mapWidth,
        mapHeight
    );
    
    // 그림자 초기화
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // 메모장 상단 빨간 줄 (노트 바인딩 부분)
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(
        mapLeft - camera.x,
        mapTop - camera.y,
        mapWidth,
        40
    );
    
    // 메모장 가로줄 (연한 파란색 줄)
    const lineSpacing = 60;
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.15)';
    ctx.lineWidth = 1;
    
    for (let y = mapTop + 100; y < mapBottom; y += lineSpacing) {
        const screenY = y - camera.y;
        if (screenY >= -lineSpacing && screenY <= canvas.height + lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(mapLeft - camera.x + 80, screenY);
            ctx.lineTo(mapRight - camera.x - 40, screenY);
            ctx.stroke();
        }
    }
    
    // 왼쪽 빨간 여백선 (마진 라인)
    ctx.strokeStyle = 'rgba(244, 67, 54, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mapLeft - camera.x + 80, mapTop - camera.y + 40);
    ctx.lineTo(mapLeft - camera.x + 80, mapBottom - camera.y);
    ctx.stroke();
    
    // 책 테두리 (흰색 가장자리)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.strokeRect(
        mapLeft - bookPadding - camera.x,
        mapTop - bookPadding - camera.y,
        mapWidth + bookPadding * 2,
        mapHeight + bookPadding * 2
    );
    
    // 메모장 테두리
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        mapLeft - camera.x,
        mapTop - camera.y,
        mapWidth,
        mapHeight
    );
}
