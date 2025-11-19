// --- 0. 版本資訊 ---
// 版本號為 V1.0.3
const GAME_VERSION = "V1.0.3 - 修正起始關卡、加入獎勵選擇與牌庫狀態顯示 (2025/11/19)";


// --- 1. 資料結構與定義 ---

// 可作為獎勵的新卡牌
const NEW_CARDS = [
    { id: "heavy_strike", name: "重擊", cost: 2, type: "Attack", damage: 13, description: "造成 13 點傷害。" },
    { id: "shield_up", name: "堅盾", cost: 1, type: "Skill", block: 8, description: "獲得 8 點格擋。" },
    { id: "double_hit", name: "連擊", cost: 1, type: "Attack", damage: 3, repeat: 2, description: "造成 3 點傷害兩次。" },
    { id: "draw_two", name: "抽二", cost: 0, type: "Skill", draw: 2, description: "抽 2 張牌。" },
];

// 將新卡牌加入到 CARD_DEFINITIONS
const CARD_DEFINITIONS = {
    strike: { name: "攻擊", cost: 1, type: "Attack", damage: 6, description: "造成 6 點傷害。" },
    defend: { name: "防禦", cost: 1, type: "Skill", block: 5, description: "獲得 5 點格擋。" },
    bash: { name: "猛擊", cost: 2, type: "Attack", damage: 10, description: "造成 10 點傷害。" },
    // 新增卡牌定義
    ...NEW_CARDS.reduce((acc, card) => ({ ...acc, [card.id]: card }), {}),
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
    isCombatActive: false, 
    currentFloor: 0, // 修正：設為 0，讓初始化時進入第 1 關
};

// --- 2. 核心遊戲邏輯 ---

/** 渲染敵人意圖 (顯示傷害數字) */
function renderIntent() {
    const intentDisplay = document.getElementById('enemy-intent');
    
    // 這裡簡化：敵人永遠是攻擊
    if (gameState.enemy && gameState.isCombatActive) {
        // 顯示為 X 點傷害
        intentDisplay.innerHTML = `⚔️ ${gameState.enemy.attack}`; 
        intentDisplay.title = `敵人將造成 ${gameState.enemy.attack} 點傷害`;
    } else {
        intentDisplay.innerHTML = '';
        intentDisplay.title = '';
    }
}

/** 更新牌庫狀態顯示 */
function updateDeckStatus() {
    // 總牌數是所有牌堆的總和
    const totalCards = gameState.player.deck.length + gameState.player.hand.length + gameState.player.discard.length;
    
    document.getElementById('total-cards').querySelector('span').textContent = totalCards;
    document.getElementById('draw-pile').querySelector('span').textContent = gameState.player.deck.length;
    document.getElementById('discard-pile').querySelector('span').textContent = gameState.player.discard.length;
}


/** 更新畫面上顯示的狀態數字 */
function updateUI() {
    document.getElementById('player-hp').querySelector('span').textContent = `${gameState.player.currentHp} / ${gameState.player.maxHp}`;
    document.getElementById('player-block').querySelector('span').textContent = gameState.player.block;
    document.getElementById('player-energy').querySelector('span').textContent = `${gameState.player.energy} / ${gameState.player.maxEnergy}`;
    
    // 更新敵人狀態
    const enemyZone = document.getElementById('enemy-zone');
    if (gameState.enemy) {
        enemyZone.querySelector('h3').textContent = `敵人 (${gameState.enemy.name}) - 第 ${gameState.currentFloor} 關`;
        document.getElementById('enemy-hp').querySelector('span').textContent = `${gameState.enemy.currentHp} / ${gameState.enemy.maxHp}`;
        enemyZone.style.display = 'block';
    } else {
        enemyZone.style.display = 'none'; // 戰鬥結束時隱藏敵人
    }
    
    renderIntent(); 
    updateDeckStatus(); // 更新牌庫狀態
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
        [array[currentIndex], array[randomIndex]] = [array[currentIndex], array[randomIndex]];
    }
    return array;
}

/** 洗牌並抽牌 */
function drawCards(count = 5) {
    const replenishDeck = () => {
        logMessage("牌堆已空，洗牌...");
        gameState.player.deck = shuffle(gameState.player.discard);
        gameState.player.discard = [];
    };

    for (let i = 0; i < count; i++) {
        if (gameState.player.deck.length === 0) {
            if (gameState.player.discard.length > 0) {
                replenishDeck();
            } else {
                break; 
            }
        }
        const cardId = gameState.player.deck.pop();
        gameState.player.hand.push(cardId);
    }
    renderHand();
}

/** 渲染手牌到畫面上 */
function renderCard(cardId, index, onClickAction, containerId = 'hand-zone') {
    const cardData = CARD_DEFINITIONS[cardId];
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.cardId = cardId;
    cardElement.dataset.index = index;
    
    if (onClickAction) {
        cardElement.onclick = onClickAction;
    } else {
        cardElement.style.cursor = 'default';
        cardElement.style.transform = 'none';
    }

    // 檢查能量不足時的樣式
    if (containerId === 'hand-zone') {
        if (gameState.player.energy < cardData.cost) {
             cardElement.style.opacity = '0.5';
             cardElement.onclick = () => logMessage(`能量不足！打出 ${cardData.name} 需要 ${cardData.cost} 點能量。`);
        }
    }
    
    // 處理連擊卡的描述
    const description = cardData.repeat 
        ? `造成 ${cardData.damage} 點傷害 ${cardData.repeat} 次。` 
        : cardData.description;

    cardElement.innerHTML = `
        <div class="card-title">${cardData.name} <span class="card-cost">${cardData.cost}</span></div>
        <div class="card-desc">${description}</div>
    `;
    document.getElementById(containerId).appendChild(cardElement);
}

function renderHand() {
    const handZone = document.getElementById('hand-zone');
    handZone.innerHTML = '';
    
    gameState.player.hand.forEach((cardId, index) => {
        const playAction = () => playCard(cardId, index);
        renderCard(cardId, index, playAction, 'hand-zone');
    });
}

/** 打出卡牌的邏輯 */
function playCard(cardId, index) {
    if (!gameState.isCombatActive) return; 

    const cardData = CARD_DEFINITIONS[cardId];
    
    if (gameState.player.energy < cardData.cost) return;

    logMessage(`玩家打出 ${cardData.name}。`);
    gameState.player.energy -= cardData.cost;

    // 傷害處理
    if (cardData.damage) {
        const attacks = cardData.repeat || 1;
        for (let i = 0; i < attacks; i++) {
            gameState.enemy.currentHp -= cardData.damage;
            gameState.enemy.currentHp = Math.max(0, gameState.enemy.currentHp);
            logMessage(`對 ${gameState.enemy.name} 造成 ${cardData.damage} 點傷害。`);
            if (gameState.enemy.currentHp === 0) break; // 如果敵人被打死，停止連擊
        }
    }

    // 格擋處理
    if (cardData.block) {
        gameState.player.block += cardData.block;
        logMessage(`獲得 ${cardData.block} 點格擋。`);
    }

    // 抽牌處理
    if (cardData.draw) {
        logMessage(`抽了 ${cardData.draw} 張牌。`);
        drawCards(cardData.draw);
    }

    // 將牌從手牌移到棄牌堆
    gameState.player.hand.splice(index, 1);
    gameState.player.discard.push(cardId);

    updateUI();
    renderHand();

    checkGameStatus();
}

/** 敵人回合的行動 (不變) */
function enemyTurn() {
    if (!gameState.isCombatActive) return;

    document.getElementById('end-turn-btn').disabled = true; 
    logMessage(`--- 敵人回合開始 ---`);
    
    const enemyDamage = gameState.enemy.attack;
    let effectiveDamage = enemyDamage;
    
    if (gameState.player.block > 0) {
        const damageBlocked = Math.min(enemyDamage, gameState.player.block);
        effectiveDamage = enemyDamage - damageBlocked;
        gameState.player.block -= damageBlocked;
        logMessage(`敵人的 ${enemyDamage} 點攻擊被格擋吸收 ${damageBlocked} 點。`);
    }
    
    if (effectiveDamage > 0) {
        gameState.player.currentHp -= effectiveDamage;
        gameState.player.currentHp = Math.max(0, gameState.player.currentHp);
        logMessage(`${gameState.enemy.name} 造成 ${effectiveDamage} 點傷害。`);
    } else {
         logMessage(`${gameState.enemy.name} 攻擊，但被完全格擋。`);
    }
    
    gameState.player.block = 0;
    
    updateUI();
    
    if (checkGameStatus()) {
        document.getElementById('end-turn-btn').disabled = false;
        return; 
    }

    logMessage(`--- 玩家回合開始 ---`);
    startTurn(); 
}

/** 結束回合按鈕觸發 (不變) */
function endTurn() {
    if (!gameState.isCombatActive) return;

    gameState.player.discard = gameState.player.discard.concat(gameState.player.hand);
    gameState.player.hand = [];
    renderHand();
    
    enemyTurn();
}

/** 檢查戰鬥勝負，返回 true 表示戰鬥結束 */
function checkGameStatus() {
    if (gameState.enemy.currentHp <= 0) {
        logMessage(`*** 勝利！您擊敗了 ${gameState.enemy.name}！ ***`);
        gameState.isCombatActive = false;
        
        // 觸發獎勵選擇
        showReward();

        // 移除意圖顯示
        renderIntent(); 

        return true; 
    } else if (gameState.player.currentHp <= 0) {
        logMessage(`*** 失敗！遊戲結束！ ***`);
        gameState.isCombatActive = false;
        
        const btn = document.getElementById('end-turn-btn');
        btn.textContent = '重新開始 (重新整理)';
        btn.onclick = () => window.location.reload();
        btn.disabled = false;

        renderIntent(); 

        return true; 
    }
    return false; 
}

/** 玩家新回合開始 (不變) */
function startTurn() {
    gameState.player.energy = gameState.player.maxEnergy;

    drawCards(5);
    updateUI();
    document.getElementById('end-turn-btn').disabled = false;
    document.getElementById('end-turn-btn').onclick = endTurn;
}

/** 進入下一關的邏輯 (在選擇獎勵後呼叫) */
function advanceToNextFloor() {
    gameState.currentFloor++;
    logMessage(`--- 進入第 ${gameState.currentFloor} 關 ---`);
    
    // 清空手牌、棄牌堆，並將所有牌洗回牌組
    gameState.player.deck = gameState.player.deck.concat(gameState.player.hand, gameState.player.discard);
    gameState.player.hand = [];
    gameState.player.discard = [];
    gameState.player.deck = shuffle(gameState.player.deck);

    // 根據關卡數決定敵人強度
    let enemyIndex = 0;
    if (gameState.currentFloor <= 3) {
        enemyIndex = 0; // 瘦弱史萊姆
    } else if (gameState.currentFloor <= 6) {
        enemyIndex = 1; // 普通史萊姆
    } else {
        enemyIndex = 2; // 巨型史萊姆
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
    btn.disabled = false;

    // 開始新的戰鬥
    startCombat();
}

/** 戰鬥初始化 (不變) */
function startCombat() {
    gameState.isCombatActive = true;
    logMessage(`您遭遇了 ${gameState.enemy.name}！戰鬥開始。`);
    startTurn();
}

// --- 3. 牌庫/獎勵功能 ---

/** 顯示三張獎勵卡牌供玩家選擇 */
function showReward() {
    const rewardPopup = document.getElementById('reward-popup');
    const container = document.getElementById('reward-cards-container');
    container.innerHTML = '';
    
    // 隨機從 NEW_CARDS 中選出 3 張不同的卡牌 ID
    const allNewCardIds = NEW_CARDS.map(c => c.id);
    const shuffledIds = shuffle([...allNewCardIds]);
    const rewardCardIds = shuffledIds.slice(0, 3);
    
    rewardCardIds.forEach((cardId) => {
        const selectAction = () => selectRewardCard(cardId);
        // 使用 renderCard 函數來渲染獎勵卡牌
        renderCard(cardId, -1, selectAction, 'reward-cards-container');
    });

    rewardPopup.style.display = 'flex';
}

/** 玩家選擇獎勵卡牌 */
function selectRewardCard(cardId) {
    gameState.player.deck.push(cardId);
    logMessage(`您選擇了 "${CARD_DEFINITIONS[cardId].name}"，它已加入您的牌組！`);
    
    document.getElementById('reward-popup').style.display = 'none';
    
    // 立即進入下一關
    advanceToNextFloor();
}

/** 顯示牌庫檢視視窗 */
function viewDeck() {
    const deckViewPopup = document.getElementById('deck-view-popup');
    const deckContainer = document.getElementById('deck-view-deck');
    const discardContainer = document.getElementById('deck-view-discard');
    
    deckContainer.innerHTML = '';
    discardContainer.innerHTML = '';

    // 顯示牌組 (Draw Pile)
    gameState.player.deck.forEach((cardId) => {
        // 在檢視模式下，onClickAction 為 null
        renderCard(cardId, -1, null, 'deck-view-deck'); 
    });

    // 顯示棄牌堆 (Discard Pile)
    gameState.player.discard.forEach((cardId) => {
        renderCard(cardId, -1, null, 'deck-view-discard');
    });

    deckViewPopup.style.display = 'flex';
}

/** 關閉牌庫檢視視窗 */
function closeDeckView() {
    document.getElementById('deck-view-popup').style.display = 'none';
}


// --- 4. 遊戲初始化 ---
function initializeGame() {
    // 顯示版本資訊
    document.getElementById('game-version').textContent = `版本: ${GAME_VERSION}`;
    
    // 確保牌組是洗好的
    gameState.player.deck = shuffle(gameState.player.deck); 
    
    // 修正：從這裡開始進入第 1 關
    advanceToNextFloor();
}

initializeGame();