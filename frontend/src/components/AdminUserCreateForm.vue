<script setup lang="ts">
import { ref } from 'vue'

type CreateUserPayload = {
  username: string
  password: string
  nickname?: string
  role: 'ADMIN' | 'USER'
}

const props = withDefaults(defineProps<{
  creating?: boolean
}>(), {
  creating: false,
})

const emit = defineEmits<{
  submit: [payload: CreateUserPayload]
  cancel: []
}>()

const username = ref('')
const password = ref('')
const nickname = ref('')
const role = ref<'ADMIN' | 'USER'>('USER')

function handleSubmit() {
  emit('submit', {
    username: username.value.trim(),
    password: password.value.trim(),
    nickname: nickname.value.trim() || undefined,
    role: role.value,
  })
}
</script>

<template>
  <div class="bento-card create-form">
    <div class="form-header">
      <h3>新增编委账号</h3>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="输入登录账号" />
      </div>
      <div class="field">
        <label>初始密码</label>
        <input v-model="password" type="password" placeholder="设置初始密码" />
      </div>
      <div class="field">
        <label>真实姓名/昵称</label>
        <input v-model="nickname" type="text" placeholder="选填" />
      </div>
    </div>
    <div class="form-footer">
      <div class="role-selector">
        <span class="label">分配角色：</span>
        <label class="role-radio" :class="{ 'is-active': role === 'USER' }">
          <input v-model="role" type="radio" value="USER" />
          <span>编委</span>
        </label>
        <label class="role-radio admin" :class="{ 'is-active': role === 'ADMIN' }">
          <input v-model="role" type="radio" value="ADMIN" />
          <span>协修</span>
        </label>
      </div>
      <div class="actions">
        <button class="btn btn--ghost" type="button" @click="emit('cancel')">取消</button>
        <button class="btn btn--primary" type="button" :disabled="props.creating" @click="handleSubmit">
          {{ props.creating ? '创建中...' : '确认创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bento-card {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper);
  padding: 24px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-header h3 {
  margin: 0;
  font-size: var(--text-title-18);
  font-family: var(--font-serif);
  color: var(--color-neutral-9);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
}

.field input {
  padding: 10px 14px;
  border: 1px solid var(--color-neutral-5);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  outline: none;
  transition: border-color var(--duration-fast);
}

.field input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-8);
}

.role-selector .label {
  color: var(--color-neutral-6);
}

.role-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  cursor: pointer;
}

.role-radio input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--color-accent);
}

.role-radio span {
  line-height: 1;
}

.actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-footer {
    flex-direction: column;
    gap: 14px;
    align-items: stretch;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
