import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixturesDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures'
)

describe('fixture security', () => {
  it('contains only sanitized account metadata', async () => {
    const fixtureNames = (await readdir(fixturesDirectory))
      .filter(name => name.endsWith('.html'))

    for (const fixtureName of fixtureNames) {
      const html = await readFile(path.join(fixturesDirectory, fixtureName), 'utf8')
      const csrfTokens = html.matchAll(/<meta\s+name="csrf-token"\s+content="([^"]*)"/g)
      const formTokens = html.matchAll(
        /<input\b(?=[^>]*\bname="authenticity_token")[^>]*\bvalue="([^"]*)"/g
      )
      const pseudIds = html.matchAll(
        /<input\b(?=[^>]*\bid="bookmark_pseud_id")[^>]*\bvalue="([^"]*)"/g
      )

      for (const match of csrfTokens) {
        expect(match[1], `${fixtureName} contains a CSRF token`).toBe('[REDACTED]')
      }
      for (const match of formTokens) {
        expect(match[1], `${fixtureName} contains a form token`).toBe('[REDACTED]')
      }
      for (const match of pseudIds) {
        expect(match[1], `${fixtureName} contains a bookmark pseud ID`).toBe('0')
      }

      expect(html, `${fixtureName} contains a signed account image`).not.toContain(
        '/rails/active_storage/representations/proxy/'
      )
    }
  })
})
