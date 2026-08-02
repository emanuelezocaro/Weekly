// Copies plain text (e.g. a report to paste into a chat), falling back to
// the native share sheet, and finally to a downloaded .txt file.
export async function copyOrShareText(text, filename = 'riepilogo.txt') {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      // fall through
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  await shareOrDownloadText(filename, text, 'text/plain')
  return 'downloaded'
}

export async function shareOrDownloadText(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })

  if (navigator.canShare) {
    const file = new File([blob], filename, { type: mime })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return true
      } catch (err) {
        if (err?.name === 'AbortError') return false
        // fall through to download if sharing fails for another reason
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}
