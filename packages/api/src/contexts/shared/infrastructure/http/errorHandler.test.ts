import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    DuplicatedTableNumberError,
    InvalidCapacityError,
    InvalidTableStatusError,
    TableNumberRequiredError
} from '@errors/DomainErrors.js'

function createResponse() {
    const res = {
        status: vi.fn(),
        json: vi.fn()
    }
    res.status.mockReturnValue(res)
    return res
}

function handle(error: unknown) {
    const res = createResponse()
    errorHandler(error, {} as Request, res as unknown as Response, (() => {}) as NextFunction)
    return res
}

describe('errorHandler', () => {
    it('should map TableNotFoundError to 404 with name and message', () => {
        const res = handle(new TableNotFoundError())

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it.each([
        [new TableNotAvailableError(), 'TableNotAvailableError', 'Table is not available'],
        [new DuplicatedTableNumberError(), 'DuplicatedTableNumberError', 'Table number already exists in this restaurant'],
        [new InvalidCapacityError(), 'InvalidCapacityError', 'Capacity must be a positive integer'],
        [new InvalidTableStatusError(), 'InvalidTableStatusError', 'Invalid table status'],
        [new TableNumberRequiredError(), 'TableNumberRequiredError', 'Table number is required']
    ])('should map %s to 400', (error, name, message) => {
        const res = handle(error)

        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: name, message })
    })

    it('should map unknown errors to 500', () => {
        const res = handle(new Error('boom'))

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({ error: 'InternalServerError', message: 'Something went wrong' })
    })
})
