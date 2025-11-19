const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const P1_BAR = document.getElementById('p1-bar');
const P2_BAR = document.getElementById('p2-bar');

const GRAVITY = 0.6;
const JUMP_POWER = -14;

class Fighter {
    constructor(x, facingRight = true, isAI = false) {
        this.x = x;
        this.y = 200;
        this.velX = 0;
        this.velY = 0;
        this.width = 50;
        this.height = 100;
        this.facingRight = facingRight;
        this.isAI = isAI;
        this.health = 100;
        this.blocking = false;
        this.state = 'idle';
        this.frame = 0;
        this.attackCooldown = 0;
        this.hitbox = null;
        this.attackType = null;
        this.hurtFrame = 0;
    }

    update(opponent, keys, gamepad) {
        this.frame++;
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);

        let left = false, right = false, jump = false, block = false;
        let lightPunch = false, heavyPunch = false, lightKick = false, heavyKick = false;

        if (!this.isAI) {
            // === 玩家（P1）輸入：鍵盤 + XBOX手把 ===
            left   = keys['KeyA'] || keys['ArrowLeft'];
            right  = keys['KeyD'] || keys['ArrowRight'];
            jump   = keys['KeyW'] || keys['ArrowUp'];
            block  = keys['KeyS'];
            lightPunch = keys['KeyY'];
            heavyPunch = keys['KeyU'];
            lightKick  = keys['KeyB'];
            heavyKick  = keys['KeyN'];

            if (gamepad) {
                const axes = gamepad.axes[0];
                const btn = gamepad.buttons;
                if (Math.abs(axes) > 0.3) {
                    left  = axes < -0.3;
                    right = axes > 0.3;
                }
                jump       = btn[0].pressed;  // A
                lightPunch = btn[2].pressed;  // X
                heavyPunch = btn[3].pressed;  // Y
                lightKick  = btn[1].pressed;  // B
                heavyKick  = btn[3].pressed && btn[6].value > 0.5; // Y + LT 當重腳（可自行調整）
                block      = btn[6].value > 0.5 || btn[7].value > 0.5; // LT 或 RT
            }
        } else {
            // === AI（P2）完整智能行為 ===
            const dist = opponent.x - this.x;
            const absDist = Math.abs(dist);
            const tooClose = absDist < 80;
            const goodRange = absDist >= 90 && absDist <= 140;
            const far = absDist > 200;

            // 基本移動
            if (far) {
                right = dist > 0;
                left  = dist < 0;
            } else if (tooClose) {
                // 太近就後退拉開距離
                left  = this.facingRight;
                right = !this.facingRight;
            } else if (goodRange || Math.random() < 0.4) {
                // 保持距離，偶爾小幅走動
                if (Math.random() < 0.1) {
                    left  = Math.random() < 0.5;
                    right = !left;
                }
            }

            // 隨機跳躍（空中攻擊或騙招）
            if (Math.random() < 0.018 && this.y >= 200) jump = true;

            // 格擋（根據玩家動作判斷）
            block = opponent.state === 'attack' && Math.random() < 0.6;

            // 主動攻擊（更積極）
            if (this.attackCooldown === 0 && this.y >= 200 && Math.random() < 0.045) {
                const rand = Math.random();
                if (rand < 0.25) lightPunch = true;
                else if (rand < 0.5) heavyPunch = true;
                else if (rand < 0.75) lightKick = true;
                else heavyKick = true;
            }
        }

        // 動作優先級
        if (this.state === 'hurt') {
            if (this.frame - this.hurtFrame > 18) this.state = 'idle';
        } else if (this.state === 'attack') {
            if (this.frame - this.attackFrame > this.attackDuration) {
                this.state = 'idle';
                this.hitbox = null;
            }
        } else {
            this.blocking = block && this.y >= 200;

            // 出招
            if (heavyPunch && this.attackCooldown === 0) this.attack('heavyPunch', 28, 42, 20);
            else if (lightPunch && this.attackCooldown === 0) this.attack('lightPunch', 16, 32, 12);
            else if (heavyKick && this.attackCooldown === 0) this.attack('heavyKick', 34, 48, 24);
            else if (lightKick && this.attackCooldown === 0) this.attack('lightKick', 20, 38, 14);

            if (this.state !== 'attack') {
                if (jump && this.y >= 200) {
                    this.velY = JUMP_POWER;
                    this.state = 'jump';
                }

                this.velX = 0;
                if (left) this.velX -= 4.5;
                if (right) this.velX += 4.5;

                // 面向玩家
                if (opponent.x > this.x !== this.facingRight) {
                    this.facingRight = opponent.x > this.x;
                }

                if (this.velX === 0 && this.y >= 200) this.state = 'idle';
                else if (this.y >= 200) this.state = 'walk';
            }
        }

        // 物理
        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;
        if (this.y > 200) {
            this.y = 200;
            this.velY = 0;
        }

        // 邊界
        this.x = Math.max(60, Math.min(canvas.width - 60, this.x));
    }

    attack(type, damage, range, duration) {
        this.state = 'attack';
        this.attackType = type;
        this.attackFrame = this.frame;
        this.attackDuration = duration;
        this.attackCooldown = duration + 12;

        this.hitbox = {
            x: this.x + (this.facingRight ? 40 : -40),
            y: this.y - 50,
            width: range,
            height: 50,
            damage: damage
        };
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + 80);
        if (!this.facingRight) ctx.scale(-1, 1);

        const hurtFlash = this.state === 'hurt' && this.frame % 4 < 2;

        // 頭+身體
        ctx.fillStyle = hurtFlash ? '#ff8888' : (this.isAI ? '#88ccff' : '#ffccaa');
        ctx.fillRect(-20, -80, 40, 90);

        // 手臂（攻擊時前伸）
        ctx.fillStyle = '#ffaa77';
        const armExtend = this.state === 'attack' && this.attackType?.includes('Punch') ? 25 : 0;
        ctx.fillRect(15 + armExtend, -50, 35, 55);
        ctx.fillRect(-50 - armExtend, -50, 35, 55);

        // 腿
        ctx.fillStyle = this.isAI ? '#0066cc' : '#3366ff';
        ctx.fillRect(-18, 10, 18, 65);
        ctx.fillRect(0, 10, 18, 65);

        // 眼睛（擋格時變綠）
        ctx.fillStyle = this.blocking ? '#00ff00' : '#000';
        ctx.fillRect(8, -65, 10, 10);

        ctx.restore();
    }
}

// 建立角色：P1 玩家，P2 AI
const player1 = new Fighter(200, true, false);  // 玩家
const player2 = new Fighter(800, false, true);   // AI

let keys = {};
let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener("gamepadconnected", e => console.log("手把已連接"));

function checkCollision(a, b) {
    if (!a.hitbox) return false;
    const hx = a.x + (a.facingRight ? 40 : -40);
    return hx < b.x + 30 &&
           hx + a.hitbox.width > b.x - 30 &&
           a.y - 50 < b.y + 20 &&
           a.y - 10 > b.y - 100;
}

function gameLoop() {
    gamepads = navigator.getGamepads();
    const gp = gamepads[0];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 地板
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 280, canvas.width, 120);

    player1.update(player2, keys, gp);   // 玩家
    player2.update(player1, {}, null);   // AI（傳空 keys 和 gamepad）

    // 碰撞判定
    if (checkCollision(player1, player2)) {
        const dmg = player2.blocking ? player1.hitbox.damage * 0.25 : player1.hitbox.damage;
        player2.health -= dmg * 0.1;
        if (!player2.blocking) {
            player2.state = 'hurt';
            player2.hurtFrame = player2.frame;
            player2.velX = player1.facingRight ? 10 : -10;
        }
        player1.hitbox = null;
    }
    if (checkCollision(player2, player1)) {
        const dmg = player1.blocking ? player2.hitbox.damage * 0.25 : player2.hitbox.damage;
        player1.health -= dmg * 0.1;
        if (!player1.blocking) {
            player1.state = 'hurt';
            player1.hurtFrame = player1.frame;
            player1.velX = player2.facingRight ? 10 : -10;
        }
        player2.hitbox = null;
    }

    player1.draw();
    player2.draw();

    P1_BAR.style.width = Math.max(0, player1.health) + '%';
    P2_BAR.style.width = Math.max(0, player2.health) + '%';

    if (player1.health <= 0 || player2.health <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '72px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(player1.health <= 0 ? 'YOU LOSE' : 'YOU WIN!', canvas.width/2, canvas.height/2);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();