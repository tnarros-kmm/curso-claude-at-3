import type { TableRepository } from '@repositories/table.repository.js'
import type { Table, TableStatus } from '@models/table.model.js'
import { DuplicatedTableNumberError } from '@errors/DomainErrors.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async create(table: Table): Promise<void> {
        this.assertUniqueNumber(table)
        this.tables.set(table.id, { ...table })
    }

    async findById(id: string): Promise<Table | null> {
        const table = this.tables.get(id)
        return table ? { ...table } : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
            .map(t => ({ ...t }))
    }

    async update(table: Table): Promise<void> {
        const existing = this.tables.get(table.id)
        if (!existing) return
        this.assertUniqueNumber(table)
        this.tables.set(table.id, {
            ...existing,
            number: table.number,
            description: table.description,
            capacity: table.capacity,
            updatedAt: table.updatedAt
        })
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }

    async updateStatus(id: string, status: TableStatus, updatedAt: string): Promise<void> {
        const existing = this.tables.get(id)
        if (existing) {
            this.tables.set(id, { ...existing, status, updatedAt })
        }
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId && t.status === 'libre' && t.capacity >= people)
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
            .map(t => ({ ...t }))
    }

    async occupyIfFree(id: string, updatedAt: string): Promise<boolean> {
        const existing = this.tables.get(id)
        if (!existing || existing.status !== 'libre') return false
        this.tables.set(id, { ...existing, status: 'ocupada', updatedAt })
        return true
    }

    private assertUniqueNumber(table: Table): void {
        const duplicated = Array.from(this.tables.values()).some(t =>
            t.id !== table.id && t.restaurantId === table.restaurantId && t.number === table.number
        )
        if (duplicated) {
            throw new DuplicatedTableNumberError()
        }
    }
}
