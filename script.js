// script.js

// 1. 定義地圖尺寸和圖塊尺寸
const TILE_SIZE = 40;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 15;

// 2. 屬性定義 (與前一個範例相同)
const ATTRIBUTES = { FIRE: '火', WATER: '水', WIND: '風', EARTH: '地' };
const ATTRIBUTE_ADVANTAGE = {
    [ATTRIBUTES.FIRE]: { [ATTRIBUTES.WIND]: 2.0, [ATTRIBUTES.WATER]: 0.5 },
    [ATTRIBUTES.WATER]: { [ATTRIBUTES.FIRE]: 2.0, [ATTRIBUTES.EARTH]: 0.5 },
    [ATTRIBUTES.WIND]: { [ATTRIBUTES.EARTH]: 2.0, [ATTRIBUTES.FIRE]: 0.5 },
    [ATTRIBUTES.EARTH]: { [ATTRIBUTES.WATER]: 2.0, [ATTRIBUTES.WIND]: 0.5 }
};

// 3. 怪物數據和進化 (簡化，僅為示例)
const MONSTER_DATA = {
    'F_01': { name: '火小鬼', attr: ATTRIBUTES.FIRE, evoTo: 'F_02', color: 0xFF0000 },
    'F_02': { name: '火惡魔', attr: ATTRIBUTES.FIRE, evoTo: 'F_03', color: 0xCC0000 },
    'W_01': { name: '水史萊姆', attr: ATTRIBUTES.WATER, evoTo: 'W_02', color: 0x0000FF },
    // 更多怪物...
};


// 4. 遊戲單元格 (Unit) 類 - 用於主角和怪物
class GameUnit extends Phaser.GameObjects.Container {
    constructor(scene, x, y, data, isPlayerUnit = false) {
        // 座標轉換為畫布像素
        super(scene, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        this.scene = scene;
        this.gridX = x;
        this.gridY = y;
        this.isPlayerUnit = isPlayerUnit;
        
        // 怪物數據
        this.id = data.id;
        this.name = data.name;
        this.attribute = data.attr;
        this.currentHp = 100; // 簡化數值
        this.attack = 20;

        // 繪製單元格圖形 (用圓形代表單位)
        const graphic = scene.add.circle(0, 0, TILE_SIZE / 2 - 5, data.color);
        graphic.setStrokeStyle(2, isPlayerUnit ? 0x00FF00 : 0xFFFF00); // 玩家單位綠邊，野生單位黃邊
        
        // 繪製名稱標籤
        const nameText = scene.add.text(0, 0, this.name[0], { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        this.add([graphic, nameText]);
        scene.add.existing(this); // 將容器加入場景

        // 點擊事件 (戰棋核心)
        graphic.setInteractive({ useHandCursor: true });
        graphic.on('pointerdown', () => this.handleUnitClick());
    }

    handleUnitClick() {
        if (this.scene.scene.key === 'BattleScene') {
             // 處理單元格點擊邏輯：移動、攻擊、技能選單等
            this.scene.game.statusText.setText(`點擊了 ${this.name} (${this.gridX}, ${this.gridY})`);
            
            if (this.isPlayerUnit) {
                // 如果是玩家單位，顯示移動範圍
                this.scene.highlightMovement(this.gridX, this.gridY, 3);
            } else {
                // 如果是敵方單位，可能顯示攻擊範圍或資訊
            }
        }
    }

    getDamageMultiplier(targetAttribute) {
        // 根據屬性相剋表計算傷害倍率
        return ATTRIBUTE_ADVANTAGE[this.attribute][targetAttribute] || 1.0;
    }
}


// 5. 大地圖場景 (WorldMapScene)
class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
        this.stages = [
            { id: 1, name: "火焰峽谷", x: 4, y: 5, enemies: ['F_01', 'F_01'] },
            { id: 2, name: "潮濕洞穴", x: 10, y: 8, enemies: ['W_01', 'F_01'] }
        ];
    }

    preload() {
        // 載入大地圖資源 (若有)
    }

    create() {
        this.add.text(20, 20, '🌎 大地圖 - 選擇關卡 (點擊關卡點)', { fontSize: '24px', fill: '#fff' });

        this.stages.forEach(stage => {
            // 繪製關卡點 (用星星表示)
            const star = this.add.star(
                stage.x * TILE_SIZE + TILE_SIZE / 2, 
                stage.y * TILE_SIZE + TILE_SIZE / 2, 
                5, 10, 20, 0xffff00 // 5角星，內半徑10，外半徑20
            );
            
            // 設置互動區域
            star.setInteractive({ useHandCursor: true });
            star.on('pointerdown', () => this.enterStage(stage));
            
            // 關卡名稱
            this.add.text(star.x, star.y + 25, stage.name, { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);
        });

        this.game.statusText.setText('狀態: 大地圖');
    }

    // 1. 進入關卡
    enterStage(stage) {
        this.scene.start('BattleScene', { stageData: stage, playerRoster: this.game.player.roster });
    }
}


// 6. 戰鬥場景 (BattleScene)
class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        this.mapGrid = []; // 網格數據
        this.playerUnits = [];
        this.enemyUnits = [];
    }

    init(data) {
        this.stageData = data.stageData;
        this.playerRoster = data.playerRoster; // 接收主角隊伍
    }

    create() {
        this.game.statusText.setText(`⚔️ 進入關卡: ${this.stageData.name}`);
        this.createMapGrid();
        this.placeUnits();
    }

    createMapGrid() {
        // 繪製地圖網格 (用矩形模擬圖塊)
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                // 簡化：交替顏色來顯示網格
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
                    TILE_SIZE, TILE_SIZE, 0xFFFFFF, 0.001 // 透明點擊區
                ).setInteractive().on('pointerdown', () => this.handleTileClick(x, y));
            }
        }
    }

    placeUnits() {
        // 放置玩家單位 (簡化：放在左下角)
        this.playerRoster.slice(0, 3).forEach((m, i) => {
            const unit = new GameUnit(this, 1 + i, MAP_HEIGHT - 2, m, true);
            this.playerUnits.push(unit);
        });

        // 放置敵方單位 (簡化：放在右上角)
        this.stageData.enemies.forEach((id, i) => {
            const data = { id, ...MONSTER_DATA[id] };
            const unit = new GameUnit(this, MAP_WIDTH - 2 - i, 1, data, false);
            this.enemyUnits.push(unit);
        });
    }

    // 點擊地圖方塊的核心處理函數
    handleTileClick(x, y) {
        this.game.statusText.setText(`點擊地圖方塊 (${x}, ${y})`);
        
        // 這裡將是戰棋遊戲的行動邏輯：
        // 1. 如果有單位被選中，檢查(x, y)是否在移動範圍內 -> 移動
        // 2. 否則，清除所有高亮
    }
    
    // 突出顯示移動範圍 (曼哈頓距離)
    highlightMovement(startX, startY, range) {
        this.children.each((child) => {
            if (child.name === 'highlight') {
                child.destroy();
            }
        });
        
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const distance = Math.abs(x - startX) + Math.abs(y - startY);
                if (distance > 0 && distance <= range) {
                    const rect = this.add.rectangle(
                        x * TILE_SIZE + TILE_SIZE / 2, 
                        y * TILE_SIZE + TILE_SIZE / 2, 
                        TILE_SIZE, TILE_SIZE, 0x00FF00, 0.3 // 綠色半透明
                    ).setDepth(-1); // 放在圖塊下方
                    rect.name = 'highlight'; // 標記為高亮以便清除
                }
            }
        }
    }

    // 1. 戰鬥結束回到大地圖 (點擊這裡的按鈕，或戰勝後自動調用)
    exitBattle(message) {
        alert(message);
        this.scene.start('WorldMapScene');
    }
}


// 7. 遊戲主程式配置
const config = {
    type: Phaser.AUTO,
    width: MAP_WIDTH * TILE_SIZE,
    height: MAP_HEIGHT * TILE_SIZE + 50, // 額外空間留給狀態欄
    parent: 'game-area', // 注入到 index.html 的 div 中
    scene: [WorldMapScene, BattleScene], // 定義兩個場景
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
};

// 8. 遊戲啟動實例化
const game = new Phaser.Game(config);

// 9. 全局狀態和 UI (因為 Phaser 不處理 DOM UI，我們手動添加一個狀態欄)
game.player = { // 模擬主角資料
    roster: [
        { id: 'F_01', name: '隊伍火怪', attr: ATTRIBUTES.FIRE, evoTo: 'F_02', color: 0xFF0000 },
        { id: 'W_01', name: '隊伍水怪', attr: ATTRIBUTES.WATER, evoTo: 'W_02', color: 0x0000FF },
        { id: 'E_01', name: '隊伍地怪', attr: ATTRIBUTES.EARTH, evoTo: null, color: 0x00FF00 },
    ],
    // 這裡可以加入您的圖鑑 (pokedex) 數據
};

// 創建遊戲狀態顯示區域
const statusTextElement = document.createElement('div');
statusTextElement.id = 'status-text';
statusTextElement.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 100%; background: #333; color: #fff; padding: 5px; text-align: center;';
document.getElementById('game-area').appendChild(statusTextElement);
game.statusText = {
    setText: (text) => statusTextElement.textContent = text
};

// 額外 UI 控制按鈕 (模擬您在 HTML 裡要的功能)
const btnPanel = document.createElement('div');
btnPanel.style.cssText = 'position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;';

const rosterBtn = document.createElement('button');
rosterBtn.textContent = '怪物圖鑑/隊伍';
rosterBtn.onclick = () => alert("這裡將彈出圖鑑模態框。"); // 實際邏輯需您在 HTML/CSS 中添加
btnPanel.appendChild(rosterBtn);

const exitBtn = document.createElement('button');
exitBtn.textContent = '回大地圖';
exitBtn.onclick = () => {
    // 只有在戰鬥場景才可回退
    const currentScene = game.scene.isActive('BattleScene') ? game.scene.getScene('BattleScene') : null;
    if (currentScene) {
         currentScene.exitBattle("你中途退出了戰鬥。");
    } else {
        alert("你已經在大地圖了。");
    }
};
btnPanel.appendChild(exitBtn);

document.getElementById('game-area').appendChild(btnPanel);