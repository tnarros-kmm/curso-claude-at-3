import { Database } from '@config/database.js'
import type { Table, TableStatus } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import { DuplicatedTableNumberError } from '@errors/DomainErrors.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    createdAt: string
    updatedAt: string
}

const SELECT_TABLE = `SELECT id, restaurant_id as restaurantId, number, description, capacity, status,
    created_at as createdAt, updated_at as updatedAt FROM tables`

export interface TableRepository {
    create(table: Table): Promise<void>
    findById(id: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    update(table: Table): Promise<void>
    delete(id: string): Promise<void>
    updateStatus(id: string, status: TableStatus, updatedAt: string): Promise<void>
    findAvailable(restaurantId: string, people: number): Promise<Table[]>
    occupyIfFree(id: string, updatedAt: string): Promise<boolean>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async create(table: Table): Promise<void> {
        await this.withDuplicateCheck(() => this.db.run(
            'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.createdAt, table.updatedAt]
        ))
    }

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`${SELECT_TABLE} WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(`${SELECT_TABLE} WHERE restaurant_id = ? ORDER BY number ASC`, [restaurantId])
        return rows.map(row => this.mapToTable(row))
    }

    async update(table: Table): Promise<void> {
        await this.withDuplicateCheck(() => this.db.run(
            'UPDATE tables SET number = ?, description = ?, capacity = ?, updated_at = ? WHERE id = ?',
            [table.number, table.description, table.capacity, table.updatedAt, table.id]
        ))
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ?', [id])
    }

    async updateStatus(id: string, status: TableStatus, updatedAt: string): Promise<void> {
        await this.db.run('UPDATE tables SET status = ?, updated_at = ? WHERE id = ?', [status, updatedAt, id])
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_TABLE} WHERE restaurant_id = ? AND status = 'libre' AND capacity >= ? ORDER BY capacity ASC, number ASC`,
            [restaurantId, people]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async occupyIfFree(id: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE tables SET status = 'ocupada', updated_at = ? WHERE id = ? AND status = 'libre'",
            [updatedAt, id]
        )
        return result.changes === 1
    }

    private async withDuplicateCheck(operation: () => Promise<unknown>): Promise<void> {
        try {
            await operation()
        } catch (error) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint failed: tables.restaurant_id, tables.number')) {
                throw new DuplicatedTableNumberError()
            }
            throw error
        }
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
