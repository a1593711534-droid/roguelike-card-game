// script.js

// 預設開局的 FEN 字符串
const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

// 遊戲狀態變量
let board = null; // Xiangqiboard 實例
let game = null;  // ChessEngine 實例 (負責規則和AI)
let $status = $('#status');
let isPlayerTurn = true; // 玩家先手 (紅方)

// ----------------------------------------------------
// 初始化遊戲
// ----------------------------------------------------

function initGame() {
    // 創建 ChessEngine 實例 (這就是我們的 AI/規則核心)
    game = new ChessEngine(START_FEN);
    
    // 配置 Xiangqiboard 介面
    const config = {
        position: START_FEN,
        onDrop: onDrop, // 棋子放下後呼叫的函數
        onDragStart: onDragStart, // 棋子拖曳開始時呼叫的函數
        onMoveEnd: onMoveEnd, // 移動動畫結束後呼叫的函數
        draggable: true, // 允許拖曳
        showNotation: false, // 不顯示坐標
        pieceTheme: 'https://cdn.jsdelivr.net/gh/lengyanyu258/xiangqiboardjs@v0.3.3/dist/pieces/{piece}.png'
    };
    
    // 創建 Xiangqiboard 實例
    board = Xiangqiboard('board', config);

    // AI 配置 (電腦走棋深度和時間限制)
    // 數值越大，AI越強，計算時間越長
    game.setDepth(4); // 搜索深度設為 4 (適合網頁的平衡點)
    game.setTime(1000); // 每次思考不超過 1000 毫秒 (1秒)

    updateStatus();
    isPlayerTurn = true;
}

// ----------------------------------------------------
// 玩家互動函數 (Players' Interaction)
// ----------------------------------------------------

// 拖曳開始時檢查是否可以移動該棋子
function onDragStart(source, piece, position, orientation) {
    // 只能在玩家回合移動紅方棋子
    if (!isPlayerTurn || game.turn() !== 'w' || piece[0] !== 'r') {
        return false;
    }
}

// 棋子放下後呼叫，處理玩家的走棋邏輯
function onDrop(source, target) {
    // 嘗試走這一步棋
    const move = game.move({
        from: source,
        to: target,
        promotion: 'k' // 中國象棋沒有升變，但API要求
    });

    // 如果 move 是 null，表示走法不合法 (如：擋住、吃了自己的子等)
    if (move === null) return 'snapback'; // 彈回原位
    
    // 走棋合法，交給 AI 處理
    isPlayerTurn = false; 
}

// 移動動畫結束後，檢查遊戲狀態並讓電腦走棋
function onMoveEnd() {
    // 如果不是玩家回合，且遊戲還沒結束，則輪到電腦走棋
    if (!isPlayerTurn && !game.isGameOver()) {
        window.setTimeout(makeComputerMove, 250); // 延遲 250ms 讓動畫跑完
    }
    updateStatus();
}

// ----------------------------------------------------
// 電腦 AI 走棋邏輯 (Computer AI)
// ----------------------------------------------------

function makeComputerMove() {
    $status.text("電腦 (黑方) 思考中...");
    
    // 使用 ChessEngine 的 search 函數找到最佳走法
    const bestMove = game.search(); 

    // 進行最佳走法
    if (bestMove) {
        game.move(bestMove);
        
        // 更新棋盤介面
        board.position(game.fen());
        
        isPlayerTurn = true;
        updateStatus();
    } else {
        // 如果沒有走法，表示遊戲結束 (理論上不應該發生)
        updateStatus(); 
    }
}

// ----------------------------------------------------
// 遊戲狀態與控制
// ----------------------------------------------------

function updateStatus() {
    let statusText = '';
    const turn = game.turn() === 'w' ? '紅方' : '黑方';
    
    if (game.isCheckMate()) {
        statusText = `**${turn} 被將死！** 遊戲結束。`;
    } else if (game.isStalemate()) {
        statusText = `**和棋！** 遊戲結束。`;
    } else if (game.isCheck()) {
        statusText = `**${turn} 被將軍！**`;
    } else {
        statusText = `${turn} 走棋...`;
    }
    
    // 如果遊戲結束，禁用拖曳
    if (game.isGameOver()) {
        board.draggable = false;
    } else {
        board.draggable = true;
    }
    
    // 確保狀態文本正確顯示當前回合
    if (!game.isGameOver()) {
        statusText = isPlayerTurn ? '您的回合 (紅方)' : '電腦思考中...';
    }

    $status.html(statusText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
}

// 重新開始按鈕
$('#reset-btn').on('click', function() {
    initGame();
});

// 悔棋按鈕 (這裡暫時只用來停止AI，JS引擎不提供完整的悔棋歷史)
$('#undo-btn').on('click', function() {
    alert("在當前 JS 引擎中，悔棋操作較為複雜，此按鈕暫時無效。請點擊『重新開始』。");
});

// 啟動遊戲
$(document).ready(initGame);