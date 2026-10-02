import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectSource, inspectTheme } from '../scripts/check-design-system.mjs'

const page = 'src/features/dashboard/Page.tsx'
test('guard rejects literal colors, palette classes and cva', () => {
  for (const source of [
    'const x = "bg-blue-600"',
    'const x = "text-[#213342]"',
    'import { cva } from "class-variance-authority"',
  ])
    assert.ok(inspectSource(source, page).length)
})
test('guard rejects raw buttons and manual class variants', () => {
  for (const source of [
    'const x = <button />',
    'const x = <div className={active ? "a" : "b"} />',
    'const x = <div className={`base ${active}`} />',
  ])
    assert.ok(inspectSource(source, page).length)
})
test('guard accepts semantic tokens and typed tv recipes', () => {
  assert.deepEqual(
    inspectSource(
      'const x = tv({ base: "bg-primary text-primary-foreground", variants: { size: { sm: "p-2" } }, defaultVariants: { size: "sm" } })',
      page,
    ),
    [],
  )
  assert.ok(inspectSource('const x = tv({ variants: {} })', page).length)
})
test('theme guard permits token definitions but rejects selector colors', () => {
  assert.deepEqual(
    inspectTheme(
      ':root { --primary: #5540bd; } body { color: var(--primary); }',
      'index.css',
    ),
    [],
  )
  assert.ok(
    inspectTheme(
      ':root { --primary: #5540bd; } body { color: #5540bd; }',
      'index.css',
    ).length,
  )
})
