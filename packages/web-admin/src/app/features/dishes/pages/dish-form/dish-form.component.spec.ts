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

  describe('encabezados y agrupación', () => {
    it('hay un único h1 "Nuevo plato"', async () => {
      const { el } = await render()
      const h1 = el.querySelectorAll('h1')
      expect(h1.length).toBe(1)
      expect(h1[0].textContent?.trim()).toBe('Nuevo plato')
    })

    it('en edición el h1 es "Editar plato"', async () => {
      const dish = { name: 'X', description: null, price: 5, category: 'postre', available: true, ingredients: [] }
      const { el } = await render({ dishId: 'd-1', dish })
      expect(el.querySelector('h1')?.textContent?.trim()).toBe('Editar plato')
    })

    it('el fieldset de ingredientes tiene legend "Ingredientes del plato"', async () => {
      const { el } = await render()
      const legend = el.querySelector('fieldset > legend')
      expect(legend?.textContent?.trim()).toBe('Ingredientes del plato')
    })
  })

  describe('enlace volver e iconos', () => {
    it('el enlace volver tiene nombre accesible', async () => {
      const { el } = await render()
      const link = el.querySelector('a.back-link')
      expect(link?.getAttribute('aria-label')).toBe('Volver a la lista de platos')
    })

    it('los iconos decorativos están ocultos a tecnologías de apoyo', async () => {
      const { el } = await render()
      const icons = Array.from(el.querySelectorAll('lucide-icon'))
      expect(icons.length).toBeGreaterThan(0)
      icons.forEach(i => expect(i.getAttribute('aria-hidden')).toBe('true'))
    })
  })

  describe('acciones nativas', () => {
    it('hay un form con novalidate y Guardar es button submit', async () => {
      const { el } = await render()
      const form = el.querySelector('form')
      expect(form).toBeTruthy()
      expect(form!.hasAttribute('novalidate')).toBe(true)
      const save = form!.querySelector('button[type=submit]')
      expect(save?.textContent?.trim()).toBe('Guardar')
    })

    it('el submit del form llama a onSubmit', async () => {
      const { el, component } = await render()
      const spy = vi.spyOn(component, 'onSubmit').mockResolvedValue()
      el.querySelector('form')!.dispatchEvent(new Event('submit'))
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('Cancelar es un enlace a la lista', async () => {
      const { el } = await render()
      const cancel = Array.from(el.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Cancelar')
      expect(cancel).toBeTruthy()
      expect(cancel!.getAttribute('href')).toBe('/restaurants/rest-1/dishes')
    })
  })

  describe('añadir ingrediente', () => {
    function select(el: HTMLElement, fixture: ComponentFixture<DishFormComponent>, id: string, qty = '2') {
      const sel = el.querySelector<HTMLSelectElement>('#new-ingredient')!
      sel.value = id
      sel.dispatchEvent(new Event('change'))
      const q = el.querySelector<HTMLInputElement>('#new-ingredient-qty')!
      q.value = qty
      q.dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }

    it('el botón es un button type=button con aria-label y añade el ingrediente', async () => {
      const { el, fixture, component } = await render()
      const btn = el.querySelector<HTMLButtonElement>('button[aria-label="Añadir ingrediente"]')
      expect(btn).toBeTruthy()
      expect(btn!.type).toBe('button')
      select(el, fixture, 'ing-1')
      btn!.click()
      expect(component.form.ingredients).toEqual([{ ingredientId: 'ing-1', quantity: 2 }])
    })

    it('Enter en cantidad añade el ingrediente y no envía el formulario', async () => {
      const { el, fixture, component } = await render()
      const submit = vi.spyOn(component, 'onSubmit').mockResolvedValue()
      select(el, fixture, 'ing-2', '3')
      const q = el.querySelector<HTMLInputElement>('#new-ingredient-qty')!
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      q.dispatchEvent(ev)
      expect(component.form.ingredients).toEqual([{ ingredientId: 'ing-2', quantity: 3 }])
      expect(ev.defaultPrevented).toBe(true)
      expect(submit).not.toHaveBeenCalled()
    })

    it('no duplica ingredientes', async () => {
      const { el, fixture, component } = await render()
      const btn = el.querySelector<HTMLButtonElement>('button[aria-label="Añadir ingrediente"]')!
      select(el, fixture, 'ing-1')
      btn.click()
      fixture.detectChanges()
      select(el, fixture, 'ing-1')
      btn.click()
      expect(component.form.ingredients.length).toBe(1)
    })
  })

  describe('quitar ingrediente', () => {
    async function withIngredients() {
      const dish = {
        name: 'X', description: null, price: 5, category: 'postre', available: true,
        ingredients: [{ ingredientId: 'ing-1', quantity: 2 }, { ingredientId: 'ing-2', quantity: 1 }]
      }
      return render({ dishId: 'd-1', dish })
    }

    it('los chips forman una lista semántica con botón "Quitar X"', async () => {
      const { el } = await withIngredients()
      expect(el.querySelectorAll('ul li').length).toBe(2)
      const btns = Array.from(el.querySelectorAll<HTMLButtonElement>('ul li button'))
      expect(btns.map(b => b.getAttribute('aria-label'))).toEqual(['Quitar Tomate (kg)', 'Quitar Queso (g)'])
      btns.forEach(b => expect(b.type).toBe('button'))
    })

    it('al pulsar el botón se elimina el ingrediente', async () => {
      const { el, fixture, component } = await withIngredients()
      el.querySelector<HTMLButtonElement>('ul li button')!.click()
      fixture.detectChanges()
      expect(component.form.ingredients.map(i => i.ingredientId)).toEqual(['ing-2'])
      expect(el.querySelectorAll('ul li').length).toBe(1)
    })
  })
})
