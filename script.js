/**
 * 核心遊戲邏輯：定義屬性、怪物類、主角類、遊戲狀態機
 */

// 1. 定義屬性及其相剋關係
const ATTRIBUTES = {
    FIRE: '火',
    WATER: '水',
    WIND: '風',
    EARTH: '地'
};

// 屬性相剋表 (攻擊方 -> 防禦方)
// 傷害倍率： 2.0 (剋制), 0.5 (被剋), 1.0 (普通)
const ATTRIBUTE_ADVANTAGE = {
    [ATTRIBUTES.FIRE]: { [ATTRIBUTES.WIND]: 2.0, [ATTRIBUTES.WATER]: 0.5 },
    [ATTRIBUTES.WATER]: { [ATTRIBUTES.FIRE]: 2.0, [ATTRIBUTES.EARTH]: 0.5 },
    [ATTRIBUTES.WIND]: { [ATTRIBUTES.EARTH]: 2.0, [ATTRIBUTES.FIRE]: 0.5 },
    [ATTRIBUTES.EARTH]: { [ATTRIBUTES.WATER]: 2.0, [ATTRIBUTES.WIND]: 0.5 }
};

// 2. 怪物數據和進化鏈
const MONSTER_DATA = {
    // 火屬性
    'F_01_IMP': { name: '火小鬼', attr: ATTRIBUTES.FIRE, baseStats: { hp: 40, atk: 15 }, evoTo: 'F_02_FIEND' },
    'F_02_FIEND': { name: '火惡魔', attr: ATTRIBUTES.FIRE, baseStats: { hp: 60, atk: 25 }, evoTo: 'F_03_BLAZER' },
    'F_03_BLAZER': { name: '烈焰王', attr: ATTRIBUTES.FIRE, baseStats: { hp: 80, atk: 35 }, evoTo: null },
    'F_11_LIZARD': { name: '火焰蜥蜴', attr: ATTRIBUTES.FIRE, baseStats: { hp: 50, atk: 12 }, evoTo: 'F_12_DRAGON' },
    'F_12_DRAGON': { name: '火龍', attr: ATTRIBUTES.FIRE, baseStats: { hp: 70, atk: 22 }, evoTo: 'F_13_DRAKO' },
    'F_13_DRAKO': { name: '火神龍', attr: ATTRIBUTES.FIRE, baseStats: { hp: 90, atk: 32 }, evoTo: null },
    // 水屬性 (省略其他屬性，但結構相同)
    'W_01_SLIME': { name: '水史萊姆', attr: ATTRIBUTES.WATER, baseStats: { hp: 50, atk: 10 }, evoTo: 'W_02_GEL' },
    'W_02_GEL': { name: '水凝膠', attr: ATTRIBUTES.WATER, baseStats: { hp: 70, atk: 20 }, evoTo: 'W_03_OCEAN' },
    'W_03_OCEAN': { name: '深海巨獸', attr: ATTRIBUTES.WATER, baseStats: { hp: 90, atk: 30 }, evoTo: null },
    // 風屬性
    'WI_01_BIRD': { name: '小風鳥', attr: ATTRIBUTES.WIND, baseStats: { hp: 45, atk: 14 }, evoTo: 'WI_02_EAGLE' },
    // 地屬性
    'E_01_GOLEM': { name: '小石魔', attr: ATTRIBUTES.EARTH, baseStats: { hp: 60, atk: 8 }, evoTo: 'E_02_TITAN' },
};


// 3. 怪物類 (Monster Class)
class Monster {
    constructor(id, level = 1, isWild = false) {
        this.id = id; // 唯一識別碼，如 'F_01_IMP'
        const data = MONSTER_DATA[id];
        this.name = data.name;
        this.attribute = data.attr;
        this.level = level;
        this.isWild = isWild; // 是否為野生怪物
        this.baseId = this.getBaseId(id); // 用於圖鑑追蹤 (例如：F_01_IMP 的 baseId 也是 F_01)

        // 屬性計算 (簡化處理)
        this.maxHp = data.baseStats.hp + level * 5;
        this.currentHp = this.maxHp;
        this.attack = data.baseStats.atk + level * 2;
        this.canEvolve = !!data.evoTo;
        this.evoToId = data.evoTo;
    }

    getBaseId(id) {
        // 從 'F_01_IMP' 取得 'F_01'
        const parts = id.split('_');
        return `${parts[0]}_${parts[1]}`;
    }

    getDamageMultiplier(targetAttribute) {
        return ATTRIBUTE_ADVANTAGE[this.attribute][targetAttribute] || 1.0;
    }

    // 模擬攻擊 (SRPG/RSLG 戰鬥核心)
    attackTarget(target) {
        const multiplier = this.getDamageMultiplier(target.attribute);
        const damage = Math.round(this.attack * multiplier);
        target.currentHp -= damage;

        let combatLog = `${this.name} (${this.attribute}) 攻擊 ${target.name} (${target.attribute})，造成 ${damage} 點傷害。`;
        if (multiplier > 1.0) combatLog += ' 效果絕佳！';
        if (multiplier < 1.0) combatLog += ' 效果不彰。';
        
        return combatLog;
    }

    // 進化邏輯
    evolve() {
        if (!this.canEvolve) return null;
        const newMonster = new Monster(this.evoToId, this.level);
        return newMonster;
    }

    // 顯示資訊 (用於圖鑑)
    getCardHTML() {
        return `
            <div class="monster-card" data-id="${this.id}">
                <h4>${this.name} (Lv.${this.level})</h4>
                <p>屬性: ${this.attribute} | HP: ${this.currentHp}/${this.maxHp} | 攻擊力: ${this.attack}</p>
                <p>進化至: ${this.evoToId ? MONSTER_DATA[this.evoToId].name : '無'}</p>
                ${!this.isWild ? `<button onclick="game.tryEvolve('${this.id}')">嘗試進化</button>` : ''}
            </div>
        `;
    }
}


// 4. 主角/玩家類 (Player Class)
class Player {
    constructor() {
        this.name = "主角";
        this.level = 1;
        this.gold = 500;
        this.roster = []; // 隊伍中的怪物實例
        this.pokedex = {}; // 圖鑑: { baseId: { count: number, maxEvo: string/id } }
        this.currentStage = 'WORLD_MAP'; // 當前狀態
    }

    // 6. 主角原本就有各屬性的怪物幾隻
    initializeRoster() {
        this.roster.push(new Monster('F_01_IMP', 5));
        this.roster.push(new Monster('W_01_SLIME', 5));
        this.roster.push(new Monster('WI_01_BIRD', 5));
        this.roster.push(new Monster('E_01_GOLEM', 5));
        
        // 初始化圖鑑
        this.roster.forEach(m => this.addToPokedex(m));
    }

    // 5. 召喚/收服怪物 (將怪物實例加入隊伍)
    addMonster(monster) {
        monster.isWild = false;
        this.roster.push(monster);
        this.addToPokedex(monster);
    }

    // 8. 更新圖鑑
    addToPokedex(monster) {
        const baseId = monster.getBaseId(monster.id);
        const currentId = monster.id;
        
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
    releaseMonster(monsterIndex) {
        if (monsterIndex >= 0 && monsterIndex < this.roster.length) {
            const releasedMonster = this.roster.splice(monsterIndex, 1)[0];
            
            // 由於圖鑑只追蹤種類和數量，我們需要減少數量
            const baseId = releasedMonster.getBaseId(releasedMonster.id);
            if (this.pokedex[baseId]) {
                this.pokedex[baseId].count--;
                if (this.pokedex[baseId].count <= 0) {
                    // 即使數量歸零，圖鑑紀錄 (maxEvo) 仍保留
                    this.pokedex[baseId].count = 0;
                }
            }
            return releasedMonster;
        }
        return null;
    }
}


// 5. 遊戲主類 (Game Class) - 負責狀態管理和 UI 互動
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusDisplay = document.getElementById('status-display');
        this.player = new Player();
        this.player.initializeRoster(); // 初始化主角隊伍
        
        this.gameState = 'WORLD_MAP'; // WORLD_MAP | STAGE_BATTLE
        this.currentStage = null; // 當前關卡數據

        this.render();
    }

    // 繪製遊戲畫面
    render() {
        this.ctx.fillStyle = this.gameState === 'WORLD_MAP' ? '#0a3d62' : '#57606f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';

        if (this.gameState === 'WORLD_MAP') {
            // 1. 大地圖繪製和關卡選項
            this.ctx.fillText("🌎 大地圖 - 選擇關卡", this.canvas.width / 2, 50);
            
            // 模擬三個關卡
            this.drawStageButton(1, 150, "🔥 火焰峽谷 (Lv.10)", [new Monster('F_11_LIZARD', 10, true)]);
            this.drawStageButton(2, 250, "💧 潮濕洞穴 (Lv.12)", [new Monster('W_01_SLIME', 12, true), new Monster('E_01_GOLEM', 10, true)]);
            this.drawStageButton(3, 350, "✅ 已通關綠洲", null);
            
        } else if (this.gameState === 'STAGE_BATTLE') {
            // 1. 關卡地圖繪製 (簡化戰鬥畫面)
            this.ctx.fillText(`⚔️ 關卡: ${this.currentStage.name}`, this.canvas.width / 2, 50);
            
            // 顯示敵我雙方
            this.ctx.textAlign = 'left';
            this.ctx.font = '18px Arial';
            this.ctx.fillText("你的隊伍:", 50, 100);
            this.player.roster.slice(0, 3).forEach((m, i) => {
                 this.ctx.fillText(`${i+1}. ${m.name} [${m.attribute}] HP:${m.currentHp}/${m.maxHp}`, 50, 130 + i * 30);
            });

            this.ctx.textAlign = 'right';
            this.ctx.fillText("敵人隊伍:", this.canvas.width - 50, 100);
            this.currentStage.enemies.forEach((m, i) => {
                 this.ctx.fillText(`${m.name} [${m.attribute}] HP:${m.currentHp}/${m.maxHp}`, this.canvas.width - 50, 130 + i * 30);
            });

            this.ctx.textAlign = 'center';
            this.ctx.font = '16px Arial';
            this.ctx.fillText("點擊 Canvas 進行一輪戰鬥 (回合制)", this.canvas.width / 2, 450);
            this.ctx.fillText("使用技能：[1]普通攻擊 [2]收服魔法 [3]回大地圖(逃跑)", this.canvas.width / 2, 500);
        }

        // 更新狀態面板
        this.statusDisplay.textContent = `狀態: ${this.gameState} | 黃金: ${this.player.gold} | 怪物數量: ${this.player.roster.length}`;
    }

    // 點擊大地圖上的關卡
    drawStageButton(id, y, text, enemies) {
        this.ctx.fillStyle = enemies ? '#e67e22' : '#27ae60';
        const x = this.canvas.width / 2 - 100;
        const width = 200;
        const height = 40;
        this.ctx.fillRect(x, y - height/2, width, height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '18px Arial';
        this.ctx.fillText(text, this.canvas.width / 2, y + 5);

        if (enemies) {
            // 設置點擊區域
            this.canvas.onclick = (event) => {
                const rect = this.canvas.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const clickY = event.clientY - rect.top;

                if (clickX >= x && clickX <= x + width && clickY >= y - height/2 && clickY <= y + height/2) {
                    this.enterStage(id, text, enemies);
                }
            };
        } else {
            // 已通關的區域，取消點擊事件，或在 enterStage 中處理
            this.canvas.onclick = null;
        }
    }

    // 1. 進入關卡
    enterStage(id, name, enemies) {
        if (!enemies) return; // 已通關
        this.gameState = 'STAGE_BATTLE';
        this.currentStage = { id, name, enemies: enemies.map(e => new Monster(e.id, e.level, true)), log: [] };
        this.canvas.onclick = (event) => this.handleBattleClick(event);
        this.render();
    }

    // 1. 戰勝後回到大地圖
    showWorldMap(message = null) {
        this.gameState = 'WORLD_MAP';
        this.currentStage = null;
        this.canvas.onclick = null; // 重置點擊事件
        
        if (message) {
             alert(message);
        }
        
        this.render();
    }

    // 戰鬥邏輯簡化
    handleBattleClick(event) {
        const battleLog = document.getElementById('status-display');
        battleLog.textContent = '戰鬥中...';
        
        const playerMonster = this.player.roster[0]; // 簡化：只用隊伍第一隻
        const wildMonster = this.currentStage.enemies[0]; // 簡化：只打第一隻敵人

        if (!playerMonster || !wildMonster) {
            this.showWorldMap("戰鬥結束。");
            return;
        }

        // 8. 主角技能 - 收服魔法 (簡化：若敵方HP低於20%且玩家發動收服)
        const action = prompt("請輸入動作: 1.攻擊, 2.收服魔法, 3.逃跑 (輸入數字)");
        
        if (action === '3') {
            this.showWorldMap("你成功逃跑了。");
            return;
        }

        let log = '';
        if (action === '2') {
            // 7. 收服魔法
            const captureRate = (wildMonster.maxHp - wildMonster.currentHp) / wildMonster.maxHp;
            if (Math.random() < captureRate) { // 血量越低，成功率越高
                log = `🎉 收服魔法成功！你收服了 ${wildMonster.name}！`;
                this.player.addMonster(wildMonster); // 5. 收服過來的怪物就變主角的
                this.showWorldMap(log);
                return;
            } else {
                log = `收服魔法失敗！收服率: ${Math.round(captureRate*100)}%。`;
            }
        } else {
            // 普通攻擊
            log = playerMonster.attackTarget(wildMonster);
        }

        // 敵人反擊
        if (wildMonster.currentHp > 0) {
            log += " | " + wildMonster.attackTarget(playerMonster);
        }
        
        // 檢查戰鬥結果
        if (wildMonster.currentHp <= 0) {
            log += ` | ${wildMonster.name} 被擊敗！`;
            this.currentStage.enemies.shift(); // 移除敵人
            if (this.currentStage.enemies.length === 0) {
                 this.showWorldMap(`🎉 恭喜你，戰勝了關卡 ${this.currentStage.name}！`);
            }
        } else if (playerMonster.currentHp <= 0) {
            log += ` | ${playerMonster.name} 被擊敗！`;
            this.showWorldMap("你的怪物已全滅，戰鬥失敗！");
        }

        battleLog.textContent = log; // 顯示戰鬥日誌
        this.render(); // 重新繪製畫面
    }

    // 8. 顯示圖鑑/隊伍
    showRoster() {
        this.showModal();
        const modalData = document.getElementById('modal-data');
        let html = '<h2>📖 怪物圖鑑 (收服數量 / 最高進化)</h2>';
        
        // 遍歷所有怪物基礎 ID (例如 F_01, F_11, W_01...)
        const allBaseIds = new Set(Object.values(MONSTER_DATA).map(data => data.baseStats ? new Monster(Object.keys(MONSTER_DATA).find(key => MONSTER_DATA[key] === data), 1).getBaseId(Object.keys(MONSTER_DATA).find(key => MONSTER_DATA[key] === data)) : null).filter(id => id && id.endsWith('_01') || id.endsWith('_11')));

        allBaseIds.forEach(baseId => {
            const entry = this.player.pokedex[baseId];
            
            if (entry && entry.count > 0) {
                // 已有的怪物
                const currentMonsterData = MONSTER_DATA[entry.maxEvo];
                let evoChain = currentMonsterData.name;
                let currentEvo = currentMonsterData.evoTo;
                // 顯示進化鏈
                while(currentEvo) {
                    evoChain += ` -> ${MONSTER_DATA[currentEvo].name}`;
                    currentEvo = MONSTER_DATA[currentEvo].evoTo;
                }

                html += `
                    <div class="monster-card">
                        <h3>${currentMonsterData.name} 系列</h3>
                        <p>收服數量: **${entry.count}**</p>
                        <p>最高進化: ${MONSTER_DATA[entry.maxEvo].name}</p>
                        <p>進化鏈: ${evoChain}</p>
                    </div>
                `;
            } else {
                // 未取的的怪物顯示問號
                html += `
                    <div class="monster-card" style="opacity: 0.6;">
                        <h3>??? 未知怪物系列</h3>
                        <p>收服數量: **0**</p>
                        <p>最高進化: ???</p>
                        <p>進化鏈: ??? -> ??? -> ???</p>
                    </div>
                `;
            }
        });
        
        html += '<hr><h2>🦸 你的隊伍 (可選擇放生)</h2>';
        this.player.roster.forEach((monster, index) => {
            html += `
                <div class="monster-card">
                    <h4>[${index + 1}] ${monster.name} (Lv.${monster.level})</h4>
                    <p>屬性: ${monster.attribute} | HP: ${monster.currentHp}/${monster.maxHp} | 攻擊力: ${monster.attack}</p>
                    <button onclick="game.releaseMonsterAction(${index})">放生這隻</button>
                </div>
            `;
        });

        modalData.innerHTML = html;
    }

    // 9. 放生怪物操作
    releaseMonsterAction(index) {
        const released = this.player.releaseMonster(index);
        if (released) {
            alert(`已放生 ${released.name}。`);
            this.showRoster(); // 重新整理圖鑑/隊伍
            this.render(); // 重新繪製畫面
        }
    }
    
    // 4. 怪物進化操作
    tryEvolve(monsterId) {
        // 尋找隊伍中的該怪物實例
        const index = this.player.roster.findIndex(m => m.id === monsterId);
        if (index === -1) {
            alert("找不到該怪物。");
            return;
        }

        const oldMonster = this.player.roster[index];
        if (!oldMonster.canEvolve) {
            alert(`${oldMonster.name} 無法再進化了！`);
            return;
        }
        
        // 簡化：消耗金錢進化
        const cost = 100;
        if (this.player.gold < cost) {
            alert(`金錢不足！進化需要 ${cost} 金幣。`);
            return;
        }

        this.player.gold -= cost;
        const newMonster = oldMonster.evolve();
        
        if (newMonster) {
            this.player.roster[index] = newMonster; // 替換舊怪物
            this.player.addToPokedex(newMonster); // 更新圖鑑
            alert(`🎉 ${oldMonster.name} 成功進化成 ${newMonster.name}！`);
            this.showRoster(); // 重新整理圖鑑/隊伍
            this.render(); // 重新繪製畫面
        } else {
            alert("進化失敗。");
        }
    }
    

    // 模態視窗控制
    showModal() {
        document.getElementById('modal-backdrop').classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('modal-backdrop').classList.add('hidden');
    }
}

// 啟動遊戲
const game = new Game();