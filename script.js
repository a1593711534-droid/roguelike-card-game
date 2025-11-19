// --- 遊戲數據 ---
const GAME_STATE = {
    player: { maxHp: 60, hp: 60, energy: 3, maxEnergy: 3, block: 0, gold: 50 },
    enemy: null,
    masterDeck: [],
    drawPile: [],
    hand: [],
    discardPile: [],
    floor: 1, // 當前層數
    removalCost: 50,
    isFreeRemoval: false // 標記這次刪牌是否免費
};

// --- 卡牌資料庫 ---
const CARD_DATABASE = [
    // 基礎卡
    { id: 'strike', name: '打擊', type: 'attack', rarity: 'common', cost: 1, value: 6, desc: '造成 6 點傷害', price: 25 },
    { id: 'defend', name: '防禦', type: 'skill', rarity: 'common', cost: 1, value: 5, desc: '獲得 5 點護甲', price: 25 },
    { id: 'bash', name: '痛擊', type: 'attack', rarity: 'common', cost: 2, value: 10, desc: '造成 10 點傷害, 破防', price: 50 },
    // 進階攻擊
    { id: 'cleave', name: '橫掃', type: 'attack', rarity: 'common', cost: 1, value: 9, desc: '造成 9 點傷害', price: 45 },
    { id: 'uppercut', name: '昇龍拳', type: 'attack', rarity: 'common', cost: 2, value: 14, desc: '造成 14 點傷害', price: 60 },
    { id: 'iron_wave', name: '鐵斬波', type: 'attack', rarity: 'common', cost: 1, value: 5, block: 5, desc: '5 點傷害, 5 點護甲', price: 55 },
    // 抽牌與濾牌 (新功能)
    { id: 'acrobatics', name: '雜技', type: 'skill', rarity: 'common', cost: 1, value: 0, desc: '抽 4 張牌', effect: 'draw_4', price: 60 },
    { id: 'quick_hit', name: '快攻', type: 'attack', rarity: 'common', cost: 0, value: 4, desc: '造成 4 點傷害，抽 1 張牌', effect: 'draw_1', price: 50 },
    // 回能量 (新功能)
    { id: 'adrenaline', name: '腎上腺素', type: 'skill', rarity: 'common', cost: 0, value: 0, desc: '獲得 2 點能量', effect: 'gain_energy_2', price: 70 },
    { id: 'concentrate', name: '專注', type: 'skill', rarity: 'common', cost: 0, value: 0, desc: '獲得 2 點能量', effect: 'gain_energy_2', price: 70 },
    // 稀有卡 (新功能 - 強力)
    { id: 'demon_form', name: '惡魔型態', type: 'power', rarity: 'rare', cost: 3, value: 0, desc: '獲得 3 點能量，抽 3 張牌', effect: 'demon_mod', price: 150 },
    { id: 'bludgeon', name: '重鎚', type: 'attack', rarity: 'rare', cost: 2, value: 25, desc: '造成 25 點傷害', price: 120 },
    { id: 'impervious', name: '銅牆鐵壁', type: 'skill', rarity: 'rare', cost: 2, value: 30, desc: '獲得 30 點護甲', price: 110 },
];

// --- 敵人資料庫 (分級) ---
const ENEMIES = {
    normal: [
        { name: '酸液史萊姆', maxHp: 32, minDmg: 5, maxDmg: 8, sprite: '🦠' },
        { name: '大顎蟲', maxHp: 40, minDmg: 7, maxDmg: 10, sprite: '🐛' },
        { name: '奴隸販子', maxHp: 45, minDmg: 8, maxDmg: 12, sprite: '🤠' }
    ],
    elite: [
        { name: '地精大塊頭', maxHp: 90, minDmg: 12, maxDmg: 16, sprite: '👹' },
        { name: '哨衛機器人', maxHp: 85, minDmg: 10, maxDmg: 14, sprite: '🤖' }
    ],
    boss: [
        { name: '六火亡魂', maxHp: 220, minDmg: 15, maxDmg: 22, sprite: '🔥' },
        { name: '時間吞噬者', maxHp: 240, minDmg: 14, maxDmg: 20, sprite: '🐌' }
    ]
};

// --- 初始化 ---
window.onload = () => {
    hideAllOverlays();
    
    // 初始牌組
    GAME_STATE.masterDeck = [
        getCard('strike'), getCard('strike'), getCard('strike'), getCard('strike'),
        getCard('defend'), getCard('defend'), getCard('defend'), getCard('bash')
    ];
    
    updateGlobalStats();
    
    // 綁定按鈕
    document.getElementById('end-turn-btn').onclick = endTurn;
    document.getElementById('view-deck-btn').onclick = () => showOverlay(GAME_STATE.masterDeck, '總牌庫', false);
    document.getElementById('draw-pile').onclick = () => showOverlay(GAME_STATE.drawPile, '抽牌堆 (順序隱藏)', false);
    document.getElementById('discard-pile').onclick = () => showOverlay(GAME_STATE.discardPile, '棄牌堆', false);
    document.getElementById('close-overlay').onclick = hideAllOverlays;
    document.getElementById('skip-reward').onclick = showMapSelection;
    
    document.getElementById('service-remove-card').onclick = () => openRemovalService(false);
    document.getElementById('leave-shop-btn').onclick = showMapSelection;
    document.getElementById('camp-rest').onclick = useCampfireRest;
    document.getElementById('cancel-removal').onclick = hideAllOverlays;
    
    // 聖壇按鈕
    document.getElementById('shrine-purify').onclick = () => openRemovalService(true); // true = 免費
    document.getElementById('shrine-leave').onclick = showMapSelection;

    // 開始遊戲
    showMapSelection();
};

// --- 核心邏輯 ---

function getCard(id) {
    return JSON.parse(JSON.stringify(CARD_DATABASE.find(c => c.id === id)));
}

function getRandomCard(allowRare = false) {
    let pool = CARD_DATABASE;
    // 簡單的稀有度權重
    const roll = Math.random();
    if (allowRare && roll < 0.2) { // 20% 機率出稀有卡
        pool = CARD_DATABASE.filter(c => c.rarity === 'rare');
    } else {
        pool = CARD_DATABASE.filter(c => c.rarity !== 'rare');
    }
    
    // 如果池子空了(防呆)，就回退到全部
    if (pool.length === 0) pool = CARD_DATABASE;
    
    const rand = Math.floor(Math.random() * pool.length);
    return JSON.parse(JSON.stringify(pool[rand]));
}

function switchScene(sceneId) {
    document.querySelectorAll('.scene').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    const target = document.getElementById(sceneId);
    target.classList.remove('hidden');
    target.classList.add('active');
}

function hideAllOverlays() {
    document.querySelectorAll('#overlay, #reward-overlay, #removal-overlay').forEach(el => el.classList.add('hidden'));
}

function updateGlobalStats() {
    document.getElementById('player-hp').textContent = Math.floor(GAME_STATE.player.hp);
    document.getElementById('player-max-hp').textContent = GAME_STATE.player.maxHp;
    document.getElementById('player-gold').textContent = GAME_STATE.player.gold;
    document.getElementById('floor-num').textContent = GAME_STATE.floor;
}

// --- 1. 地圖邏輯 (新增 BOSS/菁英判斷) ---
function showMapSelection() {
    hideAllOverlays();
    switchScene('scene-map');
    GAME_STATE.floor++; // 進入地圖選擇視為新的一層開始前奏 (或你也可以在戰鬥後加)
    updateGlobalStats();

    const container = document.getElementById('map-nodes');
    container.innerHTML = '';
    
    const isBossFloor = (GAME_STATE.floor % 10 === 0); // 每 10 層 Boss
    const isEliteFloor = (GAME_STATE.floor % 5 === 0 && !isBossFloor); // 每 5 層菁英

    if (isBossFloor) {
        createNode('boss', '👑 BOSS 戰', container);
        return;
    }

    if (isEliteFloor) {
        createNode('elite', '☠️ 菁英怪', container);
        createNode('campfire', '🔥 營火', container); // 菁英層給個休息選項
        return;
    }

    // 一般層數：隨機 3 選 1
    const options = [];
    for(let i=0; i<3; i++) {
        const rand = Math.random();
        if (rand < 0.5) options.push('enemy');
        else if (rand < 0.7) options.push('shop');
        else if (rand < 0.85) options.push('shrine'); // 15% 出聖壇
        else options.push('campfire');
    }
    
    // 保底機制：必有一個敵人
    if(!options.includes('enemy')) options[0] = 'enemy';

    options.forEach(type => {
        let title = '未知';
        if(type === 'enemy') title = '⚔️ 敵人';
        if(type === 'shop') title = '💰 商店';
        if(type === 'campfire') title = '🔥 營火';
        if(type === 'shrine') title = '⛩️ 聖壇';
        createNode(type, title, container);
    });
}

function createNode(type, title, container) {
    const div = document.createElement('div');
    div.className = `map-node ${type}`;
    let icon = '';
    if(type === 'enemy') icon = '⚔️';
    if(type === 'elite') icon = '☠️';
    if(type === 'boss') icon = '👑';
    if(type === 'shop') icon = '💰';
    if(type === 'campfire') icon = '🔥';
    if(type === 'shrine') icon = '⛩️';

    div.innerHTML = `<div class="node-icon">${icon}</div><div class="node-title">${title}</div>`;
    div.onclick = () => enterNode(type);
    container.appendChild(div);
}

function enterNode(type) {
    if(type === 'enemy') initBattle('normal');
    else if(type === 'elite') initBattle('elite');
    else if(type === 'boss') initBattle('boss');
    else if(type === 'shop') initShop();
    else if(type === 'campfire') initCampfire();
    else if(type === 'shrine') initShrine();
}

// --- 2. 戰鬥系統 (支援不同強度) ---
function initBattle(difficulty) {
    switchScene('scene-battle');
    
    GAME_STATE.player.energy = GAME_STATE.player.maxEnergy;
    GAME_STATE.player.block = 0;
    GAME_STATE.hand = [];
    GAME_STATE.discardPile = [];
    GAME_STATE.drawPile = shuffle([...GAME_STATE.masterDeck]);
    
    // 選擇敵人
    let enemyPool = ENEMIES.normal;
    if(difficulty === 'elite') enemyPool = ENEMIES.elite;
    if(difficulty === 'boss') enemyPool = ENEMIES.boss;
    
    const enemyData = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    GAME_STATE.enemy = { ...enemyData, hp: enemyData.maxHp, difficulty: difficulty, intent: {} };
    
    // UI 更新
    document.getElementById('battle-type-label').textContent = 
        difficulty === 'boss' ? '👑 BOSS 戰' : (difficulty === 'elite' ? '☠️ 菁英戰' : '普通戰鬥');
    document.getElementById('battle-type-label').style.color = 
        difficulty === 'boss' ? '#ff0000' : (difficulty === 'elite' ? '#e056fd' : '#aaa');

    document.getElementById('enemy-name').textContent = GAME_STATE.enemy.name;
    document.getElementById('enemy-sprite').textContent = GAME_STATE.enemy.sprite;
    updateEnemyUI();
    
    startTurn();
}

function startTurn() {
    GAME_STATE.player.energy = GAME_STATE.player.maxEnergy;
    GAME_STATE.player.block = 0;
    updateEnemyIntent();
    drawCards(5);
    document.getElementById('end-turn-btn').disabled = false;
    updateBattleUI();
}

function endTurn() {
    document.getElementById('end-turn-btn').disabled = true;
    while(GAME_STATE.hand.length > 0) discardCard(0);
    
    setTimeout(() => {
        resolveEnemyAction();
        if(GAME_STATE.player.hp <= 0) {
            alert(`💀 遊戲結束！你到達了第 ${GAME_STATE.floor} 層。`);
            location.reload();
        } else {
            startTurn();
        }
    }, 800);
}

function drawCards(count) {
    for(let i=0; i<count; i++) {
        if(GAME_STATE.drawPile.length === 0) {
            if(GAME_STATE.discardPile.length > 0) {
                GAME_STATE.drawPile = shuffle([...GAME_STATE.discardPile]);
                GAME_STATE.discardPile = [];
            } else break;
        }
        GAME_STATE.hand.push(GAME_STATE.drawPile.pop());
    }
    renderHand();
    updatePileCounts();
}

// --- 新增：卡牌效果處理 ---
function playCard(index) {
    const card = GAME_STATE.hand[index];
    if(GAME_STATE.player.energy < card.cost) return;

    GAME_STATE.player.energy -= card.cost;
    
    // 通用效果
    if(card.type === 'attack' || card.value > 0) {
        if (card.type === 'attack') {
             let dmg = card.value;
             if(card.id === 'bash') dmg += 2; // 痛擊特效
             damageEnemy(dmg);
        }
        if (card.block) addBlock(card.block); // 鐵斬波
        if (card.type === 'skill' && card.value > 0) addBlock(card.value); // 防禦
    }

    // 特殊效果
    if (card.effect === 'draw_1') drawCards(1);
    if (card.effect === 'draw_4') drawCards(4);
    if (card.effect === 'gain_energy_2') GAME_STATE.player.energy += 2;
    if (card.effect === 'demon_mod') {
        GAME_STATE.player.energy += 3;
        drawCards(3);
    }

    discardCard(index);
    updateBattleUI();
    
    if(GAME_STATE.enemy.hp <= 0) handleWin();
}

function discardCard(index) {
    GAME_STATE.discardPile.push(GAME_STATE.hand[index]);
    GAME_STATE.hand.splice(index, 1);
    renderHand();
    updatePileCounts();
}

function damageEnemy(amount) {
    GAME_STATE.enemy.hp = Math.max(0, GAME_STATE.enemy.hp - amount);
    updateEnemyUI();
}

function addBlock(amount) {
    GAME_STATE.player.block += amount;
    updateBattleUI();
}

function resolveEnemyAction() {
    const intent = GAME_STATE.enemy.intent;
    let damage = intent.value;
    if(damage > 0) {
        if(GAME_STATE.player.block >= damage) {
            GAME_STATE.player.block -= damage;
            damage = 0;
        } else {
            damage -= GAME_STATE.player.block;
            GAME_STATE.player.block = 0;
        }
        GAME_STATE.player.hp -= damage;
    }
    updateGlobalStats();
}

function updateEnemyIntent() {
    const randDmg = Math.floor(Math.random() * (GAME_STATE.enemy.maxDmg - GAME_STATE.enemy.minDmg + 1)) + GAME_STATE.enemy.minDmg;
    GAME_STATE.enemy.intent = { value: randDmg };
    document.getElementById('enemy-intent').textContent = `⚔️ ${randDmg}`;
}

// --- 3. 獎勵系統 ---
function handleWin() {
    // 金錢隨難度提升
    let baseGold = 25;
    if (GAME_STATE.enemy.difficulty === 'elite') baseGold = 50;
    if (GAME_STATE.enemy.difficulty === 'boss') baseGold = 100;
    
    const goldReward = baseGold + Math.floor(Math.random() * 10);
    GAME_STATE.player.gold += goldReward;
    updateGlobalStats();

    document.getElementById('reward-gold').textContent = goldReward;
    document.getElementById('reward-overlay').classList.remove('hidden');

    const container = document.getElementById('reward-cards');
    container.innerHTML = '';
    
    // 生成 3 張獎勵卡，菁英/Boss 戰有更高機率出稀有卡
    const rareChance = (GAME_STATE.enemy.difficulty !== 'normal');
    
    for(let i=0; i<3; i++) {
        const card = getRandomCard(rareChance); // 如果是強敵，允許出稀有卡
        const el = createCardElement(card, false);
        el.onclick = () => {
            GAME_STATE.masterDeck.push(card);
            showMapSelection();
        };
        container.appendChild(el);
    }
}

// --- 4. 商店與聖壇 ---
function initShop() {
    switchScene('scene-shop');
    document.getElementById('shop-gold-display').textContent = GAME_STATE.player.gold;
    document.getElementById('remove-cost').textContent = GAME_STATE.removalCost;
    
    const container = document.getElementById('shop-cards');
    container.innerHTML = '';
    
    for(let i=0; i<5; i++) {
        const card = getRandomCard(true); // 商店有機會出稀有卡
        const el = createCardElement(card, true);
        el.onclick = () => buyCard(card, el);
        container.appendChild(el);
    }
}

function buyCard(card, element) {
    if(GAME_STATE.player.gold >= card.price) {
        GAME_STATE.player.gold -= card.price;
        GAME_STATE.masterDeck.push(card);
        element.remove();
        updateGlobalStats();
        document.getElementById('shop-gold-display').textContent = GAME_STATE.player.gold;
    } else {
        alert("金幣不足！");
    }
}

function initShrine() {
    switchScene('scene-shrine');
}

// 移除卡牌服務 (通用：商店付費 或 聖壇免費)
function openRemovalService(isFree) {
    GAME_STATE.isFreeRemoval = isFree;
    
    if(!isFree && GAME_STATE.player.gold < GAME_STATE.removalCost) {
        alert("金幣不足！");
        return;
    }
    
    const title = isFree ? "✨ 選擇一張卡牌淨化 (免費)" : "🔥 選擇一張卡牌移除";
    document.getElementById('removal-title').textContent = title;
    
    showOverlay(GAME_STATE.masterDeck, title, true);
}

// 處理移除點擊
function handleRemoval(index) {
    if(!GAME_STATE.isFreeRemoval) {
        GAME_STATE.player.gold -= GAME_STATE.removalCost;
        GAME_STATE.removalCost += 25;
    }
    
    GAME_STATE.masterDeck.splice(index, 1);
    updateGlobalStats();
    hideAllOverlays();
    
    // 根據來源返回不同場景
    if(GAME_STATE.isFreeRemoval) {
        showMapSelection(); // 聖壇刪完直接走
    } else {
        document.getElementById('shop-gold-display').textContent = GAME_STATE.player.gold;
        document.getElementById('remove-cost').textContent = GAME_STATE.removalCost;
    }
}

// --- 5. 營火 ---
function initCampfire() {
    switchScene('scene-campfire');
}

function useCampfireRest() {
    const healAmt = Math.floor(GAME_STATE.player.maxHp * 0.3);
    GAME_STATE.player.hp = Math.min(GAME_STATE.player.maxHp, GAME_STATE.player.hp + healAmt);
    updateGlobalStats();
    showMapSelection();
}

// --- UI 渲染 ---
function updateBattleUI() {
    document.getElementById('player-block').textContent = GAME_STATE.player.block;
    document.getElementById('player-energy').textContent = GAME_STATE.player.energy;
    updateEnemyUI();
}

function updateEnemyUI() {
    document.getElementById('enemy-hp').textContent = GAME_STATE.enemy.hp;
    document.getElementById('enemy-max-hp').textContent = GAME_STATE.enemy.maxHp;
    const percent = (GAME_STATE.enemy.hp / GAME_STATE.enemy.maxHp) * 100;
    document.getElementById('enemy-hp-bar').style.width = percent + '%';
}

function updatePileCounts() {
    document.getElementById('draw-count').textContent = GAME_STATE.drawPile.length;
    document.getElementById('discard-count').textContent = GAME_STATE.discardPile.length;
}

function renderHand() {
    const container = document.getElementById('hand-area');
    container.innerHTML = '';
    GAME_STATE.hand.forEach((card, index) => {
        const el = createCardElement(card, false);
        if(GAME_STATE.player.energy < card.cost) el.classList.add('disabled');
        else el.onclick = () => playCard(index);
        container.appendChild(el);
    });
}

function createCardElement(card, showPrice) {
    const div = document.createElement('div');
    div.className = `card ${card.rarity === 'rare' ? 'rare' : ''}`;
    div.innerHTML = `
        <div class="card-cost">${card.cost}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.desc}</div>
        ${showPrice ? `<div class="card-price">$${card.price}</div>` : ''}
    `;
    return div;
}

function showOverlay(cards, title, isRemoval) {
    if(isRemoval) {
        document.getElementById('removal-overlay').classList.remove('hidden');
        const grid = document.getElementById('removal-cards');
        grid.innerHTML = '';
        cards.forEach((card, index) => {
            const el = createCardElement(card, false);
            el.onclick = () => {
                if(confirm(`確定要移除 ${card.name} 嗎？`)) {
                    handleRemoval(index);
                }
            };
            grid.appendChild(el);
        });
    } else {
        document.getElementById('modal-title').textContent = title;
        const grid = document.getElementById('modal-cards');
        grid.innerHTML = '';
        cards.forEach(card => {
            const el = createCardElement(card, false);
            el.style.cursor = 'default';
            grid.appendChild(el);
        });
        document.getElementById('overlay').classList.remove('hidden');
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}