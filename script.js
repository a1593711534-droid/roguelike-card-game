const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const P1_BAR = document.getElementById('p1-bar');
const P2_BAR = document.getElementById('p2-bar');

const GRAVITY = 0.7;
const JUMP_POWER = -16.5;
const WALK_SPEED = 5.5;
const SCALE = 1.6;

class Fighter {
    constructor(x, isAI = false) {
        this.x = x;
        this.y = 200;
        this.velX = 0;
        this.velY = 0;
        this.facingRight = x < canvas.width / 2;
        this.isAI = isAI;
        this.health = 100;
        this.state = 'idle';
        this.frame = 0;
        this.attackCooldown = 0;
        this.hitbox = null;
        this.attackType = null;
        this.hurtFrame = 0;
    }

    update(opponent, input, gamepad) {
        this.frame++;
        this.attackCooldown = Math.max(0, this.attackCooldown - 1);

        // === 完全同步所有輸入：鍵盤 + 手把左搖桿 + 手把方向鍵 ===
        let left = input['KeyA'] || input['ArrowLeft'];
        let right = input['KeyD'] || input['ArrowRight'];
        let down = input['KeyS'] || input['ArrowDown'];
        let up = input['KeyW'] || input['ArrowUp'];
        let lp = input['KeyJ'];
        let hp = input['KeyI'];
        let lk = input['KeyK'];
        let hk = input['KeyL'];

        if (gamepad) {
            // 左搖桿（axes[0] 左右，axes[1] 上下）
            const axisH = gamepad.axes[0];
            const axisV = gamepad.axes[1];
            if (Math.abs(axisH) > 0.25) {
                left  = left  || axisH < -0.25;
                right = right || axisH >  0.25;
            }
            if (Math.abs(axisV) > 0.25) {
                up   = up   || axisV < -0.5;   // 上
                down = down || axisV >  0.3;   // 下（蹲要明顯下壓）
            }

            // 方向鍵（D-pad）完全同步
            const dpadUp    = gamepad.buttons[12]?.pressed;
            const dpadDown  = gamepad.buttons[13]?.pressed;
            const dpadLeft  = gamepad.buttons[14]?.pressed;
            const dpadRight = gamepad.buttons[15]?.pressed;
            up    = up    || dpadUp;
            down  = down  || dpadDown;
            left  = left  || dpadLeft;
            right = right || dpadRight;

            // 攻擊鍵（標準 XBOX 布局）
            const btn = gamepad.buttons;
            lp = lp || btn[2].pressed;  // X 輕拳
            hp = hp || btn[3].pressed;  // Y 重拳
            lk = lk || btn[1].pressed;  // B 輕腳
            hk = hk || btn[5].pressed;  // RB 重腳（更常用）
            up = up || btn[0].pressed;  // A 也當跳躍（很多人習慣）
        }

        // === AI 行為（不變）===
        if (this.isAI) {
            const dist = opponent.x - this.x;
            const absDist = Math.abs(dist);
            if (absDist > 190) { right = dist > 0; left = dist < 0; }
            else if (absDist < 70) { left = this.facingRight; right = !this.facingRight; }

            if (Math.random() < 0.022 && this.y >= 200) up = true;
            if (opponent.state === 'attack' && Math.random() < 0.45) {
                left = this.facingRight;
                down = Math.random() < 0.5;
            }
            if (this.attackCooldown === 0 && Math.random() < 0.058 && absDist < 170) {
                const r = Math.random();
                if (r < 0.3) lp = true;
                else if (r < 0.55) hp = true;
                else if (r < 0.8) lk = true;
                else hk = true;
            }
        }

        // === 動作邏輯（其餘完全不變）===
        if (this.state === 'hurt') {
            if (this.frame - this.hurtFrame > 22) this.state = down ? 'crouch' : 'idle';
        } else if (this.state === 'attack') {
            if (this.frame - this.attackFrame > this.attackDuration) {
                this.state = 'idle';
                this.hitbox = null;
            }
        } else {
            const back = this.facingRight ? left : right;
            const forward = this.facingRight ? right : left;
            this.blocking = back && this.y >= 200;

            if (hk && this.attackCooldown === 0) this.attack('heavyKick', 38, 62, 28);
            else if (lk && this.attackCooldown === 0) this.attack('lightKick', 21, 48, 15);
            else if (hp && this.attackCooldown === 0) this.attack('heavyPunch', 33, 52, 22);
            else if (lp && this.attackCooldown === 0) this.attack('lightPunch', 17, 40, 12);

            if (this.state !== 'attack') {
                if (up && this.y >= 200) { this.velY = JUMP_POWER; this.state = 'jump'; }
                this.velX = 0;
                if (forward && !back) this.velX = this.facingRight ? WALK_SPEED : -WALK_SPEED;
                if (back && !forward) this.velX = this.facingRight ? -WALK_SPEED * 0.75 : WALK_SPEED * 0.75;

                if (this.y >= 200) this.state = down ? 'crouch' : (this.velX !== 0 ? 'walk' : 'idle');
            }
        }

        if (opponent.x > this.x !== this.facingRight && this.velX === 0) {
            this.facingRight = opponent.x > this.x;
        }

        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;
        if (this.y > 200) { this.y = 200; this.velY = 0; }
        this.x = Math.max(80, Math.min(canvas.width - 80, this.x));
    }

    attack(type, damage, range, duration) {
        this.state = 'attack';
        this.attackType = type;
        this.attackFrame = this.frame;
        this.attackDuration = duration;
        this.attackCooldown = duration + 16;

        const low = type.includes('Kick');
        this.hitbox = {
            x: this.x + (this.facingRight ? 40 : -40),
            y: this.y - (low ? 10 : 70),
            width: range,
            height: low ? 50 : 80,
            damage: damage,
            low: low
        };
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y + 130);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.scale(SCALE, SCALE);

        const hurt = this.state === 'hurt' && this.frame % 5 < 3;
        const crouch = this.state === 'crouch' || (this.state === 'attack' && this.attackType?.includes('Kick'));
        const punchExtend = this.state === 'attack' && this.attackType?.includes('Punch') ? 40 : 0;
        const kickExtend = this.state === 'attack' && this.attackType?.includes('Kick') ? 45 : 0;

        ctx.fillStyle = hurt ? '#ff5555' : (this.isAI ? '#88ccff' : '#ffccaa');
        ctx.beginPath();
        ctx.arc(0, -80, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hurt ? '#ff5555' : '#333';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, -62);
        ctx.lineTo(0, crouch ? -15 : 10);
        ctx.stroke();

        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.lineTo(30 + punchExtend, -45);
        ctx.moveTo(30 + punchExtend, -45);
        ctx.lineTo(35 + punchExtend, -20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.lineTo(-30 - punchExtend, -45);
        ctx.moveTo(-30 - punchExtend, -45);
        ctx.lineTo(-35 - punchExtend, -20);
        ctx.stroke();

        ctx.lineWidth = 7;
        if (crouch) {
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.lineTo(25, 25);
            ctx.moveTo(0, 10);
            ctx.lineTo(-25, 25);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.lineTo(25 + kickExtend, 55 + (kickExtend ? 20 : 0));
            ctx.moveTo(0, 10);
            ctx.lineTo(-25 - kickExtend, 55 + (kickExtend ? 20 : 0));
            ctx.stroke();
        }

        ctx.fillStyle = this.blocking ? '#00ff00' : '#000';
        ctx.beginPath();
        ctx.arc(8, -80, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

const player = new Fighter(220, false);
const ai     = new Fighter(780, true);

let keys = {};
let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

window.addEventListener('keydown', e => { if (!e.repeat) keys[e.code] = true; });
window.addEventListener('keyup', e => keys[e.code] = false);

function checkHit(a, b) {
    if (!a.hitbox) return false;
    const hx = a.x + (a.facingRight ? 40 : -40) * SCALE;
    const blocked = (a.hitbox.low && b.state === 'crouch' && b.blocking) || (!a.hitbox.low && b.blocking);
    if (hx < b.x + 40 && hx + a.hitbox.width > b.x - 40 &&
        a.y - 70 < b.y + 20 && a.y > b.y - 130) {
        const dmg = blocked ? a.hitbox.damage * 0.12 : a.hitbox.damage;
        b.health -= dmg * 0.1;
        if (!blocked) {
            b.state = 'hurt';
            b.hurtFrame = b.frame;
            b.velX = a.facingRight ? 14 : -14;
        }
        a.hitbox = null;
        return true;
    }
    return false;
}

function gameLoop() {
    gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
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
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '90px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(player.health <= 0 ? 'YOU LOSE' : 'YOU WIN!!', canvas.width/2, canvas.height/2);
        ctx.font = '36px Arial';
        ctx.fillText('按 F5 再戰', canvas.width/2, canvas.height/2 + 80);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();