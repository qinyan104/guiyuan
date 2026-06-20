<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant: 'privacy' | 'terms'
}>()

const content = computed(() => {
  if (props.variant === 'privacy') {
    return {
      eyebrow: 'Privacy',
      title: '隐私说明',
      intro: '归源用于整理、浏览和共享家族谱系信息。以下说明帮助用户了解系统会保存什么、为什么保存，以及你可以怎样控制这些内容。',
      sections: [
        {
          title: '我们会保存哪些资料',
          body: [
            '账号资料：登录邮箱、用户名、权限角色和必要的认证信息。',
            '谱系资料：人物姓名、称谓、生卒、关系、备注、照片以及用户主动录入的谱系结构。',
            '协作记录：为了支持共享、审阅与问题追溯，系统可能保留发布时间、编辑记录和访问相关日志。',
          ],
        },
        {
          title: '这些资料的用途',
          body: [
            '用于展示家族结构、支持编辑协作、生成共享视图，以及帮助管理员处理权限和数据问题。',
            '我们不会把你的谱系内容用于公开展示，除非你主动创建共享链接或授予他人访问权限。',
          ],
        },
        {
          title: '你可以怎样控制数据',
          body: [
            '你可以按角色区分查看者和编辑者，降低误改风险。',
            '涉及共享时，请只向需要的人发送链接，并定期检查是否仍需保留该共享入口。',
            '如果你的团队对留存期限、导出方式或删除流程有额外要求，建议在正式部署前补充内部规范。',
          ],
        },
      ],
    }
  }

  return {
    eyebrow: 'Terms',
    title: '使用说明',
    intro: '归源适合用来整理、校对与共享家族谱系。为了让协作过程更稳定，建议在使用前确认以下约定。',
    sections: [
      {
        title: '适合的使用方式',
        body: [
          '先录入主干人物，再逐步补旁支、迁徙与故事内容。',
          '多人协作时，优先明确谁负责录入、谁负责校对、谁负责最终发布。',
          '共享给亲友前，建议先完成一轮内部核对，避免未确认的数据被过早传播。',
        ],
      },
      {
        title: '发布与共享',
        body: [
          '共享链接更适合浏览、核对和收集反馈，不等于永久公开页面。',
          '如果内容涉及在世亲属、联系方式或其他敏感信息，请先确认访问范围与展示字段。',
        ],
      },
      {
        title: '内容责任',
        body: [
          '录入者应尽量保证人物关系、时间和备注信息来源清楚。',
          '若需要用于正式出版、宗亲会档案或公共传播，建议在系统外再做一次人工复核。',
        ],
      },
    ],
  }
})
</script>

<template>
  <div class="doc-page">
    <main class="doc-shell">
      <router-link to="/" class="doc-back">返回首页</router-link>
      <p class="doc-eyebrow">{{ content.eyebrow }}</p>
      <h1>{{ content.title }}</h1>
      <p class="doc-intro">{{ content.intro }}</p>

      <section v-for="section in content.sections" :key="section.title" class="doc-section">
        <h2>{{ section.title }}</h2>
        <p v-for="item in section.body" :key="item">{{ item }}</p>
      </section>

      <div class="doc-actions">
        <router-link to="/dashboard" class="doc-button doc-button--primary">进入系统</router-link>
        <router-link to="/" class="doc-button">查看首页</router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.doc-page {
  min-height: 100dvh;
  padding: 32px 20px;
  background:
    radial-gradient(circle at top left, rgba(196, 58, 49, 0.1), transparent 20%),
    linear-gradient(180deg, #fbfaf7 0%, #f2eee6 100%);
}

.doc-shell {
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 32px;
  border-radius: 28px;
  border: 1px solid rgba(20, 19, 18, 0.08);
  background: rgba(249, 248, 245, 0.88);
  box-shadow: 0 24px 48px rgba(20, 19, 18, 0.08);
  backdrop-filter: blur(16px);
}

.doc-back,
.doc-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.doc-back {
  margin-bottom: 24px;
}

.doc-eyebrow {
  margin-bottom: 14px;
}

.doc-shell h1 {
  margin-bottom: 14px;
  font-size: clamp(2.4rem, 6vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.doc-intro,
.doc-section p {
  max-width: 60ch;
  color: var(--color-neutral-7);
  line-height: 1.85;
}

.doc-section {
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid rgba(20, 19, 18, 0.08);
}

.doc-section h2 {
  margin-bottom: 12px;
  font-size: var(--text-title-24);
}

.doc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}

.doc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(20, 19, 18, 0.08);
  background: rgba(255, 255, 255, 0.56);
  color: var(--color-neutral-8);
}

.doc-button--primary {
  border-color: transparent;
  background: linear-gradient(145deg, #d15e56, var(--color-accent));
  color: #fff;
}

@media (max-width: 640px) {
  .doc-page {
    padding: 16px 12px 24px;
  }

  .doc-shell {
    padding: 24px 18px;
    border-radius: 22px;
  }

  .doc-actions > * {
    flex: 1 1 100%;
  }
}
</style>
