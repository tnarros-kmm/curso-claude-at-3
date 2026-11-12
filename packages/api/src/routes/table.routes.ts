import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const tableService = new TableService(tableRepository)
const tableController = new TableController(tableService)

const READ_ROLES = ['admin', 'manager', 'camarero', 'cocinero']
const STATUS_ROLES = ['admin', 'manager', 'camarero']

const router = Router({ mergeParams: true })

// /available y /:id/occupy se registran antes que /:id
router.get('/available', authenticate, tableController.getAvailable)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)
router.patch('/:id/status', authenticate, authorize(STATUS_ROLES), tableController.updateStatus)

router.post('/', authenticate, authorize(['admin']), tableController.create)
router.get('/', authenticate, authorize(READ_ROLES), tableController.getAll)
router.get('/:id', authenticate, authorize(READ_ROLES), tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), tableController.update)
router.delete('/:id', authenticate, authorize(['admin']), tableController.delete)

export default router
