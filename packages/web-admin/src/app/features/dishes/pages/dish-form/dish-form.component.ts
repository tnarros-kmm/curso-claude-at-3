import { afterNextRender, Component, computed, ElementRef, inject, Injector, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import { validateDish, type DishFormErrors } from './dish-form.validation'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly injector = inject(Injector)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)
  fieldErrors = signal<DishFormErrors>({})
  liveMessage = signal('')
  errorSummary = computed(() => {
    const e = this.fieldErrors()
    const items: { fieldId: string; message: string }[] = []
    if (e.name) items.push({ fieldId: 'dish-name', message: e.name })
    if (e.price) items.push({ fieldId: 'dish-price', message: e.price })
    return items
  })

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = {
    name: '',
    description: null,
    price: 0,
    category: 'principal',
    available: true,
    ingredients: []
  }

  newIngredientId = ''
  newIngredientQty = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.ingredientStore.loadByRestaurant(this.restaurantId)
    }

    if (id && this.restaurantId) {
      this.isEditing = true
      this.dishId = id
      this.loadDish()
    }
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  focusField(fieldId: string, event?: Event): void {
    event?.preventDefault()
    this.host.nativeElement.querySelector<HTMLElement>(`#${fieldId}`)?.focus()
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
      { injector: this.injector }
    )
  }

  private plainIngredientName(ingredientId: string): string {
    return this.ingredientStore.ingredients().find(i => i.id === ingredientId)?.name ?? ingredientId
  }

  addIngredient(): void {
    if (!this.newIngredientId || this.newIngredientQty <= 0) return
    const exists = this.form.ingredients.find(i => i.ingredientId === this.newIngredientId)
    if (exists) return

    this.liveMessage.set(`Ingrediente ${this.plainIngredientName(this.newIngredientId)} añadido`)
    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.newIngredientId = ''
    this.newIngredientQty = 1
    this.focusAfterRender('#new-ingredient')
  }

  removeIngredient(ingredientId: string): void {
    const index = this.form.ingredients.findIndex(i => i.ingredientId === ingredientId)
    this.liveMessage.set(`Ingrediente ${this.plainIngredientName(ingredientId)} eliminado`)
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
    const hasNext = index >= 0 && index < this.form.ingredients.length
    this.focusAfterRender(hasNext ? `.ingredient-chips li:nth-child(${index + 1}) button` : '#new-ingredient')
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    const errors = validateDish(this.form)
    this.fieldErrors.set(errors)
    if (Object.keys(errors).length > 0) {
      const first = this.errorSummary()[0]
      afterNextRender(() => this.focusField(first.fieldId), { injector: this.injector })
      return
    }

    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
