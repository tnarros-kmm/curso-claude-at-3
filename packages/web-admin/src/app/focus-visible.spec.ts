import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), 'src')
const css = [
  readFileSync(resolve(root, 'styles.css'), 'utf8'),
  readFileSync(resolve(root, 'app/features/dishes/pages/dish-form/dish-form.component.css'), 'utf8')
].join('\n')

function rules(source: string): { selector: string; body: string }[] {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }))
}

describe('foco visible (WCAG 2.4.7 / 2.4.11)', () => {
  it('no elimina el outline sin sustituto', () => {
    const offenders = rules(css).filter(r => /outline\s*:\s*(none|0)\b/.test(r.body))
    expect(offenders.map(r => r.selector)).toEqual([])
  })

  it('define :focus-visible con outline sólido de al menos 2px', () => {
    const rule = rules(css).find(r => r.selector.includes(':focus-visible') && /outline\s*:/.test(r.body))
    expect(rule, 'regla :focus-visible con outline').toBeTruthy()
    const width = /outline\s*:\s*(\d+)px\s+solid/.exec(rule!.body)
    expect(width).not.toBeNull()
    expect(Number(width![1])).toBeGreaterThanOrEqual(2)
  })

  it('cubre controles de formulario, botones y enlaces', () => {
    const selectors = rules(css).filter(r => r.selector.includes(':focus-visible')).map(r => r.selector).join(',')
    for (const target of ['.form-control', 'button', 'a']) {
      expect(selectors).toContain(target)
    }
  })
})
