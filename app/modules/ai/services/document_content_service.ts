import drive from '@adonisjs/drive/services/main'
import mammoth from 'mammoth'
import { extractText } from 'unpdf'

import aiConfig from '#config/ai'
import type { AiDocumentSource } from '#modules/ai/interfaces/ai_interface'

export interface ExtractedDocumentContent {
  text: string
  origin: 'file' | 'metadata' | 'description'
  warnings: string[]
  truncated: boolean
}

export default class DocumentContentService {
  async extract(source: AiDocumentSource): Promise<ExtractedDocumentContent> {
    const warnings: string[] = []
    let text = ''
    let origin: ExtractedDocumentContent['origin'] = 'file'

    if (source.file_size > aiConfig.retrieval.maxFileBytes) {
      warnings.push('file_exceeds_retrieval_size_limit')
    } else {
      try {
        const bytes = await drive.use(source.storage_disk).getBytes(source.file_name)
        text = await this.extractBytes(bytes, source.file_name, source.file_type)
        if (!text.trim()) warnings.push('file_has_no_extractable_text')
      } catch {
        warnings.push('file_content_unavailable')
      }
    }

    if (!text.trim()) {
      const metadataText = this.metadataText(source.metadata)
      if (metadataText) {
        text = metadataText
        origin = 'metadata'
      } else {
        text = source.description ?? ''
        origin = 'description'
      }
    }

    const normalized = this.normalize(text)
    const truncated = normalized.length > aiConfig.retrieval.maxSourceChars
    if (truncated) warnings.push('content_truncated_for_retrieval')

    return {
      text: normalized.slice(0, aiConfig.retrieval.maxSourceChars),
      origin,
      warnings,
      truncated,
    }
  }

  private async extractBytes(
    bytes: Uint8Array,
    fileName: string,
    fileType: string
  ): Promise<string> {
    const extension = fileName.split('.').at(-1)?.toLowerCase()
    if (
      fileType.startsWith('text/') ||
      ['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm'].includes(extension ?? '')
    ) {
      return new TextDecoder('utf-8').decode(bytes)
    }
    if (fileType === 'application/pdf' || extension === 'pdf') {
      const result = await extractText(bytes, { mergePages: true })
      return result.text
    }
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === 'docx'
    ) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
      return result.value
    }
    return ''
  }

  private metadataText(metadata: Record<string, unknown>): string {
    const keys = ['extracted_text', 'ocr_text', 'content', 'full_text']
    return keys
      .map((key) => metadata[key])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n\n')
  }

  private normalize(text: string): string {
    return text
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n')
      .replaceAll('\u0000', '')
      .split('\n')
      .map((line) => line.replace(/[\t ]+/g, ' ').trimEnd())
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  }
}
