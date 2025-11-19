/**
 * SRPG 遊戲核心邏輯 - 基礎架構 (Phase 1)
 * * 實現功能:
 * 1. Phaser 遊戲初始化。
 * 2. 大地圖場景 (WorldMapScene) 顯示。
 * 3. 點擊大地圖上的關卡點，切換到戰鬥場景 (BattleScene)。
 * 4. 戰鬥場景中，點擊勝利按鈕，切換回大地圖。
 */

// --- 遊戲配置 ---
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [WorldMapScene, BattleScene], // 定義場景順序
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

let game = new Phaser.Game(config);


// --- 1. 大地圖場景 (WorldMapScene) ---
class WorldMapScene extends Phaser.Scene {
    constructor() {
        super('WorldMapScene');
    }

    preload() {
        // 由於我們沒有外部圖片，先用 Phaser 內建的圖形來模擬資源
        this.load.image('map_bg', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAJACAIAAADuExxFAAAAA3NCSVQICAjb4U/gAAAAFElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAABfBoAAAZQd8iYAAAAASUVORK5CYII='); // 800x600 灰色背景
        this.load.image('level_icon', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAAB4sgndAAAAaklEQVRYhe2TQQrAMAwEf9Z+9x1vCAHBEQ4iP6Sg48jO0+0QkH0fI+v2+0BAb6b4XQ0gIDJqA8B6YgNA8rIcgH6eA0jyMgzAoJ9lAKvIAgIqB2DqNhoAYB/Q5mU4AEB3y0l/rCq5nQdD03jFwAAAABJRU5ErkJggg=='); // 藍色方塊
    }

    create() {
        this.cameras.main.setBackgroundColor('#88B04B'); // 模擬大地圖綠色背景

        this.add.text(config.width / 2, 50, '世界地圖 - 選擇關卡', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);

        // 模擬關卡點 1
        this.createLevelIcon(200, 300, '關卡 1 - 火山口', 'level_1');

        // 模擬關卡點 2
        this.createLevelIcon(500, 450, '關卡 2 - 冰雪洞', 'level_2');

        // 加入怪物圖鑑按鈕 (條件 9: 暫時只做切換功能)
        const pokedexButton = this.add.text(700, 50, '怪物圖鑑', { fontSize: '20px', fill: '#000', backgroundColor: '#DDD', padding: 5 })
            .setInteractive()
            .on('pointerdown', () => {
                // TODO: Phase 5 - 切換到圖鑑場景 (PokedexScene)
                console.log('進入圖鑑');
            });
    }

    createLevelIcon(x, y, text, levelKey) {
        const icon = this.add.sprite(x, y, 'level_icon').setScale(1.5).setInteractive();
        const label = this.add.text(x, y + 30, text, { fontSize: '18px', fill: '#000' }).setOrigin(0.5);

        icon.on('pointerover', () => icon.setTint(0xff8800));
        icon.on('pointerout', () => icon.setTint(0xffffff));

        icon.on('pointerdown', () => {
            console.log(`進入 ${levelKey}: ${text}`);
            // 切換到戰鬥場景，並傳遞關卡資訊
            this.scene.start('BattleScene', { level: levelKey, name: text });
        });
    }
}


// --- 2. 戰鬥場景 (BattleScene) ---
class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        this.levelData = null;
    }

    init(data) {
        // 接收從大地圖傳來的關卡數據
        this.levelData = data;
    }

    create() {
        this.cameras.main.setBackgroundColor('#6A5ACD'); // 模擬戰場紫色背景

        this.add.text(config.width / 2, 50, `進入關卡: ${this.levelData.name}`, { fontSize: '28px', fill: '#FFF' }).setOrigin(0.5);
        
        // 模擬戰鬥場景的基礎地圖，此處應是網格地圖 (Phase 3 實現)
        this.add.rectangle(config.width / 2, config.height / 2, 600, 400, 0x36454F)
            .setStrokeStyle(4, 0xFFFFFF)
            .setAlpha(0.8);

        this.add.text(config.width / 2, config.height / 2, 'SRPG 戰鬥進行中...', { fontSize: '36px', fill: '#FFD700' }).setOrigin(0.5);

        // --- 模擬戰勝後回到大地圖的按鈕 (條件 1) ---
        const winButton = this.add.text(config.width - 150, config.height - 50, '<< 戰勝！返回大地圖', { 
                fontSize: '22px', 
                fill: '#000', 
                backgroundColor: '#00FF00', 
                padding: 10 
            })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => this.endBattle(true));
    }

    /**
     * 結束戰鬥的邏輯
     * @param {boolean} isWin - 是否勝利
     */
    endBattle(isWin) {
        if (isWin) {
            alert(`恭喜您戰勝 ${this.levelData.name}！`);
        } else {
            alert(`挑戰 ${this.levelData.name} 失敗...`);
        }
        // 回到大地圖場景
        this.scene.start('WorldMapScene');
    }

    update() {
        // 戰鬥邏輯將在後續步驟中填充
    }
}