import { Bill } from './engine/bills'
import { Rates, Trip } from './engine/trips'
import { LedgerEntry } from './engine/ledger'
import { IncentiveSlab } from './engine/incentives'
import { Payout } from './engine/payouts'

export interface ShiftLog {
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
  lang: 'en' | 'kn' | 'hi'
  theme: 'night' | 'day'
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
  shiftLog: ShiftLog[]
  shiftStartedAt: number | null
  entries: LedgerEntry[]
  incentives: IncentiveSlab[]
  payouts: Payout[]
  lastServiceDay: string | null
  serviceIntervalKm: number
}

const STORAGE_KEY = 'gigwallet.v1'

function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
function addDaysIso(base: string, n: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return iso(dt)
}

let idCounter = 0
export function genId(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

export function createSeed(today: string): AppState {
  const trips: Trip[] = []
  for (let i = 6; i >= 0; i--) {
    const day = addDaysIso(today, -i)
    const count = i === 0 ? 3 : 6
    for (let j = 0; j < count; j++) {
      const fare = 12000 + ((i * 7 + j * 13) % 10) * 1500
      const tip = j % 3 === 0 ? 1000 : 0
      const km = 4 + ((i + j) % 6)
      const minutes = 18 + ((i * 3 + j * 5) % 25)
      trips.push({
        id: `seed_trip_${i}_${j}`,
        day,
        fare,
        tip,
        km,
        minutes,
        platform: j % 5 === 0 ? 'Alt' : 'Main',
      })
    }
  }
  return {
    version: 1,
    lang: 'en',
    theme: 'night',
    balance: 4332809,
    bills: [
      { id: 'seed_bill_1', name: 'Phone EMI', amount: 150000, saved: 60000, dueDate: addDaysIso(today, 5) },
      { id: 'seed_bill_2', name: 'Bike insurance', amount: 220000, saved: 80000, dueDate: addDaysIso(today, 18) },
      { id: 'seed_bill_3', name: 'Rent share', amount: 500000, saved: 150000, dueDate: addDaysIso(today, 12) },
      { id: 'seed_bill_4', name: 'School fee', amount: 180000, saved: 180000, dueDate: addDaysIso(today, 25) },
    ],
    emergency: { goal: 5000000, saved: 800000, monthly: 150000 },
    livingPerDay: 35000,
    workDaysPerMonth: 26,
    dailyTarget: null,
    tdsDeducted: 120000,
    digitalReceiptsOk: false,
    rates: { mileage: 40, fuelPricePerLitre: 10500, wearPerKm: 80, platformFeeBps: 2000 },
    trips,
    shiftLog: [{ day: addDaysIso(today, -1), minutes: 420 }, { day: today, minutes: 120 }],
    shiftStartedAt: null,
    entries: [],
    incentives: [
      {
        id: 'seed_slab_1',
        platform: 'Main',
        label: 'Weekend bonus',
        startDay: addDaysIso(today, -2),
        endDay: addDaysIso(today, 4),
        tripsNeeded: 16,
        bonus: 60000,
      },
    ],
    payouts: [],
    lastServiceDay: addDaysIso(today, -40),
    serviceIntervalKm: 3000,
  }
}

function defaultState(): Partial<AppState> {
  return {
    version: 1,
    lang: 'en',
    theme: 'night',
    balance: 0,
    bills: [],
    emergency: { goal: 0, saved: 0, monthly: 0 },
    livingPerDay: 0,
    workDaysPerMonth: 26,
    dailyTarget: null,
    tdsDeducted: 0,
    digitalReceiptsOk: false,
    rates: { mileage: 40, fuelPricePerLitre: 10500, wearPerKm: 80, platformFeeBps: 2000 },
    trips: [],
    shiftLog: [],
    shiftStartedAt: null,
    entries: [],
    incentives: [],
    payouts: [],
    lastServiceDay: null,
    serviceIntervalKm: 3000,
  }
}

export function mergeDefaults(parsed: unknown, today: string): AppState {
  const seed = createSeed(today)
  const base = defaultState()
  if (!parsed || typeof parsed !== 'object') return seed
  const p = parsed as Partial<AppState>
  if (p.version !== 1) return seed
  return {
    ...(base as AppState),
    ...p,
    version: 1,
    emergency: { ...(base.emergency as Emergency), ...(p.emergency || {}) },
    rates: { ...(base.rates as Rates), ...(p.rates || {}) },
    bills: Array.isArray(p.bills) ? p.bills : [],
    trips: Array.isArray(p.trips) ? p.trips : [],
    shiftLog: Array.isArray(p.shiftLog) ? p.shiftLog : [],
    entries: Array.isArray(p.entries) ? p.entries : [],
    incentives: Array.isArray(p.incentives) ? p.incentives : [],
    payouts: Array.isArray(p.payouts) ? p.payouts : [],
  }
}

export function loadState(today: string): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed(today)
    const parsed = JSON.parse(raw)
    return mergeDefaults(parsed, today)
  } catch {
    return createSeed(today)
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

export type Action =
  | { type: 'addTrip'; trip: Trip }
  | { type: 'addSetAside'; billId: string; amount: number }
  | { type: 'update'; patch: Partial<AppState> }
  | { type: 'startShift'; at: number }
  | { type: 'endShift'; at: number; day: string }
  | { type: 'addEntry'; entry: LedgerEntry }
  | { type: 'setEntryStatus'; id: string; status: LedgerEntry['status'] }
  | { type: 'upsertSlab'; slab: IncentiveSlab }
  | { type: 'removeSlab'; id: string }
  | { type: 'upsertPayout'; payout: Payout }
  | { type: 'removePayout'; id: string }
  | { type: 'reset'; today: string }

function upsertById<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = arr.findIndex((x) => x.id === item.id)
  if (idx === -1) return [...arr, item]
  const copy = arr.slice()
  copy[idx] = item
  return copy
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addTrip':
      return { ...state, trips: [...state.trips, action.trip] }
    case 'addSetAside': {
      const bills = state.bills.map((b) => {
        if (b.id !== action.billId) return b
        const add = Math.max(0, action.amount)
        const saved = Math.min(b.amount, b.saved + add)
        return { ...b, saved }
      })
      return { ...state, bills }
    }
    case 'update':
      return { ...state, ...action.patch }
    case 'startShift':
      return { ...state, shiftStartedAt: action.at }
    case 'endShift': {
      if (state.shiftStartedAt === null) return state
      const minutes = Math.max(0, Math.round((action.at - state.shiftStartedAt) / 60000))
      const idx = state.shiftLog.findIndex((s) => s.day === action.day)
      let shiftLog: ShiftLog[]
      if (idx === -1) {
        shiftLog = [...state.shiftLog, { day: action.day, minutes }]
      } else {
        shiftLog = state.shiftLog.map((s, i) => (i === idx ? { ...s, minutes: s.minutes + minutes } : s))
      }
      return { ...state, shiftStartedAt: null, shiftLog }
    }
    case 'addEntry':
      return { ...state, entries: [...state.entries, action.entry] }
    case 'setEntryStatus':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.id ? { ...e, status: action.status } : e)),
      }
    case 'upsertSlab':
      return { ...state, incentives: upsertById(state.incentives, action.slab) }
    case 'removeSlab':
      return { ...state, incentives: state.incentives.filter((s) => s.id !== action.id) }
    case 'upsertPayout':
      return { ...state, payouts: upsertById(state.payouts, action.payout) }
    case 'removePayout':
      return { ...state, payouts: state.payouts.filter((p) => p.id !== action.id) }
    case 'reset':
      return createSeed(action.today)
    default:
      return state
  }
}

export { STORAGE_KEY }
