import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Zap,
  Trophy,
  RotateCcw,
  AlertTriangle,
  Timer,
  ChevronRight,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const GAME_STATE = {
  IDLE: 'idle',
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
  RESULT: 'result',
  TOO_EARLY: 'too_early',
}

const MIN_DELAY_MS = 2000
const MAX_DELAY_MS = 6000

// ─── LED Component ────────────────────────────────────────────────────────────
function LED({ color, isOn }) {
  const baseClasses =
    'w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 transition-all duration-200 select-none'

  const colorMap = {
    red: {
      on: 'bg-red-500 border-red-400 led-red-on',
      off: 'bg-red-950/60 border-red-900/50',
    },
    yellow: {
      on: 'bg-yellow-400 border-yellow-300 led-yellow-on',
      off: 'bg-yellow-950/60 border-yellow-900/50',
    },
    green: {
      on: 'bg-green-400 border-green-300 led-green-on',
      off: 'bg-green-950/60 border-green-900/50',
    },
  }

  const state = colorMap[color]

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${baseClasses} ${isOn ? state.on : state.off}`}
        role="img"
        aria-label={`${color} LED ${isOn ? 'on' : 'off'}`}
      />
      {/* LED socket ring */}
      <div className="w-4 h-1.5 rounded-full bg-gray-700 border border-gray-600" />
    </div>
  )
}

// ─── Scoreboard Row ───────────────────────────────────────────────────────────
function ScoreRow({ label, value, highlight }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 rounded-lg ${
        highlight ? 'bg-yellow-900/30 border border-yellow-600/40' : 'bg-gray-800/60'
      }`}
    >
      <span className="text-gray-400 text-xs uppercase tracking-widest">{label}</span>
      <span
        className={`font-digital text-sm ${
          highlight ? 'text-yellow-300' : 'text-gray-300'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function ReactionGame() {
  const [gameState, setGameState] = useState(GAME_STATE.IDLE)
  const [reactionTime, setReactionTime] = useState(null)
  const [bestTime, setBestTime] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [isPressing, setIsPressing] = useState(false)

  // Refs for timer IDs so we can clean up reliably
  const greenTimeoutRef = useRef(null)
  const startTimestampRef = useRef(null)

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (greenTimeoutRef.current) {
      clearTimeout(greenTimeoutRef.current)
      greenTimeoutRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  // ── Start sequence ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    clearTimers()
    setReactionTime(null)
    setIsPressing(false)

    // Phase 1: Red
    setGameState(GAME_STATE.RED)

    // Phase 2: Yellow after 800ms
    const yellowTimeout = setTimeout(() => {
      setGameState(GAME_STATE.YELLOW)

      // Phase 3: Green after random delay 2-6s
      const delay =
        Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) +
        MIN_DELAY_MS

      greenTimeoutRef.current = setTimeout(() => {
        startTimestampRef.current = performance.now()
        setGameState(GAME_STATE.GREEN)
        greenTimeoutRef.current = null
      }, delay)
    }, 800)

    // Store yellow timeout so it can be cleared too
    greenTimeoutRef.current = yellowTimeout
  }, [clearTimers])

  // ── Handle big button press ─────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (gameState === GAME_STATE.IDLE || gameState === GAME_STATE.RESULT) {
      startGame()
      return
    }

    if (gameState === GAME_STATE.RED || gameState === GAME_STATE.YELLOW) {
      // Too early!
      clearTimers()
      setAttempts((a) => a + 1)
      setGameState(GAME_STATE.TOO_EARLY)
      return
    }

    if (gameState === GAME_STATE.GREEN) {
      const elapsed = Math.round(performance.now() - startTimestampRef.current)
      clearTimers()
      setReactionTime(elapsed)
      setAttempts((a) => a + 1)
      setBestTime((prev) => (prev === null ? elapsed : Math.min(prev, elapsed)))
      setGameState(GAME_STATE.RESULT)
      return
    }

    if (gameState === GAME_STATE.TOO_EARLY) {
      startGame()
    }
  }, [gameState, clearTimers, startGame])

  // ── Keyboard support (spacebar) ─────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        handlePress()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePress])

  // ── Derived UI values ───────────────────────────────────────────────────────
  const leds = {
    red:
      gameState === GAME_STATE.RED ||
      gameState === GAME_STATE.YELLOW ||
      gameState === GAME_STATE.GREEN,
    yellow:
      gameState === GAME_STATE.YELLOW || gameState === GAME_STATE.GREEN,
    green: gameState === GAME_STATE.GREEN,
  }

  const isWaiting =
    gameState === GAME_STATE.RED || gameState === GAME_STATE.YELLOW

  const isGreen = gameState === GAME_STATE.GREEN

  const isNewBest =
    reactionTime !== null && bestTime !== null && reactionTime === bestTime

  // ── Button appearance ───────────────────────────────────────────────────────
  const buttonConfig = (() => {
    switch (gameState) {
      case GAME_STATE.IDLE:
        return {
          label: 'START CHALLENGE',
          sublabel: 'Press to begin',
          classes:
            'bg-blue-600 hover:bg-blue-500 border-blue-400 btn-glow-blue text-white',
          icon: <ChevronRight className="w-6 h-6" />,
        }
      case GAME_STATE.RED:
      case GAME_STATE.YELLOW:
        return {
          label: 'WAIT...',
          sublabel: 'Don\'t press yet!',
          classes:
            'bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed',
          icon: <Timer className="w-6 h-6" />,
        }
      case GAME_STATE.GREEN:
        return {
          label: 'PRESS!',
          sublabel: 'Go! Go! Go!',
          classes:
            'bg-green-500 hover:bg-green-400 border-green-300 led-green-on text-white cursor-pointer',
          icon: <Zap className="w-6 h-6" />,
        }
      case GAME_STATE.TOO_EARLY:
        return {
          label: 'TOO EARLY!',
          sublabel: 'Tap to try again',
          classes:
            'bg-red-700 hover:bg-red-600 border-red-400 led-red-on text-white',
          icon: <AlertTriangle className="w-6 h-6" />,
        }
      case GAME_STATE.RESULT:
        return {
          label: 'PLAY AGAIN',
          sublabel: 'Beat your score!',
          classes:
            'bg-blue-600 hover:bg-blue-500 border-blue-400 btn-glow-blue text-white',
          icon: <RotateCcw className="w-6 h-6" />,
        }
      default:
        return {
          label: 'START',
          sublabel: '',
          classes: 'bg-gray-700 border-gray-500 text-white',
          icon: null,
        }
    }
  })()

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 select-none overflow-hidden relative">
      {/* Subtle scanline overlay on the whole page */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
        }}
      />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute top-10 left-1/4 w-72 h-72 bg-blue-800/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-72 h-72 bg-yellow-800/10 rounded-full blur-3xl" />

      {/* ── Main Card ────────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-sm sm:max-w-md scanline-overlay z-10
          bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl
          flex flex-col items-center gap-6 p-6 sm:p-8"
        style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 text-xs tracking-[0.3em] uppercase font-bold">
              Reaction Test
            </span>
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <h1
            className="title-glow text-3xl sm:text-4xl font-black tracking-tight text-yellow-300 text-center leading-tight"
          >
            LIGHT SPEED<br />CHALLENGE
          </h1>
          <p className="text-gray-500 text-xs tracking-widest mt-1">
            HOW FAST ARE YOU?
          </p>
        </div>

        {/* ── Hardware panel surround ───────────────────────────────────────── */}
        <div
          className="w-full rounded-xl bg-gray-800 border border-gray-700 p-4"
          style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)' }}
        >
          {/* LED strip label */}
          <div className="flex justify-center mb-3">
            <span className="text-gray-600 text-[10px] tracking-[0.4em] uppercase">
              Signal Array
            </span>
          </div>

          {/* LED row */}
          <div className="flex justify-center gap-6 sm:gap-8">
            <LED color="red" isOn={leds.red} />
            <LED color="yellow" isOn={leds.yellow} />
            <LED color="green" isOn={leds.green} />
          </div>

          {/* Status text under LEDs */}
          <div className="mt-4 text-center h-6">
            {isWaiting && (
              <p className="text-yellow-400 text-xs tracking-widest uppercase animate-pulse">
                Prepare yourself...
              </p>
            )}
            {isGreen && (
              <p className="text-green-400 text-xs tracking-widest uppercase font-bold">
                GO! GO! GO!
              </p>
            )}
            {gameState === GAME_STATE.TOO_EARLY && (
              <p className="text-red-400 text-xs tracking-widest uppercase font-bold">
                ⚡ False start!
              </p>
            )}
          </div>
        </div>

        {/* ── Result display ────────────────────────────────────────────────── */}
        {gameState === GAME_STATE.RESULT && reactionTime !== null && (
          <div
            className="w-full rounded-xl bg-gray-800/80 border border-gray-700 px-4 py-4 flex flex-col items-center gap-2"
            style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}
          >
            <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">
              Reaction Time
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className="font-digital text-5xl sm:text-6xl font-black text-green-300"
                style={{
                  textShadow:
                    '0 0 12px #4ade80, 0 0 30px #22c55e',
                }}
              >
                {reactionTime}
              </span>
              <span className="font-digital text-xl text-green-500">ms</span>
            </div>
            {isNewBest && (
              <div className="flex items-center gap-1.5 mt-1 bg-yellow-900/40 border border-yellow-600/50 rounded-full px-3 py-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 text-xs font-bold tracking-wider uppercase">
                  New Best!
                </span>
              </div>
            )}
            {/* Performance label */}
            <p className="text-gray-500 text-xs mt-1">
              {reactionTime < 200
                ? '⚡ Lightning reflexes!'
                : reactionTime < 300
                ? '🔥 Excellent!'
                : reactionTime < 400
                ? '👍 Good reaction'
                : reactionTime < 600
                ? '😐 Average'
                : '🐢 Keep practicing!'}
            </p>
          </div>
        )}

        {/* ── Big Action Button ──────────────────────────────────────────────── */}
        <button
          onClick={handlePress}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          disabled={isWaiting}
          aria-label={buttonConfig.label}
          className={`
            relative w-full rounded-2xl border-2 py-6 px-4
            font-black text-2xl tracking-widest uppercase
            transition-all duration-100
            flex flex-col items-center justify-center gap-1
            ${buttonConfig.classes}
            ${isPressing && !isWaiting ? 'scale-95 brightness-125' : 'scale-100'}
            disabled:opacity-70 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
          `}
          style={
            isWaiting
              ? {}
              : {
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }
          }
        >
          <div className="flex items-center gap-2">
            {buttonConfig.icon}
            <span>{buttonConfig.label}</span>
          </div>
          <span className="text-xs font-normal opacity-70 tracking-widest normal-case">
            {buttonConfig.sublabel}
          </span>

          {/* Keyboard hint */}
          <span className="absolute bottom-2 right-3 text-[9px] opacity-30 tracking-wider normal-case font-normal">
            SPACE
          </span>
        </button>

        {/* ── Scoreboard ────────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">
              Session Stats
            </span>
          </div>
          <ScoreRow
            label="Best Time"
            value={bestTime !== null ? `${bestTime} ms` : '---'}
            highlight={bestTime !== null}
          />
          <ScoreRow
            label="Attempts"
            value={attempts}
            highlight={false}
          />
          {reactionTime !== null && gameState === GAME_STATE.RESULT && (
            <ScoreRow
              label="Last Time"
              value={`${reactionTime} ms`}
              highlight={false}
            />
          )}
        </div>

        {/* ── Footer hint ───────────────────────────────────────────────────── */}
        <p className="text-gray-700 text-[10px] tracking-widest uppercase text-center">
          Wait for green · click as fast as you can
        </p>
      </div>

      {/* Version badge */}
      <p className="relative z-10 mt-4 text-gray-700 text-[10px] tracking-widest uppercase">
        v1.0 · Light Speed Challenge
      </p>
    </div>
  )
}
