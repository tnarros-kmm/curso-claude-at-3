import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { APIRequestContext } from '@playwright/test'

export const ADMIN_EMAIL = 'admin@resttek.com'
export const STORAGE_STATE = 'e2e/.auth/admin.json'
const API_URL = 'http://localhost:3000/api/v1'

/** Inicia sesión por API con el usuario seed (contraseña = email) y guarda el storageState. */
export async function loginAsAdmin(request: APIRequestContext, email = ADMIN_EMAIL): Promise<void> {
  const response = await request.post(`${API_URL}/auth/login`, { data: { email, password: email } })
  if (!response.ok()) throw new Error(`Login fallido: ${response.status()}`)
  const { token, employee } = await response.json()

  mkdirSync(dirname(STORAGE_STATE), { recursive: true })
  const state = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4200',
        localStorage: [
          { name: 'auth_token', value: token },
          { name: 'auth_user', value: JSON.stringify(employee) }
        ]
      }
    ]
  }
  writeFileSync(STORAGE_STATE, JSON.stringify(state))
}
