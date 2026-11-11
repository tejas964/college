import { dayNumber } from './bills'

export interface Payout {
  id: string
  platform: string
  from: string
  to: string
  received: number
  status: 'open' | 'sent' | 'answered' | 'resolved'
}

export interface PayoutTrip {
  platform?: string
  day: string
  fare: number
}

export interface ReconcileResult {
  expected: number
  gap: number
  flagged: boolean
}

export function reconcile(
  payout: Payout,
  trips: PayoutTrip[],
  incentiveBonus: number
): ReconcileResult {
  const fromN = dayNumber(payout.from)
  const toN = dayNumber(payout.to)
  const expectedTrips = trips.filter((t) => {
    const p = t.platform ?? 'Main'
    if (p !== payout.platform) return false
    const dn = dayNumber(t.day)
    return dn >= fromN && dn <= toN
  })
  const fareSum = expectedTrips.reduce((s, t) => s + t.fare, 0)
  const expected = fareSum + incentiveBonus
  const gap = expected - payout.received
  const flagged = gap > 5000 && (expected === 0 ? false : gap > expected * 0.02)
  return { expected, gap, flagged }
}
