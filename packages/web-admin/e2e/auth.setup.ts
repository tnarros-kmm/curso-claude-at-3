import { test as setup } from '@playwright/test'
import { loginAsAdmin } from './helpers/login'

setup('autenticar como admin', async ({ request }) => {
  await loginAsAdmin(request)
})
