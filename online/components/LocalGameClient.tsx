'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const HEX_SIZE = 38;
const DIRECTIONS = [{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];
const coordsKey = (q: number, r: number) => `${q},${r}`;

const INITIAL_TILES = [{q:0, r:0}, {q:1, r:0}, {q:1, r:-1}, {q:0, r:-1}, {q:-1, r:0}, {q:-1, r:1}, {q:0, r:1}, {q:2, r:0}, {q:2, r:-1}, {q:2, r:-2}, {q:1, r:-2}, {q:0, r:-2}, {q:-1, r:-1}, {q:-2, r:0}, {q:-2, r:1}, {q:-2, r:2}, {q:-1, r:2}, {q:0, r:2}, {q:1, r:1}];

const INITIAL_PIECES = [
    { id: 'r1', player: 'red' as const,  q: 2,  r: -2 },
    { id: 'b1', player: 'blue' as const, q: 2,  r: 0  },
    { id: 'r2', player: 'red' as const,  q: 0,  r: 2  },
    { id: 'b2', player: 'blue' as const, q: -2, r: 2  },
    { id: 'r3', player: 'red' as const,  q: -2, r: 0  },
    { id: 'b3', player: 'blue' as const, q: 0,  r: -2 }
];

const getLang = () => {
    if (typeof window === 'undefined') return 'ja';
    const lang = (document.documentElement.lang || 'ja').toLowerCase();
    return lang.startsWith('en') ? 'en' : 'ja';
};

const I18N = {
    ja: {
        shuffleDeciding: '先攻を決めています...',
        ai: 'AI',
        you: 'あなた',
        youWin: 'あなたの勝ち!',
        aiWin: 'AIの勝ち!',
        redWin: '赤の勝ち!',
        blueWin: '青の勝ち!',
        playAgain: 'もう一度あそぶ',
        pvp: 'ふたりで対戦モード',
        aiMode: 'AI対戦モード',
        onlineMode: 'オンライン対戦',
        selectMode: 'モード選択',
        changeMode: 'モード変更',
        thinking: '🤖 AI思考中...',
        phaseMoveToken: '1. コマを滑らせる',
        phaseMoveTile: '2. タイルを動かす',
        goal: '自分のコマを 3つ連結 させれば勝ち!',
        goalHint: 'クリックで詳しい説明へ',
        slideToEdge: '端までコマを滑らせる',
        moveEmptyTile: '空きタイルを移動する',
        rulesLabel: 'ゲームルール',
        boardLabel: 'NONAGA ゲームボード',
        boardSvgLabel: '六角形タイルとコマのゲームボード',
        mainLabel: 'NONAGA ゲーム盤面',
        alertBoardSplit: '盤面を分断できません',
        playerRed: '赤',
        playerBlue: '青'
    },
    en: {
        shuffleDeciding: 'Deciding who goes first...',
        ai: 'AI',
        you: 'You',
        youWin: 'You win!',
        aiWin: 'AI wins!',
        redWin: 'Red wins!',
        blueWin: 'Blue wins!',
        playAgain: 'Play again',
        pvp: '2-Player Mode',
        aiMode: 'AI Mode',
        onlineMode: 'Online Mode',
        selectMode: 'Select Mode',
        changeMode: 'Change Mode',
        thinking: '🤖 AI thinking...',
        phaseMoveToken: '1. Slide a piece',
        phaseMoveTile: '2. Move a tile',
        goal: 'Win by connecting your three pieces!',
        goalHint: 'Click for details',
        slideToEdge: 'Slide a piece to the edge',
        moveEmptyTile: 'Move an empty tile',
        rulesLabel: 'Rules',
        boardLabel: 'NONAGA game board',
        boardSvgLabel: 'Hex tiles and pieces board',
        mainLabel: 'NONAGA game area',
        alertBoardSplit: 'You cannot split the board.',
        playerRed: 'Red',
        playerBlue: 'Blue'
    }
} as const;

type Player = 'red' | 'blue';
type Phase = 'move_token' | 'move_tile' | 'ended';
type GameMode = 'ai' | 'pvp';
type Tile = { q: number; r: number };
type Piece = { id: string; player: Player; q: number; r: number };
type Strings = typeof I18N.ja | typeof I18N.en;

const Confetti = ({ winner }: { winner: Player }) => {
    const dots = useMemo(() => [...Array(40)].map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        delay: Math.random() * 4 + 's',
        size: (Math.random() * 8 + 4) + 'px',
        color: winner === 'red' ? '#fb7185' : '#818cf8'
    })), [winner]);
    return (
        <div style={{position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100}}>
            {dots.map(d => (
                <div key={d.id} style={{
                    position: 'absolute',
                    left: d.left,
                    width: d.size,
                    height: d.size,
                    backgroundColor: d.color,
                    borderRadius: '2px',
                    animation: `confetti-fall 4s linear infinite`,
                    animationDelay: d.delay
                }} />
            ))}
        </div>
    );
};

const ShuffleAnimation = ({ strings }: { strings: Strings }) => {
    return (
        <div className="shuffle-container">
            <div className="shuffle-text">{strings.shuffleDeciding}</div>
            <div className="shuffle-players">
                <div className="shuffle-player">
                    <div className="shuffle-avatar ai">🤖</div>
                    <div className="shuffle-label">{strings.ai}</div>
                </div>
                <div style={{fontSize: '1.5rem', color: '#cbd5e1'}}>⚡</div>
                <div className="shuffle-player">
                    <div className="shuffle-avatar human">👤</div>
                    <div className="shuffle-label">{strings.you}</div>
                </div>
            </div>
        </div>
    );
};

const ModeSelector = ({ strings, currentMode, onSelect, onClose }: {
    strings: Strings;
    currentMode: GameMode;
    onSelect: (mode: string) => void;
    onClose: () => void;
}) => {
    return (
        <div className="mode-selector-overlay" onClick={onClose}>
            <div className="mode-selector-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="mode-selector-title">{strings.selectMode}</h2>
                <div className="mode-selector-options">
                    <button
                        className={`mode-option ${currentMode === 'ai' ? 'active' : ''}`}
                        onClick={() => onSelect('ai')}
                    >
                        <span className="mode-icon">🤖</span>
                        <span className="mode-label">{strings.aiMode}</span>
                    </button>
                    <button
                        className={`mode-option ${currentMode === 'pvp' ? 'active' : ''}`}
                        onClick={() => onSelect('pvp')}
                    >
                        <span className="mode-icon">👥</span>
                        <span className="mode-label">{strings.pvp}</span>
                    </button>
                    <button
                        className="mode-option online"
                        onClick={() => onSelect('online')}
                    >
                        <span className="mode-icon">🌐</span>
                        <span className="mode-label">{strings.onlineMode}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function LocalGameClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [lang, setLang] = useState<'ja' | 'en'>('ja');
    const strings = I18N[lang];

    useEffect(() => {
        const langParam = searchParams.get('lang');
        if (langParam === 'en') {
            setLang('en');
        } else {
            setLang(getLang() as 'ja' | 'en');
        }
    }, [searchParams]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateOffsets = () => {
            const headerHeight = headerRef.current?.offsetHeight ?? 0;
            const statusHeight = statusRef.current?.offsetHeight ?? 0;
            const rulesHeight = rulesRef.current?.offsetHeight ?? 0;
            const topOffset = headerHeight + statusHeight + 8;
            const bottomOffset = rulesHeight + 8;
            container.style.setProperty('--ui-top-offset', `${topOffset}px`);
            container.style.setProperty('--ui-bottom-offset', `${bottomOffset}px`);
        };

        updateOffsets();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateOffsets);
            return () => window.removeEventListener('resize', updateOffsets);
        }

        const observer = new ResizeObserver(() => updateOffsets());
        if (headerRef.current) observer.observe(headerRef.current);
        if (statusRef.current) observer.observe(statusRef.current);
        if (rulesRef.current) observer.observe(rulesRef.current);
        window.addEventListener('resize', updateOffsets);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateOffsets);
        };
    }, []);

    const [tiles, setTiles] = useState<Tile[]>(INITIAL_TILES);
    const [pieces, setPieces] = useState<Piece[]>(INITIAL_PIECES);
    const [turn, setTurn] = useState<Player>('red');
    const [phase, setPhase] = useState<Phase>('move_token');
    const [selectedId, setSelectedId] = useState<string | number | null>(null);
    const [winner, setWinner] = useState<Player | null>(null);
    const [victoryLine, setVictoryLine] = useState<string[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animatingPiece, setAnimatingPiece] = useState<{ id: string; x: number; y: number } | null>(null);
    const [animatingTile, setAnimatingTile] = useState<{ index: number; x: number; y: number } | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>('ai');
    const [aiPlayer, setAiPlayer] = useState<Player | null>(() => Math.random() < 0.5 ? 'red' : 'blue');
    const [aiThinking, setAiThinking] = useState(false);
    const [isShuffling, setIsShuffling] = useState(true);
    const [showModeSelector, setShowModeSelector] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLElement | null>(null);
    const statusRef = useRef<HTMLDivElement | null>(null);
    const rulesRef = useRef<HTMLElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const shuffleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aboutUrl = lang === 'en' ? '/en/about/' : '/about/';

    const resetGame = () => {
        if (shuffleTimeoutRef.current) {
            clearTimeout(shuffleTimeoutRef.current);
        }

        setTiles(INITIAL_TILES);
        setPieces(INITIAL_PIECES);
        setTurn('red');
        setPhase('move_token');
        setSelectedId(null);
        setWinner(null);
        setVictoryLine([]);
        setIsAnimating(false);
        setAnimatingPiece(null);
        setAnimatingTile(null);
        setAiThinking(false);

        if (gameMode === 'ai') {
            setIsShuffling(true);
            const newAiPlayer: Player = Math.random() < 0.5 ? 'red' : 'blue';
            shuffleTimeoutRef.current = setTimeout(() => {
                setAiPlayer(newAiPlayer);
                setIsShuffling(false);
            }, 1200);
        }
    };

    const handleModeSelect = (newMode: string) => {
        setShowModeSelector(false);

        if (newMode === 'online') {
            router.push('/online');
            return;
        }

        if (newMode === gameMode) return;

        if (shuffleTimeoutRef.current) {
            clearTimeout(shuffleTimeoutRef.current);
        }

        setGameMode(newMode as GameMode);

        setTiles(INITIAL_TILES);
        setPieces(INITIAL_PIECES);
        setTurn('red');
        setPhase('move_token');
        setSelectedId(null);
        setWinner(null);
        setVictoryLine([]);
        setIsAnimating(false);
        setAnimatingPiece(null);
        setAnimatingTile(null);
        setAiThinking(false);

        if (newMode === 'ai') {
            setIsShuffling(true);
            const newAiPlayer: Player = Math.random() < 0.5 ? 'red' : 'blue';
            shuffleTimeoutRef.current = setTimeout(() => {
                setAiPlayer(newAiPlayer);
                setIsShuffling(false);
            }, 1200);
        } else {
            setAiPlayer(null);
            setIsShuffling(false);
        }
    };

    const tileMap = useMemo(() => new Set(tiles.map(t => coordsKey(t.q, t.r))), [tiles]);
    const pieceMap = useMemo(() => {
        const map = new Map<string, Piece>();
        pieces.forEach(p => map.set(coordsKey(p.q, p.r), p));
        return map;
    }, [pieces]);
    const hexToPixel = (q: number, r: number) => ({ x: HEX_SIZE * (3/2 * q), y: HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) });

    const viewBounds = useMemo(() => {
        const padding = 60;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        tiles.forEach(t => {
            const { x, y } = hexToPixel(t.q, t.r);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        });
        return { x: minX - padding, y: minY - padding, w: (maxX - minX) + padding * 2, h: (maxY - minY) + padding * 2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tiles]);

    const getVictoryCoords = (currentPieces: Piece[], player: Player) => {
        const p = currentPieces.filter(cp => cp.player === player);
        const isAdj = (a: Piece, b: Piece) => DIRECTIONS.some(d => a.q + d.q === b.q && a.r + d.r === b.r);
        const c01 = isAdj(p[0], p[1]), c12 = isAdj(p[1], p[2]), c20 = isAdj(p[2], p[0]);
        if ((c01 ? 1:0) + (c12 ? 1:0) + (c20 ? 1:0) >= 2) return p.map(item => coordsKey(item.q, item.r));
        return null;
    };

    const animatePieceMove = (pieceId: string, fromQ: number, fromR: number, toQ: number, toR: number) => {
        const startTime = performance.now();
        const fromPos = hexToPixel(fromQ, fromR);
        const toPos = hexToPixel(toQ, toR);
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / 800, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatingPiece({ id: pieceId, x: fromPos.x + (toPos.x - fromPos.x) * eased, y: fromPos.y + (toPos.y - fromPos.y) * eased });
            if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
            else {
                setAnimatingPiece(null); setIsAnimating(false);
                const nextPieces = pieces.map(p => p.id === pieceId ? { ...p, q: toQ, r: toR } : p);
                setPieces(nextPieces);
                const winCoords = getVictoryCoords(nextPieces, turn);
                if (winCoords) { setWinner(turn); setVictoryLine(winCoords); setPhase('ended'); }
                else { setPhase('move_tile'); setSelectedId(null); }
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    const animateTileMove = (tileIndex: number, fromQ: number, fromR: number, toQ: number, toR: number) => {
        const startTime = performance.now();
        const fromPos = hexToPixel(fromQ, fromR);
        const toPos = hexToPixel(toQ, toR);
        const isAiTurn = gameMode === 'ai' && turn === aiPlayer;
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / 800, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatingTile({ index: tileIndex, x: fromPos.x + (toPos.x - fromPos.x) * eased, y: fromPos.y + (toPos.y - fromPos.y) * eased });
            if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
            else {
                setAnimatingTile(null);
                const nt = [...tiles]; nt[tileIndex] = { q: toQ, r: toR };
                setTiles(nt); setPhase('move_token'); setSelectedId(null);

                if (isAiTurn) {
                    setTimeout(() => {
                        setIsAnimating(false);
                        setTurn(turn === 'red' ? 'blue' : 'red');
                    }, 500);
                } else {
                    setIsAnimating(false);
                    setTurn(turn === 'red' ? 'blue' : 'red');
                }
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handlePieceClick = (piece: Piece) => {
        if (winner || phase !== 'move_token' || piece.player !== turn || isAnimating || aiThinking || isShuffling || (gameMode === 'ai' && turn === aiPlayer)) return;
        setSelectedId(selectedId === piece.id ? null : piece.id);
    };

    const handleTileClick = (tile: Tile, index: number) => {
        if (winner || isAnimating || aiThinking || isShuffling || (gameMode === 'ai' && turn === aiPlayer)) return;
        if (phase === 'move_token' && typeof selectedId === 'string') {
            const piece = pieces.find(p => p.id === selectedId);
            if (!piece) return;
            const moves = DIRECTIONS.map(dir => {
                let curQ = piece.q, curR = piece.r;
                let lastValid: { q: number; r: number } | null = null;
                while (true) {
                    const nQ = curQ + dir.q, nR = curR + dir.r;
                    if (!tileMap.has(coordsKey(nQ, nR)) || pieceMap.has(coordsKey(nQ, nR))) break;
                    lastValid = { q: nQ, r: nR }; curQ = nQ; curR = nR;
                }
                return lastValid;
            }).filter(Boolean) as { q: number; r: number }[];
            if (moves.some(m => m.q === tile.q && m.r === tile.r)) { setIsAnimating(true); animatePieceMove(selectedId, piece.q, piece.r, tile.q, tile.r); }
        } else if (phase === 'move_tile' && !pieceMap.has(coordsKey(tile.q, tile.r))) {
            const temp = tiles.filter((_, i) => i !== index);
            const queue = [temp[0]], vis = new Set([coordsKey(temp[0].q, temp[0].r)]);
            while(queue.length > 0) {
                const cur = queue.shift()!;
                DIRECTIONS.forEach(d => {
                    const k = coordsKey(cur.q+d.q, cur.r+d.r);
                    if(temp.some(t => coordsKey(t.q, t.r) === k) && !vis.has(k)) { vis.add(k); queue.push({q:cur.q+d.q, r:cur.r+d.r}); }
                });
            }
            if (vis.size === temp.length) setSelectedId(index);
            else alert(strings.alertBoardSplit);
        }
    };

    const makeAIMove = () => {
        if (aiThinking || isAnimating || winner) return;
        setAiThinking(true);

        setTimeout(() => {
            if (phase === 'move_token') {
                const myPieces = pieces.filter(p => p.player === turn);
                if (myPieces.length === 0) {
                    setAiThinking(false);
                    return;
                }

                let bestMove: { piece: Piece; dest: { q: number; r: number } } | null = null;
                let bestScore = -Infinity;

                myPieces.forEach(piece => {
                    DIRECTIONS.forEach(dir => {
                        let cq = piece.q, cr = piece.r;
                        while (true) {
                            const nq = cq + dir.q, nr = cr + dir.r;
                            if (!tileMap.has(coordsKey(nq, nr))) break;
                            if (pieceMap.has(coordsKey(nq, nr))) break;
                            cq = nq; cr = nr;
                        }
                        if (cq === piece.q && cr === piece.r) return;

                        const testPieces = pieces.map(p => p.id === piece.id ? { ...p, q: cq, r: cr } : p);
                        const myTestPieces = testPieces.filter(p => p.player === turn);
                        const enemyPieces = testPieces.filter(p => p.player !== turn);

                        let score = 0;

                        let adjacentPairs = 0;
                        for (let i = 0; i < myTestPieces.length; i++) {
                            for (let j = i + 1; j < myTestPieces.length; j++) {
                                const p1 = myTestPieces[i], p2 = myTestPieces[j];
                                if (DIRECTIONS.some(d => p1.q + d.q === p2.q && p1.r + d.r === p2.r)) {
                                    adjacentPairs++;
                                }
                            }
                        }
                        if (adjacentPairs >= 2) {
                            score = 10000;
                        } else {
                            score += adjacentPairs * 500;

                            let minDist = Infinity;
                            for (let i = 0; i < myTestPieces.length; i++) {
                                for (let j = i + 1; j < myTestPieces.length; j++) {
                                    const p1 = myTestPieces[i], p2 = myTestPieces[j];
                                    const dist = Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r);
                                    minDist = Math.min(minDist, dist);
                                }
                            }
                            score -= minDist * 30;

                            const centerQ = myTestPieces.reduce((sum, p) => sum + p.q, 0) / 3;
                            const centerR = myTestPieces.reduce((sum, p) => sum + p.r, 0) / 3;
                            const compactness = myTestPieces.reduce((sum, p) => {
                                return sum + Math.abs(p.q - centerQ) + Math.abs(p.r - centerR);
                            }, 0);
                            score -= compactness * 20;

                            let enemyAdjacentPairs = 0;
                            for (let i = 0; i < enemyPieces.length; i++) {
                                for (let j = i + 1; j < enemyPieces.length; j++) {
                                    const p1 = enemyPieces[i], p2 = enemyPieces[j];
                                    if (DIRECTIONS.some(d => p1.q + d.q === p2.q && p1.r + d.r === p2.r)) {
                                        enemyAdjacentPairs++;
                                    }
                                }
                            }
                            score -= enemyAdjacentPairs * 200;

                            const distToCenter = Math.abs(cq) + Math.abs(cr);
                            score -= distToCenter * 5;
                        }

                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = { piece, dest: { q: cq, r: cr } };
                        }
                    });
                });

                if (bestMove) {
                    const move = bestMove as { piece: Piece; dest: { q: number; r: number } };
                    setIsAnimating(true);
                    animatePieceMove(move.piece.id, move.piece.q, move.piece.r, move.dest.q, move.dest.r);
                }
            } else if (phase === 'move_tile') {
                const myPieces = pieces.filter(p => p.player === turn);
                const emptyTiles = tiles.map((t, i) => ({ tile: t, index: i }))
                    .filter(({ tile }) => !pieceMap.has(coordsKey(tile.q, tile.r)));

                if (emptyTiles.length === 0) {
                    setAiThinking(false);
                    return;
                }

                let bestMove: { selectedIndex: number; dest: { q: number; r: number } } | null = null;
                let bestScore = -Infinity;

                emptyTiles.forEach(({ tile: selectedTile, index: selectedIndex }) => {
                    const rem = tiles.filter((_, i) => i !== selectedIndex);
                    const candidates = new Map<string, { q: number; r: number; c: number }>();

                    rem.forEach(t => DIRECTIONS.forEach(d => {
                        const nQ = t.q + d.q, nR = t.r + d.r, k = coordsKey(nQ, nR);
                        if (rem.some(rt => rt.q === nQ && rt.r === nR) || coordsKey(selectedTile.q, selectedTile.r) === k) return;
                        const data = candidates.get(k) || { q: nQ, r: nR, c: 0 };
                        data.c++;
                        candidates.set(k, data);
                    }));

                    candidates.forEach((dest) => {
                        if (dest.c < 2) return;

                        const tempTiles = rem.map(t => ({ q: t.q, r: t.r }));
                        tempTiles.push({ q: dest.q, r: dest.r });
                        const queue = [tempTiles[0]];
                        const visited = new Set([coordsKey(tempTiles[0].q, tempTiles[0].r)]);
                        while (queue.length > 0) {
                            const cur = queue.shift()!;
                            DIRECTIONS.forEach(d => {
                                const k2 = coordsKey(cur.q + d.q, cur.r + d.r);
                                if (tempTiles.some(t => coordsKey(t.q, t.r) === k2) && !visited.has(k2)) {
                                    visited.add(k2);
                                    queue.push({ q: cur.q + d.q, r: cur.r + d.r });
                                }
                            });
                        }
                        if (visited.size !== tempTiles.length) return;

                        let score = 0;
                        const enemyPieces = pieces.filter(p => p.player !== turn);

                        const newTiles = [...rem, { q: dest.q, r: dest.r }];
                        const newTileMap = new Set(newTiles.map(t => coordsKey(t.q, t.r)));

                        let enemyCanWinNextTurn = false;
                        for (const enemyPiece of enemyPieces) {
                            for (const dir of DIRECTIONS) {
                                let eq = enemyPiece.q, er = enemyPiece.r;
                                while (true) {
                                    const nQ = eq + dir.q, nR = er + dir.r;
                                    if (!newTileMap.has(coordsKey(nQ, nR))) break;
                                    if (pieces.some(p => p.q === nQ && p.r === nR && p.id !== enemyPiece.id)) break;
                                    eq = nQ; er = nR;
                                }
                                if (eq === enemyPiece.q && er === enemyPiece.r) continue;

                                const testEnemyPieces = enemyPieces.map(p =>
                                    p.id === enemyPiece.id ? { ...p, q: eq, r: er } : p
                                );
                                let adjacentPairs = 0;
                                for (let i = 0; i < testEnemyPieces.length; i++) {
                                    for (let j = i + 1; j < testEnemyPieces.length; j++) {
                                        const p1 = testEnemyPieces[i], p2 = testEnemyPieces[j];
                                        if (DIRECTIONS.some(d => p1.q + d.q === p2.q && p1.r + d.r === p2.r)) {
                                            adjacentPairs++;
                                        }
                                    }
                                }
                                if (adjacentPairs >= 2) {
                                    enemyCanWinNextTurn = true;
                                    break;
                                }
                            }
                            if (enemyCanWinNextTurn) break;
                        }

                        const enemyPieceTiles = enemyPieces.map(p => coordsKey(p.q, p.r));
                        const isEnemyPieceOnSelectedTile = enemyPieceTiles.includes(coordsKey(selectedTile.q, selectedTile.r));

                        if (enemyCanWinNextTurn && isEnemyPieceOnSelectedTile) {
                            score += 15000;
                        } else if (enemyCanWinNextTurn) {
                            score -= 5000;
                        }

                        let enemyAdjacentPairs = 0;
                        for (let i = 0; i < enemyPieces.length; i++) {
                            for (let j = i + 1; j < enemyPieces.length; j++) {
                                const p1 = enemyPieces[i], p2 = enemyPieces[j];
                                if (DIRECTIONS.some(d => p1.q + d.q === p2.q && p1.r + d.r === p2.r)) {
                                    enemyAdjacentPairs++;
                                }
                            }
                        }

                        if (isEnemyPieceOnSelectedTile) {
                            const selectedEnemyPiece = enemyPieces.find(p => p.q === selectedTile.q && p.r === selectedTile.r);
                            if (selectedEnemyPiece) {
                                const otherEnemyPieces = enemyPieces.filter(p => p.id !== selectedEnemyPiece.id);
                                const avgDistBefore = otherEnemyPieces.reduce((sum, p) => {
                                    return sum + Math.abs(selectedTile.q - p.q) + Math.abs(selectedTile.r - p.r);
                                }, 0) / otherEnemyPieces.length;
                                const avgDistAfter = otherEnemyPieces.reduce((sum, p) => {
                                    return sum + Math.abs(dest.q - p.q) + Math.abs(dest.r - p.r);
                                }, 0) / otherEnemyPieces.length;

                                const distImprovement = avgDistAfter - avgDistBefore;
                                score += distImprovement * 100;

                                if (enemyAdjacentPairs >= 1) {
                                    score += distImprovement * 200;
                                }
                            }
                        }

                        const myPieceTiles = myPieces.map(p => coordsKey(p.q, p.r));
                        const isMyPieceOnSelectedTile = myPieceTiles.includes(coordsKey(selectedTile.q, selectedTile.r));

                        if (isMyPieceOnSelectedTile) {
                            const selectedPiece = myPieces.find(p => p.q === selectedTile.q && p.r === selectedTile.r);
                            if (selectedPiece) {
                                const otherPieces = myPieces.filter(p => p.id !== selectedPiece.id);
                                const avgDist = otherPieces.reduce((sum, p) => {
                                    return sum + Math.abs(dest.q - p.q) + Math.abs(dest.r - p.r);
                                }, 0) / otherPieces.length;
                                score -= avgDist * 50;
                            }
                        } else {
                            let totalDist = 0;
                            for (let i = 0; i < myPieces.length; i++) {
                                for (let j = i + 1; j < myPieces.length; j++) {
                                    const p1 = myPieces[i], p2 = myPieces[j];
                                    const dist = Math.abs(p1.q - p2.q) + Math.abs(p1.r - p2.r);
                                    totalDist += dist;
                                }
                            }
                            score -= totalDist * 10;
                        }

                        score += Math.random() * 3;

                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = { selectedIndex, dest };
                        }
                    });
                });

                if (bestMove) {
                    const move = bestMove as { selectedIndex: number; dest: { q: number; r: number } };
                    const tile = tiles[move.selectedIndex];
                    setIsAnimating(true);
                    animateTileMove(move.selectedIndex, tile.q, tile.r, move.dest.q, move.dest.r);
                }
            }
            setAiThinking(false);
        }, 800);
    };

    // 初回マウント時のシャッフルアニメーション
    useEffect(() => {
        if (gameMode === 'ai' && isShuffling) {
            shuffleTimeoutRef.current = setTimeout(() => {
                setIsShuffling(false);
            }, 1200);
        }
        return () => {
            if (shuffleTimeoutRef.current) {
                clearTimeout(shuffleTimeoutRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (gameMode === 'ai' && turn === aiPlayer && !winner && !isAnimating && !aiThinking && !isShuffling) {
            makeAIMove();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turn, phase, gameMode, aiPlayer, winner, isAnimating, aiThinking, isShuffling]);

    const validDests = useMemo(() => {
        if (winner || isAnimating) return [];
        if (phase === 'move_token' && typeof selectedId === 'string') {
            const piece = pieces.find(p => p.id === selectedId);
            if (!piece) return [];
            return DIRECTIONS.map(dir => {
                let curQ = piece.q, curR = piece.r;
                let lastValid: { q: number; r: number } | null = null;
                while (true) {
                    const nQ = curQ + dir.q, nR = curR + dir.r;
                    if (!tileMap.has(coordsKey(nQ, nR)) || pieceMap.has(coordsKey(nQ, nR))) break;
                    lastValid = { q: nQ, r: nR }; curQ = nQ; curR = nR;
                }
                return lastValid;
            }).filter(Boolean) as { q: number; r: number }[];
        }
        if (phase === 'move_tile' && typeof selectedId === 'number') {
            const cands = new Map<string, { q: number; r: number; c: number }>();
            const rem = tiles.filter((_, i) => i !== selectedId);
            rem.forEach(t => DIRECTIONS.forEach(d => {
                const nQ = t.q+d.q, nR = t.r+d.r, k = coordsKey(nQ, nR);
                if (rem.some(rt => rt.q===nQ && rt.r===nR) || coordsKey(tiles[selectedId as number].q, tiles[selectedId as number].r) === k) return;
                const data = cands.get(k) || { q:nQ, r:nR, c:0 };
                data.c++; cands.set(k, data);
            }));
            return Array.from(cands.values()).filter(c => c.c >= 2);
        }
        return [];
    }, [selectedId, phase, tiles, pieces, tileMap, pieceMap, winner, isAnimating]);

    return (
        <div ref={containerRef} id="main-content" className={`game-container ${winner === 'red' ? 'bg-rose' : winner === 'blue' ? 'bg-indigo' : 'bg-slate'}`}>
            {winner && <Confetti winner={winner} />}
            {showModeSelector && (
                <ModeSelector
                    strings={strings}
                    currentMode={gameMode}
                    onSelect={handleModeSelect}
                    onClose={() => setShowModeSelector(false)}
                />
            )}
            <header ref={headerRef} className="header" role="banner">
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                    <h1 className="game-title">Nonaga</h1>
                    <div style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'white',
                        background: gameMode === 'ai' ? '#f59e0b' : '#6366f1',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '9999px',
                        boxShadow: gameMode === 'ai' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(99, 102, 241, 0.3)',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap'
                    }}>
                        {gameMode === 'ai' ? strings.aiMode : strings.pvp}
                    </div>
                </div>
            </header>

            <div ref={statusRef} className="status-container">
                {isShuffling && gameMode === 'ai' ? (
                    <ShuffleAnimation strings={strings} />
                ) : winner ? (
                    <div className="victory-container">
                        <div className={`victory-badge ${winner}`}><span style={{fontSize:20, fontWeight:900}}>
                            {gameMode === 'ai'
                                ? (winner === aiPlayer ? strings.aiWin : strings.youWin)
                                : (winner === 'red' ? strings.redWin : strings.blueWin)}
                        </span></div>
                        <button onClick={resetGame} className="reset-button" disabled={isAnimating || aiThinking}>{strings.playAgain}</button>
                    </div>
                ) : (
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                        <div style={{display:'flex', alignItems:'center'}}>
                            <div className={`turn-indicator ${(isAnimating || aiThinking) ? 'disabled' : ''}`}>
                                <div className={`player-indicator ${turn === 'red' ? 'active' : ''}`}>
                                    <div className="player-dot red" />
                                    {gameMode === 'ai' ? (aiPlayer === 'red' ? strings.ai : strings.you) : strings.playerRed}
                                </div>
                                <div style={{width:1, height:12, background:'#e2e8f0'}} />
                                <div className={`player-indicator ${turn === 'blue' ? 'active' : ''}`}>
                                    <div className="player-dot blue" />
                                    {gameMode === 'ai' ? (aiPlayer === 'blue' ? strings.ai : strings.you) : strings.playerBlue}
                                </div>
                            </div>
                            <button onClick={() => setShowModeSelector(true)} className="mode-button" disabled={isAnimating || aiThinking}>
                                {strings.changeMode}
                            </button>
                        </div>
                        <div style={{fontSize:11, fontWeight:800, color:'#94a3b8', marginTop:10, textTransform:'uppercase', letterSpacing: '0.1em'}}>
                            {aiThinking ? strings.thinking : (phase === 'move_token' ? strings.phaseMoveToken : strings.phaseMoveTile)}
                        </div>
                    </div>
                )}
            </div>

            <div className="board-container" role="application" aria-label={strings.boardLabel}>
                <svg viewBox={`${viewBounds.x} ${viewBounds.y} ${viewBounds.w} ${viewBounds.h}`} className="board-svg" role="img" aria-label={strings.boardSvgLabel}>
                    <defs>
                        <filter id="selected-glow" x="-100%" y="-100%" width="300%" height="300%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur1"/>
                            <feOffset in="blur1" dx="0" dy="0" result="offsetBlur1"/>
                            <feFlood floodColor="#fbbf24" floodOpacity="1" result="color1"/>
                            <feComposite in="color1" in2="offsetBlur1" operator="in" result="glow1"/>

                            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur2"/>
                            <feOffset in="blur2" dx="0" dy="0" result="offsetBlur2"/>
                            <feFlood floodColor="#fbbf24" floodOpacity="0.8" result="color2"/>
                            <feComposite in="color2" in2="offsetBlur2" operator="in" result="glow2"/>

                            <feGaussianBlur in="SourceAlpha" stdDeviation="18" result="blur3"/>
                            <feOffset in="blur3" dx="0" dy="0" result="offsetBlur3"/>
                            <feFlood floodColor="#fbbf24" floodOpacity="0.5" result="color3"/>
                            <feComposite in="color3" in2="offsetBlur3" operator="in" result="glow3"/>

                            <feMerge>
                                <feMergeNode in="glow3"/>
                                <feMergeNode in="glow2"/>
                                <feMergeNode in="glow1"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <g>
                        {tiles.map((tile, i) => {
                            const pos = (animatingTile && animatingTile.index === i) ? { x: animatingTile.x, y: animatingTile.y } : hexToPixel(tile.q, tile.r);
                            const key = coordsKey(tile.q, tile.r);
                            const isV = victoryLine.includes(key);
                            const isSelected = phase === 'move_tile' && selectedId === i;
                            const isDestHint = phase === 'move_token' && validDests.some(d => d.q === tile.q && d.r === tile.r);
                            const isSelectableEmpty = !winner && phase === 'move_tile' && !pieceMap.has(key) && !isAnimating;
                            return (
                                <polygon key={`tile-${i}`} points="-34,-19 0,-38 34,-19 34,19 0,38 -34,19" transform={`translate(${pos.x}, ${pos.y})`}
                                    className={`tile ${isV ? `victory-tile ${winner}` : isSelected ? 'selected-origin' : isDestHint ? 'destination-hint' : isSelectableEmpty ? 'selectable-empty' : ''} ${winner && !isV ? 'faded' : ''}`}
                                    onClick={() => handleTileClick(tile, i)} />
                            );
                        })}
                        {phase === 'move_tile' && typeof selectedId === 'number' && validDests.map((dest, i) => {
                            const { x, y } = hexToPixel(dest.q, dest.r);
                            return (
                                <polygon key={`guide-${i}`} points="-30,-16 0,-34 30,-16 30,16 0,34 -30,16" transform={`translate(${x}, ${y})`}
                                    style={{fill:'#f0fdf4', stroke:'#34d399', strokeWidth:2, strokeDasharray:'4', opacity:0.8, cursor:'pointer'}}
                                    onClick={() => {
                                        setIsAnimating(true);
                                        animateTileMove(selectedId, tiles[selectedId].q, tiles[selectedId].r, dest.q, dest.r);
                                    }} />
                            );
                        })}
                        {pieces.map((p) => {
                            const isV = victoryLine.includes(coordsKey(p.q, p.r));
                            const pos = (animatingPiece && animatingPiece.id === p.id) ? { x: animatingPiece.x, y: animatingPiece.y } : hexToPixel(p.q, p.r);
                            const isMyTurn = !winner && p.player === turn && phase === 'move_token';
                            const isSelected = selectedId === p.id;
                            return (
                                <g key={p.id} transform={`translate(${pos.x}, ${pos.y})`} style={{cursor: 'pointer'}} onClick={() => handlePieceClick(p)}>
                                    <circle r="30" fill="transparent" />
                                    <circle r="20" className={`piece-main ${p.player} ${isSelected ? 'selected' : ''} ${isV ? 'victory-piece' : ''} ${isMyTurn ? 'my-turn' : ''}`} style={{opacity: (winner && !isV) ? 0.2 : 1, filter: isSelected ? 'url(#selected-glow)' : 'none'}} />
                                    <circle r="14" fill="rgba(0,0,0,0.05)" style={{pointerEvents:'none', opacity: (winner && !isV) ? 0 : 1}} />
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            <aside ref={rulesRef} className="rules-container" role="complementary" aria-label={strings.rulesLabel}>
                <div className="rules-card">
                    <div className="goal-box">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '0.5rem' }}>
                            <Link
                                href={lang === 'en' ? '/' : '/?lang=en'}
                                className="goal-hint"
                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                {lang === 'en' ? '日本語に変更' : 'Change to English'}
                            </Link>
                            <a
                                href={aboutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}
                            >
                                <span style={{fontSize:16}}>🏆</span>
                                <div>
                                    <p style={{ margin: 0 }}>{strings.goal}</p>
                                    <p className="goal-hint" style={{ margin: 0 }}>{strings.goalHint}</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
