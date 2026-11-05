export interface DishFormErrors {
  name?: string
  price?: string
}

export function validateDish(form: { name: string; price: number }): DishFormErrors {
  const errors: DishFormErrors = {}
  if (!form.name || form.name.trim() === '') {
    errors.name = 'El nombre es obligatorio'
  }
  if (typeof form.price !== 'number' || Number.isNaN(form.price) || form.price <= 0) {
    errors.price = 'El precio debe ser mayor que 0'
  }
  return errors
}
