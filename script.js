const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const P1_BAR = document.getElementById('p1-bar');
const P2_BAR = document.getElementById('p2-bar');

const GRAVITY = 0.6;
const FRICTION = 0.8;
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
        this.state = 'idle'; // idle, walk, jump, attack, hurt, block
        this.frame = 0;
        this.attackCooldown = 0;
        this.hitbox = null;
    }

    update(opponent, keys, gamepad) {
        this.frame++;
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);

        // ----- 輸入處理 -----
        let left = false, right = false, jump = false, block = false;
        let lightPunch = false, heavyPunch = false, lightKick = false, heavyKick = false;

        if (!this.isAI) {
            // 鍵盤
            left = keys['KeyA'] || keys['ArrowLeft'];
            right = keys['KeyD'] || keys['ArrowRight'];
            jump = keys['KeyW'] || keys['ArrowUp'];
            block = keys['KeyS'];
            lightPunch = keys['KeyY'];
            heavyPunch = keys['KeyU'];
            lightKick = keys['KeyB'];
            heavyKick = keys['KeyN'];

            // XBOX / 通用手把支援
            if (gamepad) {
                const axes = gamepad.axes[0];
                const buttons = gamepad.buttons;
                if (Math.abs(axes) > 0.3) {
                    left = axes < -0.3;
                    right = axes > 0.3;
                }
                jump = buttons[0].pressed;      // A
                lightPunch = buttons[2].pressed; // X
                heavyPunch = buttons[3].pressed; // Y
                lightKick = buttons[1].pressed;  // B
                heavyKick = buttons[0].pressed && buttons[12].pressed; // A + 上 (簡化重腳)
                block = buttons[6].value > 0.5; // LT
            }
        } else {
            // 簡單 AI 邏輯
            const dist = opponent.x - this.x;
            const absDist = Math.abs(dist);

            if (absDist > 180) {
                right = dist > 0;
                left = dist < 0;
            } else if (absDist < 80) {
                left = this.facingRight;
                right = !this.facingRight;
                block = Math.random() < 0.3;
            } else {
                block = Math.random() < 0.15;
            }

            if (Math.abs(this.velY) > 1) block = false; // 空中不能擋

            if (this.attackCooldown === 0 && Math.random() < 0.03 && absDist < 150) {
                const attacks = ['lightPunch', 'heavyPunch', 'lightKick', 'heavyKick'];
                const rand = attacks[Math.floor(Math.random() * attacks.length)];
                this[rand] = true;
            }

            if (Math.random() < 0.015 && this.y >= 200) jump = true;
        }

        // ----- 動作優先級 -----
        if (this.state === 'hurt') {
            // 受擊硬直
            if (this.frame - this.hurtFrame > 15) this.state = 'idle';
        } else if (this.state === 'attack') {
            if (this.frame - this.attackFrame > this.attackDuration) {
                this.state = 'idle';
                this.hitbox = null;
            }
        } else {
            this.blocking = block && this.y >= 200;

            if (heavyPunch && this.attackCooldown === 0) this.attack('heavyPunch', 25, 30, 18);
            else if (lightPunch && this.attackCooldown === 0) this.attack('lightPunch', 15, 20, 10);
            else if (heavyKick && this.attackCooldown === 0) this.attack('heavyKick', 30, 35, 22);
            else if (lightKick && this.attackCooldown === 0) this.attack('lightKick', 18, 25, 12);

            if (this.state !== 'attack') {
                if (jump && this.y >= 200) {
                    this.velY = JUMP_POWER;
                    this.state = 'jump';
                }

                this.velX = 0;
                if (left) this.velX = -4;
                if (right) this.velX = 4;
                if (left !== right && (left && !this.facingRight || right && this.facingRight)) {
                    this.facingRight = left ? false : true;
                }

                if (this.velX === 0 && this.y >= 200) this.state = 'idle';
                else if (this.velX !== 0 && this.y >= 200) this.state = 'walk';
            }
        }

        // 物理
        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;

        // 地面碰撞
        if (this.y > 200) {
            this.y = 200;
            this.velY = 0;
        }

        // 畫面邊界
        this.x = Math.max(60, Math.min(canvas.width - 60, this.x));

        // 面向對手
        if (!this.isAI && this.x > opponent.x !== this.facingRight) {
            if (this.velX === 0) this.facingRight = this.x < opponent.x;
        }
    }

    attack(type, damage, range, duration) {
        this.state = 'attack';
        this.attackFrame = this.frame;
        this.attackDuration = duration;
        this.attackCooldown = duration + 10;

        const dir = this.facingRight ? 1 : -1;
        this.hitbox = {
            x: this.x + (this.facingRight ? 40 : -40),
            y: this.y - 50,
            width: range,
            height: 40,
            damage: damage,
            type: type
        };
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + 80);

        if (!this.facingRight) {
            ctx.translate(0, 0);
            ctx.scale(-1, 1);
        }

        const animFrame = Math.floor(this.frame / 8) % 4;
        const hurtFlash = this.state === 'hurt' && this.frame % 4 < 2;

        // 身體
        ctx.fillStyle = hurtFlash ? '#ff8888' : '#ffccaa';
        ctx.fillRect(-20, -80, 40, 90); // 軀幹+頭

        // 手
        ctx.fillStyle = '#ffaa77';
        let armY = -50;
        if (this.state === 'attack') {
            if (this.attackType?.includes('Punch')) armY = -70;
        }
        ctx.fillRect(this.facingRight ? 15 : -35, armY, 30, 50); // 手臂
        ctx.fillRect(this.facingRight ? -45 : 5, armY, 30, 50);

        // 腿
        ctx.fillStyle = '#3366ff';
        ctx.fillRect(-18, 10, 18, 60);
        ctx.fillRect(0, 10, 18, 60);

        // 眼睛
        ctx.fillStyle = this.blocking ? '#00ff00' : '#000';
        ctx.fillRect(this.facingRight ? 5 : -15, -65, 10, 10);

        // 攻擊 hitbox 除錯用（可刪）
        if (this.hitbox && this.state === 'attack') {
            ctx.fillStyle = 'rgba(255,0,0,0.4)';
            ctx.fillRect(
                this.facingRight ? 40 : -40 - this.hitbox.width,
                -50,
                this.hitbox.width,
                40
            );
        }

        ctx.restore();
    }
}

// 遊戲物件
const player1 = new Fighter(200, true, false);
const player2 = new Fighter(800, false, true);

let keys = {};
let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

// 輸入監聽
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener("gamepadconnected", e => {
    console.log("手把已連接", e.gamepad);
});

function checkCollision(a, b) {
    if (!a.hitbox) return false;
    return a.x + (a.facingRight ? 40 : -40) < b.x + 30 &&
           a.x + (a.facingRight ? 40 : -40) + a.hitbox.width > b.x - 30 &&
           a.y - 50 < b.y + 20 &&
           a.y - 10 > b.y - 100;
}

function gameLoop() {
    gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 地板
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 280, canvas.width, 120);

    player1.update(player2, keys, gp);
    player2.update(player1, keys, null);

    // 碰撞判定
    if (checkCollision(player1, player2)) {
        if (!player2.blocking) {
            player2.health -= player1.hitbox.damage * 0.1;
            player2.state = 'hurt';
            player2.hurtFrame = player2.frame;
            player2.velX = player1.facingRight ? 8 : -8;
        } else {
            player2.health -= player1.hitbox.damage * 0.03; // 擋住減傷
        }
        player1.hitbox = null;
    }
    if (checkCollision(player2, player1)) {
        if (!player1.blocking) {
            player1.health -= player2.hitbox.damage * 0.1;
            player1.state = 'hurt';
            player1.hurtFrame = player1.frame;
            player1.velX = player2.facingRight ? 8 : -8;
        } else {
            player1.health -= player2.hitbox.damage * 0.03;
        }
        player2.hitbox = null;
    }

    player1.draw();
    player2.draw();

    // 更新血條
    P1_BAR.style.width = player1.health + '%';
    P2_BAR.style.width = player2.health + '%';

    // 勝負判定
    if (player1.health <= 0 || player2.health <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '60px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(player1.health <= 0 ? 'P2 WIN!' : 'P1 WIN!', canvas.width/2, canvas.height/2);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();