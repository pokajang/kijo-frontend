import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import defaultHandbookContent from '../data/defaultHandbookContent.json'

const backendSeedPath = path.resolve(
  process.cwd(),
  '../backend-laravel/database/seeders/data/handbook_v2_2024_01_05.json',
)
const backendSeedContent = JSON.parse(fs.readFileSync(backendSeedPath, 'utf8'))

const decorativeClasses = new Set([
  'card',
  'card-header',
  'card-body',
  'row',
  'shadow-sm',
  'h-100',
  'mt-3',
  'mb-0',
  'fw-semibold',
  'fst-italic',
  'text-center',
  'ms-3',
])

const classNamesFor = (content) =>
  content.chapters.flatMap((chapter) =>
    Array.from(chapter.bodyHtml.matchAll(/class="([^"]+)"/g)).flatMap((match) =>
      match[1].split(/\s+/),
    ),
  )

const tableCountFor = (title) => {
  const chapter = defaultHandbookContent.chapters.find((item) => item.title === title)
  return (chapter?.bodyHtml.match(/<table\b/g) || []).length
}

describe('defaultHandbookContent', () => {
  it('keeps frontend fallback and backend seed content aligned', () => {
    expect(defaultHandbookContent).toEqual(backendSeedContent)
  })

  it('uses document-flow content instead of decorative Bootstrap wrappers', () => {
    const classes = classNamesFor(defaultHandbookContent)

    expect(classes.filter((className) => decorativeClasses.has(className))).toEqual([])
    expect(classes.filter((className) => className.startsWith('col-'))).toEqual([])
  })

  it('preserves semantic tables in policy sections', () => {
    expect(tableCountFor('4.0 Company Policies')).toBe(1)
    expect(tableCountFor('12.0 Leave Entitlement')).toBe(1)
    expect(tableCountFor('13.0 Company Expenses')).toBe(1)
    expect(tableCountFor('17.0 Allowances')).toBe(3)
  })

  it('uses consistent title case for formerly card-based section headings', () => {
    const headings = defaultHandbookContent.chapters.flatMap((chapter) =>
      Array.from(chapter.bodyHtml.matchAll(/<h6[^>]*>(.*?)<\/h6>/g)).map((match) =>
        match[1].replace(/<[^>]+>/g, '').trim(),
      ),
    )

    expect(headings).toContain('Your First Day')
    expect(headings).toContain('Your First Week')
    expect(headings).toContain('Your First Month')
    expect(headings).toContain('When')
    expect(headings).toContain('How')
    expect(headings).toContain('Bonuses')
    expect(headings).not.toContain('YOUR FIRST DAY')
    expect(headings).not.toContain('WHEN')
  })

  it('uses full sentences instead of em dashes in Common Rules', () => {
    const commonRules = defaultHandbookContent.chapters.find(
      (chapter) => chapter.title === '9.0 Common Rules',
    )

    expect(commonRules.bodyHtml).not.toContain('—')
    expect(commonRules.bodyHtml).toContain(
      'Snacks in the kitchen are for quick energy boosts. They are not meal replacements.',
    )
    expect(commonRules.bodyHtml).toContain(
      'Cooking facilities are available. Please clean up after yourself to keep our shared space tidy.',
    )
  })
})
