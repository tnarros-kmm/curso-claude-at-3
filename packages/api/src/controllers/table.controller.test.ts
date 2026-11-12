import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { TableController } from './table.controller.js'
import { TableService } from '@services/table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Table } from '@models/table.model.js'

interface FakeResponse {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
}

function createResponse(): FakeResponse {
    const res = { status: vi.fn(), json: vi.fn(), send: vi.fn() }
    res.status.mockReturnValue(res)
    return res
}

async function call(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
    req: { params?: Record<string, string>, body?: unknown, query?: Record<string, unknown> }
) {
    const res = createResponse()
    const next = vi.fn()
    await handler({ params: {}, body: {}, query: {}, ...req } as unknown as Request, res as unknown as Response, next)
    return { res, next }
}

describe('TableController', () => {
    let service: TableService
    let controller: TableController
    let table: Table

    beforeEach(async () => {
        service = new TableService(new MockTableRepository())
        controller = new TableController(service)
        table = await service.create({ restaurantId: 'r1', number: 1, description: 'Ventana', capacity: 4 })
    })

    it('create should respond 201 with the table built from params and body', async () => {
        const { res } = await call(controller.create, {
            params: { restaurantId: 'r1' },
            body: { number: 2, description: 'Terraza', capacity: 6, status: 'ocupada', id: 'ignored' }
        })

        expect(res.status).toHaveBeenCalledWith(201)
        const body = res.json.mock.calls[0]?.[0]
        expect(body).toMatchObject({ restaurantId: 'r1', number: 2, description: 'Terraza', capacity: 6, status: 'libre' })
        expect(Object.keys(body).sort()).toEqual(['capacity', 'createdAt', 'description', 'id', 'number', 'restaurantId', 'status', 'updatedAt'])
        expect(body.id).not.toBe('ignored')
    })

    it('create should pass validation errors to next', async () => {
        const { res, next } = await call(controller.create, { params: { restaurantId: 'r1' }, body: { capacity: 2 } })

        expect(res.status).not.toHaveBeenCalled()
        expect(next.mock.calls[0]?.[0]?.name).toBe('TableNumberRequiredError')
    })

    it('getAll should respond 200 with the tables of the restaurant', async () => {
        const { res } = await call(controller.getAll, { params: { restaurantId: 'r1' } })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([table])
    })

    it('getById should respond 200 with the table', async () => {
        const { res } = await call(controller.getById, { params: { restaurantId: 'r1', id: table.id } })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(table)
    })

    it('getById should pass TableNotFoundError to next for another restaurant', async () => {
        const { next } = await call(controller.getById, { params: { restaurantId: 'r2', id: table.id } })

        expect(next.mock.calls[0]?.[0]?.name).toBe('TableNotFoundError')
    })

    it('update should respond 200 with the updated table', async () => {
        const { res } = await call(controller.update, {
            params: { restaurantId: 'r1', id: table.id },
            body: { number: 9, capacity: 2 }
        })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]?.[0]).toMatchObject({ id: table.id, number: 9, capacity: 2, description: null, status: 'libre' })
    })

    it('update should pass errors to next', async () => {
        const { next } = await call(controller.update, { params: { restaurantId: 'r1', id: 'missing' }, body: { number: 1, capacity: 1 } })

        expect(next.mock.calls[0]?.[0]?.name).toBe('TableNotFoundError')
    })

    it('delete should respond 204 without body', async () => {
        const { res } = await call(controller.delete, { params: { restaurantId: 'r1', id: table.id } })

        expect(res.status).toHaveBeenCalledWith(204)
        expect(res.send).toHaveBeenCalledWith()
    })

    it('delete should pass errors to next', async () => {
        const { next } = await call(controller.delete, { params: { restaurantId: 'r1', id: 'missing' } })

        expect(next.mock.calls[0]?.[0]?.name).toBe('TableNotFoundError')
    })

    it('updateStatus should respond 200 with the table in the new status', async () => {
        const { res } = await call(controller.updateStatus, {
            params: { restaurantId: 'r1', id: table.id },
            body: { status: 'reservada' }
        })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]?.[0]).toMatchObject({ id: table.id, status: 'reservada' })
    })

    it('updateStatus should pass InvalidTableStatusError to next', async () => {
        const { next } = await call(controller.updateStatus, { params: { restaurantId: 'r1', id: table.id }, body: {} })

        expect(next.mock.calls[0]?.[0]?.name).toBe('InvalidTableStatusError')
    })

    it('getAvailable should respond 200 with free tables for the people query', async () => {
        const { res } = await call(controller.getAvailable, { params: { restaurantId: 'r1' }, query: { people: '4' } })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith([table])
    })

    it('getAvailable should pass InvalidCapacityError to next when people is missing', async () => {
        const { next } = await call(controller.getAvailable, { params: { restaurantId: 'r1' } })

        expect(next.mock.calls[0]?.[0]?.name).toBe('InvalidCapacityError')
    })

    it('occupy should respond 200 with the occupied table', async () => {
        const { res } = await call(controller.occupy, { params: { restaurantId: 'r1', id: table.id } })

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json.mock.calls[0]?.[0]).toMatchObject({ id: table.id, status: 'ocupada' })
    })

    it('occupy should pass TableNotAvailableError to next when the table is not free', async () => {
        await service.occupy('r1', table.id)

        const { next } = await call(controller.occupy, { params: { restaurantId: 'r1', id: table.id } })

        expect(next.mock.calls[0]?.[0]?.name).toBe('TableNotAvailableError')
    })
})
