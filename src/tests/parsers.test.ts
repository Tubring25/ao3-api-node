import { describe, it, expect } from 'vitest'
import { parseWorkList, parseWorkBlurb } from '../lib/parsers.js'
import * as cheerio from 'cheerio'

describe('parseWorkList', () => {
  it('should handle HTML with "of X Works" format', () => {
    const html = `
      <html>
        <h2 class="heading">1 - 20 of 1,234 Works in Test Fandom</h2>
        <ol class="work index">
          <li class="work blurb group" id="work_123">
            <h4 class="heading">
              <a href="/works/123">Test Work</a>
            </h4>
            <a rel="author" href="/users/testauthor">Test Author</a>
            <h5 class="fandoms">
              <a href="/tags/test">Test Fandom</a>
            </h5>
            <dl class="stats">
              <dt>Words:</dt>
              <dd class="words">1,000</dd>
              <dt>Kudos:</dt>
              <dd class="kudos">50</dd>
              <dt>Hits:</dt>
              <dd class="hits">100</dd>
            </dl>
          </li>
        </ol>
      </html>
    `
    
    const result = parseWorkList(html)
    expect(result.totalResults).toBe(1234)
    expect(result.works).toHaveLength(1)
    expect(result.works[0].id).toBe('123')
  })

  it('should handle HTML with "X Found" format', () => {
    const html = `
      <html>
        <h3 class="heading">567 Found</h3>
        <ol class="work index">
          <li class="work blurb group" id="work_456">
            <h4 class="heading">
              <a href="/works/456">Another Work</a>
            </h4>
            <a rel="author" href="/users/anotherauthor">Another Author</a>
            <h5 class="fandoms">
              <a href="/tags/anotherfandom">Another Fandom</a>
            </h5>
            <dl class="stats">
              <dt>Words:</dt>
              <dd class="words">2,000</dd>
              <dt>Kudos:</dt>
              <dd class="kudos">75</dd>
              <dt>Hits:</dt>
              <dd class="hits">200</dd>
            </dl>
          </li>
        </ol>
      </html>
    `
    
    const result = parseWorkList(html)
    expect(result.totalResults).toBe(567)
    expect(result.works).toHaveLength(1)
  })

  it('should handle empty work list', () => {
    const html = `
      <html>
        <h2 class="heading">0 Found</h2>
        <ol class="work index"></ol>
      </html>
    `
    
    const result = parseWorkList(html)
    expect(result.totalResults).toBe(0)
    expect(result.works).toHaveLength(0)
  })
})

describe('parseWorkBlurb', () => {
  it('should handle missing statistics gracefully', () => {
    const html = `
      <li class="work blurb group" id="work_789">
        <h4 class="heading">
          <a href="/works/789">Work Without Stats</a>
        </h4>
        <a rel="author" href="/users/nostatauthor">No Stat Author</a>
        <h5 class="fandoms">
          <a href="/tags/testfandom">Test Fandom</a>
        </h5>
        <dl class="stats">
          <dt>Words:</dt>
          <dd class="words">invalid</dd>
          <dt>Kudos:</dt>
          <dd class="kudos">not-a-number</dd>
          <dt>Hits:</dt>
          <dd class="hits"></dd>
        </dl>
      </li>
    `
    
    const $ = cheerio.load(html)
    const element = $('li.work').get(0)
    const result = parseWorkBlurb(element, $)
    
    expect(result.id).toBe('789')
    expect(result.title).toBe('Work Without Stats')
    expect(result.author).toBe('No Stat Author')
    expect(result.words).toBe(0)
    expect(result.kudos).toBe(0)
    expect(result.hits).toBe(0)
  })

  it('should handle missing work ID', () => {
    const html = `
      <li class="work blurb group">
        <h4 class="heading">
          <a href="/works/999">Work Without ID Attr</a>
        </h4>
        <a rel="author" href="/users/author">Author</a>
        <h5 class="fandoms">
          <a href="/tags/fandom">Fandom</a>
        </h5>
        <dl class="stats">
          <dt>Words:</dt>
          <dd class="words">500</dd>
          <dt>Kudos:</dt>
          <dd class="kudos">25</dd>
          <dt>Hits:</dt>
          <dd class="hits">50</dd>
        </dl>
      </li>
    `
    
    const $ = cheerio.load(html)
    const element = $('li.work').get(0)
    const result = parseWorkBlurb(element, $)
    
    expect(result.id).toBe('')
    expect(result.title).toBe('Work Without ID Attr')
  })
})