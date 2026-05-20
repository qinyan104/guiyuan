import { computed, markRaw } from 'vue'

import { hasPersonLifeRecord, isPersonDeceased } from '../lib/personStatus'
import type { PublicationStateReturn } from './usePublicationState'

export function usePersonEditor(pub: PublicationStateReturn) {
  const {
    publication,
    selectedPerson,
    selectedSpouse,
    selectedChildren,
    selectedPersonLineageSuggestion,
    selectedOutMarriedDaughter,
    selectedInLawOfOutMarriedDaughter,
    isSelectedBranchFocused,
    canSetSelectedBranchMode,
    selectedBranchMode,
    branchActionLabel,
    getPersonStatus,
    getGenderLabel,
  } = pub

  const selectedPersonSuggestion = computed(() => {
    const person = selectedPerson.value
    if (!person) return '点击人物卡即可在右侧浮层里编辑。'
    if (!person.birth) return '建议优先补录出生时间，这会影响谱图的时间表达。'
    if (!hasPersonLifeRecord(person)) return '建议补录卒年或享年，让出版卡片的信息闭环更完整。'
    if (!person.note) {
      if (selectedPersonLineageSuggestion.value) {
        return `系统可按当前宗支推算为"${selectedPersonLineageSuggestion.value}"，你可以一键填入后再微调。`
      }
      return '建议补充房次、排行或配偶身份，方便读者快速识别宗支位置。'
    }
    if (selectedPersonLineageSuggestion.value && person.note !== selectedPersonLineageSuggestion.value) {
      return `系统按当前宗支推算的称谓是"${selectedPersonLineageSuggestion.value}"，如果你们家谱记法不同，可以保留现有注记。`
    }
    if (canSetSelectedBranchMode.value) {
      return selectedBranchMode.value === 'uxorilocal'
        ? '当前家庭按"招婿承支"处理，配偶会标为婿，后代继续留在本支。'
        : '当前家庭按"外嫁支系"处理，配偶会标为婿，后代按外支显示。'
    }
    return '当前人物信息较完整，可以继续整理其配偶、子女和相关宗支关系。'
  })

  const selectedPersonDetails = computed(() => {
    const person = selectedPerson.value
    if (!person) return []
    const details = [
      { label: '状态', value: getPersonStatus(person) },
      { label: '性别', value: getGenderLabel(person.gender) },
      { label: '称号', value: person.titleName || '未录入' },
      { label: '宗族', value: person.clan || '未录入' },
      { label: '身份', value: person.note || selectedPersonLineageSuggestion.value || '待补充注记' },
      { label: '出生', value: person.birth || '待补全' },
      { label: '卒年', value: person.death || (isPersonDeceased(person) ? '已故（未录卒年）' : '未录入') },
      { label: '年龄', value: person.age || '自动推算 / 待补全' },
      { label: '配偶', value: selectedSpouse.value?.name || '未建立配偶关系' },
    ]
    if (canSetSelectedBranchMode.value) {
      details.push({
        label: '婚配归属',
        value: selectedBranchMode.value === 'uxorilocal' ? '招婿承支' : '外嫁支系',
      })
    }
    return details
  })

  const editorBranchActionLabel = computed(() => {
    if (selectedOutMarriedDaughter.value || selectedInLawOfOutMarriedDaughter.value) {
      return isSelectedBranchFocused.value ? '已在外嫁支系' : '查看外嫁支系'
    }
    return branchActionLabel.value
  })

  const editorSelectedPersonSuggestion = computed(() => {
    const outMarriedDaughter = selectedOutMarriedDaughter.value
    if (outMarriedDaughter) {
      const childCount = selectedChildren.value.length
      if (isSelectedBranchFocused.value) {
        return childCount
          ? `这是外嫁女。当前已切到她自己的家庭支系，名下 ${childCount} 位子女会在这里正常展开。`
          : '这是外嫁女。当前已切到她自己的家庭支系，可以继续在这里整理她的配偶与子女。'
      }
      return childCount
        ? `这是外嫁女。父系主谱会继续显示她的配偶和 ${childCount} 位子女，并用"外嫁/婿"标识婚配关系；点击"查看外嫁支系"可单独聚焦她这一支。`
        : '这是外嫁女。父系主谱会显示她本人和配偶，并用"外嫁/婿"标识婚配关系；如需单独整理她这一支，请点击"查看外嫁支系"。'
    }

    const daughterSpouse = selectedInLawOfOutMarriedDaughter.value
    if (daughterSpouse) {
      const childCount = selectedChildren.value.length
      if (isSelectedBranchFocused.value) {
        return childCount
          ? `这是外嫁女 ${daughterSpouse.name} 的配偶。当前已进入他们自己的家庭支系，可继续整理名下 ${childCount} 位子女。`
          : `这是外嫁女 ${daughterSpouse.name} 的配偶。当前已进入他们自己的家庭支系，可以继续补录后代信息。`
      }
      return childCount
        ? `这是外嫁女 ${daughterSpouse.name} 的配偶。父系主谱会继续显示他们名下 ${childCount} 位子女，并用"婿"标识婚配关系；点击"查看外嫁支系"可单独聚焦他们这一支。`
        : `这是外嫁女 ${daughterSpouse.name} 的配偶。父系主谱会用"婿"标识婚配关系；点击"查看外嫁支系"可进入他们自己的家庭支系。`
    }

    return selectedPersonSuggestion.value
  })

  const editorSelectedPersonDetails = computed(() => {
    if (selectedOutMarriedDaughter.value) {
      return [
        ...selectedPersonDetails.value,
        { label: '谱系提示', value: isSelectedBranchFocused.value ? '当前查看外嫁支系' : '父系主谱会继续显示其配偶与子女' },
      ]
    }
    if (selectedInLawOfOutMarriedDaughter.value) {
      return [
        ...selectedPersonDetails.value,
        { label: '谱系提示', value: isSelectedBranchFocused.value ? '当前查看外嫁支系' : '父系主谱中作为婿/配偶显示，并保留后代' },
      ]
    }
    return selectedPersonDetails.value
  })

  type EditablePersonField = 'name' | 'birth' | 'death' | 'age' | 'titleName' | 'clan' | 'note' | 'avatarUrl'

  function updateSelectedPersonField(payload: { field: EditablePersonField; value: string }) {
    const person = selectedPerson.value
    if (person) {
      // 方案五兼容: markRaw 对象不能就地 mutate，必须替换整个对象引用以触发响应式更新
      publication.people[person.id] = markRaw({ ...person, [payload.field]: payload.value })
    }
  }

  function updateSelectedPersonGender(gender: 'male' | 'female' | 'unknown') {
    const person = selectedPerson.value
    if (person) {
      publication.people[person.id] = markRaw({ ...person, gender })
    }
  }

  return {
    selectedPersonSuggestion,
    selectedPersonDetails,
    editorBranchActionLabel,
    editorSelectedPersonSuggestion,
    editorSelectedPersonDetails,
    updateSelectedPersonField,
    updateSelectedPersonGender,
  }
}
