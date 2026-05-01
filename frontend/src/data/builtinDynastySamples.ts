import type { Gender, Person, PublicationData } from '../types/family'
import { samplePublication } from './sampleFamily'

type ImperialHighlightRole = NonNullable<Person['highlightRole']>

interface SuccessionSampleRuler {
  name: string
  note: string
  gender?: Gender
  birth?: string
  death?: string
  deceased?: boolean
  highlightRole?: ImperialHighlightRole
  displayName?: string
  titleName?: string
  clan?: string
}

interface SuccessionSampleRelative {
  name: string
  note: string
  gender?: Gender
  birth?: string
  death?: string
  deceased?: boolean
  highlightRole?: ImperialHighlightRole
  displayName?: string
  titleName?: string
  clan?: string
}

interface SuccessionSampleBranch {
  parent: string
  children: Array<string | SuccessionSampleRelative>
}

interface SuccessionSampleDefinition {
  id: string
  label: string
  group: string
  title?: string
  subtitle?: string
  rulers: SuccessionSampleRuler[]
  branches?: SuccessionSampleBranch[]
}

export interface BuiltinSampleRecord {
  id: string
  label: string
  group: string
  publication: PublicationData
}

export interface BuiltinSampleGroup {
  label: string
  samples: Array<Pick<BuiltinSampleRecord, 'id' | 'label'>>
}

type HistoricalRulerProfile = Pick<
  SuccessionSampleRuler,
  'birth' | 'death' | 'note' | 'displayName' | 'titleName' | 'clan'
>

const dynastyClanProfiles: Record<string, string> = {
  xia: '姒姓夏后氏',
  shang: '子姓商族',
  'western-zhou': '姬姓周王室',
  'eastern-zhou': '姬姓周王室',
  qin: '嬴姓赵氏 · 秦王室',
  'western-han': '汉室刘氏 · 沛丰帝系',
  'eastern-han': '汉室刘氏 · 东汉帝系',
  'cao-wei': '谯国曹氏',
  'shu-han': '蜀汉刘氏 · 昭烈帝系',
  'eastern-wu': '吴郡孙氏 · 孙吴宗室',
  'western-jin': '河内司马氏 · 西晋帝系',
  'eastern-jin': '河内司马氏 · 东晋帝系',
  'liu-song': '彭城刘氏',
  'southern-qi': '兰陵萧氏',
  liang: '兰陵萧氏',
  chen: '陈郡陈氏',
  'northern-wei': '拓跋鲜卑',
  'eastern-wei': '元氏皇族',
  'western-wei': '元氏皇族',
  'northern-qi': '渤海高氏',
  'northern-zhou': '鲜卑宇文氏',
  sui: '弘农杨氏 · 隋皇室',
  tang: '陇西李氏 · 唐王室',
  'later-liang': '朱氏皇族',
  'later-tang': '沙陀李氏',
  'later-jin': '沙陀石氏',
  'later-han': '沙陀刘氏',
  'later-zhou': '郭柴宗室',
  liao: '契丹耶律氏 · 辽皇族',
  'western-xia': '党项李氏 · 西夏皇室',
  jin: '完颜氏 · 金皇族',
  'northern-song': '赵宋宗室 · 北宋帝系',
  'southern-song': '赵宋宗室 · 南宋帝系',
  yuan: '孛儿只斤氏 · 蒙元皇族',
  qing: '爱新觉罗氏 · 清皇室',
}

const personClanOverrides: Record<string, Record<string, string>> = {
  xin: {
    王莽: '魏郡王氏 · 新室',
    王宇: '魏郡王氏 · 新室',
  },
  'wu-zhou': {
    则天皇帝: '并州文水武氏 · 武周帝系',
    李显: '陇西李氏 · 唐宗室',
    李旦: '陇西李氏 · 唐宗室',
  },
}

const historicalRulerProfiles: Record<string, Record<string, HistoricalRulerProfile>> = {
  xia: {
    夏禹: { note: '大禹·姒文命' },
    夏启: { note: '启王·姒启' },
    太康: { note: '太康·夏启子' },
    少康: { note: '少康·中兴之主' },
    孔甲: { note: '孔甲·夏后氏君主' },
    夏桀: { note: '履癸·夏朝末主' },
  },
  shang: {
    成汤: { note: '成汤·子履' },
    太甲: { note: '太甲·商初天子' },
    盘庚: { note: '盘庚·迁殷之主' },
    武丁: { note: '武丁·高宗中兴' },
    帝乙: { note: '帝乙·商末先君' },
    帝辛: { note: '帝辛·商纣王' },
  },
  'western-zhou': {
    周武王: { death: '前1043年', note: '周武王·姬发' },
    周成王: { death: '前1021年', note: '周成王·姬诵' },
    周康王: { death: '前996年', note: '周康王·姬钊' },
    周昭王: { death: '前977年', note: '周昭王·姬瑕' },
    周穆王: { death: '前922年', note: '周穆王·姬满' },
    周幽王: { death: '前771年', note: '周幽王·姬宫湦' },
  },
  'eastern-zhou': {
    周平王: { death: '前720年', note: '周平王·姬宜臼' },
    周桓王: { death: '前697年', note: '周桓王·姬林' },
    周庄王: { death: '前682年', note: '周庄王·姬佗' },
    周景王: { death: '前520年', note: '周景王·姬贵' },
    周敬王: { death: '前476年', note: '周敬王·姬匄' },
    周赧王: { death: '前256年', note: '周赧王·姬延' },
  },
  qin: {
    秦始皇: { birth: '前259年', death: '前210年', note: '始皇帝·嬴政' },
    秦二世: { birth: '前230年', death: '前207年', note: '二世皇帝·胡亥' },
    子婴: { death: '前206年', note: '秦王子婴' },
  },
  'western-han': {
    汉高祖: { birth: '前256年', death: '前195年', note: '高祖·刘邦' },
    汉惠帝: { birth: '前210年', death: '前188年', note: '惠帝·刘盈' },
    汉文帝: { birth: '前203年', death: '前157年', note: '文帝·刘恒' },
    汉景帝: { birth: '前188年', death: '前141年', note: '景帝·刘启' },
    汉武帝: { birth: '前156年', death: '前87年', note: '武帝·刘彻' },
    汉昭帝: { birth: '前94年', death: '前74年', note: '昭帝·刘弗陵' },
    汉宣帝: { birth: '前91年', death: '前49年', note: '宣帝·刘询' },
    汉元帝: { birth: '前75年', death: '前33年', note: '元帝·刘奭' },
    汉成帝: { birth: '前51年', death: '前7年', note: '成帝·刘骜' },
    汉哀帝: { birth: '前27年', death: '前1年', note: '哀帝·刘欣' },
    汉平帝: { birth: '前9年', death: '6年', note: '平帝·刘衎' },
  },
  xin: {
    王莽: { birth: '前45年', death: '23年', note: '新帝·王莽' },
  },
  'eastern-han': {
    汉光武帝: { birth: '前5年', death: '57年', note: '光武帝·刘秀' },
    汉明帝: { birth: '28年', death: '75年', note: '明帝·刘庄' },
    汉章帝: { birth: '57年', death: '88年', note: '章帝·刘炟' },
    汉和帝: { birth: '79年', death: '106年', note: '和帝·刘肇' },
    汉安帝: { birth: '94年', death: '125年', note: '安帝·刘祜' },
    汉顺帝: { birth: '115年', death: '144年', note: '顺帝·刘保' },
    汉桓帝: { birth: '132年', death: '167年', note: '桓帝·刘志' },
    汉灵帝: { birth: '156年', death: '189年', note: '灵帝·刘宏' },
    汉献帝: { birth: '181年', death: '234年', note: '献帝·刘协' },
  },
  'cao-wei': {
    魏文帝: { birth: '187年', death: '226年', note: '文帝·曹丕' },
    魏明帝: { birth: '205年', death: '239年', note: '明帝·曹叡' },
    齐王曹芳: { birth: '232年', death: '274年', note: '齐王·曹芳' },
    高贵乡公: { birth: '241年', death: '260年', note: '高贵乡公·曹髦' },
    魏元帝: { birth: '246年', death: '302年', note: '元帝·曹奂' },
  },
  'shu-han': {
    汉昭烈帝: { birth: '161年', death: '223年', note: '昭烈帝·刘备' },
    汉怀帝: { birth: '207年', death: '271年', note: '后主·刘禅' },
  },
  'eastern-wu': {
    吴大帝: { birth: '182年', death: '252年', note: '大帝·孙权' },
    会稽王: { birth: '243年', death: '260年', note: '会稽王·孙亮' },
    吴景帝: { birth: '235年', death: '264年', note: '景帝·孙休' },
    吴末帝: { birth: '242年', death: '284年', note: '末帝·孙皓' },
  },
  'western-jin': {
    晋武帝: { birth: '236年', death: '290年', note: '武帝·司马炎' },
    晋惠帝: { birth: '259年', death: '307年', note: '惠帝·司马衷' },
    晋怀帝: { birth: '284年', death: '313年', note: '怀帝·司马炽' },
    晋愍帝: { birth: '300年', death: '318年', note: '愍帝·司马邺' },
  },
  'eastern-jin': {
    晋元帝: { birth: '276年', death: '323年', note: '元帝·司马睿' },
    晋明帝: { birth: '299年', death: '325年', note: '明帝·司马绍' },
    晋成帝: { birth: '321年', death: '342年', note: '成帝·司马衍' },
    晋康帝: { birth: '322年', death: '344年', note: '康帝·司马岳' },
    晋穆帝: { birth: '343年', death: '361年', note: '穆帝·司马聃' },
    晋孝武帝: { birth: '362年', death: '396年', note: '孝武帝·司马曜' },
    晋安帝: { birth: '382年', death: '419年', note: '安帝·司马德宗' },
    晋恭帝: { birth: '385年', death: '421年', note: '恭帝·司马德文' },
  },
  'liu-song': {
    宋武帝: { birth: '363年', death: '422年', note: '武帝·刘裕' },
    宋少帝: { birth: '406年', death: '424年', note: '少帝·刘义符' },
    宋文帝: { birth: '407年', death: '453年', note: '文帝·刘义隆' },
    宋孝武帝: { birth: '430年', death: '464年', note: '孝武帝·刘骏' },
    前废帝: { birth: '449年', death: '466年', note: '前废帝·刘子业' },
    宋明帝: { birth: '439年', death: '472年', note: '明帝·刘彧' },
    宋顺帝: { birth: '467年', death: '479年', note: '顺帝·刘准' },
  },
  'southern-qi': {
    齐高帝: { birth: '427年', death: '482年', note: '高帝·萧道成' },
    齐武帝: { birth: '440年', death: '493年', note: '武帝·萧赜' },
    郁林王: { birth: '473年', death: '494年', note: '郁林王·萧昭业' },
    海陵王: { birth: '480年', death: '494年', note: '海陵王·萧昭文' },
    齐明帝: { birth: '452年', death: '498年', note: '明帝·萧鸾' },
    东昏侯: { birth: '483年', death: '501年', note: '东昏侯·萧宝卷' },
    和帝: { birth: '488年', death: '502年', note: '和帝·萧宝融' },
  },
  liang: {
    梁武帝: { birth: '464年', death: '549年', note: '武帝·萧衍' },
    梁简文帝: { birth: '503年', death: '551年', note: '简文帝·萧纲' },
    豫章王: { note: '豫章王·萧栋' },
    梁元帝: { birth: '508年', death: '555年', note: '元帝·萧绎' },
    梁敬帝: { birth: '543年', death: '558年', note: '敬帝·萧方智' },
  },
  chen: {
    陈武帝: { birth: '503年', death: '559年', note: '武帝·陈霸先' },
    陈文帝: { birth: '522年', death: '566年', note: '文帝·陈蒨' },
    陈废帝: { note: '废帝·陈伯宗' },
    陈宣帝: { birth: '530年', death: '582年', note: '宣帝·陈顼' },
    陈后主: { birth: '553年', death: '604年', note: '后主·陈叔宝' },
  },
  'northern-wei': {
    魏道武帝: { birth: '371年', death: '409年', note: '道武帝·拓跋珪' },
    魏明元帝: { birth: '392年', death: '423年', note: '明元帝·拓跋嗣' },
    魏太武帝: { birth: '408年', death: '452年', note: '太武帝·拓跋焘' },
    魏文成帝: { birth: '440年', death: '465年', note: '文成帝·拓跋濬' },
    魏孝文帝: { birth: '467年', death: '499年', note: '孝文帝·元宏' },
    魏宣武帝: { birth: '483年', death: '515年', note: '宣武帝·元恪' },
    魏孝明帝: { birth: '510年', death: '528年', note: '孝明帝·元诩' },
    魏孝庄帝: { birth: '507年', death: '531年', note: '孝庄帝·元子攸' },
    魏节闵帝: { birth: '498年', death: '532年', note: '节闵帝·元恭' },
    魏孝武帝: { birth: '510年', death: '535年', note: '孝武帝·元修' },
  },
  'eastern-wei': {
    魏孝静帝: { birth: '524年', death: '552年', note: '孝静帝·元善见' },
  },
  'western-wei': {
    魏文帝: { birth: '507年', death: '551年', note: '文帝·元宝炬' },
    魏废帝: { birth: '525年', death: '554年', note: '废帝·元钦' },
    魏恭帝: { birth: '537年', death: '557年', note: '恭帝·元廓' },
  },
  'northern-qi': {
    齐文宣帝: { birth: '529年', death: '559年', note: '文宣帝·高洋' },
    齐废帝: { birth: '545年', death: '561年', note: '废帝·高殷' },
    齐孝昭帝: { birth: '535年', death: '561年', note: '孝昭帝·高演' },
    齐武成帝: { birth: '537年', death: '569年', note: '武成帝·高湛' },
    齐后主: { birth: '556年', death: '577年', note: '后主·高纬' },
    幼主: { birth: '570年', death: '578年', note: '幼主·高恒' },
  },
  'northern-zhou': {
    周孝闵帝: { birth: '542年', death: '557年', note: '孝闵帝·宇文觉' },
    周明帝: { birth: '534年', death: '560年', note: '明帝·宇文毓' },
    周武帝: { birth: '543年', death: '578年', note: '武帝·宇文邕' },
    周宣帝: { birth: '559年', death: '580年', note: '宣帝·宇文赟' },
    周静帝: { birth: '573年', death: '581年', note: '静帝·宇文阐' },
  },
  sui: {
    隋文帝: { birth: '541年', death: '604年', note: '文帝·杨坚' },
    隋炀帝: { birth: '569年', death: '618年', note: '炀帝·杨广' },
    恭帝: { birth: '605年', death: '619年', note: '恭帝·杨侑' },
  },
  tang: {
    唐高祖: { birth: '566年', death: '635年', note: '高祖·李渊' },
    唐太宗: { birth: '598年', death: '649年', note: '太宗·李世民' },
    唐高宗: { birth: '628年', death: '683年', note: '高宗·李治' },
    唐中宗: { birth: '656年', death: '710年', note: '中宗·李显' },
    唐睿宗: { birth: '662年', death: '716年', note: '睿宗·李旦' },
    唐玄宗: { birth: '685年', death: '762年', note: '玄宗·李隆基' },
    唐肃宗: { birth: '711年', death: '762年', note: '肃宗·李亨' },
    唐代宗: { birth: '726年', death: '779年', note: '代宗·李豫' },
    唐德宗: { birth: '742年', death: '805年', note: '德宗·李适' },
    唐宪宗: { birth: '778年', death: '820年', note: '宪宗·李纯' },
    唐文宗: { birth: '809年', death: '840年', note: '文宗·李昂' },
    唐宣宗: { birth: '810年', death: '859年', note: '宣宗·李忱' },
    唐僖宗: { birth: '862年', death: '888年', note: '僖宗·李儇' },
    唐昭宗: { birth: '867年', death: '904年', note: '昭宗·李晔' },
    唐哀帝: { birth: '892年', death: '908年', note: '哀帝·李柷' },
  },
  'wu-zhou': {
    则天皇帝: { birth: '624年', death: '705年', note: '则天皇帝·武曌' },
  },
  'later-liang': {
    后梁太祖: { birth: '852年', death: '912年', note: '太祖·朱温' },
    后梁郢王: { birth: '884年', death: '913年', note: '郢王·朱友珪' },
    后梁末帝: { birth: '888年', death: '923年', note: '末帝·朱友贞' },
  },
  'later-tang': {
    后唐庄宗: { birth: '885年', death: '926年', note: '庄宗·李存勖' },
    后唐明宗: { birth: '867年', death: '933年', note: '明宗·李嗣源' },
    后唐闵帝: { birth: '914年', death: '934年', note: '闵帝·李从厚' },
    后唐末帝: { birth: '885年', death: '936年', note: '末帝·李从珂' },
  },
  'later-jin': {
    后晋高祖: { birth: '892年', death: '942年', note: '高祖·石敬瑭' },
    后晋出帝: { birth: '914年', death: '974年', note: '出帝·石重贵' },
  },
  'later-han': {
    后汉高祖: { birth: '895年', death: '948年', note: '高祖·刘知远' },
    后汉隐帝: { birth: '931年', death: '950年', note: '隐帝·刘承祐' },
  },
  'later-zhou': {
    后周太祖: { birth: '904年', death: '954年', note: '太祖·郭威' },
    后周世宗: { birth: '921年', death: '959年', note: '世宗·柴荣' },
    后周恭帝: { birth: '953年', death: '973年', note: '恭帝·柴宗训' },
  },
  liao: {
    辽太祖: { birth: '872年', death: '926年', note: '太祖·耶律阿保机' },
    辽太宗: { birth: '902年', death: '947年', note: '太宗·耶律德光' },
    辽世宗: { birth: '918年', death: '951年', note: '世宗·耶律阮' },
    辽穆宗: { birth: '931年', death: '969年', note: '穆宗·耶律璟' },
    辽景宗: { birth: '948年', death: '982年', note: '景宗·耶律贤' },
    辽圣宗: { birth: '971年', death: '1031年', note: '圣宗·耶律隆绪' },
    辽兴宗: { birth: '1016年', death: '1055年', note: '兴宗·耶律宗真' },
    辽道宗: { birth: '1032年', death: '1101年', note: '道宗·耶律洪基' },
    天祚帝: { birth: '1075年', death: '1128年', note: '天祚帝·耶律延禧' },
  },
  'western-xia': {
    景宗: { birth: '1003年', death: '1048年', note: '景宗·李元昊' },
    毅宗: { birth: '1047年', death: '1067年', note: '毅宗·李谅祚' },
    惠宗: { birth: '1061年', death: '1086年', note: '惠宗·李秉常' },
    崇宗: { birth: '1083年', death: '1139年', note: '崇宗·李乾顺' },
    仁宗: { birth: '1124年', death: '1193年', note: '仁宗·李仁孝' },
    末帝: { death: '1227年', note: '末帝·李睍' },
  },
  jin: {
    金太祖: { birth: '1068年', death: '1123年', note: '太祖·完颜阿骨打' },
    金太宗: { birth: '1075年', death: '1135年', note: '太宗·完颜晟' },
    金熙宗: { birth: '1119年', death: '1150年', note: '熙宗·完颜亶' },
    海陵王: { birth: '1122年', death: '1161年', note: '海陵王·完颜亮' },
    金世宗: { birth: '1123年', death: '1189年', note: '世宗·完颜雍' },
    金章宗: { birth: '1168年', death: '1208年', note: '章宗·完颜璟' },
    卫绍王: { death: '1213年', note: '卫绍王·完颜永济' },
    金宣宗: { birth: '1163年', death: '1224年', note: '宣宗·完颜珣' },
    金哀宗: { birth: '1198年', death: '1234年', note: '哀宗·完颜守绪' },
    金末帝: { death: '1234年', note: '末帝·完颜承麟' },
  },
  'northern-song': {
    宋太祖: { birth: '927年', death: '976年', note: '太祖·赵匡胤' },
    宋太宗: { birth: '939年', death: '997年', note: '太宗·赵炅' },
    宋真宗: { birth: '968年', death: '1022年', note: '真宗·赵恒' },
    宋仁宗: { birth: '1010年', death: '1063年', note: '仁宗·赵祯' },
    宋英宗: { birth: '1032年', death: '1067年', note: '英宗·赵曙' },
    宋神宗: { birth: '1048年', death: '1085年', note: '神宗·赵顼' },
    宋哲宗: { birth: '1077年', death: '1100年', note: '哲宗·赵煦' },
    宋徽宗: { birth: '1082年', death: '1135年', note: '徽宗·赵佶' },
    宋钦宗: { birth: '1100年', death: '1156年', note: '钦宗·赵桓' },
  },
  'southern-song': {
    宋高宗: { birth: '1107年', death: '1187年', note: '高宗·赵构' },
    宋孝宗: { birth: '1127年', death: '1194年', note: '孝宗·赵昚' },
    宋光宗: { birth: '1147年', death: '1200年', note: '光宗·赵惇' },
    宋宁宗: { birth: '1168年', death: '1224年', note: '宁宗·赵扩' },
    宋理宗: { birth: '1205年', death: '1264年', note: '理宗·赵昀' },
    宋度宗: { birth: '1240年', death: '1274年', note: '度宗·赵禥' },
    宋恭帝: { birth: '1271年', death: '1323年', note: '恭帝·赵㬎' },
    端宗: { birth: '1269年', death: '1278年', note: '端宗·赵昰' },
    帝昺: { birth: '1272年', death: '1279年', note: '帝昺·赵昺' },
  },
  yuan: {
    元世祖: { birth: '1215年', death: '1294年', note: '世祖·忽必烈' },
    元成宗: { birth: '1265年', death: '1307年', note: '成宗·铁穆耳' },
    元武宗: { birth: '1281年', death: '1311年', note: '武宗·海山' },
    元仁宗: { birth: '1285年', death: '1320年', note: '仁宗·爱育黎拔力八达' },
    元英宗: { birth: '1303年', death: '1323年', note: '英宗·硕德八剌' },
    元文宗: { birth: '1304年', death: '1332年', note: '文宗·图帖睦尔' },
    元顺帝: { birth: '1320年', death: '1370年', note: '顺帝·妥懽帖睦尔' },
  },
  qing: {
    清太祖: { birth: '1559年', death: '1626年', note: '太祖·努尔哈赤' },
    清太宗: { birth: '1592年', death: '1643年', note: '太宗·皇太极' },
    顺治帝: { birth: '1638年', death: '1661年', note: '顺治帝·福临' },
    康熙帝: { birth: '1654年', death: '1722年', note: '康熙帝·玄烨' },
    雍正帝: { birth: '1678年', death: '1735年', note: '雍正帝·胤禛' },
    乾隆帝: { birth: '1711年', death: '1799年', note: '乾隆帝·弘历' },
    嘉庆帝: { birth: '1760年', death: '1820年', note: '嘉庆帝·颙琰' },
    道光帝: { birth: '1782年', death: '1850年', note: '道光帝·旻宁' },
    咸丰帝: { birth: '1831年', death: '1861年', note: '咸丰帝·奕詝' },
    同治帝: { birth: '1856年', death: '1875年', note: '同治帝·载淳' },
    光绪帝: { birth: '1871年', death: '1908年', note: '光绪帝·载湉' },
    宣统帝: { birth: '1906年', death: '1967年', note: '宣统帝·溥仪' },
  },
}

function resolveHistoricalRuler(
  sampleId: string,
  ruler: SuccessionSampleRuler | SuccessionSampleRelative,
): SuccessionSampleRuler | SuccessionSampleRelative {
  const profile = historicalRulerProfiles[sampleId]?.[ruler.name]
  const historicalPresentation = profile?.note
    ? inferImperialPresentation({
        ...ruler,
        note: profile.note,
        displayName: profile.displayName,
        titleName: profile.titleName,
      })
    : undefined

  return {
    ...profile,
    ...ruler,
    displayName: ruler.displayName ?? profile?.displayName ?? historicalPresentation?.displayName,
    titleName: ruler.titleName ?? profile?.titleName ?? historicalPresentation?.titleName,
    deceased: ruler.deceased ?? true,
  }
}

function looksLikePersonalName(value: string): boolean {
  if (!/^[\p{Script=Han}A-Za-z·]+$/u.test(value)) return false
  if (value.length > 12) return false
  return !/(之|为|时期|中兴|建国|即位|在位|亡国|复位|称帝|末主|嫡系|后代|先君)/.test(value)
}

function inferImperialPresentation(
  member: SuccessionSampleRuler | SuccessionSampleRelative,
): { displayName: string; titleName?: string } {
  if (member.displayName || member.titleName) {
    return {
      displayName: member.displayName ?? member.name,
      titleName: member.titleName,
    }
  }

  const [noteTitle, noteTail] = member.note.split('·', 2)
  const hasTitleMarker = /[帝王宗主侯公祖皇]/.test(member.name)
  const displayName =
    hasTitleMarker && noteTail && looksLikePersonalName(noteTail) ? noteTail : member.name
  const titleName = (() => {
    const value = hasTitleMarker ? member.name : noteTitle || undefined
    return value === displayName ? undefined : value
  })()

  return { displayName, titleName }
}

function createSuccessionSample(definition: SuccessionSampleDefinition): PublicationData {
  const people: PublicationData['people'] = {}
  const families: PublicationData['families'] = {}
  const personIdByName = new Map<string, string>()
  const familyIdByAdultId = new Map<string, string>()
  let personCounter = 1
  let familyCounter = 1

  function createPerson(
    rawMember: SuccessionSampleRuler | SuccessionSampleRelative,
    defaultHighlightRole?: ImperialHighlightRole,
  ): string {
    const member = resolveHistoricalRuler(definition.id, rawMember)
    const presentation = inferImperialPresentation(member)
    const personId = `p${personCounter++}`
    personIdByName.set(member.name, personId)
    personIdByName.set(presentation.displayName, personId)
    people[personId] = {
      id: personId,
      name: presentation.displayName,
      gender: member.gender ?? 'male',
      birth: member.birth,
      death: member.death,
      deceased: member.deceased ?? true,
      titleName: presentation.titleName,
      clan: member.clan ?? personClanOverrides[definition.id]?.[member.name] ?? dynastyClanProfiles[definition.id],
      note: member.note,
      highlightRole: member.highlightRole ?? defaultHighlightRole,
    }
    return personId
  }

  function ensureFamily(adultId: string): string {
    const existingFamilyId = familyIdByAdultId.get(adultId)
    if (existingFamilyId) {
      return existingFamilyId
    }

    const familyId = `f${familyCounter++}`
    familyIdByAdultId.set(adultId, familyId)
    families[familyId] = {
      id: familyId,
      adults: [adultId],
      children: [],
    }
    return familyId
  }

  function resolveChild(child: string | SuccessionSampleRelative): string {
    if (typeof child === 'string') {
      const existingId = personIdByName.get(child)
      if (!existingId) {
        throw new Error(`未找到王朝示例人物：${child}`)
      }
      return existingId
    }

    const existingId = personIdByName.get(child.name)
    if (existingId) {
      return existingId
    }

    return createPerson(child)
  }

  const rulerIds = definition.rulers.map((ruler) => createPerson(ruler, 'emperor'))

  rulerIds.forEach((adultId, index) => {
    const familyId = ensureFamily(adultId)
    const childId = index < rulerIds.length - 1 ? rulerIds[index + 1] : null
    families[familyId].children = childId ? [childId] : []
  })

  definition.branches?.forEach((branch) => {
    const parentId = personIdByName.get(branch.parent)
    if (!parentId) {
      throw new Error(`未找到王朝示例父节点：${branch.parent}`)
    }

    const familyId = ensureFamily(parentId)
    families[familyId].children = branch.children.map(resolveChild)
  })

  return {
    title: definition.title ?? `${definition.label}世系示例图`,
    subtitle:
      definition.subtitle ?? '按关键君主串联皇统承续关系进行简化建模，便于快速预览前端排版效果。',
    focusFamilyId: 'f1',
    people,
    families,
  }
}

const successionSampleDefinitions: SuccessionSampleDefinition[] = [
  {
    id: 'xia',
    label: '夏朝',
    group: '先秦',
    rulers: [
      { name: '夏禹', note: '夏朝奠基者' },
      { name: '夏启', note: '家天下之始' },
      { name: '太康', note: '启之子' },
      { name: '少康', note: '少康中兴' },
      { name: '孔甲', note: '夏末强君' },
      { name: '夏桀', note: '末代君主' },
    ],
    branches: [
      {
        parent: '夏启',
        children: [
          '太康',
          { name: '仲康', note: '仲康·夏启次子' },
        ],
      },
      {
        parent: '少康',
        children: [
          { name: '杼', note: '杼王·少康之子' },
          '孔甲',
        ],
      },
    ],
  },
  {
    id: 'shang',
    label: '商朝',
    group: '先秦',
    rulers: [
      { name: '成汤', note: '商朝开国君主' },
      { name: '太甲', note: '早期代表君主' },
      { name: '盘庚', note: '迁殷定都' },
      { name: '武丁', note: '中兴名君' },
      { name: '帝乙', note: '商末在位君主' },
      { name: '帝辛', note: '商朝末帝' },
    ],
    branches: [
      {
        parent: '成汤',
        children: [{ name: '太丁', note: '太丁·商汤太子' }],
      },
      {
        parent: '太丁',
        children: ['太甲'],
      },
      {
        parent: '武丁',
        children: [
          { name: '祖甲', note: '祖甲·武丁嫡系后代' },
          '帝乙',
        ],
      },
    ],
  },
  {
    id: 'western-zhou',
    label: '西周',
    group: '先秦',
    rulers: [
      { name: '周武王', note: '灭商建周' },
      { name: '周成王', note: '成康之治开端' },
      { name: '周康王', note: '成康之治代表君主' },
      { name: '周昭王', note: '中期周王' },
      { name: '周穆王', note: '西周盛世君主' },
      { name: '周幽王', note: '西周末王' },
    ],
  },
  {
    id: 'eastern-zhou',
    label: '东周',
    group: '先秦',
    rulers: [
      { name: '周平王', note: '东周开端' },
      { name: '周桓王', note: '春秋早期周王' },
      { name: '周庄王', note: '春秋时期周王' },
      { name: '周景王', note: '春秋中后期周王' },
      { name: '周敬王', note: '战国初期周王' },
      { name: '周赧王', note: '东周末王' },
    ],
  },
  {
    id: 'qin',
    label: '秦朝',
    group: '秦汉',
    rulers: [
      { name: '秦始皇', note: '完成统一' },
      { name: '秦二世', note: '胡亥即位' },
      { name: '子婴', note: '秦朝末主' },
    ],
    branches: [
      {
        parent: '秦始皇',
        children: [
          { name: '扶苏', birth: '前241年', death: '前210年', note: '公子扶苏·始皇长子', highlightRole: 'heir' },
          '秦二世',
        ],
      },
    ],
  },
  {
    id: 'western-han',
    label: '西汉',
    group: '秦汉',
    rulers: [
      { name: '汉高祖', note: '刘邦建汉' },
      { name: '汉惠帝', note: '西汉第二帝' },
      { name: '汉文帝', note: '文景之治代表' },
      { name: '汉景帝', note: '平定七国之乱' },
      { name: '汉武帝', note: '西汉极盛' },
      { name: '汉昭帝', note: '武帝后继' },
      { name: '汉宣帝', note: '中兴之主' },
      { name: '汉元帝', note: '西汉中后期' },
      { name: '汉成帝', note: '外戚势强' },
      { name: '汉哀帝', note: '短暂改革' },
      { name: '汉平帝', note: '西汉末帝' },
    ],
    branches: [
      {
        parent: '汉武帝',
        children: [
          { name: '戾太子刘据', birth: '前128年', death: '前91年', note: '戾太子·刘据', highlightRole: 'heir' },
          '汉昭帝',
        ],
      },
      {
        parent: '戾太子刘据',
        children: [{ name: '刘进', note: '皇孙·刘进' }],
      },
      {
        parent: '刘进',
        children: ['汉宣帝'],
      },
      {
        parent: '汉昭帝',
        children: [],
      },
    ],
  },
  {
    id: 'xin',
    label: '新朝',
    group: '秦汉',
    rulers: [{ name: '王莽', note: '新朝建立者' }],
    branches: [
      {
        parent: '王莽',
        children: [{ name: '王宇', death: '3年', note: '长子·王宇' }],
      },
    ],
  },
  {
    id: 'eastern-han',
    label: '东汉',
    group: '秦汉',
    rulers: [
      { name: '汉光武帝', note: '刘秀中兴' },
      { name: '汉明帝', note: '东汉初盛' },
      { name: '汉章帝', note: '章和之治' },
      { name: '汉和帝', note: '东汉中期' },
      { name: '汉安帝', note: '外戚与宦官渐盛' },
      { name: '汉顺帝', note: '东汉中后期' },
      { name: '汉桓帝', note: '党锢之祸时期' },
      { name: '汉灵帝', note: '黄巾起义前夜' },
      { name: '汉献帝', note: '东汉末帝' },
    ],
    branches: [
      {
        parent: '汉明帝',
        children: [
          { name: '东海王刘疆', birth: '39年', death: '58年', note: '东海王·刘疆', highlightRole: 'heir' },
          '汉章帝',
        ],
      },
      {
        parent: '汉章帝',
        children: [
          { name: '清河王刘庆', birth: '78年', death: '106年', note: '清河孝王·刘庆' },
          '汉和帝',
        ],
      },
    ],
  },
  {
    id: 'cao-wei',
    label: '曹魏',
    group: '三国两晋',
    rulers: [
      { name: '魏文帝', note: '曹丕代汉' },
      { name: '魏明帝', note: '曹叡继位' },
      { name: '齐王曹芳', note: '高平陵之变前后' },
      { name: '高贵乡公', note: '曹髦在位' },
      { name: '魏元帝', note: '曹奂禅晋' },
    ],
  },
  {
    id: 'shu-han',
    label: '蜀汉',
    group: '三国两晋',
    rulers: [
      { name: '汉昭烈帝', note: '刘备建国' },
      { name: '汉怀帝', note: '刘禅亡国' },
    ],
    branches: [
      {
        parent: '汉怀帝',
        children: [{ name: '刘璿', death: '264年', note: '太子·刘璿', highlightRole: 'heir' }],
      },
    ],
  },
  {
    id: 'eastern-wu',
    label: '孙吴',
    group: '三国两晋',
    rulers: [
      { name: '吴大帝', note: '孙权建国' },
      { name: '会稽王', note: '孙亮在位' },
      { name: '吴景帝', note: '孙休继位' },
      { name: '吴末帝', note: '孙皓亡国' },
    ],
    branches: [
      {
        parent: '吴大帝',
        children: [
          { name: '孙登', birth: '209年', death: '241年', note: '宣太子·孙登', highlightRole: 'heir' },
          '会稽王',
        ],
      },
    ],
  },
  {
    id: 'western-jin',
    label: '西晋',
    group: '三国两晋',
    rulers: [
      { name: '晋武帝', note: '司马炎统一三国' },
      { name: '晋惠帝', note: '八王之乱时期' },
      { name: '晋怀帝', note: '永嘉之乱' },
      { name: '晋愍帝', note: '西晋末帝' },
    ],
    branches: [
      {
        parent: '晋惠帝',
        children: [{ name: '司马遹', birth: '277年', death: '300年', note: '愍怀太子·司马遹', highlightRole: 'heir' }],
      },
    ],
  },
  {
    id: 'eastern-jin',
    label: '东晋',
    group: '三国两晋',
    rulers: [
      { name: '晋元帝', note: '东晋开国' },
      { name: '晋明帝', note: '早期稳定局势' },
      { name: '晋成帝', note: '王导辅政时期' },
      { name: '晋康帝', note: '短暂在位' },
      { name: '晋穆帝', note: '东晋中期' },
      { name: '晋孝武帝', note: '淝水之战时期' },
      { name: '晋安帝', note: '末期衰乱' },
      { name: '晋恭帝', note: '东晋末帝' },
    ],
  },
  {
    id: 'liu-song',
    label: '刘宋',
    group: '南北朝',
    rulers: [
      { name: '宋武帝', note: '刘裕建国' },
      { name: '宋少帝', note: '刘义符即位' },
      { name: '宋文帝', note: '元嘉之治' },
      { name: '宋孝武帝', note: '刘骏继位' },
      { name: '前废帝', note: '刘子业在位' },
      { name: '宋明帝', note: '刘彧继位' },
      { name: '宋顺帝', note: '刘宋末帝' },
    ],
    branches: [
      {
        parent: '宋文帝',
        children: [
          { name: '刘劭', birth: '426年', death: '453年', note: '元凶太子·刘劭', highlightRole: 'heir' },
          '宋孝武帝',
        ],
      },
    ],
  },
  {
    id: 'southern-qi',
    label: '南齐',
    group: '南北朝',
    rulers: [
      { name: '齐高帝', note: '萧道成建齐' },
      { name: '齐武帝', note: '南齐全盛' },
      { name: '郁林王', note: '萧昭业在位' },
      { name: '海陵王', note: '萧昭文在位' },
      { name: '齐明帝', note: '萧鸾即位' },
      { name: '东昏侯', note: '萧宝卷在位' },
      { name: '和帝', note: '南齐末帝' },
    ],
    branches: [
      {
        parent: '齐武帝',
        children: [
          { name: '文惠太子萧长懋', birth: '458年', death: '493年', note: '文惠太子·萧长懋', highlightRole: 'heir' },
          '齐明帝',
        ],
      },
      {
        parent: '文惠太子萧长懋',
        children: ['郁林王', '海陵王'],
      },
      {
        parent: '郁林王',
        children: [],
      },
      {
        parent: '海陵王',
        children: [],
      },
      {
        parent: '齐明帝',
        children: ['东昏侯', '和帝'],
      },
    ],
  },
  {
    id: 'liang',
    label: '梁朝',
    group: '南北朝',
    rulers: [
      { name: '梁武帝', note: '萧衍建梁' },
      { name: '梁简文帝', note: '侯景之乱时期' },
      { name: '豫章王', note: '萧栋短暂在位' },
      { name: '梁元帝', note: '江陵称帝' },
      { name: '梁敬帝', note: '梁朝末帝' },
    ],
    branches: [
      {
        parent: '梁武帝',
        children: [
          { name: '昭明太子萧统', birth: '501年', death: '531年', note: '昭明太子·萧统', highlightRole: 'heir' },
          '梁简文帝',
          '梁元帝',
        ],
      },
      {
        parent: '豫章王',
        children: [],
      },
    ],
  },
  {
    id: 'chen',
    label: '陈朝',
    group: '南北朝',
    rulers: [
      { name: '陈武帝', note: '陈霸先建国' },
      { name: '陈文帝', note: '陈蒨继位' },
      { name: '陈废帝', note: '陈伯宗在位' },
      { name: '陈宣帝', note: '陈顼中兴' },
      { name: '陈后主', note: '陈叔宝亡国' },
    ],
    branches: [
      {
        parent: '陈文帝',
        children: ['陈废帝', '陈宣帝'],
      },
      {
        parent: '陈废帝',
        children: [],
      },
      {
        parent: '陈宣帝',
        children: ['陈后主'],
      },
    ],
  },
  {
    id: 'northern-wei',
    label: '北魏',
    group: '南北朝',
    rulers: [
      { name: '魏道武帝', note: '拓跋珪建国' },
      { name: '魏明元帝', note: '拓跋嗣继位' },
      { name: '魏太武帝', note: '统一北方' },
      { name: '魏文成帝', note: '恢复佛教' },
      { name: '魏孝文帝', note: '汉化改革' },
      { name: '魏宣武帝', note: '北魏中期' },
      { name: '魏孝明帝', note: '六镇之乱前后' },
      { name: '魏孝庄帝', note: '尔朱荣时期' },
      { name: '魏节闵帝', note: '北魏末期' },
      { name: '魏孝武帝', note: '出奔长安' },
    ],
  },
  {
    id: 'eastern-wei',
    label: '东魏',
    group: '南北朝',
    rulers: [{ name: '魏孝静帝', note: '东魏唯一君主' }],
  },
  {
    id: 'western-wei',
    label: '西魏',
    group: '南北朝',
    rulers: [
      { name: '魏文帝', note: '元宝炬建西魏' },
      { name: '魏废帝', note: '元钦在位' },
      { name: '魏恭帝', note: '西魏末帝' },
    ],
    branches: [
      {
        parent: '魏文帝',
        children: ['魏废帝', '魏恭帝'],
      },
      {
        parent: '魏废帝',
        children: [],
      },
    ],
  },
  {
    id: 'northern-qi',
    label: '北齐',
    group: '南北朝',
    rulers: [
      { name: '齐文宣帝', note: '高洋建北齐' },
      { name: '齐废帝', note: '高殷在位' },
      { name: '齐孝昭帝', note: '高演继位' },
      { name: '齐武成帝', note: '高湛在位' },
      { name: '齐后主', note: '高纬亡国前后' },
      { name: '幼主', note: '高恒短暂在位' },
    ],
  },
  {
    id: 'northern-zhou',
    label: '北周',
    group: '南北朝',
    rulers: [
      { name: '周孝闵帝', note: '宇文觉建国' },
      { name: '周明帝', note: '宇文毓继位' },
      { name: '周武帝', note: '灭北齐统一北方' },
      { name: '周宣帝', note: '宇文赟在位' },
      { name: '周静帝', note: '北周末帝' },
    ],
    branches: [
      {
        parent: '周武帝',
        children: ['周宣帝'],
      },
      {
        parent: '周宣帝',
        children: ['周静帝'],
      },
    ],
  },
  {
    id: 'sui',
    label: '隋朝',
    group: '隋唐五代',
    rulers: [
      { name: '隋文帝', note: '杨坚建隋' },
      { name: '隋炀帝', note: '大运河与东征高句丽' },
      { name: '恭帝', note: '杨侑在位' },
    ],
    branches: [
      {
        parent: '隋文帝',
        children: [
          { name: '杨勇', death: '604年', note: '废太子·杨勇', highlightRole: 'heir' },
          '隋炀帝',
        ],
      },
      {
        parent: '隋炀帝',
        children: [{ name: '杨昭', birth: '584年', death: '606年', note: '元德太子·杨昭', highlightRole: 'heir' }],
      },
      {
        parent: '杨昭',
        children: ['恭帝'],
      },
      {
        parent: '恭帝',
        children: [],
      },
    ],
  },
  {
    id: 'tang',
    label: '唐朝',
    group: '隋唐五代',
    rulers: [
      { name: '唐高祖', note: '李渊建唐' },
      { name: '唐太宗', note: '贞观之治' },
      { name: '唐高宗', note: '永徽之治' },
      { name: '唐中宗', note: '神龙复辟' },
      { name: '唐睿宗', note: '让位玄宗' },
      { name: '唐玄宗', note: '开元盛世' },
      { name: '唐肃宗', note: '安史之乱中继位' },
      { name: '唐代宗', note: '乱后收束' },
      { name: '唐德宗', note: '中唐转折' },
      { name: '唐宪宗', note: '元和中兴' },
      { name: '唐文宗', note: '甘露之变时期' },
      { name: '唐宣宗', note: '大中之治' },
      { name: '唐僖宗', note: '黄巢之乱时期' },
      { name: '唐昭宗', note: '晚唐乱局' },
      { name: '唐哀帝', note: '唐朝末帝' },
    ],
    branches: [
      {
        parent: '唐太宗',
        children: [
          { name: '李承乾', birth: '619年', death: '645年', note: '废太子·李承乾', highlightRole: 'heir' },
          '唐高宗',
        ],
      },
      {
        parent: '唐高宗',
        children: [
          { name: '李弘', birth: '652年', death: '675年', note: '孝敬皇帝·李弘', highlightRole: 'heir' },
          '唐中宗',
          '唐睿宗',
        ],
      },
      {
        parent: '唐中宗',
        children: [],
      },
      {
        parent: '唐睿宗',
        children: ['唐玄宗'],
      },
      {
        parent: '唐玄宗',
        children: [
          { name: '李瑛', death: '737年', note: '废太子·李瑛', highlightRole: 'heir' },
          '唐肃宗',
        ],
      },
    ],
  },
  {
    id: 'wu-zhou',
    label: '武周',
    group: '隋唐五代',
    rulers: [{ name: '则天皇帝', note: '武曌称帝改周' }],
    branches: [
      {
        parent: '则天皇帝',
        children: [
          { name: '李显', note: '庐陵王·后复位为唐中宗' },
          { name: '李旦', note: '相王·后复位为唐睿宗' },
        ],
      },
    ],
  },
  {
    id: 'later-liang',
    label: '后梁',
    group: '隋唐五代',
    rulers: [
      { name: '后梁太祖', note: '朱温建国' },
      { name: '后梁郢王', note: '朱友珪在位' },
      { name: '后梁末帝', note: '朱友贞亡国' },
    ],
    branches: [
      {
        parent: '后梁太祖',
        children: ['后梁郢王', '后梁末帝'],
      },
      {
        parent: '后梁郢王',
        children: [],
      },
    ],
  },
  {
    id: 'later-tang',
    label: '后唐',
    group: '隋唐五代',
    rulers: [
      { name: '后唐庄宗', note: '李存勖灭后梁' },
      { name: '后唐明宗', note: '李嗣源继位' },
      { name: '后唐闵帝', note: '李从厚在位' },
      { name: '后唐末帝', note: '李从珂亡国' },
    ],
    branches: [
      {
        parent: '后唐明宗',
        children: [
          { name: '李从荣', death: '933年', note: '秦王·李从荣', highlightRole: 'heir' },
          '后唐闵帝',
        ],
      },
    ],
  },
  {
    id: 'later-jin',
    label: '后晋',
    group: '隋唐五代',
    rulers: [
      { name: '后晋高祖', note: '石敬瑭建国' },
      { name: '后晋出帝', note: '石重贵亡国' },
    ],
    branches: [
      {
        parent: '后晋高祖',
        children: ['后晋出帝'],
      },
    ],
  },
  {
    id: 'later-han',
    label: '后汉',
    group: '隋唐五代',
    rulers: [
      { name: '后汉高祖', note: '刘知远建国' },
      { name: '后汉隐帝', note: '刘承祐在位' },
    ],
    branches: [
      {
        parent: '后汉高祖',
        children: ['后汉隐帝'],
      },
    ],
  },
  {
    id: 'later-zhou',
    label: '后周',
    group: '隋唐五代',
    rulers: [
      { name: '后周太祖', note: '郭威建国' },
      { name: '后周世宗', note: '柴荣中兴' },
      { name: '后周恭帝', note: '柴宗训禅宋' },
    ],
    branches: [
      {
        parent: '后周世宗',
        children: ['后周恭帝'],
      },
    ],
  },
  {
    id: 'liao',
    label: '辽朝',
    group: '宋辽夏金元明清',
    rulers: [
      { name: '辽太祖', note: '耶律阿保机建辽' },
      { name: '辽太宗', note: '耶律德光南下' },
      { name: '辽世宗', note: '耶律阮继位' },
      { name: '辽穆宗', note: '耶律璟在位' },
      { name: '辽景宗', note: '耶律贤继位' },
      { name: '辽圣宗', note: '澶渊之盟时期' },
      { name: '辽兴宗', note: '辽中期' },
      { name: '辽道宗', note: '辽后期' },
      { name: '天祚帝', note: '辽朝末帝' },
    ],
    branches: [
      {
        parent: '辽景宗',
        children: ['辽圣宗'],
      },
      {
        parent: '辽道宗',
        children: [{ name: '耶律浚', birth: '1052年', death: '1080年', note: '昭怀太子·耶律浚', highlightRole: 'heir' }],
      },
      {
        parent: '耶律浚',
        children: ['天祚帝'],
      },
      {
        parent: '天祚帝',
        children: [],
      },
    ],
  },
  {
    id: 'western-xia',
    label: '西夏',
    group: '宋辽夏金元明清',
    rulers: [
      { name: '景宗', note: '李元昊建国' },
      { name: '毅宗', note: '李谅祚继位' },
      { name: '惠宗', note: '李秉常在位' },
      { name: '崇宗', note: '李乾顺中兴' },
      { name: '仁宗', note: '李仁孝在位' },
      { name: '末帝', note: '李睍亡国' },
    ],
  },
  {
    id: 'jin',
    label: '金朝',
    group: '宋辽夏金元明清',
    rulers: [
      { name: '金太祖', note: '完颜阿骨打建金' },
      { name: '金太宗', note: '完颜晟灭辽' },
      { name: '金熙宗', note: '完颜亶在位' },
      { name: '海陵王', note: '完颜亮迁都燕京' },
      { name: '金世宗', note: '大定之治' },
      { name: '金章宗', note: '金朝后期' },
      { name: '卫绍王', note: '完颜永济在位' },
      { name: '金宣宗', note: '南迁开封' },
      { name: '金哀宗', note: '金朝末帝之一' },
      { name: '金末帝', note: '完颜承麟亡国' },
    ],
    branches: [
      {
        parent: '金世宗',
        children: [{ name: '完颜允恭', birth: '1146年', death: '1185年', note: '显宗·完颜允恭', highlightRole: 'heir' }],
      },
      {
        parent: '完颜允恭',
        children: ['金章宗'],
      },
      {
        parent: '金章宗',
        children: ['卫绍王'],
      },
    ],
  },
  {
    id: 'northern-song',
    label: '北宋',
    group: '宋辽夏金元明清',
    rulers: [
      { name: '宋太祖', note: '赵匡胤建宋' },
      { name: '宋太宗', note: '赵炅继位' },
      { name: '宋真宗', note: '澶渊之盟时期' },
      { name: '宋仁宗', note: '庆历新政前后' },
      { name: '宋英宗', note: '短暂在位' },
      { name: '宋神宗', note: '王安石变法时期' },
      { name: '宋哲宗', note: '新旧党争' },
      { name: '宋徽宗', note: '北宋末期' },
      { name: '宋钦宗', note: '靖康之变' },
    ],
    branches: [
      {
        parent: '宋太宗',
        children: [
          '宋真宗',
          { name: '赵元份', note: '商恭靖王·赵元份' },
        ],
      },
      {
        parent: '赵元份',
        children: [{ name: '赵允让', note: '濮安懿王·赵允让' }],
      },
      {
        parent: '赵允让',
        children: ['宋英宗'],
      },
      {
        parent: '宋仁宗',
        children: [],
      },
    ],
  },
  {
    id: 'southern-song',
    label: '南宋',
    group: '宋辽夏金元明清',
    rulers: [
      { name: '宋高宗', note: '赵构南渡建都' },
      { name: '宋孝宗', note: '南宋较盛时期' },
      { name: '宋光宗', note: '南宋中期' },
      { name: '宋宁宗', note: '韩侂胄北伐时期' },
      { name: '宋理宗', note: '南宋后期' },
      { name: '宋度宗', note: '国势日衰' },
      { name: '宋恭帝', note: '元军入临安' },
      { name: '端宗', note: '流亡海上' },
      { name: '帝昺', note: '崖山之后南宋亡' },
    ],
    branches: [
      {
        parent: '宋高宗',
        children: [
          { name: '赵旉', birth: '1127年', death: '1129年', note: '元懿太子·赵旉', highlightRole: 'heir' },
          '宋孝宗',
        ],
      },
    ],
  },
  {
    id: 'yuan',
    label: '元朝',
    group: '宋辽夏金元明清',
    rulers: [
      { name: '元世祖', note: '忽必烈建元' },
      { name: '元成宗', note: '铁穆耳继位' },
      { name: '元武宗', note: '海山在位' },
      { name: '元仁宗', note: '爱育黎拔力八达' },
      { name: '元英宗', note: '硕德八剌在位' },
      { name: '元文宗', note: '图帖睦尔继位' },
      { name: '元顺帝', note: '元朝末帝' },
    ],
    branches: [
      {
        parent: '元世祖',
        children: [{ name: '真金', birth: '1243年', death: '1286年', note: '裕宗·真金', highlightRole: 'heir' }],
      },
      {
        parent: '真金',
        children: ['元成宗'],
      },
      {
        parent: '元成宗',
        children: ['元武宗'],
      },
    ],
  },
]

export const defaultSampleId = 'ming'

export const builtinSamples: BuiltinSampleRecord[] = [
  ...successionSampleDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    group: definition.group,
    publication: createSuccessionSample(definition),
  })),
  {
    id: 'ming',
    label: '明朝',
    group: '宋辽夏金元明清',
    publication: samplePublication,
  },
  {
    id: 'qing',
    label: '清朝',
    group: '宋辽夏金元明清',
    publication: createSuccessionSample({
      id: 'qing',
      label: '清朝',
      group: '宋辽夏金元明清',
      rulers: [
        { name: '清太祖', note: '努尔哈赤奠基后金' },
        { name: '清太宗', note: '皇太极改国号为清' },
        { name: '顺治帝', note: '清朝入关' },
        { name: '康熙帝', note: '平三藩、收台湾' },
        { name: '雍正帝', note: '整饬吏治' },
        { name: '乾隆帝', note: '清朝鼎盛' },
        { name: '嘉庆帝', note: '由盛转衰' },
        { name: '道光帝', note: '鸦片战争前后' },
        { name: '咸丰帝', note: '内忧外患加剧' },
        { name: '同治帝', note: '同治中兴时期' },
        { name: '光绪帝', note: '戊戌变法时期' },
        { name: '宣统帝', note: '清朝末帝' },
      ],
      branches: [
        {
          parent: '康熙帝',
          children: [
            { name: '胤礽', birth: '1674年', death: '1725年', note: '废太子·胤礽', highlightRole: 'heir' },
            '雍正帝',
          ],
        },
        {
          parent: '雍正帝',
          children: ['乾隆帝'],
        },
        {
          parent: '道光帝',
          children: [
            '咸丰帝',
            { name: '奕譞', birth: '1840年', death: '1891年', note: '醇贤亲王·奕譞' },
          ],
        },
        {
          parent: '咸丰帝',
          children: ['同治帝'],
        },
        {
          parent: '同治帝',
          children: [],
        },
        {
          parent: '奕譞',
          children: [
            '光绪帝',
            { name: '载沣', birth: '1883年', death: '1951年', note: '醇亲王·载沣' },
          ],
        },
        {
          parent: '光绪帝',
          children: [],
        },
        {
          parent: '载沣',
          children: ['宣统帝'],
        },
      ],
    }),
  },
]

const builtinSampleIndex = new Map(builtinSamples.map((sample) => [sample.id, sample]))

export function getBuiltinSampleById(id: string): BuiltinSampleRecord | undefined {
  return builtinSampleIndex.get(id)
}

export const builtinSampleGroups: BuiltinSampleGroup[] = (() => {
  const groups = new Map<string, BuiltinSampleGroup>()

  for (const sample of builtinSamples) {
    const existingGroup = groups.get(sample.group)
    if (existingGroup) {
      existingGroup.samples.push({ id: sample.id, label: sample.label })
      continue
    }

    groups.set(sample.group, {
      label: sample.group,
      samples: [{ id: sample.id, label: sample.label }],
    })
  }

  return Array.from(groups.values())
})()
