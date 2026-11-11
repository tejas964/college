import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../App'

export function ShiftCapsule() {
  const { state, dispatch, t, today } = useApp()
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef<number | null>(null)
  const holdStartRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (state.shiftStartedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [state.shiftStartedAt])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function clearHold() {
    setHolding(false)
    setProgress(0)
    holdStartRef.current = null
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null }
    if (rafRef.current) { window.cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  function startHold() {
    if (state.shiftStartedAt !== null) return
    setHolding(true)
    holdStartRef.current = performance.now()
    const tick = () => {
      if (holdStartRef.current === null) return
      const elapsed = performance.now() - holdStartRef.current
      const p = Math.min(1, elapsed / 600)
      setProgress(p)
      if (p < 1) rafRef.current = window.requestAnimationFrame(tick)
    }
    rafRef.current = window.requestAnimationFrame(tick)
    timerRef.current = window.setTimeout(() => {
      dispatch({ type: 'startShift', at: Date.now() })
      clearHold()
    }, 600)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (state.shiftStartedAt !== null) {
      dispatch({ type: 'endShift', at: Date.now(), day: today })
      return
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    startHold()
  }
  function onPointerUp() { if (holding) clearHold() }
  function onPointerLeave() { if (holding) clearHold() }
  function onPointerCancel() { if (holding) clearHold() }

  const onShift = state.shiftStartedAt !== null
  const elapsedMin = onShift ? Math.floor((now - (state.shiftStartedAt as number)) / 60000) : 0
  const h = Math.floor(elapsedMin / 60)
  const m = elapsedMin % 60
  const timeStr = `${h}:${String(m).padStart(2, '0')}`

  return (
    <div className="shift-capsule glass" data-on={onShift ? 'true' : 'false'}>
      <div className="shift-status">
        <span className="shift-dot" />
        <span>{onShift ? t('shift.onShift') : t('shift.offShift')}</span>
        {onShift && <span className="shift-timer">{timeStr}</span>}
      </div>
      <button
        className="shift-btn"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        aria-label={onShift ? t('shift.tapEnd') : t('shift.holdStart')}
      >
        <span className="shift-ring" style={{ ['--p' as any]: holding ? progress : 0 }} />
        <span className="shift-btn-label">{onShift ? t('shift.tapEnd') : t('shift.holdStart')}</span>
      </button>
    </div>
  )
}
