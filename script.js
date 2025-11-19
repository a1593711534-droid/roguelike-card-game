// script.js

const gameContainer = document.getElementById('game-container');
const player1 = document.getElementById('player1');
const player2 = document.getElementById('player2');
const gamepadStatus = document.getElementById('gamepad-status');

const groundY = 0;
const moveSpeed = 8;
const jumpForce = 18;
const gravity = 1;
const attackDuration = 200;
const heavyAttackDuration = 400;

// 玩家狀態物件
const p1State = { x: 100, y: groundY, velocityY: 0, isJumping: false, isCrouching: false, isBlocking: false, isAttacking: false, isHit: false, gamepadIndex: null };
const p2State = { x: gameContainer.offsetWidth - 130, y: groundY, velocityY: 0, isJumping: false, isCrouching: false, isBlocking: false, isAttacking: false, isHit: false, gamepadIndex: null };

// --- 核心遊戲變數 ---
const keysPressed = {};
const attackMap = {
    // 鍵盤 P1
    'U': { type: 'light-punch', duration: attackDuration }, 'I': { type: 'heavy-punch', duration: heavyAttackDuration },
    'J': { type: 'light-kick', duration: attackDuration }, 'K': { type: 'heavy-kick', duration: heavyAttackDuration },
    // 鍵盤 P2 (Numpad)
    'NUMPAD4': { type: 'light-punch', duration: attackDuration }, 'NUMPAD5': { type: 'heavy-punch', duration: heavyAttackDuration },
    'NUMPAD1': { type: 'light-kick', duration: attackDuration }, 'NUMPAD2': { type: 'heavy-kick', duration: heavyAttackDuration },
};

function getOpponent(state) {
    return state === p1State ? { state: p2State, element: player2 } : { state: p1State, element: player1 };
}

// --- GAMEPAD MAPPING (Xbox Standard) ---
const GP_JUMP = 0;   // A 鍵
const GP_LP = 4;     // LB 鍵 (輕拳)
const GP_HP = 5;     // RB 鍵 (重拳)
const GP_LK = 2;     // X 鍵 (輕腳)
const GP_HK = 3;     // Y 鍵 (重腳)
const GP_BLOCK = 7;  // RT 鍵 (右扳機)
const GP_CROUCH = 13; // 方向鍵下
const GP_AXIS_X = 0; // 左搖桿 X 軸
const GP_AXIS_Y = 1; // 左搖桿 Y 軸
const GP_AXIS_THRESHOLD = 0.5; // 搖桿靈敏度閾值

// --- 遊戲循環 ---

function gameLoop() {
    handleGamepadInput();

    handleInputFromSource(p1State, player1, 'keyboard');
    handleInputFromSource(p2State, player2, 'keyboard');
    
    updatePlayer(p1State, player1);
    updatePlayer(p2State, player2);
    
    requestAnimationFrame(gameLoop);
}

// --- 手把輸入處理 ---

function handleGamepadInput() {
    const gamepads = navigator.getGamepads();
    let connectedCount = 0;

    // 重置手把分配，每次都重新檢查連線狀態
    p1State.gamepadIndex = null;
    p2State.gamepadIndex = null;

    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad && gamepad.connected && gamepad.mapping === "standard") {
            connectedCount++;
            
            let state = null;
            let element = null;

            // 分配手把給玩家 1 和 2
            if (connectedCount === 1) {
                state = p1State;
                element = player1;
            } else if (connectedCount === 2) {
                state = p2State;
                element = player2;
            }

            if (state && element) {
                state.gamepadIndex = i;
                handleInputFromSource(state, element, 'gamepad', gamepad);
            }
        }
    }
    
    gamepadStatus.textContent = connectedCount > 0 ? `已連接 ${connectedCount} 個標準手把。` : '請連接並按下任意手把按鈕以啟用。';
}


// --- 統一輸入處理函數 ---

function handleInputFromSource(state, element, source, gamepad = null) {
    const isP1 = state === p1State;

    // **如果玩家已分配手把，則忽略鍵盤輸入** (防止同時輸入衝突)
    if (source === 'keyboard' && state.gamepadIndex !== null) {
        return; 
    }
    
    // 如果是手把，但不是分配給該玩家的手把，則跳過
    if (source === 'gamepad' && (!gamepad || gamepad.index !== state.gamepadIndex)) {
        return;
    }


    // --- 1. 移動 ---
    let moveLeft = false;
    let moveRight = false;

    if (source === 'keyboard') {
        const moveLeftKey = isP1 ? 'A' : 'ArrowLeft';
        const moveRightKey = isP1 ? 'D' : 'ArrowRight';
        moveLeft = keysPressed[moveLeftKey];
        moveRight = keysPressed[moveRightKey];
    } else if (source === 'gamepad') {
        const axisX = gamepad.axes[GP_AXIS_X]; 
        const dpadLeft = gamepad.buttons[14].pressed;
        const dpadRight = gamepad.buttons[15].pressed;

        if (axisX < -GP_AXIS_THRESHOLD || dpadLeft) moveLeft = true;
        if (axisX > GP_AXIS_THRESHOLD || dpadRight) moveRight = true;
    }

    if (moveLeft) state.x = Math.max(0, state.x - moveSpeed);
    if (moveRight) state.x = Math.min(gameContainer.offsetWidth - element.offsetWidth, state.x + moveSpeed);
    
    // --- 2. 跳躍、蹲下、格擋 ---
    let jumpAction = false;
    let crouchAction = false;
    let blockAction = false;

    if (source === 'keyboard') {
        const jumpKey = isP1 ? 'W' : 'ArrowUp';
        const crouchKey = isP1 ? 'S' : 'ArrowDown';
        const blockKey = isP1 ? 'L' : 'NUMPAD0';
        
        jumpAction = keysPressed[jumpKey];
        crouchAction = keysPressed[crouchKey];
        blockAction = keysPressed[blockKey];
    } else if (source === 'gamepad') {
        const axisY = gamepad.axes[GP_AXIS_Y]; 

        jumpAction = gamepad.buttons[GP_JUMP].pressed || axisY < -GP_AXIS_THRESHOLD;
        crouchAction = gamepad.buttons[GP_CROUCH].pressed || axisY > GP_AXIS_THRESHOLD; 
        blockAction = gamepad.buttons[GP_BLOCK].value > 0.5; // RT 扳機
    }

    // 執行動作
    if (jumpAction && !state.isJumping && !state.isCrouching) {
        state.isJumping = true;
        state.velocityY = jumpForce;
    }

    state.isCrouching = crouchAction;
    if (state.isJumping) state.isCrouching = false;

    state.isBlocking = blockAction && !state.isJumping;
    if (state.isBlocking) state.isCrouching = false;
    
    // --- 3. 攻擊 (GamePad) ---
    if (source === 'gamepad' && !state.isAttacking) {
        if (gamepad.buttons[GP_LP].pressed) initiateAttack(state, element, 'light-punch', true);
        else if (gamepad.buttons[GP_HP].pressed) initiateAttack(state, element, 'heavy-punch', true);
        else if (gamepad.buttons[GP_LK].pressed) initiateAttack(state, element, 'light-kick', true);
        else if (gamepad.buttons[GP_HK].pressed) initiateAttack(state, element, 'heavy-kick', true);
    }
}


// --- 物理/渲染更新 ---

function updatePlayer(state, element) {
    // 物理 (重力)
    if (state.isJumping || state.y > groundY) {
        state.y += state.velocityY;
        state.velocityY -= gravity;
        
        if (state.y <= groundY) {
            state.y = groundY;
            state.velocityY = 0;
            state.isJumping = false;
        }
    }
    
    // 視覺狀態切換
    element.classList.toggle('crouch', state.isCrouching);
    element.classList.toggle('block', state.isBlocking);

    // 更新位置
    element.style.left = `${state.x}px`;
    element.style.bottom = `${state.y}px`;

    // 碰撞處理 (簡單推開)
    const otherPlayer = getOpponent(state);
    if (state.x < otherPlayer.state.x + otherPlayer.element.offsetWidth &&
        state.x + element.offsetWidth > otherPlayer.state.x &&
        state.y <= otherPlayer.state.y + otherPlayer.element.offsetHeight &&
        state.y + element.offsetHeight >= otherPlayer.state.y
    ) {
        if (state.x < otherPlayer.state.x) {
            state.x = otherPlayer.state.x - element.offsetWidth;
        } else {
            state.x = otherPlayer.state.x + otherPlayer.element.offsetWidth;
        }
    }
}

// --- 攻擊處理 ---

function initiateAttack(state, element, attackType) {
    if (state.isAttacking || state.isJumping) return;
    state.isAttacking = true;

    const { duration } = attackMap[attackType] || { duration: 300 }; // 處理手把攻擊沒有在 map 裡的狀況

    // 視覺回饋
    element.classList.add(attackType.replace('-','_')); // 類別名稱可能有不同，這裡簡單處理
    
    // TODO: 實現碰撞檢測和傷害邏輯

    setTimeout(() => {
        state.isAttacking = false;
        element.classList.remove(attackType.replace('-','_'));
    }, duration);
}

// --- 事件監聽器 (鍵盤) ---

document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    keysPressed[key] = true;
    
    // 處理 Numpad Code
    if (e.code.startsWith('NUMPAD')) {
        keysPressed[e.code] = true;
    }

    const attackType = attackMap[key] ? key : (attackMap[e.code] ? e.code : null);

    // 攻擊 (只處理鍵盤的攻擊輸入)
    if (attackType && !p1State.gamepadIndex && (['U', 'I', 'J', 'K'].includes(key) || key === 'U' || key === 'I' || key === 'J' || key === 'K')) {
        initiateAttack(p1State, player1, attackMap[attackType].type);
    } else if (attackType && !p2State.gamepadIndex && e.code.startsWith('NUMPAD')) {
         initiateAttack(p2State, player2, attackMap[attackType].type);
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    keysPressed[key] = false;
    
    if (e.code.startsWith('NUMPAD')) {
        keysPressed[e.code] = false;
    }
});

// 啟動遊戲
gameLoop();