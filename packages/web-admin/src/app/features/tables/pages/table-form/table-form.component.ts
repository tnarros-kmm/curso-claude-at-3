import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)

  form: { number: number | null; description: string; capacity: number | null } = {
    number: null,
    description: '',
    capacity: null
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const t = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = { number: t.number, description: t.description ?? '', capacity: t.capacity }
    } catch {
      this.error.set('No se pudo cargar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }

  private isPositiveInt(v: unknown): v is number {
    return typeof v === 'number' && Number.isInteger(v) && v >= 1
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    const { number, capacity, description } = this.form
    if (!this.isPositiveInt(number)) {
      this.error.set('El número de mesa debe ser un entero mayor que 0.')
      return
    }
    if (!this.isPositiveInt(capacity)) {
      this.error.set('La capacidad debe ser un entero mayor que 0.')
      return
    }
    const dto = { number, capacity, description: description.trim() || null }
    this.loading.set(true)
    try {
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }
}
