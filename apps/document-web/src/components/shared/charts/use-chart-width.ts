import { useEffect, useRef, useState } from 'react'

export function useChartWidth(minWidth = 280) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(minWidth)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => {
      setWidth(Math.max(minWidth, Math.round(node.getBoundingClientRect().width)))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [minWidth])

  return { ref, width }
}
