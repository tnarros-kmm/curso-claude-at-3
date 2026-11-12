import {
    InvalidCapacityError,
    InvalidTableStatusError,
    RestaurantIdRequiredError,
    TableNumberRequiredError
} from '@errors/DomainErrors.js'

export const TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatus = typeof TABLE_STATUSES[number]

export interface Table {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: TableStatus
    createdAt: string
    updatedAt: string
}

export interface TableProps {
    id: string
    restaurantId: string
    number: unknown
    description: unknown
    capacity: unknown
    status: unknown
    createdAt: string
    updatedAt: string
}

export function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function normalizeTableStatus(value: unknown): TableStatus {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new InvalidTableStatusError()
    }

    const normalized = value.trim().toLowerCase()
    if (!TABLE_STATUSES.includes(normalized as TableStatus)) {
        throw new InvalidTableStatusError(`Invalid table status: ${value}. Must be one of: ${TABLE_STATUSES.join(', ')}`)
    }
    return normalized as TableStatus
}

function normalizeDescription(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}

export function normalizeTable(props: TableProps): Table {
    if (!props.restaurantId || props.restaurantId.trim() === '') {
        throw new RestaurantIdRequiredError()
    }
    if (props.number === undefined || props.number === null || props.number === '') {
        throw new TableNumberRequiredError()
    }
    if (!isPositiveInteger(props.number)) {
        throw new TableNumberRequiredError('Table number must be a positive integer')
    }
    if (!isPositiveInteger(props.capacity)) {
        throw new InvalidCapacityError()
    }

    return {
        id: props.id,
        restaurantId: props.restaurantId,
        number: props.number,
        description: normalizeDescription(props.description),
        capacity: props.capacity,
        status: normalizeTableStatus(props.status),
        createdAt: props.createdAt,
        updatedAt: props.updatedAt
    }
}
