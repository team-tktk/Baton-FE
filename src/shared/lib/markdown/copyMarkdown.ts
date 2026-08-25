export async function copyMarkdown(markdown: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(markdown)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = markdown
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
