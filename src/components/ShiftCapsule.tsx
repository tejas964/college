import { useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent as ReactPointerEvent } from 'react'
import type { Action, AppState } from '../state'
import type { TFunction } from '../i18n'
import { formatDuration } from '../format'

export function ShiftCapsule({
  state,
  dispatch,
  t,
}: {
  state: AppState
  dispatch: Dispatch<Action>
  t: TFunction
}) {
  const on = state.shiftStartedAt !== null
  const [holding, setHolding] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdTriggered = useRef(false)

  useEffect(() => {
    if (state.shiftStartedAt === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [state.shiftStartedAt])

  const clearHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  const handleDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (on) {
      holdTriggered.current = false
      return
    }
    holdTriggered.current = false
    setHolding(true)
    holdTimer.current = setTimeout(() => {
      holdTriggered.current = true
      setHolding(false)
      dispatch({ type: 'startShift' })
    }, 600)
  }

  const handleUp = () => {
    clearHold()
    if (on && !holdTriggered.current) dispatch({ type: 'endShift' })
    setHolding(false)
    holdTriggered.current = false
  }

  const handleLeave = () => {
    clearHold()
    setHolding(false)
  }

  const elapsed = state.shiftStartedAt === null ? 0 : Math.max(0, now - state.shiftStartedAt)

  return (
    <div className={`shift-capsule glass ${on ? 'on' : ''}`} data-testid="shift-capsule">
      <div className="shift-status">
        <span className={`status-dot ${on ? 'live' : ''}`} />
        <div className="shift-copy">
          <span className="shift-label">{on ? t('shift.on') : t('shift.off')}</span>
          <span className="shift-time">{on ? formatDuration(elapsed) : t('shift.holdHint')}</span>
        </div>
      </div>
      <button
        type="button"
        className={`shift-button ${on ? 'end' : ''}`}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerLeave={handleLeave}
        onPointerCancel={handleLeave}
        onContextMenu={(event) => event.preventDefault()}
        aria-label={on ? t('shift.tapEnd') : t('shift.holdStart')}
      >
        <svg className="hold-ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="18" className="hold-ring-bg" />
          <circle
            cx="22"
            cy="22"
            r="18"
            className={`hold-ring-fill ${holding ? 'filling' : ''} ${on ? 'full' : ''}`}
          />
        </svg>
        <span>{on ? t('shift.tapEnd') : t('shift.holdStart')}</span>
      </button>
    </div>
  )
}