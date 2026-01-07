import type { TabInfo } from '@/types/domain'

export type CopyFormat = 'urls' | 'titles-urls' | 'markdown'

export function formatTabsForCopy(tabs: TabInfo[], format: CopyFormat): string {
  switch (format) {
    case 'urls':
      return tabs.map((t) => t.url).join('\n')

    case 'titles-urls':
      return tabs.map((t) => `${t.title}\n${t.url}`).join('\n\n')

    case 'markdown':
      return tabs.map((t) => `- [${t.title}](${t.url})`).join('\n')

    default:
      return tabs.map((t) => t.url).join('\n')
  }
}

export async function copyTabsToClipboard(
  tabs: TabInfo[],
  format: CopyFormat = 'urls'
): Promise<boolean> {
  try {
    const text = formatTabsForCopy(tabs, format)
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

export function getFormatLabel(format: CopyFormat): string {
  switch (format) {
    case 'urls':
      return 'URLs only'
    case 'titles-urls':
      return 'Title + URL'
    case 'markdown':
      return 'Markdown links'
    default:
      return format
  }
}
