import { describe, expect, it } from 'vitest'
import { clampIndex, insertItem, moveItem } from './reorder'

describe('legal compliance reorder utilities', () => {
  it('moves the first item to the last position', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('moves the last item to the first position', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('returns the same array for a no-op move', () => {
    const items = ['a', 'b', 'c']
    expect(moveItem(items, 1, 1)).toBe(items)
  })

  it('inserts at the beginning, middle, and end', () => {
    expect(insertItem(['b', 'c'], 'a', 0)).toEqual(['a', 'b', 'c'])
    expect(insertItem(['a', 'c'], 'b', 1)).toEqual(['a', 'b', 'c'])
    expect(insertItem(['a', 'b'], 'c', 2)).toEqual(['a', 'b', 'c'])
  })

  it('clamps invalid indexes', () => {
    expect(clampIndex(-10, 3)).toBe(0)
    expect(clampIndex(10, 3)).toBe(3)
    expect(clampIndex('bad', 3)).toBe(3)
    expect(moveItem(['a', 'b', 'c'], -10, 10)).toEqual(['b', 'c', 'a'])
    expect(insertItem(['a', 'b'], 'c', 10)).toEqual(['a', 'b', 'c'])
  })
})
