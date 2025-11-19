// --- 1. 資料結構 ---

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
    // 敵人狀態
    enemy: {
        name: "史萊姆",
        maxHp: 10,
        currentHp: 10,
    },
};

// --- 2. 核心遊戲邏輯 ---

/** 更新畫面上顯示的狀態數字 */
function updateUI() {
    document.getElementById('player-hp').querySelector('span').textContent = `${gameState.player.currentHp} / ${gameState.player.maxHp}`;
    document.getElementById('player-block').querySelector('span').textContent = gameState.player.block;
    document.getElementById('player-energy').querySelector('span').textContent = `${gameState.player.energy} / ${gameState.player.maxEnergy}`;
    document.getElementById('enemy-hp').querySelector('span').textContent = `${gameState.enemy.currentHp} / ${gameState.enemy.maxHp}`;
}

/** 在訊息區記錄事件 */
function logMessage(msg) {
    const log = document.getElementById('message-log');
    log.innerHTML += `<div>> ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

/** 洗牌並抽牌 */
function drawCards(count = 5) {
    // 確保牌組不為空，如果空了，將棄牌堆洗回牌組
    if (gameState.player.deck.length < count) {
        logMessage("洗牌...");
        // 將棄牌堆的牌移動到牌組
        gameState.player.deck = gameState.player.deck.concat(shuffle(gameState.player.discard));
        gameState.player.discard = [];
    }
    
    // 抽牌
    for (let i = 0; i < count; i++) {
        if (gameState.player.deck.length === 0) break; // 牌真的抽完了
        const cardId = gameState.player.deck.pop();
        gameState.player.hand.push(cardId);
    }
    renderHand();
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

        cardElement.innerHTML = `
            <div class="card-title">${cardData.name} <span class="card-cost">${cardData.cost}</span></div>
            <div class="card-desc">${cardData.description}</div>
        `;
        handZone.appendChild(cardElement);
    });
}

/** 打出卡牌的邏輯 */
function playCard(cardId, index) {
    const cardData = CARD_DEFINITIONS[cardId];
    
    // 檢查能量
    if (gameState.player.energy < cardData.cost) {
        logMessage(`能量不足！打出 ${cardData.name} 需要 ${cardData.cost} 點能量。`);
        return;
    }

    // 執行卡牌效果
    logMessage(`玩家打出 ${cardData.name}。`);
    gameState.player.energy -= cardData.cost;

    if (cardData.damage) {
        let actualDamage = cardData.damage;
        // 傷害先扣格擋
        if (gameState.player.block > 0) {
            logMessage(`傷害被格擋吸收，格擋值 ${gameState.player.block}`);
            // 簡化：不計算穿透，只顯示傷害
        }
        gameState.enemy.currentHp -= actualDamage;
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

    checkGameStatus();
}

/** 敵人回合的行動 */
function enemyTurn() {
    logMessage(`--- 敵人回合開始 ---`);
    
    // 敵人隨機行動：簡化為固定攻擊 3 點傷害
    const enemyDamage = 3;
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
        logMessage(`${gameState.enemy.name} 造成 ${effectiveDamage} 點傷害。`);
    } else {
         logMessage(`${gameState.enemy.name} 攻擊，但被完全格擋。`);
    }
    
    // 重置玩家格擋 (格擋只持續一回合)
    if (gameState.player.block < 0) gameState.player.block = 0;
    
    updateUI();
    checkGameStatus();
    
    logMessage(`--- 玩家回合開始 ---`);
    startTurn(); // 敵人回合結束，開始玩家新回合
}

/** 結束回合按鈕觸發 */
function endTurn() {
    // 棄掉所有手牌
    gameState.player.discard = gameState.player.discard.concat(gameState.player.hand);
    gameState.player.hand = [];
    renderHand();
    
    // 敵人行動
    enemyTurn();
}

/** 檢查戰鬥勝負 */
function checkGameStatus() {
    if (gameState.enemy.currentHp <= 0) {
        logMessage(`*** 勝利！您擊敗了 ${gameState.enemy.name}！ ***`);
        // 這裡可以加入 roguelike 的獎勵/升級邏輯
        document.getElementById('end-turn-btn').disabled = true;
    } else if (gameState.player.currentHp <= 0) {
        logMessage(`*** 失敗！遊戲結束！ ***`);
        document.getElementById('end-turn-btn').disabled = true;
    }
}

/** 新回合開始 */
function startTurn() {
    // 重置能量和格擋
    gameState.player.energy = gameState.player.maxEnergy;
    gameState.player.block = 0;
    
    // 抽牌
    drawCards(5);
    updateUI();
}

// --- 4. 遊戲初始化 ---
function initializeGame() {
    // 確保牌組是洗好的
    gameState.player.deck = shuffle(gameState.player.deck); 
    startTurn();
}

initializeGame();