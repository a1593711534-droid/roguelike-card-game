// --- 1. 資料結構與定義 ---

// 卡牌定義
const CARD_DEFINITIONS = {
    strike: { name: "攻擊", cost: 1, type: "Attack", damage: 6, description: "造成 6 點傷害。" },
    defend: { name: "防禦", cost: 1, type: "Skill", block: 5, description: "獲得 5 點格擋。" },
    bash: { name: "猛擊", cost: 2, type: "Attack", damage: 10, description: "造成 10 點傷害。" },
};

// 初始卡組
const INITIAL_DECK = [
    'strike', 'strike', 'strike', 'strike', 'strike',
    'defend', 'defend', 'defend', 'defend', 'defend'
];

// 敵人數據
const ENEMY_DEFINITIONS = [
    { name: "瘦弱史萊姆", maxHp: 8, attack: 3 },
    { name: "普通史萊姆", maxHp: 15, attack: 5 },
    { name: "巨型史萊姆", maxHp: 25, attack: 7 }
];

// 遊戲狀態
let gameState = {
    // 玩家狀態
    player: {
        maxHp: 20,
        currentHp: 20,
        energy: 3,
        maxEnergy: 3,
        block: 0,
        deck: [...INITIAL_DECK], // 牌組 (Deck)
        hand: [], // 手牌 (Hand)
        discard: [], // 棄牌堆 (Discard Pile)
    },
    // 敵人狀態 (會動態更新)
    enemy: null, 
    // 戰鬥狀態
    isCombatActive: false, // 修正：判斷戰鬥是否正在進行
    currentFloor: 1, // 肉鴿關卡數
};

// --- 2. 核心遊戲邏輯 ---

/** 更新畫面上顯示的狀態數字 */
function updateUI() {
    document.getElementById('player-hp').querySelector('span').textContent = `${gameState.player.currentHp} / ${gameState.player.maxHp}`;
    document.getElementById('player-block').querySelector('span').textContent = gameState.player.block;
    document.getElementById('player-energy').querySelector('span').textContent = `${gameState.player.energy} / ${gameState.player.maxEnergy}`;
    
    // 更新敵人狀態
    const enemyZone = document.getElementById('enemy-zone');
    if (gameState.enemy) {
        enemyZone.querySelector('h3').textContent = `敵人 (${gameState.enemy.name})`;
        document.getElementById('enemy-hp').querySelector('span').textContent = `${gameState.enemy.currentHp} / ${gameState.enemy.maxHp}`;
        enemyZone.style.display = 'block';
    } else {
        enemyZone.style.display = 'none'; // 戰鬥結束時隱藏敵人
    }
}

/** 在訊息區記錄事件 */
function logMessage(msg) {
    const log = document.getElementById('message-log');
    log.innerHTML += `<div>> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

/** 實作 Fisher-Yates 洗牌演算法 */
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

/** 洗牌並抽牌 */
function drawCards(count = 5) {
    // 將手牌和棄牌堆合併洗回牌組
    const replenishDeck = () => {
        logMessage("牌堆已空，洗牌...");
        gameState.player.deck = shuffle(gameState.player.discard);
        gameState.player.discard = [];
    };

    // 抽牌
    for (let i = 0; i < count; i++) {
        if (gameState.player.deck.length === 0) {
            if (gameState.player.discard.length > 0) {
                replenishDeck();
            } else {
                break; // 牌真的抽完了
            }
        }
        const cardId = gameState.player.deck.pop();
        gameState.player.hand.push(cardId);
    }
    renderHand();
}

/** 渲染手牌到畫面上 */
function renderHand() {
    const handZone = document.getElementById('hand-zone');
    handZone.innerHTML = '';
    
    gameState.player.hand.forEach((cardId, index) => {
        const cardData = CARD_DEFINITIONS[cardId];
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = cardId;
        cardElement.dataset.index = index;
        cardElement.onclick = () => playCard(cardId, index);

        // 檢查能量不足時的樣式
        if (gameState.player.energy < cardData.cost) {
             cardElement.style.opacity = '0.5';
             cardElement.onclick = () => logMessage(`能量不足！打出 ${cardData.name} 需要 ${cardData.cost} 點能量。`);
        }

        cardElement.innerHTML = `
            <div class="card-title">${cardData.name} <span class="card-cost">${cardData.cost}</span></div>
            <div class="card-desc">${cardData.description}</div>
        `;
        handZone.appendChild(cardElement);
    });
}

/** 打出卡牌的邏輯 */
function playCard(cardId, index) {
    if (!gameState.isCombatActive) return; // 戰鬥未進行，不能打牌

    const cardData = CARD_DEFINITIONS[cardId];
    
    // 檢查能量
    if (gameState.player.energy < cardData.cost) return;

    // 執行卡牌效果
    logMessage(`玩家打出 ${cardData.name}。`);
    gameState.player.energy -= cardData.cost;

    if (cardData.damage) {
        let actualDamage = cardData.damage;
        // 傷害先扣格擋
        
        gameState.enemy.currentHp -= actualDamage; // 敵人沒有格擋，直接扣血

        // 修正：確保敵人血量不會低於 0
        gameState.enemy.currentHp = Math.max(0, gameState.enemy.currentHp);

        logMessage(`對 ${gameState.enemy.name} 造成 ${actualDamage} 點傷害。`);
    }

    if (cardData.block) {
        gameState.player.block += cardData.block;
        logMessage(`獲得 ${cardData.block} 點格擋。`);
    }

    // 將牌從手牌移到棄牌堆
    gameState.player.hand.splice(index, 1);
    gameState.player.discard.push(cardId);

    updateUI();
    renderHand();

    // 每次打完牌都要檢查勝負
    checkGameStatus();
}

/** 敵人回合的行動 */
function enemyTurn() {
    if (!gameState.isCombatActive) return;

    document.getElementById('end-turn-btn').disabled = true; // 鎖定按鈕，防止重複點擊
    logMessage(`--- 敵人回合開始 ---`);
    
    // 敵人行動：使用它的固定攻擊力
    const enemyDamage = gameState.enemy.attack;
    let effectiveDamage = enemyDamage;
    
    // 計算格擋
    if (gameState.player.block > 0) {
        const damageBlocked = Math.min(enemyDamage, gameState.player.block);
        effectiveDamage = enemyDamage - damageBlocked;
        gameState.player.block -= damageBlocked;
        logMessage(`敵人的 ${enemyDamage} 點攻擊被格擋吸收 ${damageBlocked} 點。`);
    }
    
    if (effectiveDamage > 0) {
        gameState.player.currentHp -= effectiveDamage;
        // 修正：確保玩家血量不會低於 0
        gameState.player.currentHp = Math.max(0, gameState.player.currentHp);
        logMessage(`${gameState.enemy.name} 造成 ${effectiveDamage} 點傷害。`);
    } else {
         logMessage(`${gameState.enemy.name} 攻擊，但被完全格擋。`);
    }
    
    // 重置玩家格擋 (格擋只持續一回合)
    gameState.player.block = 0;
    
    updateUI();
    
    // 檢查敵人行動後的勝負
    if (checkGameStatus()) {
        document.getElementById('end-turn-btn').disabled = false; // 如果遊戲結束，會由 checkGameStatus 處理按鈕
        return; 
    }

    logMessage(`--- 玩家回合開始 ---`);
    startTurn(); // 敵人回合結束，開始玩家新回合
}

/** 結束回合按鈕觸發 */
function endTurn() {
    if (!gameState.isCombatActive) return;

    // 將手牌移到棄牌堆
    gameState.player.discard = gameState.player.discard.concat(gameState.player.hand);
    gameState.player.hand = [];
    renderHand();
    
    // 敵人行動
    enemyTurn();
}

/** 檢查戰鬥勝負，返回 true 表示戰鬥結束 */
function checkGameStatus() {
    if (gameState.enemy.currentHp <= 0) {
        logMessage(`*** 勝利！您擊敗了 ${gameState.enemy.name}！ ***`);
        gameState.isCombatActive = false;
        
        // 讓結束回合按鈕變成下一關按鈕
        const btn = document.getElementById('end-turn-btn');
        btn.textContent = '獲取獎勵並前往下一關';
        btn.onclick = () => advanceToNextFloor();
        btn.disabled = false; 

        return true; // 戰鬥結束
    } else if (gameState.player.currentHp <= 0) {
        logMessage(`*** 失敗！遊戲結束！ ***`);
        gameState.isCombatActive = false;
        
        // 讓結束回合按鈕變成重新開始按鈕
        const btn = document.getElementById('end-turn-btn');
        btn.textContent = '重新開始 (重新整理)';
        btn.onclick = () => window.location.reload();
        btn.disabled = false;

        return true; // 戰鬥結束
    }
    return false; // 戰鬥繼續
}

/** 玩家新回合開始 */
function startTurn() {
    // 重置能量和格擋
    gameState.player.energy = gameState.player.maxEnergy;
    // 格擋已在 enemyTurn 結束時歸零

    // 抽牌
    drawCards(5);
    updateUI();
    document.getElementById('end-turn-btn').disabled = false; // 恢復按鈕
    document.getElementById('end-turn-btn').onclick = endTurn; // 確保點擊是結束回合
}

/** 進入下一關的邏輯 (肉鴿元素) */
function advanceToNextFloor() {
    gameState.currentFloor++;
    logMessage(`--- 進入第 ${gameState.currentFloor} 關 ---`);
    
    // 清空手牌、棄牌堆，並將所有牌洗回牌組
    gameState.player.deck = gameState.player.deck.concat(gameState.player.hand, gameState.player.discard);
    gameState.player.hand = [];
    gameState.player.discard = [];
    gameState.player.deck = shuffle(gameState.player.deck);

    // 隨機選擇一個新的敵人 (隨著關卡數增加，選擇更強的敵人)
    let enemyIndex = Math.min(Math.floor(Math.random() * ENEMY_DEFINITIONS.length), ENEMY_DEFINITIONS.length - 1);

    // 關卡數越高，敵人越強 (簡單的難度遞增)
    if (gameState.currentFloor > 3) {
        enemyIndex = Math.min(enemyIndex + 1, ENEMY_DEFINITIONS.length - 1);
    }

    const enemyData = ENEMY_DEFINITIONS[enemyIndex];

    // 初始化新的敵人
    gameState.enemy = {
        name: enemyData.name,
        maxHp: enemyData.maxHp,
        currentHp: enemyData.maxHp,
        attack: enemyData.attack,
    };
    
    // 重設按鈕
    const btn = document.getElementById('end-turn-btn');
    btn.textContent = '結束回合';
    btn.onclick = endTurn;

    // 開始新的戰鬥
    startCombat();
}

/** 戰鬥初始化 */
function startCombat() {
    gameState.isCombatActive = true;
    logMessage(`您遭遇了 ${gameState.enemy.name}！戰鬥開始。`);
    startTurn();
}

// --- 4. 遊戲初始化 ---
function initializeGame() {
    // 確保牌組是洗好的
    gameState.player.deck = shuffle(gameState.player.deck); 
    
    // 從第一關開始
    advanceToNextFloor();
}

initializeGame();