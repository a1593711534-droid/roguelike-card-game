// --- 遊戲數據與狀態 ---
const GAME_STATE = {
    player: { maxHp: 50, hp: 50, energy: 3, maxEnergy: 3, block: 0 },
    enemy: { maxHp: 60, hp: 60, intent: { type: 'attack', value: 10 } },
    masterDeck: [],   // 總牌庫
    drawPile: [],     // 抽牌堆
    hand: [],         // 手牌
    discardPile: [],  // 棄牌堆
    turn: 1
};

// 卡牌資料庫
const CARD_DATABASE = [
    { id: 'strike', name: '打擊', type: 'attack', cost: 1, value: 6, desc: '造成 6 點傷害' },
    { id: 'defend', name: '防禦', type: 'skill', cost: 1, value: 5, desc: '獲得 5 點護甲' },
    { id: 'bash', name: '痛擊', type: 'attack', cost: 2, value: 10, desc: '造成 10 點傷害' },
    { id: 'iron_wave', name: '鐵斬波', type: 'attack', cost: 1, value: 5, block: 5, desc: '造成 5 點傷害，獲得 5 點護甲' },
    { id: 'anger', name: '憤怒', type: 'attack', cost: 0, value: 4, desc: '造成 4 點傷害' },
    { id: 'heavy_blade', name: '重刃', type: 'attack', cost: 2, value: 14, desc: '造成 14 點傷害' },
    { id: 'shrug', name: '聳肩', type: 'skill', cost: 1, value: 8, desc: '獲得 8 點護甲' },
    { id: 'meditate', name: '冥想', type: 'skill', cost: 0, value: 0, desc: '回復 1 點能量', effect: 'energy' }
];

// --- 初始化 ---
window.onload = () => {
    initGame();
    
    // 綁定按鈕事件
    document.getElementById('end-turn-btn').onclick = endTurn;
    document.getElementById('view-deck-btn').onclick = () => showOverlay(GAME_STATE.masterDeck, '總牌庫');
    document.getElementById('draw-pile').onclick = () => showOverlay(GAME_STATE.drawPile, '抽牌堆 (順序隨機)');
    document.getElementById('discard-pile').onclick = () => showOverlay(GAME_STATE.discardPile, '棄牌堆');
    document.getElementById('close-overlay').onclick = hideOverlay;
    document.getElementById('skip-reward').onclick = startNextBattle;
};

function initGame() {
    // 初始牌組
    GAME_STATE.masterDeck = [
        {...getCard('strike')}, {...getCard('strike')}, {...getCard('strike')}, {...getCard('strike')},
        {...getCard('defend')}, {...getCard('defend')}, {...getCard('defend')}, {...getCard('bash')}
    ];
    startBattle();
}

function getCard(id) {
    return CARD_DATABASE.find(c => c.id === id);
}

// --- 戰鬥流程 ---
function startBattle() {
    // 重置狀態
    GAME_STATE.player.hp = GAME_STATE.player.maxHp; // 簡單起見，每次滿血
    GAME_STATE.player.block = 0;
    GAME_STATE.player.energy = GAME_STATE.player.maxEnergy;
    GAME_STATE.enemy.hp = GAME_STATE.enemy.maxHp;
    
    // 洗牌
    GAME_STATE.drawPile = shuffle([...GAME_STATE.masterDeck]);
    GAME_STATE.discardPile = [];
    GAME_STATE.hand = [];
    
    updateStatsUI();
    updateEnemyIntent();
    
    // 第一回合抽牌
    drawCards(5);
    log("戰鬥開始！遭遇敵人。");
}

function startTurn() {
    GAME_STATE.player.energy = GAME_STATE.player.maxEnergy;
    GAME_STATE.player.block = 0; // 回合開始護甲歸零
    drawCards(5);
    updateStatsUI();
    document.getElementById('end-turn-btn').disabled = false;
}

function endTurn() {
    document.getElementById('end-turn-btn').disabled = true;
    
    // 1. 棄掉所有手牌
    while(GAME_STATE.hand.length > 0) {
        discardCard(0);
    }
    
    // 2. 敵人行動
    setTimeout(() => {
        enemyAction();
        // 3. 檢查是否玩家死亡
        if(GAME_STATE.player.hp <= 0) {
            alert("你輸了！請重新整理頁面重來。");
            location.reload();
        } else {
            // 4. 開始新回合
            startTurn();
            updateEnemyIntent();
        }
    }, 1000);
}

// --- 卡牌操作 ---
function drawCards(count) {
    for (let i = 0; i < count; i++) {
        if (GAME_STATE.drawPile.length === 0) {
            if (GAME_STATE.discardPile.length > 0) {
                // 洗棄牌堆回抽牌堆
                GAME_STATE.drawPile = shuffle([...GAME_STATE.discardPile]);
                GAME_STATE.discardPile = [];
                log("棄牌堆已洗回抽牌堆！");
            } else {
                log("沒牌可抽了！");
                break;
            }
        }
        const card = GAME_STATE.drawPile.pop();
        GAME_STATE.hand.push(card);
    }
    updatePileCounts();
    renderHand();
}

function playCard(index) {
    const card = GAME_STATE.hand[index];
    
    // 檢查能量
    if (GAME_STATE.player.energy < card.cost) {
        log("能量不足！");
        return;
    }

    // 扣能量
    GAME_STATE.player.energy -= card.cost;

    // 執行卡牌效果
    if (card.type === 'attack') {
        damageEnemy(card.value);
        // 特殊：鐵斬波
        if (card.block) addBlock(card.block);
    } 
    else if (card.type === 'skill') {
        if (card.value) addBlock(card.value);
        if (card.effect === 'energy') GAME_STATE.player.energy += 1;
    }

    log(`你打出了 ${card.name}`);
    
    // 移至棄牌堆
    GAME_STATE.hand.splice(index, 1);
    GAME_STATE.discardPile.push(card);
    
    updateStatsUI();
    updatePileCounts();
    renderHand();

    // 檢查勝利
    if (GAME_STATE.enemy.hp <= 0) {
        handleWin();
    }
}

function discardCard(index) {
    const card = GAME_STATE.hand[index];
    GAME_STATE.hand.splice(index, 1);
    GAME_STATE.discardPile.push(card);
    updatePileCounts();
    renderHand();
}

// --- 戰鬥邏輯細節 ---
function damageEnemy(amount) {
    GAME_STATE.enemy.hp -= amount;
    if (GAME_STATE.enemy.hp < 0) GAME_STATE.enemy.hp = 0;
    
    // 動畫效果（簡單改變寬度）
    const percent = (GAME_STATE.enemy.hp / GAME_STATE.enemy.maxHp) * 100;
    document.getElementById('enemy-hp-bar').style.width = percent + '%';
    document.getElementById('enemy-hp').textContent = GAME_STATE.enemy.hp;
    
    // 震動效果
    const sprite = document.querySelector('.enemy .sprite');
    sprite.style.transform = 'translateX(10px)';
    setTimeout(() => sprite.style.transform = 'translateX(0)', 100);
}

function addBlock(amount) {
    GAME_STATE.player.block += amount;
    updateStatsUI();
}

function enemyAction() {
    const intent = GAME_STATE.enemy.intent;
    if (intent.type === 'attack') {
        let dmg = intent.value;
        // 計算護甲抵擋
        if (GAME_STATE.player.block > 0) {
            if (GAME_STATE.player.block >= dmg) {
                GAME_STATE.player.block -= dmg;
                dmg = 0;
            } else {
                dmg -= GAME_STATE.player.block;
                GAME_STATE.player.block = 0;
            }
        }
        GAME_STATE.player.hp -= dmg;
        log(`敵人攻擊造成 ${dmg} 點傷害 (被格擋後)`);
    }
    updateStatsUI();
}

function updateEnemyIntent() {
    // 簡單 AI：隨機攻擊 7-15
    const dmg = Math.floor(Math.random() * 9) + 7;
    GAME_STATE.enemy.intent = { type: 'attack', value: dmg };
    document.getElementById('enemy-intent').textContent = `⚔️ 攻擊 ${dmg}`;
}

function handleWin() {
    document.getElementById('reward-overlay').classList.remove('hidden');
    generateRewards();
}

function startNextBattle() {
    document.getElementById('reward-overlay').classList.add('hidden');
    // 讓敵人變強一點
    GAME_STATE.enemy.maxHp += 20;
    startBattle();
}

// --- UI 渲染 ---
function renderHand() {
    const container = document.getElementById('hand-area');
    container.innerHTML = '';
    
    GAME_STATE.hand.forEach((card, index) => {
        const cardEl = createCardElement(card);
        
        // 檢查是否可打出
        if (GAME_STATE.player.energy < card.cost) {
            cardEl.classList.add('disabled');
        } else {
            cardEl.onclick = () => playCard(index);
        }
        
        container.appendChild(cardEl);
    });
}

function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card';
    div.setAttribute('data-type', card.type);
    div.innerHTML = `
        <div class="card-cost">${card.cost}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>
        <div class="card-type">${card.type.toUpperCase()}</div>
    `;
    return div;
}

function updateStatsUI() {
    document.getElementById('player-hp').textContent = GAME_STATE.player.hp;
    document.getElementById('player-energy').textContent = GAME_STATE.player.energy;
    document.getElementById('player-block').textContent = GAME_STATE.player.block;
}

function updatePileCounts() {
    document.getElementById('draw-count').textContent = GAME_STATE.drawPile.length;
    document.getElementById('discard-count').textContent = GAME_STATE.discardPile.length;
}

function log(msg) {
    document.getElementById('message-log').textContent = msg;
}

// --- 彈窗邏輯 ---
function showOverlay(cards, title) {
    document.getElementById('modal-title').textContent = title;
    const grid = document.getElementById('modal-cards');
    grid.innerHTML = '';
    cards.forEach(card => {
        // 這裡的卡牌只做展示，不可點擊
        const el = createCardElement(card);
        el.style.cursor = 'default';
        grid.appendChild(el);
    });
    document.getElementById('overlay').classList.remove('hidden');
}

function hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
}

// --- 獎勵邏輯 ---
function generateRewards() {
    const grid = document.getElementById('reward-cards');
    grid.innerHTML = '';
    
    // 隨機選 3 張
    for(let i=0; i<3; i++) {
        const randomCardBase = CARD_DATABASE[Math.floor(Math.random() * CARD_DATABASE.length)];
        // 複製一份新的卡牌物件，避免引用問題
        const newCard = {...randomCardBase};
        
        const el = createCardElement(newCard);
        el.onclick = () => {
            GAME_STATE.masterDeck.push(newCard);
            log(`獲得了 ${newCard.name}！`);
            startNextBattle();
        };
        grid.appendChild(el);
    }
}

// 工具：洗牌演算法 (Fisher-Yates)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}