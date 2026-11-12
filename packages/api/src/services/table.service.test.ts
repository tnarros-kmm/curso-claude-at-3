import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'

describe('TableService', () => {
    let repository: MockTableRepository
    let service: TableService

    beforeEach(() => {
        repository = new MockTableRepository()
        service = new TableService(repository)
    })

    describe('create', () => {
        it('should create a free table with generated id and timestamps', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 3, description: 'Terraza', capacity: 4 })

            expect(table.id).toBeTruthy()
            expect(table).toMatchObject({ restaurantId: 'r1', number: 3, description: 'Terraza', capacity: 4, status: 'libre' })
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await repository.findById(table.id)).toEqual(table)
        })

        it('should store a missing description as null', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 3, description: undefined, capacity: 4 })

            expect(table.description).toBeNull()
        })

        it('should validate the table data', async () => {
            await expect(service.create({ restaurantId: 'r1', number: undefined, description: null, capacity: 4 }))
                .rejects.toThrow('Table number is required')
            await expect(service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 0 }))
                .rejects.toThrow('Capacity must be a positive integer')
        })

        it('should reject a duplicated number in the same restaurant', async () => {
            await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            await expect(service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 4 }))
                .rejects.toThrow('Table number already exists in this restaurant')
        })
    })

    describe('findByRestaurantId', () => {
        it('should return only the tables of the restaurant', async () => {
            await service.create({ restaurantId: 'r1', number: 2, description: null, capacity: 2 })
            await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })
            await service.create({ restaurantId: 'r2', number: 1, description: null, capacity: 2 })

            const tables = await service.findByRestaurantId('r1')

            expect(tables.map(t => t.number)).toEqual([1, 2])
        })
    })

    describe('findById', () => {
        it('should return the table of the restaurant', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            expect(await service.findById('r1', created.id)).toEqual(created)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.findById('r1', 'missing')).rejects.toThrow('Table not found')
        })

        it('should throw TableNotFoundError when the table belongs to another restaurant', async () => {
            const created = await service.create({ restaurantId: 'r2', number: 1, description: null, capacity: 2 })

            await expect(service.findById('r1', created.id)).rejects.toThrow('Table not found')
        })
    })

    describe('update', () => {
        it('should replace number, description and capacity keeping status and createdAt', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: 'Ventana', capacity: 2 })
            await service.changeStatus('r1', created.id, 'ocupada')

            const updated = await service.update('r1', created.id, { number: 5, description: undefined, capacity: 6 })

            expect(updated).toMatchObject({ id: created.id, number: 5, description: null, capacity: 6, status: 'ocupada', createdAt: created.createdAt })
            expect(await repository.findById(created.id)).toEqual(updated)
        })

        it('should validate the new data', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            await expect(service.update('r1', created.id, { number: 1, description: null, capacity: -1 }))
                .rejects.toThrow('Capacity must be a positive integer')
        })

        it('should reject a number used by another table', async () => {
            await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })
            const second = await service.create({ restaurantId: 'r1', number: 2, description: null, capacity: 2 })

            await expect(service.update('r1', second.id, { number: 1, description: null, capacity: 2 }))
                .rejects.toThrow('Table number already exists in this restaurant')
        })

        it('should throw TableNotFoundError for a table of another restaurant', async () => {
            const created = await service.create({ restaurantId: 'r2', number: 1, description: null, capacity: 2 })

            await expect(service.update('r1', created.id, { number: 1, description: null, capacity: 2 }))
                .rejects.toThrow('Table not found')
        })
    })

    describe('delete', () => {
        it('should delete the table', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            await service.delete('r1', created.id)

            expect(await repository.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.delete('r1', 'missing')).rejects.toThrow('Table not found')
        })
    })

    describe('changeStatus', () => {
        it('should change the status and return the updated table', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            const updated = await service.changeStatus('r1', created.id, 'Reservada')

            expect(updated.status).toBe('reservada')
            expect((await repository.findById(created.id))?.status).toBe('reservada')
        })

        it('should allow setting the same status', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            expect((await service.changeStatus('r1', created.id, 'libre')).status).toBe('libre')
        })

        it('should throw InvalidTableStatusError for an invalid status', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            await expect(service.changeStatus('r1', created.id, 'cerrada')).rejects.toThrow('Invalid table status')
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.changeStatus('r1', 'missing', 'libre')).rejects.toThrow('Table not found')
        })
    })

    describe('findAvailable', () => {
        beforeEach(async () => {
            await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })
            await service.create({ restaurantId: 'r1', number: 2, description: null, capacity: 6 })
            await service.create({ restaurantId: 'r1', number: 3, description: null, capacity: 4 })
            const busy = await service.create({ restaurantId: 'r1', number: 4, description: null, capacity: 4 })
            await service.changeStatus('r1', busy.id, 'ocupada')
        })

        it('should return free tables with enough capacity ordered by capacity', async () => {
            const tables = await service.findAvailable('r1', 4)

            expect(tables.map(t => t.number)).toEqual([3, 2])
        })

        it('should accept people as a numeric query string', async () => {
            const tables = await service.findAvailable('r1', '5')

            expect(tables.map(t => t.number)).toEqual([2])
        })

        it.each([undefined, '', 'abc', '0', '-1', '2.5', 0, ['2']])('should throw InvalidCapacityError when people is %s', async (people) => {
            await expect(service.findAvailable('r1', people)).rejects.toThrow('People must be a positive integer')
        })
    })

    describe('occupy', () => {
        it('should occupy a free table and return it', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })

            const occupied = await service.occupy('r1', created.id)

            expect(occupied.status).toBe('ocupada')
            expect((await repository.findById(created.id))?.status).toBe('ocupada')
        })

        it('should throw TableNotAvailableError when the table is not free', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, description: null, capacity: 2 })
            await service.occupy('r1', created.id)

            await expect(service.occupy('r1', created.id)).rejects.toThrow('Table is not available')
        })

        it('should throw TableNotFoundError when the table belongs to another restaurant', async () => {
            const created = await service.create({ restaurantId: 'r2', number: 1, description: null, capacity: 2 })

            await expect(service.occupy('r1', created.id)).rejects.toThrow('Table not found')
            expect((await repository.findById(created.id))?.status).toBe('libre')
        })
    })
})
