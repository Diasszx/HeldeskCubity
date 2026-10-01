import assert from 'node:assert/strict'
import test from 'node:test'
import { cn } from '../src/lib/utils.ts'

test('cn includes only active conditional classes', () => {
  assert.equal(
    cn('base', false, undefined, { active: true, disabled: false }),
    'base active',
  )
})

test('cn lets a component override conflicting Tailwind classes', () => {
  assert.equal(cn('px-2 bg-blue-500', 'px-4 bg-red-500'), 'px-4 bg-red-500')
})

test('cn preserves responsive variants alongside base classes', () => {
  assert.equal(cn('px-2 md:px-6', 'px-4'), 'md:px-6 px-4')
})
