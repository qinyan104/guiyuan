import type { Person, PublicationData, PublicationSettings } from '../types/family'

const createPerson = (
  id: string,
  name: string,
  gender: Person['gender'],
  details: Omit<Person, 'id' | 'name' | 'gender'> = {},
): Person => ({
  id,
  name,
  gender,
  ...details,
})

const emperor = (
  id: string,
  name: string,
  gender: Person['gender'],
  details: Omit<Person, 'id' | 'name' | 'gender'> = {},
): Person =>
  createPerson(id, name, gender, {
    ...details,
    highlightRole: 'emperor',
  })

const heir = (
  id: string,
  name: string,
  gender: Person['gender'],
  details: Omit<Person, 'id' | 'name' | 'gender'> = {},
): Person =>
  createPerson(id, name, gender, {
    ...details,
    highlightRole: 'heir',
  })

function markHistoricalPublication(publication: PublicationData): PublicationData {
  return {
    ...publication,
    people: Object.fromEntries(
      Object.entries(publication.people).map(([personId, person]) => [
        personId,
        {
          ...person,
          deceased: person.deceased ?? true,
          clan:
            person.clan ??
            (person.name.startsWith('朱') || person.name.endsWith('公主') ? '朱明宗室 · 凤阳朱氏帝系' : undefined),
        },
      ]),
    ),
  }
}

export const blankPublication: PublicationData = {
  title: '未命名族谱',
  subtitle: '从始祖开始录入，可继续补充配偶与子女。',
  focusFamilyId: 'f1',
  people: {
    p1: { id: 'p1', name: '待录始祖', gender: 'male', note: '始祖' },
  },
  families: {
    f1: { id: 'f1', adults: ['p1'], children: [] },
  },
}

export const samplePublication: PublicationData = markHistoricalPublication({
  title: '明朝帝王世系图',
  subtitle: '补全太祖至崇祯及弘光、永历等关键后代，并突出实际继位与储君人物卡片。',
  focusFamilyId: 'f1',
  people: {
    p1: emperor('p1', '朱元璋', 'male', { birth: '1328年', death: '1398年', note: '明太祖·洪武帝' }),
    p2: createPerson('p2', '马秀英', 'female', { birth: '1332年', death: '1382年', note: '孝慈高皇后' }),
    p3: heir('p3', '朱标', 'male', { birth: '1355年', death: '1392年', note: '懿文太子' }),
    p4: emperor('p4', '朱棣', 'male', { birth: '1360年', death: '1424年', note: '明成祖·永乐帝' }),
    p5: createPerson('p5', '宁国公主', 'female', { birth: '1364年', death: '1434年', note: '太祖长女' }),
    p6: createPerson('p6', '常氏', 'female', { death: '1382年', note: '懿敬太子妃' }),
    p7: emperor('p7', '朱允炆', 'male', { birth: '1377年', death: '1402年后', note: '明惠宗·建文帝' }),
    p8: createPerson('p8', '江都公主', 'female', { note: '懿文太子女' }),
    p9: createPerson('p9', '徐皇后', 'female', { birth: '1362年', death: '1407年', note: '仁孝文皇后' }),
    p10: emperor('p10', '朱高炽', 'male', { birth: '1378年', death: '1425年', note: '明仁宗·洪熙帝' }),
    p11: createPerson('p11', '咸宁公主', 'female', { birth: '1387年', death: '1440年', note: '成祖次女' }),
    p12: createPerson('p12', '朱高煦', 'male', { birth: '1380年', death: '1426年', note: '汉王' }),
    p13: createPerson('p13', '马皇后', 'female', { death: '1402年后', note: '建文帝皇后' }),
    p14: heir('p14', '朱文奎', 'male', { birth: '1396年', death: '1402年后', note: '建文太子' }),
    p15: createPerson('p15', '朱文圭', 'male', { birth: '1401年', death: '1457年', note: '建文帝次子' }),
    p16: createPerson('p16', '张皇后', 'female', { birth: '1379年', death: '1442年', note: '诚孝昭皇后' }),
    p17: emperor('p17', '朱瞻基', 'male', { birth: '1399年', death: '1435年', note: '明宣宗·宣德帝' }),
    p18: createPerson('p18', '永安公主', 'female', { birth: '1377年', death: '1417年', note: '成祖长女' }),
    p19: createPerson('p19', '袁容', 'male', { death: '1441年', note: '驸马都尉' }),
    p20: createPerson('p20', '袁祯', 'male', { note: '外曾孙支' }),
    p21: emperor('p21', '朱祁镇', 'male', { birth: '1427年', death: '1464年', note: '明英宗·正统/天顺帝' }),
    p22: emperor('p22', '朱祁钰', 'male', { birth: '1428年', death: '1457年', note: '明代宗·景泰帝' }),
    p23: emperor('p23', '朱见深', 'male', { birth: '1447年', death: '1487年', note: '明宪宗·成化帝' }),
    p24: emperor('p24', '朱祐樘', 'male', { birth: '1470年', death: '1505年', note: '明孝宗·弘治帝' }),
    p25: createPerson('p25', '朱祐杬', 'male', { birth: '1476年', death: '1519年', note: '兴献王' }),
    p26: emperor('p26', '朱厚照', 'male', { birth: '1491年', death: '1521年', note: '明武宗·正德帝' }),
    p27: emperor('p27', '朱厚熜', 'male', { birth: '1507年', death: '1567年', note: '明世宗·嘉靖帝' }),
    p28: emperor('p28', '朱载垕', 'male', { birth: '1537年', death: '1572年', note: '明穆宗·隆庆帝' }),
    p29: emperor('p29', '朱翊钧', 'male', { birth: '1563年', death: '1620年', note: '明神宗·万历帝' }),
    p30: emperor('p30', '朱常洛', 'male', { birth: '1582年', death: '1620年', note: '明光宗·泰昌帝' }),
    p31: emperor('p31', '朱由校', 'male', { birth: '1605年', death: '1627年', note: '明熹宗·天启帝' }),
    p32: emperor('p32', '朱由检', 'male', { birth: '1611年', death: '1644年', note: '明思宗·崇祯帝' }),
    p33: createPerson('p33', '朱橚', 'male', { birth: '1361年', death: '1425年', note: '周定王' }),
    p34: createPerson('p34', '安庆公主', 'female', { birth: '1370年', death: '1446年', note: '太祖次女' }),
    p35: heir('p35', '朱雄英', 'male', { birth: '1374年', death: '1382年', note: '皇太孙' }),
    p36: createPerson('p36', '朱允熥', 'male', { birth: '1380年', death: '1417年后', note: '吴王' }),
    p37: createPerson('p37', '朱高燧', 'male', { birth: '1383年', death: '1431年', note: '赵王' }),
    p38: createPerson('p38', '朱瞻墉', 'male', { birth: '1410年', death: '1441年', note: '越王' }),
    p39: createPerson('p39', '孙皇后', 'female', { birth: '1399年', death: '1462年', note: '孝恭章皇后' }),
    p40: heir('p40', '朱见济', 'male', { birth: '1448年', death: '1453年', note: '怀献太子' }),
    p41: createPerson('p41', '朱见潾', 'male', { birth: '1449年', death: '1517年', note: '德庄王' }),
    p42: createPerson('p42', '蒋氏', 'female', { birth: '1480年', death: '1536年', note: '兴献王妃' }),
    p43: heir('p43', '朱载壡', 'male', { birth: '1536年', death: '1552年', note: '庄敬太子' }),
    p44: createPerson('p44', '朱载圳', 'male', { birth: '1539年', death: '1565年', note: '景王' }),
    p45: createPerson('p45', '朱翊镠', 'male', { birth: '1568年', death: '1614年', note: '潞王' }),
    p46: createPerson('p46', '朱常洵', 'male', { birth: '1586年', death: '1641年', note: '福忠王' }),
    p47: createPerson('p47', '朱常浩', 'male', { birth: '1594年', death: '1643年', note: '瑞王' }),
    p48: createPerson('p48', '朱常瀛', 'male', { birth: '1597年', death: '1646年', note: '桂端王' }),
    p49: emperor('p49', '朱由崧', 'male', { birth: '1607年', death: '1646年', note: '南明弘光帝' }),
    p50: emperor('p50', '朱由榔', 'male', { birth: '1623年', death: '1662年', note: '南明永历帝' }),
    p51: heir('p51', '朱慈烺', 'male', { birth: '1629年', death: '1646年后', note: '崇祯太子' }),
    p52: createPerson('p52', '朱慈炯', 'male', { birth: '1632年', death: '1644年后', note: '定王' }),
    p53: createPerson('p53', '朱慈炤', 'male', { birth: '1633年', death: '1644年后', note: '永王' }),
  },
  families: {
    f1: { id: 'f1', adults: ['p1', 'p2'], children: ['p3', 'p4', 'p5', 'p33', 'p34'] },
    f2: { id: 'f2', adults: ['p3', 'p6'], children: ['p35', 'p7', 'p8', 'p36'] },
    f3: { id: 'f3', adults: ['p4', 'p9'], children: ['p10', 'p11', 'p12', 'p18', 'p37'] },
    f4: { id: 'f4', adults: ['p7', 'p13'], children: ['p14', 'p15'] },
    f5: { id: 'f5', adults: ['p10', 'p16'], children: ['p17', 'p38'] },
    f6: { id: 'f6', adults: ['p18', 'p19'], children: ['p20'] },
    f7: { id: 'f7', adults: ['p17', 'p39'], children: ['p21', 'p22'] },
    f8: { id: 'f8', adults: ['p21'], children: ['p23', 'p41'] },
    f9: { id: 'f9', adults: ['p22'], children: ['p40'] },
    f10: { id: 'f10', adults: ['p23'], children: ['p24', 'p25'] },
    f11: { id: 'f11', adults: ['p25', 'p42'], children: ['p27'] },
    f12: { id: 'f12', adults: ['p24'], children: ['p26'] },
    f13: { id: 'f13', adults: ['p27'], children: ['p43', 'p28', 'p44'] },
    f14: { id: 'f14', adults: ['p28'], children: ['p29', 'p45'] },
    f15: { id: 'f15', adults: ['p29'], children: ['p30', 'p46', 'p47', 'p48'] },
    f16: { id: 'f16', adults: ['p30'], children: ['p31', 'p32'] },
    f17: { id: 'f17', adults: ['p46'], children: ['p49'] },
    f18: { id: 'f18', adults: ['p48'], children: ['p50'] },
    f19: { id: 'f19', adults: ['p32'], children: ['p51', 'p52', 'p53'] },
  },
})

export const defaultSettings: PublicationSettings = {
  paper: 'A3',
  cardWidth: 158,
  generationGap: 170,
  siblingGap: 88,
  partnerGap: 96,
  fontScale: 1,
  zoom: 0.8,
  showDeath: true,
  showAge: true,
  showNote: true,
  showPhoto: true,
  paddingX: 120,
  paddingY: 88,
}
