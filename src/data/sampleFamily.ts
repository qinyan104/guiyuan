import type { PublicationData, PublicationSettings } from '../types/family'

export const samplePublication: PublicationData = {
  title: '陇西李氏世系图',
  subtitle: '出版工作台示例 · 参考 Family Echo 交互与空白模板版式',
  focusFamilyId: 'f1',
  people: {
    p1: { id: 'p1', name: '李承祚', gender: 'male', birth: '1921年二月', death: '1996年九月', age: '75岁', note: '一世祖' },
    p2: { id: 'p2', name: '沈素琴', gender: 'female', birth: '1924年六月', death: '2008年四月', age: '84岁', note: '元配' },
    p3: { id: 'p3', name: '李文岳', gender: 'male', birth: '1948年三月', death: '2019年十一月', age: '71岁', note: '长房' },
    p4: { id: 'p4', name: '李文川', gender: 'male', birth: '1951年八月', death: '2022年五月', age: '71岁', note: '次房' },
    p5: { id: 'p5', name: '李文澜', gender: 'female', birth: '1955年十月', note: '三房' },
    p6: { id: 'p6', name: '陈淑珍', gender: 'female', birth: '1950年正月', death: '2021年二月', age: '71岁', note: '长房配' },
    p7: { id: 'p7', name: '李修远', gender: 'male', birth: '1975年五月', note: '长孙' },
    p8: { id: 'p8', name: '李清和', gender: 'female', birth: '1978年十一月', note: '长孙女' },
    p9: { id: 'p9', name: '赵慧兰', gender: 'female', birth: '1953年二月', note: '次房配' },
    p10: { id: 'p10', name: '李明诚', gender: 'male', birth: '1979年七月', note: '次孙' },
    p11: { id: 'p11', name: '李明玉', gender: 'female', birth: '1983年六月', note: '次孙女' },
    p12: { id: 'p12', name: '李明哲', gender: 'male', birth: '1987年十月', note: '三孙' },
    p13: { id: 'p13', name: '周清和', gender: 'female', birth: '1977年三月', note: '长孙配' },
    p14: { id: 'p14', name: '李景行', gender: 'male', birth: '2003年五月', note: '曾孙' },
    p15: { id: 'p15', name: '李景安', gender: 'male', birth: '2006年九月', note: '曾孙' },
    p16: { id: 'p16', name: '苏月仪', gender: 'female', birth: '1982年十二月', note: '次孙配' },
    p17: { id: 'p17', name: '李知微', gender: 'female', birth: '2010年八月', note: '玄孙女' },
  },
  families: {
    f1: { id: 'f1', adults: ['p1', 'p2'], children: ['p3', 'p4', 'p5'] },
    f2: { id: 'f2', adults: ['p3', 'p6'], children: ['p7', 'p8'] },
    f3: { id: 'f3', adults: ['p4', 'p9'], children: ['p10', 'p11', 'p12'] },
    f4: { id: 'f4', adults: ['p7', 'p13'], children: ['p14', 'p15'] },
    f5: { id: 'f5', adults: ['p10', 'p16'], children: ['p17'] },
  },
}

export const defaultSettings: PublicationSettings = {
  paper: 'A3',
  cardWidth: 158,
  generationGap: 170,
  siblingGap: 88,
  partnerGap: 96,
  fontScale: 1,
  zoom: 0.82,
  showDeath: true,
  showAge: true,
  showNote: true,
  paddingX: 120,
  paddingY: 88,
}

