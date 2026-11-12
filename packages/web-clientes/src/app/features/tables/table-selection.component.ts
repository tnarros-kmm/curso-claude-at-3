import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
        <h1>Elige tu mesa</h1>
        <p>Indica cuántas personas sois y selecciona una mesa libre</p>
      </div>

      <div class="people-form card">
        <label for="people">Número de personas</label>
        <input id="people" type="number" min="1" step="1" [value]="people()"
               (input)="onPeopleInput($any($event.target).value)" />
        <button class="btn btn-primary" [disabled]="loading()" (click)="search()">Buscar mesas</button>
      </div>

      @if (message()) {
        <div class="alert-error">{{ message() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card"><p>No hay mesas disponibles para {{ people() }} personas</p></div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                      (click)="selectedId.set(table.id)">
                <strong>Mesa {{ table.number }}</strong>
                <span>Capacidad: {{ table.capacity }}</span>
                @if (table.description) {
                  <span class="desc">{{ table.description }}</span>
                }
              </button>
            }
          </div>
          <button class="btn btn-primary continue-btn" [disabled]="!selectedId() || occupying()" (click)="continue()">
            {{ occupying() ? 'Reservando mesa...' : 'Continuar' }}
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .people-form { display: flex; gap: 12px; align-items: center; padding: 16px 20px; margin-bottom: 16px; flex-wrap: wrap; }
    .people-form input { width: 100px; }
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .table-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; text-align: left; cursor: pointer; }
    .table-card.selected { border-color: var(--green-medium); background: var(--green-glow); }
    .table-card .desc { color: var(--text-muted); font-size: 13px; }
    .continue-btn { margin-top: 8px; }
  `]
})
export class TableSelectionComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private readonly restaurantId = this.route.snapshot.paramMap.get('id')!

  readonly people = signal(2)
  readonly tables = signal<Table[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly searched = signal(false)
  readonly message = signal<string | null>(null)

  onPeopleInput(value: string): void {
    this.people.set(Number(value))
  }

  search(keepMessage = false): void {
    const people = this.people()
    if (!Number.isInteger(people) || people < 1) {
      this.message.set('Indica un número de personas válido (1 o más)')
      return
    }
    if (!keepMessage) this.message.set(null)
    this.loading.set(true)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.message.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const id = this.selectedId()
    if (!id || this.occupying()) return
    this.occupying.set(true)
    this.message.set(null)
    this.tableService.occupy(this.restaurantId, id).subscribe({
      next: (table) => {
        this.cartStore.setTable(table)
        this.occupying.set(false)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err: HttpErrorResponse) => {
        this.occupying.set(false)
        if (err.status === 400 && err.error?.error === 'TableNotAvailableError') {
          this.message.set('La mesa ya no está disponible. Elige otra, por favor.')
          this.search(true)
        } else if (err.status === 404) {
          this.message.set('La mesa ya no existe. Elige otra, por favor.')
          this.search(true)
        } else {
          this.message.set('Error al ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
