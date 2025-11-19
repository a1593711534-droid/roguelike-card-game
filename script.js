const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const P1_BAR = document.getElementById('p1-bar');
const P2_BAR = document.getElementById('p2-bar');

const GRAVITY = 0.65;
const JUMP_POWER = -15;
const WALK_SPEED = 4.8;

class Fighter {
    constructor(x, isAI = false, color = '#ffccaa') {
        this.x = x;
        this.y = 200;
        this.velX = 0;
        this.velY = 0;
        this.facingRight = x < canvas.width / 2;
        this.isAI = isAI;
        this.health = 100;
        this.state = 'idle'; // idle, walk, crouch, jump, attack, hurt
        this.frame = 0;
        this.attackCooldown = 0;
        this.hitbox = null;
        this.attackType = null;
        this.bodyColor = color;
        this.hurtFrame = 0;
    }

    update(opponent, input, gamepad) {
        this.frame++;
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);

        let left = false, right = false, down = false, up = false;
        let lp = false, hp = false, lk = false, hk = false;

        if (!this.isAI) {
            // 鍵盤
            left  = input['KeyA'] || input['ArrowLeft'];
            right = input['KeyD'] || input['ArrowRight'];
            down  = input['KeyS'] || input['ArrowDown'];
            up    = input['KeyW'] || input['ArrowUp'];
            lp = input['KeyJ'];     // 輕拳
            hp = input['KeyI'];     // 重拳
            lk = input['KeyK'];     // 輕腳
            hk = input['KeyL'];     // 重腳

            // XBOX / 通用手把
            if (gamepad) {
                const axes = gamepad.axes[0];
                const btn = gamepad.buttons;
                if (Math.abs(axes) > 0.25) {
                    left  = axes < -0.25;
                    right = axes > 0.25;
                }
                up    = btn[12].pressed || btn[0].pressed;  // 上或A跳
                down  = btn[13].pressed;                    // 下蹲
                lp    = btn[2].pressed;   // X 輕拳
                hp    = btn[3].pressed;   // Y 重拳
                lk    = btn[1].pressed;   // B 輕腳
                hk    = btn[4].pressed;   // RB 重腳（或自行改成其他鍵）
            }
        } else {
            // AI 邏輯（後面會寫得更聰明）
            const dist = opponent.x - this.x;
            const absDist = Math.abs(dist);
            const facingOpponent = (dist > 0) === this.facingRight;

            // 基本移動
            if (absDist > 180) {
                right = dist > 0;
                left  = dist < 0;
            } else if (absDist < 70) {
                left  = this.facingRight;
                right = !this.facingRight;
            }

            if (Math.random() < 0.02 && this.y >= 200) up = true;
            if (Math.random() < 0.25 && opponent.state === 'attack') {
                left = this.facingRight;  // 後退擋招
                down = Math.random() < 0.4;
            }

            if (this.attackCooldown === 0 && Math.random() < 0.05 && absDist < 160) {
                const r = Math.random();
                if (r < 0.3) lp = true;
                else if (r < 0.55) hp = true;
                else if (r < 0.8) lk = true;
                else hk = true;
            }
        }

        // === 動作處理 ===
        if (this.state === 'hurt') {
            if (this.frame - this.hurtFrame > 20) this.state = down ? 'crouch' : 'idle';
        } else if (this.state === 'attack') {
            if (this.frame - this.attackFrame > this.attackDuration) {
                this.state = 'idle';
                this.hitbox = null;
            }
        } else {
            // 擋格判斷（後退方向 = 擋）
            const back = this.facingRight ? left : right;
            const forward = this.facingRight ? right : left;
            this.blocking = back && this.y >= 200;

            // 出招（優先度最高）
            if (hk && this.attackCooldown === 0) this.attack('heavyKick', 35, 52, 26);
            else if (lk && this.attackCooldown === 0) this.attack('lightKick', 19, 40, 14);
            else if (hp && this.attackCooldown === 0) this.attack('heavyPunch', 30, 45, 20);
            else if (lp && this.attackCooldown === 0) this.attack('lightPunch', 15, 35, 11);

            if (this.state !== 'attack') {
                // 跳躍
                if (up && this.y >= 200) {
                    this.velY = JUMP_POWER;
                    this.state = 'jump';
                }

                // 蹲下
                if (down && this.y >= 200) this.state = 'crouch';
                else if (this.y >= 200) this.state = 'idle';

                // 移動
                this.velX = 0;
                if (forward && !back) this.velX = this.facingRight ? WALK_SPEED : -WALK_SPEED;
                if (back && !forward) this.velX = this.facingRight ? -WALK_SPEED * 0.7 : WALK_SPEED * 0.7;

                // 自動轉向
                if (opponent.x > this.x !== this.facingRight) {
                    if (this.velX === 0 || this.state === 'crouch') {
                        this.facingRight = opponent.x > this.x;
                    }
                }
            }
        }

        // 物理
        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;
        if (this.y > 200) { this.y = 200; this.velY = 0; }

        this.x = Math.max(70, Math.min(canvas.width - 70, this.x));
    }

    attack(type, damage, range, duration) {
        this.state = 'attack';
        this.attackType = type;
        this.attackFrame = this.frame;
        this.attackDuration = duration;
        this.attackCooldown = duration + 15;

        const isLow = type.includes('Kick');
        this.hitbox = {
            x: this.x + (this.facingRight ? 35 : -35),
            y: this.y - (isLow ? 20 : 60),
            width: range,
            height: isLow ? 40 : 70,
            damage: damage,
            low: isLow
        };
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + 80);
        if (!this.facingRight) ctx.scale(-1, 1);

        const hurt = this.state === 'hurt' && this.frame % 5 < 3;
        const crouch = this.state === 'crouch' || (this.state === 'attack' && this.attackType?.includes('Kick'));

        // 身體
        ctx.fillStyle = hurt ? '#ff6666' : this.bodyColor;
        ctx.fillRect(-22, crouch ? -40 : -80, 44, crouch ? 50 : 90);

        // 手臂（攻擊時伸長）
        const punchExtend = this.state === 'attack' && this.attackType?.includes('Punch') ? 30 : 0;
        ctx.fillStyle = '#ffaa77';
        ctx.fillRect(18 + punchExtend, -45, 38, 55);
        ctx.fillRect(-55 - punchExtend, -45, 38, 55);

        // 腿
        ctx.fillStyle = this.isAI ? '#2288ff' : '#3366ff';
        if (crouch) {
            ctx.fillRect(-20, 10, 20, 40);
            ctx.fillRect(0, 10, 20, 40);
        } else {
            ctx.fillRect(-18, 10, 18, 70);
            ctx.fillRect(0, 10, 18, 70);
        }

        // 眼睛（擋格時變綠）
        ctx.fillStyle = this.blocking ? '#00ff00' : '#000';
        ctx.fillRect(10, crouch ? -30 : -65, 12, 12);

        ctx.restore();
    }
}

// 建立角色
const player = new Fighter(250, false, '#ffccaa');  // 玩家
const ai     = new Fighter(750, true, '#88ccff');   // AI

let keys = {};
let gamepads = navigator.getGamepads();

window.addEventListener('keydown', e => { if (!e.repeat) keys[e.code] = true; });
window.addEventListener('keyup', e => keys[e.code] = false);

function checkHit(a, b) {
    if (!a.hitbox) return false;
    const hx = a.x + (a.facingRight ? 35 : -35);
    const blockLow = b.blocking && b.state === 'crouch';
    const blockHigh = b.blocking && b.state !== 'crouch';
    const blocked = (a.hitbox.low && blockLow) || (!a.hitbox.low && blockHigh);

    if (hx < b.x + 35 && hx + a.hitbox.width > b.x - 35 &&
        a.y - 60 < b.y + 20 && a.y > b.y - 100) {
        const dmg = blocked ? a.hitbox.damage * 0.15 : a.hitbox.damage;
        b.health -= dmg * 0.1;
        if (!blocked) {
            b.state = 'hurt';
            b.hurtFrame = b.frame;
            b.velX = a.facingRight ? 12 : -12;
        }
        a.hitbox = null;
        return true;
    }
    return false;
}

function gameLoop() {
    gamepads = navigator.getGamepads();
    const gp = gamepads[0];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 280, canvas.width, 120);

    player.update(ai, keys, gp);
    ai.update(player, {}, null);

    checkHit(player, ai);
    checkHit(ai, player);

    player.draw();
    ai.draw();

    P1_BAR.style.width = Math.max(0, player.health) + '%';
    P2_BAR.style.width = Math.max(0, ai.health) + '%';

    if (player.health <= 0 || ai.health <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '80px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(player.health <= 0 ? 'YOU LOSE' : 'YOU WIN!!', canvas.width/2, canvas.height/2);
        ctx.font = '30px Arial';
        ctx.fillText('按 F5 再來一局', canvas.width/2, canvas.height/2 + 60);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();