import type { Trip } from './trips'

export type PayoutStatus = 'open' | 'sent' | 'answered' | 'resolved'

export interface Payout {
  id: string
  platform: string
  from: string
  to: string
  received: number
  status: PayoutStatus
}

export interface Reconciliation {
  expected: number
  received: number
  gap: number
  flagged: boolean
  tripCount: number
}

function platformOf(trip: Trip): string {
  return trip.platform ?? 'Main'
}

export function reconcile(payout: Payout, trips: Trip[], incentiveBonus: number): Reconciliation {
  const periodTrips = trips.filter(
    (trip) =>
      platformOf(trip) === payout.platform &&
      trip.day >= payout.from &&
      trip.day <= payout.to,
  )
  const expected = periodTrips.reduce((sum, trip) => sum + trip.fare, 0) + incentiveBonus
  const gap = expected - payout.received
  const flagged = gap > 5_000 && gap > expected * 0.02
  return {
    expected,
    received: payout.received,
    gap,
    flagged,
    tripCount: periodTrips.length,
  }
}