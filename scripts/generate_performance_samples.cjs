const fs = require('fs');
const path = require('path');

const SURNAMES = [
  '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕'
];

const MALE_NAMES = [
  '军', '志', '斌', '华', '龙', '涛', '强', '伟', '超', '勇',
  '刚', '峰', '文', '海', '威', '辉', '健', '杰', '飞', '鹏',
  '凯', '明', '祥', '成', '磊', '彬', '宇', '浩', '泽', '轩',
  '宏', '睿', '博', '渊', '晨', '瀚', '廷', '恒', '昊', '冠'
];

const FEMALE_NAMES = [
  '芳', '蓉', '琳', '云', '华', '敏', '丽', '慧', '莲', '娟',
  '香', '莉', '萍', '婷', '梅', '霞', '凤', '燕', '英', '素',
  '兰', '玉', '洁', '珍', '秀', '琴', '琼', '玲', '芬', '倩',
  '静', '雅', '萱', '悦', '清', '雯', '涵', '颖', '欣', '怡'
];

const SUFFIXES = ['子', '甫', '之', '生'];

const STANDARD_SETTINGS = {
  paper: 'A4',
  layoutMode: 'modern',
  cardWidth: 142,
  cardRadius: 24,
  cardShadowOpacity: 18,
  cardBackgroundColor: '#F3F1EB',
  generationGap: 130,
  siblingGap: 76,
  partnerGap: 72,
  fontScale: 1,
  compactNameSize: 22,
  compactNameColor: '#1D1D1F',
  compactLineColor: '#B5A99A',
  zoom: 1.35,
  showCard: false,
  showBirth: true,
  showDeath: true,
  showAge: true,
  showNote: false,
  showStatus: true,
  showLineage: true,
  showPhoto: false,
  paddingX: 80,
  paddingY: 80
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function generateDataset(targetCount) {
  let pCounter = 1;
  let fCounter = 1;
  const dbBase = 250000 + targetCount * 13;

  function createPerson(gender, gen) {
    const id = 'p' + (pCounter++);
    const dbId = dbBase + pCounter;
    const surname = SURNAMES[rand(0, SURNAMES.length - 1)];
    let given = gender === 'male'
      ? MALE_NAMES[rand(0, MALE_NAMES.length - 1)]
      : FEMALE_NAMES[rand(0, FEMALE_NAMES.length - 1)];
    if (Math.random() < 0.2) {
      given += SUFFIXES[rand(0, SUFFIXES.length - 1)];
    }
    const name = surname + given;

    // Generational timeline: Root is around 1900-1920, descendants go earlier or forward
    // In guiyuan performance tests, gen 0 is ~1900, children are ~1870-1880 (ancestral trace style)
    const birthYear = Math.max(1200, 1910 - gen * 24 + rand(-6, 6));
    const birthMonth = pad2(rand(1, 12));
    const birthDay = pad2(rand(1, 28));
    const birth = `${birthYear}年${birthMonth}月${birthDay}日`;

    const person = {
      id,
      dbId,
      name,
      gender,
      birth
    };

    if (birthYear < 1945 || Math.random() < 0.45) {
      const age = rand(50, 88);
      const deathYear = birthYear + age;
      person.death = `${deathYear}年`;
      person.deceased = true;
    }

    return person;
  }

  const people = {};
  const families = {};

  // Root family f1
  const p1 = createPerson('male', 0);
  const p2 = createPerson('female', 0);
  people[p1.id] = p1;
  people[p2.id] = p2;

  const f1 = {
    id: 'f1',
    adults: [p1.id, p2.id],
    children: []
  };
  families['f1'] = f1;

  const queue = [{ family: f1, gen: 0 }];

  while (queue.length > 0 && pCounter <= targetCount) {
    const { family, gen } = queue.shift();
    const remaining = targetCount - pCounter + 1;
    if (remaining <= 0) break;

    // Determine number of children
    let maxC = Math.min(4, remaining);
    let minC = queue.length < 10 && remaining > 30 ? 2 : 1;
    if (minC > maxC) minC = maxC;
    const numChildren = rand(minC, maxC);

    for (let i = 0; i < numChildren; i++) {
      if (pCounter > targetCount) break;
      const childGender = Math.random() < 0.5 ? 'male' : 'female';
      const child = createPerson(childGender, gen + 1);
      people[child.id] = child;
      family.children.push(child.id);

      const remAfterChild = targetCount - pCounter + 1;
      // Child can marry if there is room for at least 1 spouse and tree needs branching
      const wantMarry = (remAfterChild >= 1) &&
        ((queue.length < 80) || (Math.random() < 0.62)) &&
        (remAfterChild > queue.length * 2);

      if (wantMarry && remAfterChild >= 1) {
        const spouseGender = childGender === 'male' ? 'female' : 'male';
        const spouse = createPerson(spouseGender, gen + 1);
        people[spouse.id] = spouse;
        fCounter++;
        const newFamId = 'f' + fCounter;
        const newFam = {
          id: newFamId,
          adults: [child.id, spouse.id],
          children: []
        };
        families[newFamId] = newFam;
        queue.push({ family: newFam, gen: gen + 1 });
      }
    }
  }

  // If any remaining persons needed to reach exactly targetCount
  const allFamilies = Object.values(families);
  while (pCounter <= targetCount) {
    const targetFam = allFamilies[rand(0, allFamilies.length - 1)];
    const child = createPerson(Math.random() < 0.5 ? 'male' : 'female', 4);
    people[child.id] = child;
    targetFam.children.push(child.id);
  }

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    publication: {
      title: `性能测试 - ${targetCount}人`,
      subtitle: `自动生成，共 ${targetCount} 人`,
      focusFamilyId: 'f1',
      people,
      families,
      info: {
        description: `性能测试用族谱 - ${targetCount}人规模`
      },
      revision: rand(5, 25)
    },
    settings: { ...STANDARD_SETTINGS }
  };
}

const TARGET_COUNTS = [3000, 4000, 6000, 7000, 8000, 9000, 10000];
const SAMPLES_DIR = path.resolve(__dirname, '..', 'samples');

for (const count of TARGET_COUNTS) {
  const start = Date.now();
  const dataset = generateDataset(count);
  const fileName = `性能测试 - ${count}人.json`;
  const filePath = path.join(SAMPLES_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2), 'utf8');
  const elapsed = Date.now() - start;
  console.log(`Generated ${fileName} (${count} persons, ${Object.keys(dataset.publication.families).length} families) in ${elapsed}ms`);
}
