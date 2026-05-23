<script setup lang="ts">
import { ref, watch } from "vue"
import { useFeedback } from "../composables/useFeedback"
import FeedbackStrip from "../components/FeedbackStrip.vue"
import BranchMountManager from "./BranchMountManager.vue"
import AppSelect from "./AppSelect.vue"
import type { FamilyBranchMode, Gender, Person } from "../types/family"
import { uploadPhoto, getPhotoUrl } from "../api/photo"

interface PersonDetailItem { label: string; value: string }
interface ChildOrderItem { person: Person; index: number; isFirst: boolean; isLast: boolean }
type EditablePersonField = "name" | "birth" | "death" | "age" | "titleName" | "clan" | "note" | "avatarUrl"

const feedback = useFeedback()

const props = defineProps<{
  open: boolean
  person: Person
  publicationId: number | null
  suggestion: string
  lineageSuggestion: string
  details: PersonDetailItem[]
  spouse: Person | null
  parents: Person[]
  children: Person[]
  childItems: ChildOrderItem[]
  canAddSpouse: boolean
  hasCompleteParents: boolean
  canSwapAdults: boolean
  isSelectedBranchFocused: boolean
  canSetBranchMode: boolean
  branchMode: FamilyBranchMode | ""
  parentActionLabel: string
  branchActionLabel: string
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "select-person", id: string): void
  (e: "add-spouse"): void
  (e: "add-child", g: Gender): void
  (e: "add-parents"): void
  (e: "remove-spouse"): void
  (e: "remove-parents"): void
  (e: "focus-branch"): void
  (e: "update-branch-mode", m: FamilyBranchMode): void
  (e: "swap-partners"): void
  (e: "move-child", p: { childId: string; direction: -1 | 1 }): void
  (e: "update-person-field", p: { field: EditablePersonField; value: string }): void
  (e: "update-person-gender", g: Gender): void
  (e: "apply-note-suggestion", v: string): void
  (e: "delete-person"): void
}>()


function uf(f: EditablePersonField, e: Event) { emit("update-person-field", { field: f, value: (e.target as HTMLInputElement).value }) }
function ug(e: Event) { emit("update-person-gender", (e.target as HTMLSelectElement).value as Gender) }
async function upAvatar(e: Event) {
  const i = e.target as HTMLInputElement; if (!i.files?.length) return
  if (!props.publicationId) { feedback.errorMessage.value = "请先保存族谱到服务器后再上传照片"; return }
  try { const pid = await uploadPhoto(props.person.id, props.publicationId, i.files[0]); emit("update-person-field", { field: "avatarUrl", value: getPhotoUrl(pid) }) }
  catch { feedback.errorMessage.value = "上传失败" }
}

const dcid = ref<string | null>(null); const dcoid = ref<string | null>(null)
function cds(id: string, e: DragEvent) { dcid.value = id; e.dataTransfer!.effectAllowed = "move" }
function cdo(id: string, e: DragEvent) { e.preventDefault(); dcoid.value = id }
function cdl() { dcoid.value = null }
function cdop(tid: string, e: DragEvent) {
  e.preventDefault(); const s = dcid.value; dcid.value = null; dcoid.value = null
  if (!s || s === tid) return
  const si = props.childItems.findIndex(c => c.person.id === s)
  const ti = props.childItems.findIndex(c => c.person.id === tid)
  if (si === -1 || ti === -1) return
  for (let i = 0; i < Math.abs(ti - si); i++) emit("move-child", { childId: s, direction: ti > si ? 1 : -1 })
}
function cde() { dcid.value = null; dcoid.value = null }

function gl(g: Gender) { return g === "male" ? "男" : g === "female" ? "女" : "未知" }
function gc(g: Gender) { return g === "male" ? "gm" : g === "female" ? "gf" : "" }

function extractYear(s: string | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d{4})/)
  return m ? parseInt(m[1]) : null
}

const autoAge = ref<string>("")

const genderOptions = [{ value: "male", label: "男" }, { value: "female", label: "女" }, { value: "unknown", label: "未知" }]

watch([() => props.person.birth, () => props.person.death], ([b, d]) => {
  const by = extractYear(b)
  if (!by) { autoAge.value = ""; return }
  const dy = extractYear(d)
  if (dy && dy > by && dy - by < 150) {
    autoAge.value = String(dy - by)
    emit("update-person-field", { field: "age", value: String(dy - by) })
  } else if (!d || !dy) {
    autoAge.value = String(new Date().getFullYear() - by)
  } else {
    autoAge.value = ""
  }
}, { immediate: true })

</script>

<template>
  <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />
  <Teleport to="body">
    <Transition name="ak-slide">
      <div v-if="open" class="ak-overlay" @click.self="$emit('close')">
        <article class="ak-card" @click.stop>
          <div class="ak-bar">
            <button class="ak-bar__btn" @click="$emit('close')">取消</button>
            <span class="ak-bar__title">编辑人物</span>
            <button class="ak-bar__btn ak-bar__done" @click="$emit('close')">完成</button>
          </div>
          <div class="ak-hbody">
            <div class="ak-left">
              <label class="ak-av">
                <img v-if="person.avatarUrl" :src="person.avatarUrl" class="ak-av__img" />
                <svg v-else width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="4" stroke="currentColor" stroke-width="1.2"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                <input type="file" accept="image/*" class="ak-av__inp" @change="upAvatar" />
              </label>
              <div class="ak-identity">
                <input :value="person.name" type="text" class="ak-inp ak-inp--hero" placeholder="姓名" @input="uf('name', $event)" />
              </div>
              <div v-if="details.length" class="ak-dlist">
                <div v-for="d in details" :key="d.label" class="ak-ditem">
                  <span class="ak-ditem__l">{{ d.label }}</span>
                  <span class="ak-ditem__v">{{ d.value }}</span>
                </div>
              </div>
            </div>
            <div class="ak-right">
              <div class="ak-grp">
                <div class="ak-grp__h">生卒信息</div>
                <div class="ak-row"><label class="ak-fld"><span class="ak-fld__l">生年</span><input :value="person.birth" type="text" class="ak-inp" placeholder="光绪三十二年" @input="uf('birth', $event)" /></label><label class="ak-fld"><span class="ak-fld__l">卒年</span><input :value="person.death" type="text" class="ak-inp" placeholder="" @input="uf('death', $event)" /></label></div>
                <div class="ak-row"><label class="ak-fld"><span class="ak-fld__l">性别</span><AppSelect :modelValue="person.gender" :options="genderOptions" placeholder="选择性别" @update:modelValue="(v: string) => emit('update-person-gender', v as Gender)" /></label><label class="ak-fld"><span class="ak-fld__l">{{ person.death ? '享年' : '年龄' }}</span><input :value="person.age" type="text" class="ak-inp" :placeholder="autoAge || '自动推算'" @input="uf('age', $event)" /></label></div>
              </div>

              <div class="ak-grp">
                <div class="ak-grp__h">亲属关系</div>
                
                <div class="ak-rel__row">
                  <span class="ak-rel__label">配偶</span>
                  <div class="ak-rel__body">
                    <template v-if="spouse">
                      <button class="ak-pchp" :class="gc(spouse.gender)" @click="$emit('select-person', spouse.id)"><span class="ak-pchp__a">{{ spouse.name.charAt(0) }}</span><span class="ak-pchp__n">{{ spouse.name }}</span></button>
                      <button v-if="canSwapAdults" class="ak-rel__aux-btn" @click="$emit('swap-partners')">调整</button>
                      <button class="ak-rel__aux-btn ak-rel__aux-btn--del" @click="$emit('remove-spouse')">解除</button>
                    </template>
                    <button v-else-if="canAddSpouse" class="ak-rel__add" @click="$emit('add-spouse')">+ 添加配偶</button>
                    <span v-else class="ak-rel__nil">—</span>
                  </div>
                </div>
                <div class="ak-rel__row">
                  <span class="ak-rel__label">父母</span>
                  <div class="ak-rel__body">
                    <template v-if="parents.length">
                      <button v-for="p in parents" :key="p.id" class="ak-pchp" :class="gc(p.gender)" @click="$emit('select-person', p.id)"><span class="ak-pchp__a">{{ p.name.charAt(0) }}</span><span class="ak-pchp__n">{{ p.name }}</span></button>
                      <button class="ak-rel__aux-btn ak-rel__aux-btn--del" @click="$emit('remove-parents')">解除</button>
                    </template>
                    <button v-else-if="!hasCompleteParents" class="ak-rel__add" @click="$emit('add-parents')">{{ parentActionLabel || '+ 添加父母' }}</button>
                    <span v-else class="ak-rel__nil">—</span>
                  </div>
                </div>
                <div class="ak-rel__row">
                  <span class="ak-rel__label">子女</span>
                  <div class="ak-rel__body">
                    <template v-if="childItems.length">
                      <button v-for="c in childItems" :key="c.person.id" class="ak-pchp ak-pchp--drag" :class="[gc(c.person.gender), {'ak-chi--over':dcoid===c.person.id,'ak-chi--drag':dcid===c.person.id}]" draggable="true" @dragstart="cds(c.person.id,$event)" @dragover="cdo(c.person.id,$event)" @dragleave="cdl" @drop="cdop(c.person.id,$event)" @dragend="cde" @click="$emit('select-person', c.person.id)"><span class="ak-pchp__badge">{{ c.index + 1 }}</span><span class="ak-pchp__a">{{ c.person.name.charAt(0) }}</span><span class="ak-pchp__n">{{ c.person.name }}</span></button>
                    </template>
                    <button class="ak-rel__add" @click="$emit('add-child','male')">+ 添子</button>
                    <button class="ak-rel__add" @click="$emit('add-child','female')">+ 添女</button>
                  </div>
                </div>
              </div>

              <div class="ak-grp">
                <div class="ak-grp__h">分支设置</div>
                <div class="ak-chips"><button class="ak-chp ak-chp--b" :disabled="isSelectedBranchFocused" @click="$emit('focus-branch')">{{ branchActionLabel }}</button><button v-if="canSetBranchMode" class="ak-chp" :class="{'ak-chp--on':branchMode==='married-out'}" @click="$emit('update-branch-mode','married-out')">适人</button><button v-if="canSetBranchMode" class="ak-chp" :class="{'ak-chp--on':branchMode==='uxorilocal'}" @click="$emit('update-branch-mode','uxorilocal')">赘婿</button></div>
              </div>

              <div class="ak-grp">
                <div class="ak-grp__h">补充信息</div>
                <label class="ak-fld"><span class="ak-fld__l">注记</span><input :value="person.note" type="text" class="ak-inp" placeholder="长房 / 次子" @input="uf('note', $event)" /><button v-if="lineageSuggestion && person.note !== lineageSuggestion" class="ak-sug" @click="$emit('apply-note-suggestion', lineageSuggestion)">采纳「{{ lineageSuggestion }}」</button></label>
                <div class="ak-sep"></div>
                <BranchMountManager :person="person" :publicationId="publicationId" />
              </div>

              <button class="ak-del" @click="$emit('delete-person')">删除此人</button>
            </div>
          </div>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ak-overlay { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; background:rgba(58,45,25,0.18); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
.ak-card { width:820px; max-height:88vh; background:#faf6ee; backdrop-filter:blur(32px); -webkit-backdrop-filter:blur(32px); border-radius:16px; box-shadow:0 4px 32px rgba(0,0,0,.12),0 0 0 .5px rgba(0,0,0,.08); display:flex; flex-direction:column; overflow:hidden; }
.ak-bar { display:flex; align-items:center; padding:12px 20px 8px; flex-shrink:0; }
.ak-bar__btn { font-size:16px; color:#916331; border:none; background:none; cursor:pointer; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:0; font-weight:400; min-width:44px; text-align:left; }
.ak-bar__btn:active { opacity:.3; }
.ak-bar__done { text-align:right; font-weight:600; }
.ak-bar__title { flex:1; text-align:center; font-size:16px; font-weight:600; color:#3a3229; }
.ak-hbody { display:flex; gap:0; overflow:hidden; flex:1; min-height:0; }
.ak-left { width:200px; flex-shrink:0; padding:20px 18px 20px; display:flex; flex-direction:column; align-items:center; gap:12px; border-right:1px solid rgba(120,95,65,0.1); overflow-y:auto; }
.ak-right { flex:1; padding:20px 24px 20px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; min-width:0; }
.ak-left::-webkit-scrollbar, .ak-right::-webkit-scrollbar { width:3px; }
.ak-left::-webkit-scrollbar-thumb, .ak-right::-webkit-scrollbar-thumb { background:rgba(120,95,65,0.12); border-radius:3px; }
.ak-av { position:relative; width:88px; height:88px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:rgba(120,95,65,0.08); flex-shrink:0; transition:background .15s; }
.ak-av:hover { background:rgba(120,95,65,0.14); }
.ak-av__img { width:100%; height:100%; object-fit:contain; }
.ak-av__inp { position:absolute; inset:0; opacity:0; cursor:pointer; }
.ak-identity { width:100%; display:flex; flex-direction:column; align-items:center; gap:2px; }
.ak-dlist { width:100%; display:flex; flex-direction:column; gap:1px; background:rgba(120,95,65,0.06); border-radius:8px; overflow:hidden; }
.ak-ditem { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; background:#faf6ee; }
.ak-ditem + .ak-ditem { border-top:1px solid rgba(120,95,65,0.06); }
.ak-ditem__l { font-size:11px; color:#8c7b6b; font-weight:500; }
.ak-ditem__v { font-size:12px; color:#3a3229; font-weight:500; text-align:right; }
.ak-inp { width:100%; padding:8px 12px; border-radius:8px; border:none; background:#faf6ee; border:1px solid rgba(120,95,65,0.12); font-size:14px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#3a3229; box-sizing:border-box; transition:background .15s; }
.ak-inp:focus { outline:none; border-color:#916331; box-shadow:0 0 0 3px rgba(145,99,49,0.1); background:#faf6ee; }
.ak-inp::placeholder { color:#b8a898; }
.ak-inp--hero { font-size:28px; font-weight:700; text-align:center; background:transparent; color:#3a3229; padding:4px 0; letter-spacing:-.01em; width:100%; }
.ak-inp--hero:focus { background:transparent; }
.ak-sel { appearance:none; background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; cursor:pointer; }
.ak-fld { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.ak-fld__l { font-size:10px; color:#8c7b6b; font-weight:500; }
.ak-sug { display:inline-flex; align-items:center; gap:3px; margin-top:4px; padding:2px 8px; border-radius:5px; border:none; background:rgba(145,99,49,0.06); color:#916331; font-size:11px; font-weight:500; cursor:pointer; font-family:inherit; width:fit-content; }
.ak-sug:hover { background:rgba(145,99,49,0.12); }
.ak-row { display:flex; gap:12px; }
.ak-grp { background:#faf6ee; border-radius:12px; padding:16px; border:1px solid rgba(120,95,65,0.1); }
.ak-grp__h { font-size:11px; font-weight:600; color:#3a3229; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(120,95,65,0.08); }
.ak-sep { height:1px; background:rgba(120,95,65,0.1); margin:8px 0; }
.ak-rel__row { display:flex; align-items:flex-start; gap:12px; padding:10px 0; }
.ak-rel__row + .ak-rel__row { border-top:1px solid rgba(120,95,65,0.08); }
.ak-rel__label { width:36px; flex-shrink:0; font-size:13px; font-weight:600; color:#3a3229; padding-top:4px; }
.ak-rel__body { flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.ak-rel__add { font-size:12px; color:#916331; border:none; background:none; cursor:pointer; font-family:inherit; padding:3px 0; white-space:nowrap; }
.ak-rel__add:hover { opacity:.7; }
.ak-rel__nil { margin:0; font-size:12px; color:#b8a898; padding:3px 0; }
.ak-rel__aux-btn { font-size:11px; padding:2px 7px; border-radius:4px; border:1px solid rgba(120,95,65,0.1); background:transparent; color:#8c7b6b; cursor:pointer; font-family:inherit; white-space:nowrap; }
.ak-rel__aux-btn:hover { border-color:rgba(120,95,65,0.2); background:rgba(120,95,65,0.04); }
.ak-rel__aux-btn--del { color:#FF3B30; }
.ak-rel__aux-btn--del:hover { background:rgba(255,59,48,.06); }
.ak-chp { font-size:12px; padding:4px 12px; border-radius:6px; border:1px solid rgba(120,95,65,0.12); background:#faf6ee; color:#3a3229; cursor:pointer; font-family:inherit; transition:background .15s; }
.ak-chp:hover:not(:disabled) { background:rgba(145,99,49,0.06); border-color:rgba(120,95,65,0.2); }
.ak-chp:disabled { opacity:.25; cursor:not-allowed; }
.ak-chp--d { color:#FF3B30; }
.ak-chp--d:hover:not(:disabled) { background:rgba(255,59,48,.08); }
.ak-chp--b { color:#916331; font-weight:500; }
.ak-chp--on { background:rgba(145,99,49,0.1); color:#916331; }
.ak-chips { display:flex; flex-wrap:wrap; gap:4px; }
.ak-pchps { display:flex; flex-wrap:wrap; gap:3px; }
.ak-pchp { display:inline-flex; align-items:center; gap:6px; padding:6px 12px 6px 6px; border-radius:8px; border:1px solid rgba(120,95,65,0.1); background:#faf6ee; cursor:pointer; font-family:inherit; font-size:13px; color:#3a3229; transition:all .15s; }
.ak-pchp:hover { border-color:#916331; background:rgba(145,99,49,0.04); }
.ak-pchp--drag { cursor:grab; }
.ak-pchp--drag:active { cursor:grabbing; }
.ak-pchp__badge { display:flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:rgba(120,95,65,0.12); font-size:9px; font-weight:700; color:#8c7b6b; flex-shrink:0; }
.ak-pchp.gm { background:rgba(145,99,49,0.06); }
.ak-pchp.gf { background:rgba(255,45,85,.06); }
.ak-pchp__a { display:flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:rgba(120,95,65,0.1); font-size:10px; font-weight:600; color:#8c7b6b; flex-shrink:0; }
.ak-pchp__n { font-weight:500; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.ak-del { padding:10px; border-radius:10px; border:none; background:transparent; color:#FF3B30; font-size:14px; font-weight:400; cursor:pointer; font-family:inherit; transition:background .15s; width:100%; }
.ak-del:hover { background:rgba(255,59,48,.06); }
.ak-slide-enter-active { transition:opacity 300ms cubic-bezier(.22,1,.36,1); }
.ak-slide-leave-active { transition:opacity 200ms ease-in; }
.ak-slide-enter-active .ak-card { animation:ak-up 380ms cubic-bezier(.22,1,.36,1) forwards; }
.ak-slide-leave-active .ak-card { animation:ak-down 180ms ease-in forwards; }
/* AppSelect — blend into drawer aesthetic */
:deep(.app-select .app-select__trigger) { background:#faf6ee; border:1px solid rgba(120,95,65,0.12); border-radius:8px; padding:8px 12px; font-size:14px; color:#3a3229; }
:deep(.app-select.open .app-select__trigger),
:deep(.app-select .app-select__trigger:hover) { border-color:#916331; box-shadow:0 0 0 3px rgba(145,99,49,0.1); }
:deep(.app-select .app-select__value.placeholder) { color:#b8a898; }
:deep(.app-select__dropdown) { background:#faf6ee; border:1px solid rgba(120,95,65,0.12); border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,.12); }
:deep(.app-select__option) { color:#3a3229; font-size:14px; }
:deep(.app-select__option:hover),
:deep(.app-select__option.highlighted) { background:rgba(145,99,49,0.08); }
:deep(.app-select__option.selected) { color:#916331; font-weight:600; }
:deep(.app-select__option.selected::after) { background:#916331; }

@keyframes ak-up { from { opacity:0; transform:translateY(32px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes ak-down { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(16px) scale(.98); } }
</style>
