import { writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { extname } from 'node:path'
import { getUserBookmarks, iteratePages } from 'ao3-api-nodejs'

// Run from the repository after pnpm run build.
// node examples/export-bookmarks.mjs USERNAME output.json [maxPages] [delayMs]
const [username, output, maxPagesArg = '10', delayMsArg = '3000'] = process.argv.slice(2)
const maxPages = Number(maxPagesArg)
const delayMs = Number(delayMsArg)
const format = extname(output || '').toLowerCase()

if (!username || !output || !['.json', '.csv'].includes(format)
  || !Number.isSafeInteger(maxPages) || maxPages < 1
  || !Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 2_147_483_647) {
  console.error('Usage: node examples/export-bookmarks.mjs USERNAME output.json|output.csv [maxPages=10] [delayMs=3000]')
  process.exitCode = 1
} else {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  process.once('SIGINT', cancel)

  try {
    const bookmarks = []
    let fetchedPages = 0
    let totalPages = 1
    let totalBookmarks = 0
    let skippedBookmarks = 0

    for await (const result of iteratePages(async page => {
      if (page > 1) await delay(delayMs, undefined, { signal: controller.signal })
      return getUserBookmarks(username, page, { timeoutMs: 30_000, signal: controller.signal })
    }, { maxPages })) {
      fetchedPages++
      totalPages = result.totalPages
      totalBookmarks = result.total
      // This example exports bookmarks of AO3 works. Series, external works,
      // and unavailable items have no work ID in the current API model.
      for (const entry of result.bookmarks) {
        if (entry.bookmark.workId) bookmarks.push(entry)
        else skippedBookmarks++
      }
    }

    const truncated = fetchedPages < totalPages
    let content
    if (format === '.json') {
      content = JSON.stringify({ username, exportedAt: new Date().toISOString(), totalBookmarks,
        fetchedPages, totalPages, truncated, skippedBookmarks, bookmarks }, null, 2) + '\n'
    } else {
      const rows = [
        ['bookmarkId', 'workId', 'title', 'author', 'url', 'bookmarkedAt', 'notes', 'tags'],
        ...bookmarks.map(({ bookmark }) => [bookmark.id, bookmark.workId, bookmark.workTitle,
          bookmark.workAuthor, `https://archiveofourown.org/works/${bookmark.workId}`,
          bookmark.created, bookmark.notes, bookmark.tags.join('; ')])
      ]
      content = rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
    }

    await writeFile(output, content, { encoding: 'utf8', flag: 'wx' })
    console.log(`Exported ${bookmarks.length} work bookmarks from ${fetchedPages}/${totalPages} pages to ${output}.`)
    if (truncated) console.log('Page limit reached; this export is partial. Increase maxPages for a larger export.')
    if (skippedBookmarks) console.log(`Skipped ${skippedBookmarks} bookmarks without an available AO3 work ID.`)
  } catch (error) {
    console.error(controller.signal.aborted ? 'Export cancelled.' : error.message)
    process.exitCode = 1
  } finally {
    process.removeListener('SIGINT', cancel)
  }
}

function csvCell(value) {
  const text = String(value ?? '')
  // Keep user-written text from being interpreted as spreadsheet formulas.
  const escaped = /^\s*[=+@-]/.test(text) ? `'${text}` : text
  return `"${escaped.replaceAll('"', '""')}"`
}
