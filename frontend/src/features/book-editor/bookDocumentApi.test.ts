import { describe, expect, it, vi } from "vitest"
import type { BookDocument } from "../../types/bookDocument"

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("../../api/http", () => ({ default: http }))

import { getBookDocument, saveBookDocument } from "./bookDocumentApi"

describe("bookDocumentApi", () => {
  it("保存并重新载入手动分页符", async () => {
    const document: BookDocument = {
      publicationId: 7,
      title: "分页测试",
      layout: { templateId: "classic", fontFamily: "qiji-combo", fontSize: 18, marginPreset: "standard" },
      blocks: [
        { type: "person", personId: "before", personName: "前文", generation: 1, text: "甲" },
        { type: "pageBreak", id: "manual-break" },
        { type: "person", personId: "after", personName: "后文", generation: 1, text: "乙" },
      ],
    }
    const row = {
      id: 11,
      publicationId: 7,
      title: document.title,
      documentJson: JSON.stringify(document),
      createdAt: "2026-07-28T00:00:00Z",
      updatedAt: "2026-07-28T00:00:00Z",
    }
    http.put.mockResolvedValue({ data: { code: 200, data: row } })
    http.get.mockResolvedValue({ data: { code: 200, data: row } })

    await saveBookDocument(document)
    const loaded = await getBookDocument(7)

    expect(JSON.parse(http.put.mock.calls[0][1].documentJson).blocks).toEqual(document.blocks)
    expect(loaded?.blocks).toEqual(document.blocks)
  })
})
