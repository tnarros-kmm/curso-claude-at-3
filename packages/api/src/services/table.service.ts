import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { isPositiveInteger, normalizeTable, normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import { InvalidCapacityError, TableNotAvailableError, TableNotFoundError } from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: unknown
    description: unknown
    capacity: unknown
}

export interface UpdateTableDTO {
    number: unknown
    description: unknown
    capacity: unknown
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table = normalizeTable({
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: 'libre',
            createdAt: now,
            updatedAt: now
        })

        await this.tableRepository.create(table)
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.findById(restaurantId, id)
        const updated = normalizeTable({
            ...existing,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            updatedAt: new Date().toISOString()
        })

        await this.tableRepository.update(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.findById(restaurantId, id)
        await this.tableRepository.delete(id)
    }

    async changeStatus(restaurantId: string, id: string, status: unknown): Promise<Table> {
        const existing = await this.findById(restaurantId, id)
        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.updateStatus(id, updated.status, updated.updatedAt)
        return updated
    }

    async findAvailable(restaurantId: string, people: unknown): Promise<Table[]> {
        return this.tableRepository.findAvailable(restaurantId, this.parsePeople(people))
    }

    async occupy(restaurantId: string, id: string): Promise<Table> {
        const existing = await this.findById(restaurantId, id)
        const updatedAt = new Date().toISOString()

        const occupied = await this.tableRepository.occupyIfFree(id, updatedAt)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return { ...existing, status: 'ocupada', updatedAt }
    }

    private parsePeople(value: unknown): number {
        const people = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value
        if (!isPositiveInteger(people)) {
            throw new InvalidCapacityError('People must be a positive integer')
        }
        return people
    }
}
