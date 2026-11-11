import { expect, test, type Locator, type Page } from '@playwright/test'
import { deleteDishesByName } from './helpers/login'

const DISH_NAME = `Plato teclado ${Date.now()}`

test.use({
  video: { mode: 'on', size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 250 }
})

/** Pulsa Tab hasta que el foco llega al elemento indicado. Solo teclado. */
async function tabTo(page: Page, target: Locator, direction: 'Tab' | 'Shift+Tab' = 'Tab', max = 40): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement)) return
    await page.keyboard.press(direction)
  }
  throw new Error('No se alcanzó el elemento con el teclado')
}

test.afterEach(async ({ page, request }) => {
  await page.waitForTimeout(1000)
  await page.close()
  await page.video()?.saveAs('e2e-videos/dish-form-keyboard.webm')
  await deleteDishesByName(request, DISH_NAME)
})

test('crear un plato usando solo el teclado', async ({ page }) => {
  // Entrar al formulario desde la lista con Tab/Enter
  await page.goto('/restaurants/rest-1/dishes')
  await expect(page.getByRole('heading', { level: 1, name: 'Platos' })).toBeVisible()
  await tabTo(page, page.getByRole('link', { name: 'Nuevo plato' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo plato' })).toBeVisible()

  // Nombre, precio (se modifica), categoría y descripción
  const name = page.getByLabel(/Nombre del plato/)
  const price = page.getByLabel(/Precio/)
  await tabTo(page, name)
  await page.keyboard.type('Plato provisional')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type(DISH_NAME)
  await page.keyboard.press('Tab')
  await expect(price).toBeFocused()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('7')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Categoría')).toBeFocused()
  await page.keyboard.type('Postre')
  await page.keyboard.press('Tab') // Disponible
  await page.keyboard.press('Tab') // Descripción
  await expect(page.getByLabel(/Descripción/)).toBeFocused()
  await page.keyboard.type('Creado solo con teclado')

  // Añadir dos ingredientes y quitar el primero
  const ingredient = page.getByLabel('Ingrediente', { exact: true })
  await page.keyboard.press('Tab')
  await expect(ingredient).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Tab')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('2')
  await page.keyboard.press('Enter')
  await expect(page.locator('ul.ingredient-chips li')).toHaveCount(1)
  await expect(ingredient).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.locator('ul.ingredient-chips li')).toHaveCount(2)

  const firstRemove = page.locator('ul.ingredient-chips li').first().getByRole('button', { name: /^Quitar/ })
  await tabTo(page, firstRemove, 'Shift+Tab')
  await page.keyboard.press('Enter')
  await expect(page.locator('ul.ingredient-chips li')).toHaveCount(1)

  // Envío incompleto: vaciar el nombre y guardar muestra errores y enfoca el campo
  await tabTo(page, name, 'Shift+Tab')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')
  await tabTo(page, page.getByRole('button', { name: 'Guardar' }))
  await page.keyboard.press('Enter')
  await expect(page.locator('.error-summary')).toBeVisible()
  await expect(page.locator('#name-error')).toBeVisible()
  await expect(name).toBeFocused()

  // Corregir y guardar
  await page.keyboard.type(DISH_NAME)
  await tabTo(page, page.getByRole('button', { name: 'Guardar' }))
  await page.keyboard.press('Space')

  await expect(page).toHaveURL(/\/restaurants\/rest-1\/dishes$/)
  await expect(page.getByText(DISH_NAME)).toBeVisible()
})
