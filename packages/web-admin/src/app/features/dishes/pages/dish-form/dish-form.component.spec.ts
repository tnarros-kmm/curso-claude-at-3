import { importProvidersFrom, provideZonelessChangeDetection, signal } from '@angular/core'
import { LucideAngularModule, ChevronLeft, Plus, Trash2 } from 'lucide-angular'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { vi } from 'vitest'
import { DishFormComponent } from './dish-form.component'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'

export const INGREDIENTS = [
  { id: 'ing-1', name: 'Tomate', unit: 'kg' },
  { id: 'ing-2', name: 'Queso', unit: 'g' }
]

interface RenderOptions {
  dishId?: string
  dish?: unknown
}

async function render(options: RenderOptions = {}) {
  const store = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const service = { getById: vi.fn().mockReturnValue(of(options.dish ?? null)) }
  const ingredientStore = { ingredients: signal(INGREDIENTS), loadByRestaurant: vi.fn() }
  const route = {
    parent: { snapshot: { params: { restaurantId: 'rest-1' } } },
    snapshot: { paramMap: { get: (k: string) => (k === 'id' ? (options.dishId ?? null) : null) } }
  }

  TestBed.configureTestingModule({
    imports: [DishFormComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ ChevronLeft, Plus, Trash2 })),
      { provide: DishStore, useValue: store },
      { provide: DishService, useValue: service },
      { provide: IngredientStore, useValue: ingredientStore },
      { provide: ActivatedRoute, useValue: route }
    ]
  })

  const fixture: ComponentFixture<DishFormComponent> = TestBed.createComponent(DishFormComponent)
  const router = TestBed.inject(Router)
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true)
  fixture.detectChanges()
  await fixture.whenStable()
  fixture.detectChanges()
  const el: HTMLElement = fixture.nativeElement
  return { fixture, component: fixture.componentInstance, el, store, service, navigate }
}

describe('DishFormComponent', () => {
  it('se crea el componente y muestra "Nuevo plato"', async () => {
    const { component, el } = await render()
    expect(component).toBeTruthy()
    expect(el.textContent).toContain('Nuevo plato')
  })

  describe('etiquetas', () => {
    const labels = ['Nombre del plato', 'Precio', 'Categoría', 'Disponible', 'Descripción', 'Ingrediente', 'Cantidad']

    it.each(labels)('el control "%s" se resuelve por su label', async (text) => {
      const { el } = await render()
      const label = Array.from(el.querySelectorAll('label')).find(l => l.textContent?.includes(text))
      expect(label, `label ${text}`).toBeTruthy()
      const control = el.querySelector(`#${label!.getAttribute('for')}`)
      expect(control).toBeTruthy()
      expect(['INPUT', 'SELECT', 'TEXTAREA']).toContain(control!.tagName)
    })

    it('cada control tiene un id único', async () => {
      const { el } = await render()
      const controls = Array.from(el.querySelectorAll('input, select, textarea'))
      const ids = controls.map(c => c.id)
      expect(ids.every(Boolean)).toBe(true)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
