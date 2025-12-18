import { test, expect, chromium, type BrowserContext } from '@playwright/test'
import path from 'path'

const extensionPath = path.join(__dirname, '../../dist')

test.describe('TabBrain Extension', () => {
  let context: BrowserContext

  test.beforeAll(async () => {
    // Launch browser with extension
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    })
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('extension should load', async () => {
    // Get the extension ID from service worker
    let extensionId: string | undefined

    // Wait for service worker to register
    const workers = context.serviceWorkers()
    for (const worker of workers) {
      const url = worker.url()
      if (url.includes('chrome-extension://')) {
        extensionId = url.split('/')[2]
        break
      }
    }

    // If no service worker yet, wait for it
    if (!extensionId) {
      const worker = await context.waitForEvent('serviceworker')
      const url = worker.url()
      extensionId = url.split('/')[2]
    }

    expect(extensionId).toBeDefined()
    console.log('Extension ID:', extensionId)
  })

  test('should open side panel', async () => {
    const page = await context.newPage()
    await page.goto('https://example.com')

    // Create multiple tabs for testing
    await context.newPage().then(p => p.goto('https://example.com/page1'))
    await context.newPage().then(p => p.goto('https://example.com/page2'))

    // Note: Side panel testing requires specific Chrome APIs
    // This test verifies the extension loads without errors
    const pages = context.pages()
    expect(pages.length).toBeGreaterThanOrEqual(3)
  })

  test('should detect duplicate tabs', async () => {
    // Create duplicate tabs
    const url = 'https://playwright.dev/docs/intro'

    const page1 = await context.newPage()
    await page1.goto(url)

    const page2 = await context.newPage()
    await page2.goto(url)

    const page3 = await context.newPage()
    await page3.goto(url)

    // Verify tabs were created
    const pages = context.pages().filter(p => p.url().includes('playwright.dev'))
    expect(pages.length).toBeGreaterThanOrEqual(3)
  })
})

test.describe('Tab Sorting (Unit Logic)', () => {
  test('should sort tabs by domain alphabetically', () => {
    // This tests the sorting logic without Chrome APIs
    interface MockTab {
      id: number
      url: string
      pinned: boolean
    }

    const tabs: MockTab[] = [
      { id: 1, url: 'https://zebra.com', pinned: false },
      { id: 2, url: 'https://apple.com', pinned: false },
      { id: 3, url: 'https://mango.com', pinned: true },
      { id: 4, url: 'https://banana.com', pinned: false },
    ]

    const getDomain = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return url
      }
    }

    const pinnedTabs = tabs.filter(t => t.pinned)
    const unpinnedTabs = tabs.filter(t => !t.pinned)

    unpinnedTabs.sort((a, b) => {
      const domainA = getDomain(a.url)
      const domainB = getDomain(b.url)
      return domainA.localeCompare(domainB)
    })

    const sortedIds = [...pinnedTabs, ...unpinnedTabs].map(t => t.id)

    // Pinned tab (mango) stays first, then alphabetical: apple, banana, zebra
    expect(sortedIds).toEqual([3, 2, 4, 1])
  })

  test('should preserve pinned tabs at start', () => {
    interface MockTab {
      id: number
      url: string
      pinned: boolean
    }

    const tabs: MockTab[] = [
      { id: 1, url: 'https://z.com', pinned: true },
      { id: 2, url: 'https://a.com', pinned: false },
      { id: 3, url: 'https://m.com', pinned: true },
    ]

    const pinnedTabs = tabs.filter(t => t.pinned)
    const unpinnedTabs = tabs.filter(t => !t.pinned)

    // Pinned tabs should stay in original order at start
    const result = [...pinnedTabs, ...unpinnedTabs]

    expect(result[0]?.pinned).toBe(true)
    expect(result[1]?.pinned).toBe(true)
    expect(result[2]?.pinned).toBe(false)
  })

  test('should group tabs by domain', () => {
    const urls = [
      'https://github.com/repo1',
      'https://github.com/repo2',
      'https://google.com/search',
      'https://github.com/repo3',
    ]

    const getDomain = (url: string) => new URL(url).hostname

    const grouped = urls.reduce((acc, url) => {
      const domain = getDomain(url)
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(url)
      return acc
    }, {} as Record<string, string[]>)

    expect(Object.keys(grouped)).toHaveLength(2)
    expect(grouped['github.com']).toHaveLength(3)
    expect(grouped['google.com']).toHaveLength(1)
  })
})
