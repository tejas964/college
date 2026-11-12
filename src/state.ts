import { addDays, todayISO } from './engine/bills'
import type { Bill } from './engine/bills'
import type { IncentiveSlab } from './engine/incentives'
import type { LedgerEntry, LedgerStatus } from './engine/ledger'
import type { Payout } from './engine/payouts'
import type { Rates, Trip } from './engine/trips'

export const STORAGE_KEY = 'gigwallet.v1'

export type Lang = 'en' | 'kn' | 'hi'
export type Theme = 'night' | 'day'

export interface ShiftLogEntry {
  day: string
  minutes: number
}

export interface Emergency {
  goal: number
  saved: number
  monthly: number
}

export interface AppState {
  version: 1
  lang: Lang
  theme: Theme
  balance: number
  bills: Bill[]
  emergency: Emergency
  livingPerDay: number
  workDaysPerMonth: number
  dailyTarget: number | null
  tdsDeducted: number
  digitalReceiptsOk: boolean
  rates: Rates
  trips: Trip[]
  shiftLog: ShiftLogEntry[]
  shiftStartedAt: number | null
  entries: LedgerEntry[]
  incentives: IncentiveSlab[]
  payouts: Payout[]
  lastServiceDay: string | null
  serviceIntervalKm: number
}

export type Action =
  | { type: 'addTrip'; trip: Trip }
  | { type: 'addSetAside'; billId: string; amount: number }
  | { type: 'update'; patch: Partial<AppState> }
  | { type: 'startShift'; at?: number }
  | { type: 'endShift'; at?: number }
  | { type: 'addEntry'; entry: LedgerEntry }
  | { type: 'setEntryStatus'; id: string; status: LedgerStatus }
  | { type: 'upsertSlab'; slab: IncentiveSlab }
  | { type: 'removeSlab'; id: string }
  | { type: 'upsertPayout'; payout: Payout }
  | { type: 'removePayout'; id: string }
  | { type: 'reset'; today?: string }

export function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}

const defaultRates: Rates = {
  mileage: 45,
  fuelPricePerLitre: 10_700,
  wearPerKm: 180,
  platformFeeBps: 1_800,
}

export function createDefaultState(): AppState {
  return {
    version: 1,
    lang: 'en',
    theme: 'night',
    balance: 0,
    bills: [],
    emergency: { goal: 0, saved: 0, monthly: 0 },
    livingPerDay: 60_000,
    workDaysPerMonth: 26,
    dailyTarget: null,
    tdsDeducted: 0,
    digitalReceiptsOk: false,
    rates: { ...defaultRates },
    trips: [],
    shiftLog: [],
    shiftStartedAt: null,
    entries: [],
    incentives: [],
    payouts: [],
    lastServiceDay: null,
    serviceIntervalKm: 3_000,
  }
}

export function createSeed(today: string = todayISO()): AppState {
  const bills: Bill[] = [
    { id: 'sample-bill-1', name: 'Bike EMI', amount: 480_000, saved: 180_000, dueDate: addDays(today, 6) },
    { id: 'sample-bill-2', name: 'Rent', amount: 1_200_000, saved: 600_000, dueDate: addDays(today, 12) },
    { id: 'sample-bill-3', name: 'Insurance', amount: 240_000, saved: 240_000, dueDate: addDays(today, 20) },
    { id: 'sample-bill-4', name: 'Phone recharge', amount: 30_000, saved: 10_000, dueDate: addDays(today, -2) },
  ]

  const trips: Trip[] = []
  for (let dayOffset = -6; dayOffset <= 0; dayOffset += 1) {
    const day = addDays(today, dayOffset)
    const perDay = dayOffset === 0 ? 3 : 6
    for (let index = 0; index < perDay; index += 1) {
      const platform = (dayOffset + index) % 7 === 0 ? 'Other' : 'Main'
      trips.push({
        id: `sample-trip-${dayOffset + 6}-${index}`,
        day,
        fare: 12_000 + ((Math.abs(dayOffset) * 900 + index * 1_300) % 14_000),
        tip: index % 3 === 0 ? 1_000 : 0,
        km: 8 + ((Math.abs(dayOffset) + index) % 12),
        minutes: 35 + ((Math.abs(dayOffset) * 5 + index * 7) % 60),
        platform,
      })
    }
  }

  const shiftLog: ShiftLogEntry[] = Array.from({ length: 6 }, (_, i) => ({
    day: addDays(today, -6 + i),
    minutes: [420, 390, 450, 360, 480, 410][i],
  }))

  const incentives: IncentiveSlab[] = [
    {
      id: 'sample-slab-1',
      platform: 'Main',
      label: 'Weekend bonus',
      startDay: addDays(today, -2),
      endDay: addDays(today, 5),
      tripsNeeded: 16,
      bonus: 60_000,
    },
  ]

  return {
    ...createDefaultState(),
    balance: 4_332_809,
    bills,
    emergency: { goal: 3_000_000, saved: 800_000, monthly: 500_000 },
    livingPerDay: 60_000,
    workDaysPerMonth: 26,
    dailyTarget: null,
    tdsDeducted: 0,
    digitalReceiptsOk: false,
    rates: { ...defaultRates },
    trips,
    shiftLog,
    shiftStartedAt: null,
    entries: [],
    incentives,
    payouts: [],
    lastServiceDay: addDays(today, -24),
    serviceIntervalKm: 3_000,
  }
}

export function isSampleState(state: AppState): boolean {
  return state.trips.length > 0 && state.trips.every((trip) => trip.id.startsWith('sample-'))
}

function mergeState(parsed: Partial<AppState>): AppState {
  const defaults = createDefaultState()
  const emergency =
    typeof parsed.emergency === 'object' && parsed.emergency !== null
      ? parsed.emergency
      : {}
  const rates = typeof parsed.rates === 'object' && parsed.rates !== null ? parsed.rates : {}
  return {
    ...defaults,
    ...parsed,
    version: 1,
    emergency: { ...defaults.emergency, ...emergency },
    rates: { ...defaults.rates, ...rates },
    bills: Array.isArray(parsed.bills) ? parsed.bills : defaults.bills,
    trips: Array.isArray(parsed.trips) ? parsed.trips : defaults.trips,
    shiftLog: Array.isArray(parsed.shiftLog) ? parsed.shiftLog : defaults.shiftLog,
    entries: Array.isArray(parsed.entries) ? parsed.entries : defaults.entries,
    incentives: Array.isArray(parsed.incentives) ? parsed.incentives : defaults.incentives,
    payouts: Array.isArray(parsed.payouts) ? parsed.payouts : defaults.payouts,
  }
}

export function loadState(): AppState {
  try {
    if (typeof localStorage === 'undefined') return createSeed(todayISO())
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed(todayISO())
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (parsed.version !== 1) return createSeed(todayISO())
    return mergeState(parsed)
  } catch {
    return createSeed(todayISO())
  }
}

export function saveState(state: AppState): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable or full; the app keeps working in memory.
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addTrip':
      return { ...state, trips: [...state.trips, action.trip] }

    case 'addSetAside': {
      const amount = Number.isFinite(action.amount) ? Math.max(0, action.amount) : 0
      return {
        ...state,
        bills: state.bills.map((bill) =>
          bill.id === action.billId
            ? { ...bill, saved: Math.min(bill.amount, bill.saved + amount) }
            : bill,
        ),
      }
    }

    case 'update':
      return { ...state, ...action.patch }

    case 'startShift':
      return { ...state, shiftStartedAt: action.at ?? Date.now() }

    case 'endShift': {
      if (state.shiftStartedAt === null) return state
      const at = action.at ?? Date.now()
      const minutes = Math.max(0, Math.round((at - state.shiftStartedAt) / 60_000))
      const day = new Date(at).toISOString().slice(0, 10)
      return {
        ...state,
        shiftStartedAt: null,
        shiftLog: [...state.shiftLog, { day, minutes }],
      }
    }

    case 'addEntry':
      return { ...state, entries: [...state.entries, action.entry] }

    case 'setEntryStatus':
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === action.id ? { ...entry, status: action.status } : entry,
        ),
      }

    case 'upsertSlab': {
      const exists = state.incentives.some((slab) => slab.id === action.slab.id)
      return {
        ...state,
        incentives: exists
          ? state.incentives.map((slab) => (slab.id === action.slab.id ? action.slab : slab))
          : [...state.incentives, action.slab],
      }
    }

    case 'removeSlab':
      return { ...state, incentives: state.incentives.filter((slab) => slab.id !== action.id) }

    case 'upsertPayout': {
      const exists = state.payouts.some((payout) => payout.id === action.payout.id)
      return {
        ...state,
        payouts: exists
          ? state.payouts.map((payout) => (payout.id === action.payout.id ? action.payout : payout))
          : [...state.payouts, action.payout],
      }
    }

    case 'removePayout':
      return { ...state, payouts: state.payouts.filter((payout) => payout.id !== action.id) }

    case 'reset':
      return createSeed(action.today ?? todayISO())

    default:
      return state
  }
}