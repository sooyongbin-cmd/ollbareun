import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribeToViewport(callback: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY)
  mediaQuery.addEventListener("change", callback)
  window.addEventListener("resize", callback)

  return () => {
    mediaQuery.removeEventListener("change", callback)
    window.removeEventListener("resize", callback)
  }
}

function getViewportSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToViewport,
    getViewportSnapshot,
    getServerSnapshot
  )
}
