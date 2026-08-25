const allowedExtensions = new Set(['pdf', 'docx', 'xlsx', 'pptx'])
const maxFileSize = 50 * 1024 * 1024

interface FileMetadata {
  name: string
  size: number
}

export type FileValidationResult = { ok: true } | { ok: false; message: string }

export function validateHandoverFile(file: FileMetadata): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!allowedExtensions.has(extension)) {
    return { ok: false, message: 'PDF, DOCX, XLSX, PPTX 파일만 추가할 수 있어요' }
  }
  if (file.size > maxFileSize) {
    return { ok: false, message: '파일당 최대 크기는 50MB예요' }
  }
  return { ok: true }
}
