import { describe, expect, it } from 'vitest'

import type { PublicationData } from '../../types/family'
import { buildEmbeddedScript, buildHtmlTemplate, buildInfoHeader } from './shareHtmlExport'

const samplePublication: PublicationData = {
  title: '李氏族谱',
  subtitle: '陇西堂支谱',
  focusFamilyId: 'f1',
  people: {
    p1: {
      id: 'p1',
      name: '李明',
      gender: 'male',
      deceased: false,
      titleName: '族长',
    },
  },
  families: {
    f1: {
      id: 'f1',
      adults: ['p1'],
      children: [],
    },
  },
  info: {
    ancestralOrigin: '陇西',
    hallName: '敦本堂',
    familyMotto: '敦亲睦族',
  },
}

describe('shareHtmlExport helpers', () => {
  it('buildInfoHeader renders readable publication metadata', () => {
    const html = buildInfoHeader(samplePublication)

    expect(html).toContain('郡望/祖籍：陇西')
    expect(html).toContain('堂号：敦本堂')
    expect(html).toContain('族训：敦亲睦族')
  })

  it('buildHtmlTemplate renders readable password gate copy', () => {
    const html = buildHtmlTemplate({
      title: samplePublication.title,
      themeCss: ':root {}',
      infoHeader: '<h1>李氏族谱</h1>',
      statsHtml: '共 1 人',
      script: 'console.log("ok")',
      isEncrypted: true,
      generatedAt: '2026/05/13 23:00:00',
    })

    expect(html).toContain('族谱已加密')
    expect(html).toContain('请输入密码以查看内容')
    expect(html).toContain('生成于：2026/05/13 23:00:00')
  })

  it('buildEmbeddedScript emits valid unlock script text', () => {
    const script = buildEmbeddedScript('{"v":1}', true)

    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain('请输入密码')
    expect(script).toContain('密码错误或文件已损坏')
  })
})
