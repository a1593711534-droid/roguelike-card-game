/**
 * SRPG 遊戲核心邏輯 (Phaser 3 + JS Classes)
 */

// --- 0. 全局配置 ---
const TILE_SIZE = 40;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 12; // 調整地圖高度以容納 UI

// --- 1. 屬性定義與相剋 ---
const ATTRIBUTES = {
    FIRE: { name: '火', color: 0xFF4500 },
    WATER: { name: '水', color: 0x1E90FF },
    WIND: { name: '風', color: 0x90EE90 },
    EARTH: { name: '地', color: 0xB8860B }
};

// 屬性相剋表 (攻擊方 -> 防禦方)
// 2.0 (剋制), 0.5 (被剋), 1.0 (普通)
const ATTRIBUTE_ADVANTAGE = {
    [ATTRIBUTES.FIRE.name]: { [ATTRIBUTES.WIND.name]: 2.0, [ATTRIBUTES.WATER.name]: 0.5 },
    [ATTRIBUTES.WATER.name]: { [ATTRIBUTES.FIRE.name]: 2.0, [ATTRIBUTES.EARTH.name]: 0.5 },
    [ATTRIBUTES.WIND.name]: { [ATTRIBUTES.EARTH.name]: 2.0, [ATTRIBUTES.FIRE.name]: 0.5 },
    [ATTRIBUTES.EARTH.name]: { [ATTRIBUTES.WATER.name]: 2.0, [ATTRIBUTES.WIND.name]: 0.5 }
};

// --- 2. 怪物數據和進化鏈 (滿足 3, 4 條件) ---
const MONSTER_DATA = {
    // 火屬性 (兩條進化鏈，各三階)
    'F_01': { name: '小火苗', attr: ATTRIBUTES.FIRE.name, baseStats: { hp: 40, atk: 15 }, evoTo: 'F_02', baseId: 'F_01' },
    'F_02': { name: '火精靈', attr: ATTRIBUTES.FIRE.name, baseStats: { hp: 60, atk: 25 }, evoTo: 'F_03', baseId: 'F_01' },
    'F_03': { name: '烈焰王', attr: ATTRIBUTES.FIRE.name, baseStats: { hp: 80, atk: 35 }, evoTo: null, baseId: 'F_01' },
    'F_11': { name: '火焰蟲', attr: ATTRIBUTES.FIRE.name, baseStats: { hp: 50, atk: 12 }, evoTo: 'F_12', baseId: 'F_11' },
    'F_12': { name: '火蜥蜴', attr: ATTRIBUTES.FIRE.name, baseStats: { hp: 70, atk: 22 }, evoTo: 'F_13', baseId: 'F_11' },
    'F_13': { name: '火神龍', attr: ATTRIBUTES.FIRE.name, baseStats: { hp: 90, atk: 32 }, evoTo: null, baseId: 'F_11' },
    
    // 水屬性 (兩條進化鏈，各三階)
    'W_01': { name: '水滴', attr: ATTRIBUTES.WATER.name, baseStats: { hp: 50, atk: 10 }, evoTo: 'W_02', baseId: 'W_01' },
    'W_02': { name: '水凝膠', attr: ATTRIBUTES.WATER.name, baseStats: { hp: 70, atk: 20 }, evoTo: 'W_03', baseId: 'W_01' },
    'W_03': { name: '深海巨獸', attr: ATTRIBUTES.WATER.name, baseStats: { hp: 90, atk: 30 }, evoTo: null, baseId: 'W_01' },

    // 風屬性 (一條鏈，需補齊第二條)
    'WI_01': { name: '小風鳥', attr: ATTRIBUTES.WIND.name, baseStats: { hp: 45, atk: 14 }, evoTo: 'WI_02', baseId: 'WI_01' },
    'WI_02': { name: '疾風鷹', attr: ATTRIBUTES.WIND.name, baseStats: { hp: 65, atk: 24 }, evoTo: 'WI_03', baseId: 'WI_01' },
    'WI_03': { name: '暴風神', attr: ATTRIBUTES.WIND.name, baseStats: { hp: 85, atk: 34 }, evoTo: null, baseId: 'WI_01' },

    // 地屬性
    'E_01': { name: '小石魔', attr: ATTRIBUTES.EARTH.name, baseStats: { hp: 60, atk: 8 }, evoTo: 'E_02', baseId: 'E_01' },
    'E_02': { name: '巨石怪', attr: ATTRIBUTES.EARTH.name, baseStats: { hp: 80, atk: 18 }, evoTo: 'E_03', baseId: 'E_01' },
    'E_03': { name: '泰坦', attr: ATTRIBUTES.EARTH.name, baseStats: { hp: 100, atk: 28 }, evoTo: null, baseId: 'E_01' },
};


// --- 3. 戰棋單位類 (GameUnit) ---
class GameUnit extends Phaser.GameObjects.Container {
    constructor(scene, x, y, monsterData, isPlayerUnit = false, level = 1) {
        // 座標轉換為畫布像素
        super(scene, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        this.scene = scene;
        this.x = x; // 網格 X
        this.y = y; // 網格 Y
        this.isPlayerUnit = isPlayerUnit;
        this.moveRange = 3;
        this.attackRange = 1;

        // 怪物數據 (實例化，帶有狀態)
        this.data = { ...monsterData, level };
        this.maxHp = monsterData.baseStats.hp + level * 5;
        this.currentHp = this.maxHp;
        this.attack = monsterData.baseStats.atk + level * 2;
        this.id = monsterData.id;
        this.name = monsterData.name;
        this.attribute = monsterData.attr;
        
        const attrColor = ATTRIBUTES[Object.keys(ATTRIBUTES).find(k => ATTRIBUTES[k].name === this.attribute)].color;

        // 繪製單元格圖形
        this.graphic = scene.add.circle(0, 0, TILE_SIZE / 2 - 5, attrColor);
        this.graphic.setStrokeStyle(2, isPlayerUnit ? 0x00FF00 : 0xFFFF00); // 玩家綠邊，敵方黃邊
        
        // 繪製名稱標籤 (顯示第一個字)
        this.nameText = scene.add.text(0, 0, this.name[0], { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);
        this.hpText = scene.add.text(0, TILE_SIZE/2 - 5, `HP: ${this.currentHp}`, { fontSize: '10px', fill: '#ff0' }).setOrigin(0.5);

        this.add([this.graphic, this.nameText, this.hpText]);
        scene.add.existing(this);

        // 設置互動
        this.graphic.setInteractive({ useHandCursor: true });
        this.graphic.on('pointerdown', () => this.scene.handleUnitSelection(this));
    }

    updatePosition(newX, newY) {
        this.x = newX;
        this.y = newY;
        this.scene.tweens.add({
            targets: this,
            x: newX * TILE_SIZE + TILE_SIZE / 2,
            y: newY * TILE_SIZE + TILE_SIZE / 2,
            duration: 300,
            ease: 'Power1'
        });
    }

    takeDamage(attacker, isCaptureAttempt = false) {
        let log = '';
        if (isCaptureAttempt) {
            log = `${attacker.name} 嘗試使用收服魔法...`;
        } else {
            const multiplier = ATTRIBUTE_ADVANTAGE[attacker.attribute][this.attribute] || 1.0;
            const damage = Math.round(attacker.attack * multiplier);
            this.currentHp -= damage;
            this.currentHp = Math.max(0, this.currentHp);
            
            this.hpText.setText(`HP: ${this.currentHp}`);

            log = `${attacker.name} (${attacker.attribute}) 攻擊 ${this.name} (${this.attribute})，造成 ${damage} 點傷害。`;
            if (multiplier > 1.0) log += ' 效果絕佳！';
            if (multiplier < 1.0) log += ' 效果不彰。';
        }

        return log;
    }

    // 7. 收服魔法邏輯 (主角技能)
    tryCapture() {
        if (this.currentHp <= 0) return { success: false, log: `${this.name} 已經被擊敗，無法收服。` };
        
        // 血量越低，成功率越高 (0% HP = 100% 成功率)
        const captureRate = 1 - (this.currentHp / this.maxHp);
        
        if (Math.random() < captureRate) { 
            return { success: true, log: `🎉 收服成功！收服率: ${Math.round(captureRate*100)}%。` };
        } else {
            return { success: false, log: `收服失敗！收服率: ${Math.round(captureRate*100)}%。` };
        }
    }

    isDefeated() {
        return this.currentHp <= 0;
    }
}


// --- 4. 主角/玩家狀態類 (PlayerState) ---
class PlayerState {
    constructor() {
        this.gold = 500;
        this.roster = []; // 隊伍中的 GameUnit 數據 (非實例)
        this.pokedex = {}; // 圖鑑: { baseId: { count: number, maxEvo: string/id } }
        this.initializeRoster();
    }

    // 6. 主角原本就有各屬性的怪物幾隻
    initializeRoster() {
        this.addMonster(MONSTER_DATA['F_01'], 5);
        this.addMonster(MONSTER_DATA['W_01'], 5);
        this.addMonster(MONSTER_DATA['WI_01'], 5);
        this.addMonster(MONSTER_DATA['E_01'], 5);
    }

    // 5. 召喚/收服怪物 (將數據加入隊伍)
    addMonster(monsterData, level) {
        const newMonster = { ...monsterData, level, currentHp: monsterData.baseStats.hp + level * 5 };
        this.roster.push(newMonster);
        this.addToPokedex(newMonster);
    }

    // 8. 更新圖鑑
    addToPokedex(monsterData) {
        const baseId = monsterData.baseId;
        const currentId = monsterData.id;
        
        if (!this.pokedex[baseId]) {
            this.pokedex[baseId] = { count: 1, maxEvo: currentId };
        } else {
            this.pokedex[baseId].count++;
            // 檢查是否為更高的進化型態
            const currentEvoLevel = parseInt(currentId.split('_')[1]);
            const existingEvoLevel = parseInt(this.pokedex[baseId].maxEvo.split('_')[1]);

            if (currentEvoLevel > existingEvoLevel) {
                this.pokedex[baseId].maxEvo = currentId;
            }
        }
    }

    // 9. 放生怪物 (從隊伍中移除)
    releaseMonster(index) {
        if (index >= 0 && index < this.roster.length) {
            const releasedMonster = this.roster.splice(index, 1)[0];
            
            const baseId = releasedMonster.baseId;
            if (this.pokedex[baseId]) {
                this.pokedex[baseId].count = Math.max(0, this.pokedex[baseId].count - 1);
            }
            return releasedMonster;
        }
        return null;
    }
    
    // 4. 進化邏輯
    evolveMonster(index) {
        const oldMonster = this.roster[index];
        const nextId = oldMonster.evoTo;

        if (!nextId) return { success: false, log: `${oldMonster.name} 無法再進化了！` };

        // 消耗金錢/材料 (簡化為金錢)
        const cost = oldMonster.level * 10;
        if (this.gold < cost) return { success: false, log: `金錢不足！需要 ${cost} 金幣。` };

        this.gold -= cost;
        
        const newMonsterData = MONSTER_DATA[nextId];
        const newMonster = { ...newMonsterData, level: oldMonster.level, currentHp: oldMonster.currentHp };

        this.roster[index] = newMonster;
        this.addToPokedex(newMonster); // 更新圖鑑的最高進化型態
        
        return { success: true, log: `🎉 ${oldMonster.name} 成功進化成 ${newMonster.name}！` };
    }
}


// --- 5. 大地圖場景 (WorldMapScene) ---
class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
        // 關卡數據
        this.stages = [
            { id: 1, name: "火焰峽谷", x: 4, y: 5, enemies: [{ id: 'F_11', level: 8 }, { id: 'F_01', level: 10 }] },
            { id: 2, name: "潮濕洞穴", x: 10, y: 8, enemies: [{ id: 'W_01', level: 12 }, { id: 'E_01', level: 10 }] }
        ];
    }

    create() {
        this.cameras.main.setBackgroundColor('#0a3d62');
        this.add.text(20, 20, '🌎 大地圖 - 選擇關卡', { fontSize: '24px', fill: '#fff' });

        this.stages.forEach(stage => {
            // 繪製關卡點
            const star = this.add.star(stage.x * TILE_SIZE, stage.y * TILE_SIZE, 5, 10, 15, 0xffff00);
            star.setInteractive({ useHandCursor: true });
            star.on('pointerdown', () => this.enterStage(stage));
            
            this.add.text(star.x, star.y + 20, stage.name, { fontSize: '14px', fill: '#fff' }).setOrigin(0.5);
        });

        // 顯示回大地圖按鈕
        document.getElementById('map-btn').classList.add('hidden');
        game.updateStatus('狀態: 大地圖');
    }

    // 1. 進入關卡
    enterStage(stage) {
        this.scene.start('BattleScene', { stageData: stage });
    }
}


// --- 6. 戰鬥場景 (BattleScene) ---
class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        this.selectedUnit = null;
        this.highlightGraphics = null;
        this.turn = 'PLAYER'; // PLAYER | ENEMY
        this.playerUnits = [];
        this.enemyUnits = [];
        this.actionPhase = 'MOVE'; // MOVE | ATTACK | SKILL
    }

    init(data) {
        this.stageData = data.stageData;
    }

    create() {
        this.cameras.main.setBackgroundColor('#34495e');
        this.highlightGraphics = this.add.graphics({ fillStyle: { color: 0x00ff00, alpha: 0.3 } });
        
        this.createMapGrid();
        this.placeUnits();
        
        document.getElementById('map-btn').classList.remove('hidden');
        document.getElementById('map-btn').onclick = () => this.exitBattle("你選擇了逃跑...");

        game.updateStatus(`⚔️ 關卡: ${this.stageData.name} | 回合: ${this.turn}`);
    }

    createMapGrid() {
        // 繪製地圖網格
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const color = (x + y) % 2 === 0 ? 0x2c3e50 : 0x34495e; 
                this.add.rectangle(
                    x * TILE_SIZE + TILE_SIZE / 2, 
                    y * TILE_SIZE + TILE_SIZE / 2, 
                    TILE_SIZE, TILE_SIZE, color
                ).setOrigin(0.5);
                
                // 設置點擊事件來選擇地圖方塊
                this.add.rectangle(
                    x * TILE_SIZE + TILE_SIZE / 2, 
                    y * TILE_SIZE + TILE_SIZE / 2, 
                    TILE_SIZE, TILE_SIZE, 0xFFFFFF, 0.001 
                ).setInteractive().on('pointerdown', () => this.handleTileClick(x, y));
            }
        }
    }

    placeUnits() {
        // 放置玩家單位 (從主角隊伍數據中實例化)
        game.player.roster.slice(0, 4).forEach((data, i) => {
            const monsterData = MONSTER_DATA[data.id];
            const unit = new GameUnit(this, 1 + i, MAP_HEIGHT - 2, monsterData, true, data.level);
            unit.currentHp = data.currentHp; // 恢復戰鬥前的 HP
            this.playerUnits.push(unit);
        });

        // 放置敵方單位 (從關卡數據中實例化)
        this.stageData.enemies.forEach((data, i) => {
            const monsterData = MONSTER_DATA[data.id];
            const unit = new GameUnit(this, MAP_WIDTH - 2 - i, 1, monsterData, false, data.level);
            this.enemyUnits.push(unit);
        });
    }

    // 處理點擊地圖方塊
    handleTileClick(x, y) {
        if (!this.selectedUnit || this.turn !== 'PLAYER') {
            game.updateStatus(`地圖 (${x}, ${y}): 請先選擇你的單位。`);
            return;
        }

        const unit = this.getUnitAt(x, y);

        if (this.actionPhase === 'MOVE') {
            const distance = Math.abs(x - this.selectedUnit.x) + Math.abs(y - this.selectedUnit.y);
            if (distance > 0 && distance <= this.selectedUnit.moveRange && !unit) {
                this.selectedUnit.updatePosition(x, y);
                this.actionPhase = 'ATTACK';
                this.highlightUnitRanges(this.selectedUnit, 'ATTACK');
                game.updateStatus(`已移動至 (${x}, ${y})。請選擇攻擊目標或技能。`);
            } else {
                game.updateStatus("無法移動到該位置 (超出範圍或已有單位)。");
            }
        } else if (this.actionPhase === 'ATTACK' || this.actionPhase === 'SKILL') {
            // 這裡可以處理技能菜單的邏輯，但為了演示，我們聚焦在攻擊
            game.updateStatus(`請選擇攻擊/收服目標，或執行其他技能。`);
        }
    }

    // 處理點擊單位
    handleUnitSelection(unit) {
        this.clearHighlights();

        if (this.turn !== 'PLAYER') return;
        
        if (unit.isPlayerUnit) {
            // 選擇自己的單位
            this.selectedUnit = unit;
            this.actionPhase = 'MOVE';
            this.highlightUnitRanges(unit, 'MOVE');
            game.updateStatus(`已選擇 ${unit.name}。請點擊移動範圍內的格子。`);
        } else if (this.selectedUnit && this.actionPhase === 'ATTACK') {
            // 攻擊敵方單位
            const distance = Math.abs(unit.x - this.selectedUnit.x) + Math.abs(unit.y - this.selectedUnit.y);
            
            // 這裡彈出操作選單
            const action = prompt(`對 ${unit.name} 執行操作: 1. 普通攻擊, 2. 收服魔法`);
            
            if (action === '1' && distance <= this.selectedUnit.attackRange) {
                // 普通攻擊
                const log = this.selectedUnit.takeDamage(unit, false);
                game.updateStatus(log);
                this.checkBattleEnd(unit);
                this.endTurn();
            } else if (action === '2') {
                // 7. 收服魔法 (主角技能)
                const captureResult = unit.tryCapture();
                game.updateStatus(captureResult.log);
                if (captureResult.success) {
                    this.captureEnemy(unit);
                    this.endTurn(); // 收服成功結束回合
                } else {
                    // 收服失敗，敵人反擊 (簡化)
                    unit.takeDamage(this.selectedUnit, true); // 仍算一次行動
                    this.endTurn(); 
                }
            } else {
                game.updateStatus("操作無效或超出攻擊範圍。");
            }
        }
    }

    highlightUnitRanges(unit, mode) {
        this.clearHighlights();
        const range = mode === 'MOVE' ? unit.moveRange : unit.attackRange;
        const color = mode === 'MOVE' ? 0x00FF00 : 0xFF0000; // 移動綠，攻擊紅

        this.highlightGraphics.fillStyle(color, 0.3);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const distance = Math.abs(x - unit.x) + Math.abs(y - unit.y);
                if (distance > 0 && distance <= range) {
                    // 檢查是否沒有單位 (移動) 或是否有敵方單位 (攻擊)
                    const targetUnit = this.getUnitAt(x, y);
                    const shouldHighlight = (mode === 'MOVE' && !targetUnit) || (mode === 'ATTACK' && targetUnit && !targetUnit.isPlayerUnit);

                    if (shouldHighlight) {
                        this.highlightGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }

    clearHighlights() {
        this.highlightGraphics.clear();
        this.selectedUnit = null;
    }

    getUnitAt(x, y) {
        return [...this.playerUnits, ...this.enemyUnits].find(u => u.x === x && u.y === y);
    }

    captureEnemy(unit) {
        // 5. 收服過來的怪物就變主角的
        this.enemyUnits = this.enemyUnits.filter(e => e !== unit);
        
        // 將怪物的**數據**加入主角隊伍
        game.player.addMonster(MONSTER_DATA[unit.id], unit.data.level);
        
        // 移除 Phaser 物件
        unit.destroy();
        this.checkBattleEnd();
    }

    checkBattleEnd(target = null) {
        if (target && target.isDefeated()) {
            (target.isPlayerUnit ? this.playerUnits : this.enemyUnits)
                .find((u, i, arr) => {
                    if (u === target) {
                        arr.splice(i, 1);
                        u.destroy();
                        return true;
                    }
                    return false;
                });
        }
        
        if (this.enemyUnits.length === 0) {
            this.exitBattle("🎉 恭喜你，戰勝了關卡！");
        } else if (this.playerUnits.length === 0) {
            this.exitBattle("戰鬥失敗，你的單位已全滅。");
        }
    }

    endTurn() {
        this.clearHighlights();
        this.turn = (this.turn === 'PLAYER') ? 'ENEMY' : 'PLAYER';
        game.updateStatus(`回合: ${this.turn}`);
        
        if (this.turn === 'ENEMY') {
            // 敵人回合 (簡化：第一個敵人攻擊第一個玩家單位)
            this.time.delayedCall(1000, () => {
                if (this.enemyUnits.length > 0 && this.playerUnits.length > 0) {
                    const attacker = this.enemyUnits[0];
                    const target = this.playerUnits[0];
                    const log = attacker.takeDamage(target, false);
                    game.updateStatus(`敵方行動: ${log}`);
                    this.checkBattleEnd(target);
                }
                this.turn = 'PLAYER';
                this.actionPhase = 'MOVE';
                game.updateStatus(`回合: ${this.turn}`);
            }, [], this);
        }
    }

    // 1. 戰勝後回到大地圖
    exitBattle(message) {
        // 戰鬥結束後，將當前隊伍狀態存回 PlayerState
        this.playerUnits.forEach(unit => {
            const index = game.player.roster.findIndex(r => r.id === unit.id);
            if (index !== -1) {
                game.player.roster[index].currentHp = unit.currentHp;
            }
        });

        alert(message);
        this.scene.start('WorldMapScene');
    }
}


// --- 7. 遊戲主實例化與 UI 控制 ---
const config = {
    type: Phaser.AUTO,
    width: MAP_WIDTH * TILE_SIZE,
    height: MAP_HEIGHT * TILE_SIZE,
    parent: 'game-area', 
    scene: [WorldMapScene, BattleScene], 
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};

const game = new Phaser.Game(config);

// 設置主角狀態
game.player = new PlayerState();

// 設置全局 UI 函數
game.updateStatus = (text) => {
    document.getElementById('status-display').textContent = text;
};
game.showModal = () => document.getElementById('modal-backdrop').classList.remove('hidden');
game.hideModal = () => document.getElementById('modal-backdrop').classList.add('hidden');

// --- 8. UI 事件監聽 ---
document.getElementById('roster-btn').onclick = () => {
    game.showModal();
    renderRosterModal();
};
document.getElementById('modal-close-btn').onclick = game.hideModal;

// --- 9. 圖鑑和放生 UI 渲染 (滿足 8, 9 條件) ---
function renderRosterModal() {
    const modalData = document.getElementById('modal-data');
    let html = '<h3>📚 圖鑑</h3><div class="monster-grid">';
    
    // 遍歷所有怪物基礎 ID (只抓取初階型態作為圖鑑入口)
    const allBaseIds = Object.keys(MONSTER_DATA).filter(id => id.endsWith('_01') || id.endsWith('_11'));

    allBaseIds.forEach(baseId => {
        const entry = game.player.pokedex[baseId];
        const isAcquired = entry && entry.count > 0;
        const className = isAcquired ? 'acquired' : '';

        // 追蹤進化鏈
        let evoChain = '';
        let currentId = baseId;
        while(currentId) {
            const data = MONSTER_DATA[currentId];
            const name = entry && entry.maxEvo === currentId ? `**${data.name}**` : data.name;
            evoChain += isAcquired ? (evoChain ? ' → ' : '') + name : '❓';
            if (currentId === entry?.maxEvo) break; // 只顯示到最高進化
            currentId = data.evoTo;
        }

        html += `
            <div class="monster-card ${className}">
                <h4>${isAcquired ? MONSTER_DATA[baseId].name + ' 系列' : '??? 未知系列'}</h4>
                <p>屬性: ${isAcquired ? MONSTER_DATA[baseId].attr : '?'}</p>
                <p>收服總數: **${entry?.count || 0}**</p>
                <p>進化鏈: ${evoChain}</p>
            </div>
        `;
    });
    html += '</div>';

    html += '<hr><h3>🎒 你的隊伍 (點擊進化或放生)</h3><div class="monster-grid">';
    game.player.roster.forEach((monster, index) => {
        const canEvolve = !!monster.evoTo;
        html += `
            <div class="monster-card acquired">
                <h4>[${index + 1}] ${monster.name} (Lv.${monster.level})</h4>
                <p>HP: ${Math.round(monster.currentHp)}/${monster.maxHp} | 攻擊: ${monster.attack}</p>
                <p>進化至: ${canEvolve ? MONSTER_DATA[monster.evoTo].name : '無'}</p>
                ${canEvolve ? `<button onclick="handleEvolve(${index})">花 $${monster.level * 10} 進化</button>` : ''}
                <button onclick="handleRelease(${index})" style="background-color: #e84118;">放生</button>
            </div>
        `;
    });
    html += '</div>';

    modalData.innerHTML = html;
}

// 隊伍管理操作函數
window.handleEvolve = (index) => {
    const result = game.player.evolveMonster(index);
    alert(result.log);
    renderRosterModal(); // 刷新 UI
    if (game.scene.isActive('BattleScene')) {
        // 如果在戰鬥中進化，需要刷新戰場上的單位數據 (簡化處理)
    }
};

window.handleRelease = (index) => {
    if (game.player.roster.length <= 1) {
        alert("你至少需要保留一隻怪物！");
        return;
    }
    const released = game.player.releaseMonster(index);
    if (released) {
        alert(`已放生 ${released.name}。`);
        renderRosterModal(); // 刷新 UI
    }
};