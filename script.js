const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 48;
let state = 'world'; // world, battle, pokedex, release
let worldX = 0, worldY = 0;
let selectedMonster = null; // 戰鬥中選中的己方怪物
let turn = 'player'; // player or enemy
let cursor = {x:0, y:0};
let message = '';
let messageTimer = 0;

// 屬性相剋表
const typeChart = {
  water: { strong: 'fire', weak: 'wind' },
  fire:  { strong: 'wind', weak: 'water' },
  wind:  { strong: 'earth', weak: 'fire' },
  earth: { strong: 'water', weak: 'wind' }
};

// 所有怪物定義（4屬性 × 2種 × 2進化 = 16種）
const monsterDB = {
  // 水
  bubble:   {name:'泡泡怪',     type:'water', evo: 'aqua',   hp:30, atk:8,  def:10, spd:12},
  aqua:     {name:'水靈王',     type:'water', hp:70, atk:20, def:25, spd:18},
  droplet:  {name:'水滴精',     type:'water', evo: 'wave',   hp:25, atk:12, def:8,  spd:15},
  wave:     {name:'巨浪龍',     type:'water', hp:80, atk:25, def:20, spd:14},
  // 火
  ember:    {name:'小火球',     type:'fire', evo: 'flame',  hp:35, atk:15, def:8,  spd:14},
  flame:    {name:'炎魔獸',     type:'fire', hp:75, atk:30, def:18, spd:20},
  spark:    {name:'電火蟲',     type:'fire', evo: 'blaze',  hp:28, atk:18, def:10, spd:22},
  blaze:    {name:'鳳凰',       type:'fire', hp:65, atk:35, def:15, spd:30},
  // 風
  breeze:   {name:'微風精靈',   type:'wind', evo: 'storm',  hp:30, atk:12, def:8,  spd:25},
  storm:    {name:'暴風龍',     type:'wind', hp:70, atk:28, def:15, spd:35},
  gust:     {name:'風刃鳥',     type:'wind', evo: 'tornado',hp:32, atk:14, def:10, spd:28},
  tornado:  {name:'龍捲鳳',     type:'wind', hp:75, atk:32, def:18, spd:40},
  // 地
  pebble:   {name:'石頭怪',     type:'earth', evo: 'rock',   hp:40, atk:10, def:20, spd:8},
  rock:     {name:'岩石巨人',   type:'earth', hp:90, atk:22, def:40, spd:10},
  sand:     {name:'沙蟲',       type:'earth', evo: 'golem',  hp:45, atk:12, def:18, spd:12},
  golem:    {name:'大地古神',   type:'earth', hp:100,atk:25, def:45, spd:15}
};

// 玩家初始怪物
let playerMonsters = [
  {id:'bubble', lv:5, exp:0, hp:30, maxhp:30},
  {id:'ember',  lv:5, exp:0, hp:35, maxhp:35},
  {id:'breeze', lv:5, exp:0, hp:30, maxhp:30},
  {id:'pebble', lv:5, exp:0, hp:40, maxhp:40}
];

// 玩家擁有的怪物種類統計（用於圖鑑）
let owned = {}; // id => {count: n, seen: true}
playerMonsters.forEach(m=>{ owned[m.id] = {count:(owned[m.id]?.count||0)+1, seen:true}; });

// 關卡定義
const stages = [
  {name:'森林試煉', x:3, y:2, enemies:['droplet','gust','sand'], cleared:false},
  {name:'火山深淵', x:7, y:5, enemies:['spark','pebble','breeze'], cleared:false},
  {name:'天空之塔', x:10, y:1, enemies:['wave','blaze','rock'], cleared:false},
  {name:'最終試煉', x:12, y:8, enemies:['tornado','golem','aqua','flame'], cleared:false}
];

// 目前戰鬥資料
let battle = null;

// 世界地圖
const worldMap = [
  "11111111111111111111",
  "10000000000000000001",
  "10202020202020200001",
  "10000000000000200001",
  "10020202020200000001",
  "10000000000020202001",
  "10202020202000000001",
  "10000000000000000001",
  "10020202020202020001",
  "10000000000000000001",
  "10202020202020200001",
  "10000000000000000001",
  "11111111111111111111"
]; // 0空 1牆 2關卡

// 載入簡單像素圖（用 base64 內嵌，免外站）
const sprites = {};
function loadSprite(id, base64) {
  const img = new Image();
  img.src = base64;
  sprites[id] = img;
}

// 所有怪物簡易像素圖 (8x8 放大 6 倍變 48x48)
const monsterSprites = {
  bubble:  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVQoU42PQREAMAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  aqua:    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHklEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAF4oBVoanVEAAAAASUVORK5CYII=",
  droplet: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHUlEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAOkjCPsJq5UAAAAASUVORK5CYII=",
  wave:    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGUlEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  ember:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAG0lEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAKpBC7kAAAAASUVORK5CYII=",
  flame:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIElEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAEr5B6Q+9mEAAAAASUVORK5CYII=",
  spark:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  blaze:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIklEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAEr5B6Q+9mEAAAAASUVORK5CYII=",
  breeze:  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAOkjCPsJq5UAAAAASUVORK5CYII=",
  storm:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAH0lEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  gust:    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHklEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAOkjCPsJq5UAAAAASUVORK5CYII=",
  tornado: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  pebble:  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGUlEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  rock:    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIElEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==",
  sand:    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAOkjCPsJq5UAAAAASUVORK5CYII=",
  golem:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIklEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg=="
};
// 為了讓程式跑得動，先全部用同一個小圖（實際可自行替換）
Object.keys(monsterDB).forEach(id => {
  if(!monsterSprites[id]) monsterSprites[id] = monsterSprites.bubble;
  loadSprite(id, monsterSprites[id]);
});
loadSprite('player', "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKElEQVQoU42PQQRAAAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==");
loadSprite('stage', "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVQoU42PQREAMAgDsQ1Dks1P0S0D9JQI8R0z3gAAAABJRU5ErkJggg==");

// 開始遊戲
function startBattle(stage) {
  state = 'battle';
  battle = {
    stage,
    map: generateBattleMap(),
    playerUnits: playerMonsters.slice(0,4).map((m,i)=>({...m, x:1, y:i+1, team:'player', moved:false, acted:false})),
    enemyUnits: stage.enemies.map((id,i)=>({
      id, lv:8+Math.floor(Math.random()*5), exp:0,
      hp:monsterDB[id].hp*2, maxhp:monsterDB[id].hp*2,
      x:10, y:i+1, team:'enemy', moved:false, acted:false
    })),
    turn: 'player',
    selected: null,
    range: []
  };
  battle.enemyUnits.forEach(u=>{
    u.hp = u.maxhp = calcStat(u.id, u.lv, 'hp');
  });
}

function generateBattleMap() {
  let map = [];
  for(let y=0;y<12;y++){
    let row = [];
    for(let x=0;x<12;x++) row.push(0); // 0 = 普通地形
    map.push(row);
  }
  return map;
}

function calcStat(id, lv, stat) {
  const base = monsterDB[id][stat] || 10;
  return Math.floor(base * (lv/5) * (1 + Math.random()*0.2));
}

// 屬性傷害倍率
function getMultiplier(attackerType, defenderType) {
  if(typeChart[attackerType].strong === defenderType) return 2;
  if(typeChart[attackerType].weak === defenderType) return 0.5;
  return 1;
}

// 繪製
function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(state === 'world') drawWorld();
  else if(state === 'battle') drawBattle();
  
  // 訊息
  if(messageTimer>0){
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(100,500,760,80);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, 480, 550);
    messageTimer--;
  }
}

function drawWorld() {
  for(let y=0;y<worldMap.length;y++){
    for(let x=0;x<worldMap[y].length;x++){
      let tx = x*TILE - worldX;
      let ty = y*TILE - worldY;
      if(tx < -TILE || tx > canvas.width || ty < -TILE || ty > canvas.height) continue;
      if(worldMap[y][x]==='1'){
        ctx.fillStyle = '#444';
        ctx.fillRect(tx,ty,TILE,TILE);
      }else if(worldMap[y][x]==='2'){
        const stage = stages.find(s=>s.x===x && s.y===y);
        ctx.drawImage(sprites.stage, tx, ty, TILE, TILE);
        if(stage && stage.cleared) {
          ctx.fillStyle = 'rgba(0,255,0,0.5)';
          ctx.fillRect(tx,ty,TILE,TILE);
        }
      }
    }
  }
  // 玩家
  ctx.drawImage(sprites.player, 480-24, 300-24, 48,48);
}

function drawBattle() {
  // 地圖
  for(let y=0;y<12;y++) for(let x=0;x<12;x++){
    ctx.fillStyle = '#333';
    ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(x*TILE, y*TILE, TILE, TILE);
  }
  
  // 單位
  [...battle.playerUnits, ...battle.enemyUnits].forEach(u=>{
    if(u.hp <= 0) return;
    const spr = sprites[u.id] || sprites.bubble;
    ctx.drawImage(spr, u.x*TILE, u.y*TILE, TILE, TILE);
    // 血條
    ctx.fillStyle = '#000';
    ctx.fillRect(u.x*TILE, u.y*TILE-8, TILE, 6);
    ctx.fillStyle = u.team==='player'?'#0f0':'#f00';
    ctx.fillRect(u.x*TILE+1, u.y*TILE-7, (u.hp/u.maxhp)*(TILE-2), 4);
  });
  
  // 移動範圍
  if(battle.range.length){
    battle.range.forEach(p=>{
      ctx.fillStyle = 'rgba(0,255,255,0.3)';
      ctx.fillRect(p.x*TILE, p.y*TILE, TILE, TILE);
    });
  }
  
  // 游標
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 3;
  ctx.strokeRect(cursor.x*TILE, cursor.y*TILE, TILE, TILE);
}

setInterval(draw, 100);

// 輸入
canvas.addEventListener('click', e=>{
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const tx = Math.floor(mx / TILE);
  const ty = Math.floor(my / TILE);

  if(state === 'world'){
    const wx = Math.floor((mx + worldX)/TILE);
    const wy = Math.floor((my + worldY)/TILE);
    const stage = stages.find(s=>s.x===wx && s.y===wy);
    if(stage){
      startBattle(stage);
    }
  }else if(state === 'battle'){
    handleBattleClick(tx, ty);
  }
});

document.addEventListener('keydown', e=>{
  if(state === 'world'){
    if(e.key==='ArrowLeft') worldX -= 32;
    if(e.key==='ArrowRight') worldX += 32;
    if(e.key==='ArrowUp') worldY -= 32;
    if(e.key==='ArrowDown') worldY += 32;
  }else if(state === 'battle'){
    if(e.key==='ArrowLeft') cursor.x = Math.max(0, cursor.x-1);
    if(e.key==='ArrowRight') cursor.x = Math.min(11, cursor.x+1);
    if(e.key==='ArrowUp') cursor.y = Math.max(0, cursor.y-1);
    if(e.key==='ArrowDown') cursor.y = Math.min(11, cursor.y+1);
    if(e.key===' ') handleBattleClick(cursor.x, cursor.y);
    if(e.key==='Escape'){ battle.selected=null; battle.range=[]; }
  }
});

function handleBattleClick(tx, ty){
  if(battle.turn !== 'player') return;
  
  const clickedUnit = [...battle.playerUnits, ...battle.enemyUnits].find(u=>u.x===tx && u.y===ty && u.hp>0);
  
  if(battle.selected){
    // 已選單位 → 移動或攻擊或技能
    if(battle.range.find(p=>p.x===tx && p.y===ty)){
      battle.selected.x = tx;
      battle.selected.y = ty;
      battle.selected.moved = true;
      showMessage('移動完成');
    }else if(clickedUnit && clickedUnit.team==='enemy' && distance(battle.selected, clickedUnit)<=2){
      attack(battle.selected, clickedUnit);
      battle.selected.acted = true;
    }else if(clickedUnit && clickedUnit.team==='player' && clickedUnit===battle.selected){
      // 點自己 → 開技能選單（簡化：直接用收服魔法）
      if(battle.selected.id === 'bubble'){ // 假設泡泡怪會收服魔法
        const target = battle.enemyUnits.find(u=>distance(battle.selected,u)<=3);
        if(target && Math.random()<0.6){
          captureMonster(target);
        }else{
          showMessage('收服失敗！');
        }
        battle.selected.acted = true;
      }
    }
    checkEndTurn();
  }else{
    // 選單位
    const unit = battle.playerUnits.find(u=>u.x===tx && u.y===ty && u.hp>0 && !u.moved);
    if(unit){
      battle.selected = unit;
      battle.range = getMoveRange(unit);
    }
  }
}

function distance(a,b){
  return Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
}

function getMoveRange(unit){
  let range = [];
  const spd = monsterDB[unit.id].spd || 10;
  const move = Math.floor(spd/8);
  for(let dx=-move;dx<=move;dx++){
    for(let dy=-move;dy<=move;dy++){
      if(Math.abs(dx)+Math.abs(dy)<=move){
        const nx=unit.x+dx, ny=unit.y+dy;
        if(nx>=0&&nx<12&&ny>=0&&ny<12) range.push({x:nx,y:ny});
      }
    }
  }
  return range;
}

function attack(attacker, defender){
  let dmg = monsterDB[attacker.id].atk || 10;
  dmg = Math.floor(dmg * getMultiplier(monsterDB[attacker.id].type, monsterDB[defender.id].type));
  dmg -= monsterDB[defender.id].def/2 || 5;
  dmg = Math.max(1, dmg + rand(-3,3));
  defender.hp -= dmg;
  showMessage(`${monsterDB[attacker.id].name} 對 ${monsterDB[defender.id].name} 造成 ${dmg} 傷害！`);
  if(defender.hp <= 0){
    showMessage(`${monsterDB[defender.id].name} 倒下！`);
    gainExp(attacker, defender.lv*10);
    if(defender.team==='enemy') checkBattleClear();
  }
}

function captureMonster(enemy){
  const m = {...enemy, hp:enemy.maxhp, x:0,y:0};
  playerMonsters.push(m);
  owned[enemy.id] = owned[enemy.id] || {count:0, seen:true};
  owned[enemy.id].count++;
  battle.enemyUnits = battle.enemyUnits.filter(u=>u!==enemy);
  showMessage(`成功收服 ${monsterDB[enemy.id].name}！`);
}

function gainExp(unit, exp){
  unit.exp += exp;
  if(unit.exp >= unit.lv*50){
    unit.lv++;
    unit.exp = 0;
    unit.maxhp += 8;
    unit.hp = unit.maxhp;
    showMessage(`${monsterDB[unit.id].name} 升級到 Lv.${unit.lv}！`);
    // 進化檢查
    const base = monsterDB[unit.id].evo;
    if(base && unit.lv >= 15){
      unit.id = base;
      showMessage(`${monsterDB[unit.id].name} 進化成了 ${monsterDB[base].name}！`);
    }
  }
}

function checkEndTurn(){
  if(battle.selected.moved && battle.selected.acted){
    battle.selected = null;
    battle.range = [];
    const allDone = battle.playerUnits.filter(u=>u.hp>0).every(u=>u.moved&&u.acted);
    if(allDone){
      battle.playerUnits.forEach(u=>{u.moved=false; u.acted=false;});
      battle.turn = 'enemy';
      setTimeout(enemyTurn, 1000);
    }
  }
}

function enemyTurn(){
  battle.enemyUnits.forEach(e=>{
    if(e.hp<=0) return;
    const target = battle.playerUnits.find(p=>p.hp>0);
    if(target && distance(e,target)<=2){
      attack(e, target);
    }else if(target){
      // 簡易AI：朝最近玩家移動
      const dx = target.x > e.x ? 1 : target.x < e.x ? -1 : 0;
      const dy = target.y > e.y ? 1 : target.y < e.y ? -1 : 0;
      e.x += dx; e.y += dy;
    }
  });
  battle.turn = 'player';
}

function checkBattleClear(){
  if(battle.enemyUnits.every(u=>u.hp<=0)){
    showMessage('關卡勝利！');
    battle.stage.cleared = true;
    setTimeout(()=>{state='world'; battle=null;}, 2000);
  }
  if(battle.playerUnits.every(u=>u.hp<=0)){
    showMessage('全滅…挑戰失敗');
    setTimeout(()=>{state='world'; battle=null;}, 2000);
  }
}

function showMessage(txt){
  message = txt;
  messageTimer = 120;
}

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

// 圖鑑
document.getElementById('pokedexBtn').onclick = ()=>{
  document.getElementById('pokedex').style.display = 'block';
  renderPokedex();
};
document.querySelectorAll('#pokedex .close')[0].onclick = ()=>{
  document.getElementById('pokedex').style.display = 'none';
};

// 放生
document.getElementById('releaseBtn').onclick = ()=>{
  document.getElementById('release').style.display = 'block';
  renderRelease();
};
document.querySelectorAll('#release .close')[0].onclick = ()=>{
  document.getElementById('release').style.display = 'none';
};

function renderPokedex(){
  const grid = document.getElementById('pokedexGrid');
  grid.innerHTML = '';
  Object.keys(monsterDB).forEach(id=>{
    const div = document.createElement('div');
    div.className = 'monster-card';
    if(owned[id]){
      div.innerHTML = `<img src="${monsterSprites[id]}" width=80 height=80><br>${monsterDB[id].name}<br>Lv.? ×${owned[id].count}`;
    }else{
      div.className += ' unknown';
      div.innerHTML = `<img src="${monsterSprites.bubble}" width=80 height=80><br>？？？<br><div class="count">0</div>`;
    }
    grid.appendChild(div);
  });
}

function renderRelease(){
  const grid = document.getElementById('releaseGrid');
  grid.innerHTML = '';
  playerMonsters.forEach((m,i)=>{
    const div = document.createElement('div');
    div.className = 'monster-card';
    div.innerHTML = `<img src="${monsterSprites[m.id]}" width=80 height=80><br>${monsterDB[m.id].name} Lv.${m.lv}`;
    div.onclick = ()=>{
      if(playerMonsters.length <= 1){ alert('至少要留一隻！'); return; }
      if(confirm(`確定要放生 ${monsterDB[m.id].name} 嗎？`)){
        playerMonsters.splice(i,1);
        owned[m.id].count--;
        if(owned[m.id].count<=0) owned[m.id].count=0;
        renderRelease();
      }
    };
    grid.appendChild(div);
  });
}

// 開始
showMessage('用方向鍵移動，點擊或空白鍵進入關卡！');