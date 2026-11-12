import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'

const NOW = '2026-11-12T10:00:00.000Z'

function buildTable(overrides: Partial<Table> = {}): Table {
    return {
        id: 't1',
        restaurantId: 'r1',
        number: 1,
        description: 'Ventana',
        capacity: 4,
        status: 'libre',
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides
    }
}

async function insertRestaurant(db: Database, id: string): Promise<void> {
    await db.run(
        'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, `Restaurante ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', NOW, NOW]
    )
}

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        await insertRestaurant(db, 'r1')
        await insertRestaurant(db, 'r2')
    })

    beforeEach(async () => {
        await db.run('DELETE FROM tables')
    })

    afterAll(async () => {
        await db.close()
    })

    it('should create and find a table by id with camelCase fields', async () => {
        const table = buildTable()
        await repo.create(table)

        expect(await repo.findById('t1')).toEqual(table)
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('missing')).toBeNull()
    })

    it('should keep a null description', async () => {
        await repo.create(buildTable({ description: null }))

        expect((await repo.findById('t1'))?.description).toBeNull()
    })

    it('should find tables by restaurant ordered by number', async () => {
        await repo.create(buildTable({ id: 't3', number: 3 }))
        await repo.create(buildTable({ id: 't1', number: 1 }))
        await repo.create(buildTable({ id: 'tx', number: 2, restaurantId: 'r2' }))

        const tables = await repo.findByRestaurantId('r1')

        expect(tables.map(t => t.id)).toEqual(['t1', 't3'])
    })

    it('should throw DuplicatedTableNumberError when the number exists in the restaurant', async () => {
        await repo.create(buildTable({ id: 't1', number: 1 }))

        await expect(repo.create(buildTable({ id: 't2', number: 1 })))
            .rejects.toThrow('Table number already exists in this restaurant')
    })

    it('should allow the same number in different restaurants', async () => {
        await repo.create(buildTable({ id: 't1', number: 1 }))
        await repo.create(buildTable({ id: 't2', number: 1, restaurantId: 'r2' }))

        expect(await repo.findById('t2')).not.toBeNull()
    })

    it('should update number, description, capacity and updatedAt', async () => {
        await repo.create(buildTable())
        const updated = buildTable({ number: 7, description: null, capacity: 6, updatedAt: '2026-11-12T11:00:00.000Z' })

        await repo.update(updated)

        expect(await repo.findById('t1')).toEqual(updated)
    })

    it('should not change the status on update', async () => {
        await repo.create(buildTable({ status: 'ocupada' }))

        await repo.update(buildTable({ status: 'libre', capacity: 2 }))

        expect((await repo.findById('t1'))?.status).toBe('ocupada')
    })

    it('should throw DuplicatedTableNumberError when updating to an existing number', async () => {
        await repo.create(buildTable({ id: 't1', number: 1 }))
        await repo.create(buildTable({ id: 't2', number: 2 }))

        await expect(repo.update(buildTable({ id: 't2', number: 1 })))
            .rejects.toThrow('Table number already exists in this restaurant')
    })

    it('should delete a table', async () => {
        await repo.create(buildTable())

        await repo.delete('t1')

        expect(await repo.findById('t1')).toBeNull()
    })

    it('should update the status', async () => {
        await repo.create(buildTable())

        await repo.updateStatus('t1', 'reservada', '2026-11-12T12:00:00.000Z')

        const found = await repo.findById('t1')
        expect(found?.status).toBe('reservada')
        expect(found?.updatedAt).toBe('2026-11-12T12:00:00.000Z')
    })

    it('should find free tables with enough capacity ordered by capacity and number', async () => {
        await repo.create(buildTable({ id: 'a', number: 1, capacity: 2 }))
        await repo.create(buildTable({ id: 'b', number: 2, capacity: 6 }))
        await repo.create(buildTable({ id: 'c', number: 3, capacity: 4 }))
        await repo.create(buildTable({ id: 'd', number: 4, capacity: 4, status: 'ocupada' }))
        await repo.create(buildTable({ id: 'e', number: 5, capacity: 8, status: 'reservada' }))
        await repo.create(buildTable({ id: 'f', number: 6, capacity: 4 }))
        await repo.create(buildTable({ id: 'g', number: 1, capacity: 10, restaurantId: 'r2' }))

        const tables = await repo.findAvailable('r1', 4)

        expect(tables.map(t => t.id)).toEqual(['c', 'f', 'b'])
    })

    it('should occupy a free table and return true', async () => {
        await repo.create(buildTable())

        const occupied = await repo.occupyIfFree('t1', '2026-11-12T13:00:00.000Z')

        expect(occupied).toBe(true)
        const found = await repo.findById('t1')
        expect(found?.status).toBe('ocupada')
        expect(found?.updatedAt).toBe('2026-11-12T13:00:00.000Z')
    })

    it.each(['ocupada', 'reservada'] as const)('should not occupy a %s table and return false', async (status) => {
        await repo.create(buildTable({ status }))

        const occupied = await repo.occupyIfFree('t1', '2026-11-12T13:00:00.000Z')

        expect(occupied).toBe(false)
        const found = await repo.findById('t1')
        expect(found?.status).toBe(status)
        expect(found?.updatedAt).toBe(NOW)
    })

    it('should return false when occupying a missing table', async () => {
        expect(await repo.occupyIfFree('missing', NOW)).toBe(false)
    })
})
