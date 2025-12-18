import { describe, it, expect } from 'vitest'
import {
  findDuplicateTabs,
  findDuplicateBookmarks,
  groupTabsByDomain,
  getDuplicateTabsToRemove,
} from '../../src/lib/algorithms/clustering'
import type { TabInfo, BookmarkNode } from '../../src/types/domain'

const createTab = (id: number, url: string, title: string = 'Tab'): TabInfo => ({
  id,
  windowId: 1,
  index: id,
  url,
  title,
  pinned: false,
  groupId: -1,
  active: false,
  discarded: false,
})

const createBookmark = (id: string, url: string, title: string = 'Bookmark'): BookmarkNode => ({
  id,
  title,
  url,
})

describe('Clustering Algorithms', () => {
  describe('findDuplicateTabs', () => {
    it('should find exact duplicate URLs', () => {
      const tabs = [
        createTab(1, 'https://example.com'),
        createTab(2, 'https://example.com'),
        createTab(3, 'https://other.com'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]?.tabs).toHaveLength(2)
    })

    it('should normalize URLs before comparison', () => {
      const tabs = [
        createTab(1, 'https://www.example.com'),
        createTab(2, 'https://example.com/'),
        createTab(3, 'https://example.com?utm_source=test'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]?.tabs).toHaveLength(3)
    })

    it('should skip chrome:// URLs', () => {
      const tabs = [
        createTab(1, 'chrome://settings'),
        createTab(2, 'chrome://settings'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      expect(duplicates).toHaveLength(0)
    })

    it('should return empty array for no duplicates', () => {
      const tabs = [
        createTab(1, 'https://a.com'),
        createTab(2, 'https://b.com'),
        createTab(3, 'https://c.com'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      expect(duplicates).toHaveLength(0)
    })

    it('should handle multiple duplicate groups', () => {
      const tabs = [
        createTab(1, 'https://example.com'),
        createTab(2, 'https://example.com'),
        createTab(3, 'https://other.com'),
        createTab(4, 'https://other.com'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      expect(duplicates).toHaveLength(2)
    })
  })

  describe('findDuplicateBookmarks', () => {
    it('should find duplicate bookmarks', () => {
      const bookmarks = [
        createBookmark('1', 'https://example.com'),
        createBookmark('2', 'https://example.com'),
        createBookmark('3', 'https://other.com'),
      ]

      const duplicates = findDuplicateBookmarks(bookmarks)
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]?.bookmarks).toHaveLength(2)
    })

    it('should skip bookmarks without URLs (folders)', () => {
      const bookmarks: BookmarkNode[] = [
        { id: '1', title: 'Folder' },
        { id: '2', title: 'Folder' },
      ]

      const duplicates = findDuplicateBookmarks(bookmarks)
      expect(duplicates).toHaveLength(0)
    })
  })

  describe('groupTabsByDomain', () => {
    it('should group tabs by domain', () => {
      const tabs = [
        createTab(1, 'https://example.com/page1'),
        createTab(2, 'https://example.com/page2'),
        createTab(3, 'https://other.com'),
      ]

      const groups = groupTabsByDomain(tabs)
      expect(groups.size).toBe(2)
      expect(groups.get('example.com')).toHaveLength(2)
      expect(groups.get('other.com')).toHaveLength(1)
    })

    it('should normalize www prefix', () => {
      const tabs = [
        createTab(1, 'https://www.example.com'),
        createTab(2, 'https://example.com'),
      ]

      const groups = groupTabsByDomain(tabs)
      expect(groups.size).toBe(1)
      expect(groups.get('example.com')).toHaveLength(2)
    })

    it('should skip internal URLs', () => {
      const tabs = [
        createTab(1, 'chrome://settings'),
        createTab(2, 'https://example.com'),
      ]

      const groups = groupTabsByDomain(tabs)
      expect(groups.size).toBe(1)
    })
  })

  describe('getDuplicateTabsToRemove', () => {
    it('should keep first tab, return rest', () => {
      const tabs = [
        createTab(1, 'https://example.com'),
        createTab(2, 'https://example.com'),
        createTab(3, 'https://example.com'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      const toRemove = getDuplicateTabsToRemove(duplicates)

      expect(toRemove).toHaveLength(2)
      expect(toRemove).toContain(2)
      expect(toRemove).toContain(3)
      expect(toRemove).not.toContain(1)
    })

    it('should not remove pinned tabs', () => {
      const tabs = [
        createTab(1, 'https://example.com'),
        { ...createTab(2, 'https://example.com'), pinned: true },
        createTab(3, 'https://example.com'),
      ]

      const duplicates = findDuplicateTabs(tabs)
      const toRemove = getDuplicateTabsToRemove(duplicates)

      expect(toRemove).not.toContain(2)
      expect(toRemove).toContain(3)
    })
  })
})
