// 所有卡牌定義
const allCards = [
  { id: 1, name: "攻擊", cost: 1, type: "attack", value: 6, desc: "造成6點傷害" },
  { id: 2, name: "防禦", cost: 1, type: "defense", value: 5, desc: "獲得5點護甲" },
  { id: 3, name: "重擊", cost: 2, type: "attack", value: 9, desc: "造成9點傷害" },
  { id: 4, name: "鐵壁", cost: 2, type: "defense", value: 11, desc: "獲得11點護甲" },
  { id: 5, name: "狂暴", cost: 1, type: "attack", value: 8, desc: "造成8點傷害" },
  { id: 6, name: "吸血攻擊", cost: 1, type: "attack", value: 5, desc: "造成5傷害<br>回復2生命" },
  { id: 7, name: "連擊", cost: 0, type: "attack", value: 4, desc: "造成4點傷害<br>抽1張牌" },
  { id: 8, name: "火球術", cost: 3, type: "attack", value: 18, desc: "造成18點傷害" },
  { id: 9, name: "治療術", cost: 1, type: "skill", value: 8, desc: "回復8點生命" },
  { id:10, name: "閃避", cost: 0, type: "defense", value: 8, desc: "獲得8點護甲" }
];

// 遊戲狀態
let masterDeck = [...allCards.slice(0, 10)]; // 初始10張基礎牌
let drawPile = [];
let discardPile = [];
let hand = [];
let player = { hp: 30, maxHp: 30, block: 0, energy: 3 };
let enemy = { hp: 50, intent: "attack", intentValue: 12 };
let currentEnergy = 3;
let turn = 0;

const handElement = document.getElementById("hand");
const rewardScreen = document.getElementById("reward-screen");
const deckModal = document.getElementById("deck-modal");

// 初始化
newGame();

function newGame() {
  masterDeck = allCards.filter(c => c.id <= 5).concat(allCards.filter(c => c.id <= 5)); // 10張基礎牌
  shuffle(masterDeck);
  drawPile = [...masterDeck];
  discardPile = [];
  hand = [];
  player.hp = 30; player.block = 0;
  enemy.hp = 50; enemy.intentValue = 12;
  updateUI();
  startTurn();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function startTurn() {
  turn++;
  player.block = 0;
  currentEnergy = 3;
  document.getElementById("energy").textContent = currentEnergy;
  
  // 抽5張牌
  for (let i = 0; i < 5; i++) {
    drawCard();
  }
  renderHand();
  updateUI();
}

function drawCard() {
  if (drawPile.length === 0) {
    if (discardPile.length === 0) return;
    drawPile = [...discardPile];
    discardPile = [];
    shuffle(drawPile);
  }
  if (hand.length >= 10) return; // 手牌上限
  const card = drawPile.pop();
  hand.push(card);
}

function playCard(cardIndex) {
  const card = hand[cardIndex];
  if (card.cost > currentEnergy) return;

  currentEnergy -= card.cost;
  document.getElementById("energy").textContent = currentEnergy;

  // 執行卡牌效果
  if (.type === "attack") {
    enemy.hp -= card.value;
    if (card.id === 6) player.hp = Math.min(player.maxHp, player.hp + 2); // 吸血
    if (card.id === 7) drawCard(); // 連擊
  } else if (card.type === "defense") {
    player.block += card.value;
  } else if (card.id === 9) {
    player.hp = Math.min(player.maxHp, player.hp + card.value);
  }

  // 移動到棄牌堆
  const playedCard = hand.splice(cardIndex, 1)[0];
  discardPile.push(playedCard);

  renderHand();
  updateUI();

  if (enemy.hp <= 0) {
    victory();
  }
}

function endTurn() {
  // 敵人攻擊
  let dmg = enemy.intentValue;
  if (player.block >= dmg) {
    player.block -= dmg;
  } else {
    dmg -= player.block;
    player.block = 0;
    player.hp -= dmg;
  }

  // 丟棄手牌
  discardPile.push(...hand);
  hand = [];

  updateUI();

  if (player.hp <= 0) {
    alert("你死了！遊戲結束");
    return;
  }

  startTurn();
}

function victory() {
  hand = [];
  renderHand();
  showReward();
}

function showReward() {
  const rewards = [];
  while (rewards.length < 3) {
    const card = allCards[Math.floor(Math.random() * allCards.length)];
    if (!rewards.includes(card)) rewards.push(card);
  }

  const container = document.getElementById("reward-cards");
  container.innerHTML = "";
  rewards.forEach((card, i) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>
    `;
    el.onclick = () => {
      masterDeck.push(card);
      alert(`已獲得：${card.name}`);
      rewardScreen.classList.add("hidden");
      newEnemy(); // 進入下一戰
    };
    container.appendChild(el);
  });

  rewardScreen.classList.remove("hidden");
}

function newEnemy() {
  enemy.hp = 45 + turn * 10;
  enemy.intentValue = 8 + turn * 2;
  document.getElementById("enemy-hp").textContent = enemy.hp;
  document.getElementById("enemy-intent").textContent = `即將攻擊 ${enemy.intentValue}`;
  startTurn();
}

// 渲染手牌
function renderHand() {
  handElement.innerHTML = "";
  hand.forEach((card, i) => {
    const el = document.createElement("div");
    el.className = "card" + (card.cost <= currentEnergy ? " playable" : " unplayable");
    el.innerHTML = `
      <div class="card-cost">${card.cost}</div>
      <div class="card-name">${card