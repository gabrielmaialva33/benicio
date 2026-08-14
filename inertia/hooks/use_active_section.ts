import { useEffect, useState } from 'react'

/**
 * Finds whatever actually scrolls around an element.
 *
 * The shell puts the page inside `<main class="overflow-y-auto">`, so the
 * window never scrolls and listening on it produces a highlight that never
 * moves. Walking up to the real container is what makes the tracking work in
 * this layout instead of only on a plain document.
 */
function scrollParentOf(element: HTMLElement): HTMLElement | Window {
  let node = element.parentElement

  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }

  return window
}

/**
 * Reports which of the given sections the reader is currently on.
 *
 * Anchor tabs without this go stale the moment you scroll: the highlight stays
 * wherever it was hard-coded while the page moves underneath it, so the strip
 * stops describing where you are and becomes decoration.
 *
 * The rule is "the last section whose top has passed the offset line", not "the
 * first one intersecting the viewport". In a two-column layout several panels
 * are on screen at once, and picking the first visible one keeps pointing at a
 * section the reader already scrolled past.
 */
export function useActiveSection(sectionIds: string[], offsetPx = 140): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null)

  useEffect(() => {
    const first = sectionIds.map((id) => document.getElementById(id)).find(Boolean)
    if (!first) return

    const container = scrollParentOf(first)
    const isWindow = container === window
    let frame = 0

    const recompute = () => {
      frame = 0
      // Section tops are viewport-relative, so the line has to be too.
      const containerTop = isWindow ? 0 : (container as HTMLElement).getBoundingClientRect().top
      const line = containerTop + offsetPx

      let current = sectionIds[0] ?? null
      for (const id of sectionIds) {
        const element = document.getElementById(id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= line) current = id
      }

      /*
       * No "snap to the last section at the bottom" rule on purpose. This page
       * is short — the scroll container has a couple hundred pixels of travel —
       * so the bottom is reached almost immediately, and such a rule would pin
       * the highlight to the final tab for the whole page.
       */
      setActiveId(current)
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(recompute)
    }

    recompute()
    container.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      container.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [sectionIds, offsetPx])

  return activeId
}
