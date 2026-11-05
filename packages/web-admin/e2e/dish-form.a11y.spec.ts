import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createDishViaApi } from './helpers/login'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa']

async function analyze(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).withTags(TAGS).include('form').analyze()
}

test.describe('Formulario de platos: accesibilidad (axe)', () => {
  test('nuevo plato no tiene violaciones', async ({ page }) => {
    await page.goto('/restaurants/rest-1/dishes/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo plato' })).toBeVisible()
    expect((await analyze(page)).violations).toEqual([])
  })

  test('formulario con errores no tiene violaciones', async ({ page }) => {
    await page.goto('/restaurants/rest-1/dishes/new')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.locator('#name-error')).toBeVisible()
    expect((await analyze(page)).violations).toEqual([])
  })

  test('edición no tiene violaciones', async ({ page, request }) => {
    const id = await createDishViaApi(request, `A11y ${Date.now()}`)
    await page.goto(`/restaurants/rest-1/dishes/${id}/edit`)
    await expect(page.getByRole('heading', { level: 1, name: 'Editar plato' })).toBeVisible()
    await expect(page.getByLabel(/Nombre del plato/)).not.toHaveValue('')
    expect((await analyze(page)).violations).toEqual([])
  })
})
