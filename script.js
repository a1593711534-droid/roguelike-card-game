// --- 遊戲數據 ---
const GAME_STATE = {
    player: { maxHp: 60, hp: 60, energy: 3, maxEnergy: 3, block: 0, gold: 50 },
    enemy: null,
    masterDeck: [],
    drawPile: [],
    hand: [],
    discardPile: [],
    turn: 1,
    removalCost: 50
};

// 卡牌資料庫
const CARD_DATABASE = [
    { id: 'strike', name: '打擊', type: 'attack', cost: 1, value: 6, desc: '造成 6 點傷害', price: 30 },
    { id: 'defend', name: '防禦', type: 'skill', cost: 1, value: 5, desc: '獲得 5 點護甲', price: 30 },
    { id: 'bash', name: '痛擊', type: 'attack', cost: 2, value: 10, desc: '造成 10 點傷害, 破防', price: 50 },
    { id: 'cleave', name: '橫掃', type: 'attack', cost: 1, value: 8, desc: '造成 8 點傷害', price: 45 },
    { id: 'uppercut', name: '昇龍拳', type: 'attack', cost: 2, value: 13, desc: '造成 13 點傷害', price: 60 },
    { id: 'iron_wave', name: '鐵斬波', type: 'attack', cost: 1, value: 5, block: 5, desc: '5 點傷害, 5 點護甲', price: 55 },
    { id: 'shrug', name: '聳肩', type: 'skill', cost: 1, value: 8, desc: '獲得 8 點護甲', price: 40 },
    { id: 'meditate', name: '冥想', type: 'skill', cost: 0, value: 0, desc: '回復 1 點能量', effect: 'energy', price: 75 },
    { id: 'pommel', name: '劍柄', type: 'attack', cost: 1, value: 9, desc: '造成 9 點傷害, 抽 1 張牌', effect: 'draw', price: 65 }
];

// 敵人資料庫
const ENEMY_TYPES = [
    { name: '史萊姆', maxHp: 40, minDmg: 6, maxDmg: 9, sprite: '🦠' },
    { name: '地精狂戰士', maxHp: 55, minDmg: 8, maxDmg: 12, sprite: '👹' },
    { name: '黑暗騎士', maxHp: 80, minDmg: 10, maxDmg: 15, sprite: '♞' },
    { name: '巨龍寶寶', maxHp: 120, minDmg: 12, maxDmg: 20, sprite: '🐲' }
];

// --- 初始化 ---
window.onload = () => {
    // 強制隱藏所有遮罩 (修復卡住問題的保險)
    document.querySelectorAll('#overlay, #reward-overlay, #removal-overlay').forEach(el => {
        el.classList.add('hidden');
    });

    // 初始牌組
    GAME_STATE.masterDeck = [
        getCard('strike'), getCard('strike'), getCard('strike'), getCard('strike'),
        getCard('defend'), getCard('defend'), getCard('defend'), getCard('bash')
    ];
    
    updateGlobalStats();
    
    // 綁定事件
    document.getElementById('end-turn-btn').onclick = endTurn;
    document.getElementById('view-deck-btn').onclick = () => showOverlay(GAME_STATE.masterDeck, '總牌庫', false);
    document.getElementById('draw-pile').onclick = () => showOverlay(GAME_STATE.drawPile, '抽牌堆 (順序隱藏)', false);
    document.getElementById('discard-pile').onclick = () => showOverlay(GAME_STATE.discardPile, '棄牌堆', false);
    document.getElementById('close-overlay').onclick = () => document.getElementById('overlay').classList.add('hidden');
    document.getElementById('skip-reward').onclick = showMapSelection;
    
    document.getElementById('service-remove-card').onclick = openRemovalService;
    document.getElementById('service-heal').onclick = buyHeal;
    document.getElementById('leave-shop-btn').onclick = showMapSelection;
    document.getElementById('camp-rest').onclick = useCampfireRest;
    document.getElementById('cancel-removal').onclick = () => document.getElementById('removal-overlay').classList.add('hidden');

    // 開始遊戲：直接進入地圖選擇
    showMapSelection();
};

// --- 工具函數 ---
function getCard(id) {
    return JSON.parse(JSON.stringify(CARD_DATABASE.find(c => c.id === id)));
}

function getRandomCard() {
    const rand = Math.floor(Math.random() * CARD_DATABASE.length);
    return JSON.parse(JSON.stringify(CARD_DATABASE[rand]));
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

function updateGlobalStats() {
    document.getElementById('player-hp').textContent = Math.floor(GAME_STATE.player.hp);
    document.getElementById('player-max-hp').textContent = GAME_STATE.player.maxHp;
    document.getElementById('player-gold').textContent = GAME_STATE.player.gold;
}

// --- 1. 地圖選擇系統 ---
function showMapSelection() {
    document.getElementById('reward-overlay').classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('removal-overlay').classList.add('hidden'); // 確保刪牌介面也關閉
    
    switchScene('scene-map');

    const container = document.getElementById('map-nodes');
    container.innerHTML = '';

    const options = [];
    for(let i=0; i<3; i++) {
        const rand = Math.random();
        if (rand < 0.6) options.push('enemy');
        else if (rand < 0.85) options.push('shop');
        else options.push('campfire');
    }
    if(!options.includes('enemy')) options[0] = 'enemy';

    options.forEach(type => {
        const div = document.createElement('div');
        div.className = 'map-node';
        let icon = '', title = '';
        if(type === 'enemy') { icon = '⚔️'; title = '遭遇敵人'; }
        else if(type === 'shop') { icon = '💰'; title = '商店'; }
        else if(type === 'campfire') { icon = '🔥'; title = '營火'; }

        div.innerHTML = `<div class="node-icon">${icon}</div><div class="node-title">${title}</div>`;
        div.onclick = () => enterNode(type);
        container.appendChild(div);
    });
}

function enterNode(type) {
    if(type === 'enemy') initBattle();
    else if(type === 'shop') initShop();
    else if(type === 'campfire') initCampfire();
}

// --- 2. 戰鬥系統 ---
function initBattle() {
    switchScene('scene-battle');
    GAME_STATE.player.energy = GAME_STATE.player.maxEnergy;
    GAME_STATE.player.block = 0;
    GAME_STATE.hand = [];
    GAME_STATE.discardPile = [];
    GAME_STATE.drawPile = shuffle([...GAME_STATE.masterDeck]);
    
    const enemyData = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    GAME_STATE.enemy = { ...enemyData, hp: enemyData.maxHp, intent: {} };
    
    document.getElementById('enemy-name').textContent = GAME_STATE.enemy.name;
    document.getElementById('enemy-sprite').textContent = GAME_STATE.enemy.sprite;
    document.getElementById('enemy-hp').textContent = GAME_STATE.enemy.hp;
    document.getElementById('enemy-max-hp').textContent = GAME_STATE.enemy.maxHp;
    document.getElementById('enemy-hp-bar').style.width = '100%';
    
    updateBattleUI();
    startTurn();
    log(`遭遇了 ${GAME_STATE.enemy.name}！`);
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
            alert("💀 你倒下了... 遊戲結束。");
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

function playCard(index) {
    const card = GAME_STATE.hand[index];
    if(GAME_STATE.player.energy < card.cost) return;

    GAME_STATE.player.energy -= card.cost;
    
    if(card.type === 'attack') {
        let dmg = card.value;
        if(card.id === 'bash') dmg += 2; 
        damageEnemy(dmg);
        if(card.block) addBlock(card.block);
        if(card.effect === 'draw') drawCards(1);
    } else if(card.type === 'skill') {
        if(card.value) addBlock(card.value);
        if(card.effect === 'energy') GAME_STATE.player.energy++;
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
        log(`受到 ${damage} 點傷害！`);
    }
    updateGlobalStats();
}

function updateEnemyIntent() {
    const dmg = Math.floor(Math.random() * (GAME_STATE.enemy.maxDmg - GAME_STATE.enemy.minDmg + 1)) + GAME_STATE.enemy.minDmg;
    GAME_STATE.enemy.intent = { value: dmg };
    document.getElementById('enemy-intent').textContent = `⚔️ ${dmg}`;
}

// --- 3. 結算與獎勵 ---
function handleWin() {
    const goldReward = Math.floor(Math.random() * 21) + 20;
    GAME_STATE.player.gold += goldReward;
    updateGlobalStats();

    document.getElementById('reward-gold').textContent = goldReward;
    document.getElementById('reward-overlay').classList.remove('hidden');

    const container = document.getElementById('reward-cards');
    container.innerHTML = '';
    for(let i=0; i<3; i++) {
        const card = getRandomCard();
        const el = createCardElement(card, false);
        el.onclick = () => {
            GAME_STATE.masterDeck.push(card);
            showMapSelection();
        };
        container.appendChild(el);
    }
}

// --- 4. 商店系統 ---
function initShop() {
    switchScene('scene-shop');
    document.getElementById('shop-gold-display').textContent = GAME_STATE.player.gold;
    document.getElementById('remove-cost').textContent = GAME_STATE.removalCost;
    
    const container = document.getElementById('shop-cards');
    container.innerHTML = '';
    
    for(let i=0; i<5; i++) {
        const card = getRandomCard();
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
        alert(`購買了 ${card.name}!`);
    } else {
        alert("金幣不足！");
    }
}

function openRemovalService() {
    if(GAME_STATE.player.gold < GAME_STATE.removalCost) {
        alert("金幣不足！");
        return;
    }
    showOverlay(GAME_STATE.masterDeck, '選擇要移除的牌 (點擊移除)', true);
}

function buyHeal() {
    const cost = 30;
    if(GAME_STATE.player.gold >= cost) {
        GAME_STATE.player.gold -= cost;
        GAME_STATE.player.hp = Math.min(GAME_STATE.player.maxHp, GAME_STATE.player.hp + 20);
        updateGlobalStats();
        document.getElementById('shop-gold-display').textContent = GAME_STATE.player.gold;
        alert("生命值已回復！");
    } else {
        alert("金幣不足！");
    }
}

// --- 5. 營火系統 ---
function initCampfire() {
    switchScene('scene-campfire');
    document.getElementById('camp-rest').style.display = 'flex';
}

function useCampfireRest() {
    const healAmt = Math.floor(GAME_STATE.player.maxHp * 0.3);
    GAME_STATE.player.hp = Math.min(GAME_STATE.player.maxHp, GAME_STATE.player.hp + healAmt);
    updateGlobalStats();
    alert(`你休息了一會兒，回復了 ${healAmt} 點生命。`);
    showMapSelection();
}

// --- UI 渲染輔助 ---
function updateBattleUI() {
    document.getElementById('player-block').textContent = GAME_STATE.player.block;
    document.getElementById('player-energy').textContent = GAME_STATE.player.energy;
    updateEnemyUI();
}

function updateEnemyUI() {
    document.getElementById('enemy-hp').textContent = GAME_STATE.enemy.hp;
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
    div.className = `card`;
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
                    GAME_STATE.masterDeck.splice(index, 1);
                    GAME_STATE.player.gold -= GAME_STATE.removalCost;
                    GAME_STATE.removalCost += 25;
                    updateGlobalStats();
                    document.getElementById('removal-overlay').classList.add('hidden');
                    document.getElementById('shop-gold-display').textContent = GAME_STATE.player.gold;
                    document.getElementById('remove-cost').textContent = GAME_STATE.removalCost;
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

function log(msg) {
    document.getElementById('message-log').textContent = msg;
}