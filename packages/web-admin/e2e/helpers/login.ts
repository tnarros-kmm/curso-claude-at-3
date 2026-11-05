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

/** Crea un plato por API (para tests de edición) y devuelve su id. */
export async function createDishViaApi(request: APIRequestContext, name: string): Promise<string> {
  const login = await request.post(`${API_URL}/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_EMAIL } })
  const { token } = await login.json()
  const headers = { Authorization: `Bearer ${token}` }
  const response = await request.post(`${API_URL}/restaurants/rest-1/dishes`, {
    headers,
    data: { name, description: null, price: 9.5, category: 'principal', available: true, ingredients: [] }
  })
  if (!response.ok()) throw new Error(`No se pudo crear el plato: ${response.status()}`)
  return (await response.json()).id
}
