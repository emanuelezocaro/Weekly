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
