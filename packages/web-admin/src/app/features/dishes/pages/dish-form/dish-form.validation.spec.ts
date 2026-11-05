import { validateDish } from './dish-form.validation'

const base = { name: 'Paella', price: 12 }

describe('validateDish', () => {
  it('devuelve vacío si es válido', () => {
    expect(validateDish(base)).toEqual({})
  })

  it('exige nombre', () => {
    expect(validateDish({ ...base, name: '' })).toEqual({ name: 'El nombre es obligatorio' })
  })

  it('trata solo espacios como nombre vacío', () => {
    expect(validateDish({ ...base, name: '   ' })).toEqual({ name: 'El nombre es obligatorio' })
  })

  it('rechaza precio 0', () => {
    expect(validateDish({ ...base, price: 0 })).toEqual({ price: 'El precio debe ser mayor que 0' })
  })

  it('rechaza precio negativo', () => {
    expect(validateDish({ ...base, price: -3 })).toEqual({ price: 'El precio debe ser mayor que 0' })
  })

  it('rechaza precio nulo o NaN', () => {
    expect(validateDish({ ...base, price: null as unknown as number })).toEqual({ price: 'El precio debe ser mayor que 0' })
    expect(validateDish({ ...base, price: NaN })).toEqual({ price: 'El precio debe ser mayor que 0' })
  })

  it('devuelve ambos errores', () => {
    expect(validateDish({ name: '', price: 0 })).toEqual({
      name: 'El nombre es obligatorio',
      price: 'El precio debe ser mayor que 0'
    })
  })
})
