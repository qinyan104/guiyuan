import { describe, expect, it } from 'vitest'

import { resolveDownloadFilename } from './download'

describe('resolveDownloadFilename', () => {
  it('parses a quoted filename', () => {
    const headers = { 'content-disposition': 'attachment; filename="genealogy_backup.sql"' }
    expect(resolveDownloadFilename(headers, 'fallback.sql')).toBe('genealogy_backup.sql')
  })

  it('parses an unquoted filename', () => {
    const headers = { 'content-disposition': 'attachment; filename=backup.sql' }
    expect(resolveDownloadFilename(headers, 'fallback.sql')).toBe('backup.sql')
  })

  it('decodes an RFC 5987 encoded filename', () => {
    const headers = { 'content-disposition': "attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87.sql" }
    expect(resolveDownloadFilename(headers, 'fallback.sql')).toBe('中文.sql')
  })

  it('accepts axios-style array headers', () => {
    const headers = { 'content-disposition': ['attachment; filename="a.sql"'] }
    expect(resolveDownloadFilename(headers, 'fallback.sql')).toBe('a.sql')
  })

  it('falls back when the header is missing or unparseable', () => {
    expect(resolveDownloadFilename(undefined, 'fallback.sql')).toBe('fallback.sql')
    expect(resolveDownloadFilename({}, 'fallback.sql')).toBe('fallback.sql')
    expect(resolveDownloadFilename({ 'content-disposition': 'attachment' }, 'fallback.sql')).toBe('fallback.sql')
  })
})
