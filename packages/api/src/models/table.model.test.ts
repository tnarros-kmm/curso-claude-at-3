import { describe, it, expect } from 'vitest'
import { normalizeTable, normalizeTableStatus, TABLE_STATUSES } from './table.model.js'

const baseProps = {
    id: 't1',
    restaurantId: 'r1',
    number: 3,
    description: 'Terraza',
    capacity: 4,
    status: 'libre',
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z'
}

describe('normalizeTableStatus', () => {
    it('should expose the valid statuses', () => {
        expect(TABLE_STATUSES).toEqual(['libre', 'ocupada', 'reservada'])
    })

    it.each(['libre', 'ocupada', 'reservada'])('should accept %s', (status) => {
        expect(normalizeTableStatus(status)).toBe(status)
    })

    it('should normalize case and spaces', () => {
        expect(normalizeTableStatus('  Ocupada ')).toBe('ocupada')
    })

    it('should throw InvalidTableStatusError for an unknown status', () => {
        expect(() => normalizeTableStatus('cerrada'))
            .toThrow('Invalid table status: cerrada. Must be one of: libre, ocupada, reservada')
    })

    it.each([undefined, null, '', 3])('should throw InvalidTableStatusError for %s', (status) => {
        expect(() => normalizeTableStatus(status)).toThrow('Invalid table status')
    })
})

describe('normalizeTable', () => {
    it('should return a valid table', () => {
        expect(normalizeTable(baseProps)).toEqual(baseProps)
    })

    it('should trim the description', () => {
        expect(normalizeTable({ ...baseProps, description: '  Terraza  ' }).description).toBe('Terraza')
    })

    it.each([undefined, null, '', '   '])('should store description %s as null', (description) => {
        expect(normalizeTable({ ...baseProps, description }).description).toBeNull()
    })

    it.each([undefined, null, ''])('should throw TableNumberRequiredError when number is %s', (number) => {
        expect(() => normalizeTable({ ...baseProps, number })).toThrow('Table number is required')
    })

    it.each([0, -1, 2.5, '3', Number.NaN])('should throw TableNumberRequiredError when number is %s', (number) => {
        expect(() => normalizeTable({ ...baseProps, number })).toThrow('Table number must be a positive integer')
    })

    it.each([undefined, null, 0, -2, 1.5, '4', Number.NaN])('should throw InvalidCapacityError when capacity is %s', (capacity) => {
        expect(() => normalizeTable({ ...baseProps, capacity })).toThrow('Capacity must be a positive integer')
    })

    it('should throw InvalidTableStatusError for an invalid status', () => {
        expect(() => normalizeTable({ ...baseProps, status: 'cerrada' })).toThrow('Invalid table status')
    })

    it.each(['', '   '])('should throw RestaurantIdRequiredError when restaurantId is "%s"', (restaurantId) => {
        expect(() => normalizeTable({ ...baseProps, restaurantId })).toThrow('Restaurant ID is required')
    })
})
