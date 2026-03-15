<template>
  <div class="friends-page">

    <div class="page-toolbar">
      <h1 class="page-title">好友</h1>
    </div>

    <div class="friends-layout">

      <!-- 左列：管理 -->
      <div class="friends-col">

        <!-- 我的好友码 -->
        <section class="friends-section">
          <h2 class="section-title">我的好友码</h2>
          <p class="section-desc">将好友码发给同学，让对方在此页面添加你。</p>
          <div class="code-row">
            <span class="my-code">{{ myId }}</span>
            <button class="btn btn-secondary" @click="copyMyCode">
              {{ codeCopied ? '✓ 已复制' : '复制' }}
            </button>
          </div>
        </section>

        <!-- 添加好友 -->
        <section class="friends-section">
          <h2 class="section-title">添加好友</h2>
          <div class="add-row">
            <input
              v-model="addInput"
              class="field-input add-input"
              placeholder="输入对方 15 位好友码"
              :disabled="adding"
              @keydown.enter="sendRequest"
            />
            <button
              class="btn btn-primary"
              :disabled="!addInput.trim() || adding"
              @click="sendRequest"
            >
              {{ adding ? '发送中…' : '发送申请' }}
            </button>
          </div>
          <p v-if="addError" class="msg-error add-msg">{{ addError }}</p>
          <p v-if="addOk"    class="msg-success add-msg">{{ addOk }}</p>
        </section>

      </div>

      <!-- 右列：列表 -->
      <div class="friends-col">

        <!-- 初次加载 -->
        <div v-if="listLoading" class="state-msg">加载中…</div>
        <div v-else-if="listError" class="state-msg state-error">{{ listError }}</div>

        <template v-else>

          <!-- 待处理请求 -->
          <section v-if="incoming.length || outgoing.length" class="friends-section">
            <h2 class="section-title">
              待处理请求
              <span class="badge">{{ incoming.length + outgoing.length }}</span>
            </h2>

            <!-- 收到的 -->
            <template v-if="incoming.length">
              <div class="subsection-label">收到的申请</div>
              <div v-for="f in incoming" :key="f.id" class="friend-row">
                <div class="friend-info">
                  <span class="friend-name">{{ displayName(f, 'from') }}</span>
                  <span class="friend-id">{{ f.expand?.from_user?.email ?? otherId(f) }}</span>
                </div>
                <div class="friend-actions">
                  <button class="btn btn-primary btn-sm" @click="acceptRequest(f)">接受</button>
                  <button class="btn btn-danger  btn-sm" @click="deleteRequest(f)">拒绝</button>
                </div>
              </div>
            </template>

            <!-- 发出的 -->
            <template v-if="outgoing.length">
              <div class="subsection-label">发出的申请（等待对方接受）</div>
              <div v-for="f in outgoing" :key="f.id" class="friend-row">
                <div class="friend-info">
                  <span class="friend-name">{{ displayName(f, 'to') }}</span>
                  <span class="friend-id">{{ f.expand?.to_user?.email ?? otherId(f) }}</span>
                </div>
                <div class="friend-actions">
                  <button class="btn btn-danger btn-sm" @click="deleteRequest(f)">取消</button>
                </div>
              </div>
            </template>
          </section>

          <!-- 好友列表 -->
          <section class="friends-section">
            <h2 class="section-title">
              好友列表
              <span class="badge">{{ friends.length }}</span>
            </h2>

            <div v-if="friends.length === 0" class="panel-empty">
              还没有好友，发送申请或等待对方添加你。
            </div>

            <div v-for="f in friends" :key="f.id" class="friend-row">
              <div class="friend-info">
                <span class="friend-name">{{ displayName(f, 'other') }}</span>
                <span class="friend-id">
                  {{ (f.from_user === myId ? f.expand?.to_user?.email : f.expand?.from_user?.email) ?? otherId(f) }}
                </span>
              </div>
              <div class="friend-actions">
                <template v-if="confirmRemoveId === f.id">
                  <span class="confirm-label">确认删除？</span>
                  <button class="btn btn-danger btn-sm" @click="confirmRemove(f)">是</button>
                  <button class="btn btn-secondary btn-sm" @click="confirmRemoveId = null">否</button>
                </template>
                <template v-else>
                  <router-link
                    :to="`/compare/${otherId(f)}`"
                    class="btn btn-secondary btn-sm"
                  >
                    对比课表
                  </router-link>
                  <button class="btn btn-danger btn-sm" @click="confirmRemoveId = f.id">删除</button>
                </template>
              </div>
            </div>
          </section>

        </template>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import pb from '../lib/pocketbase'

// ── 我的 ID ───────────────────────────────────────────────────────────────
const myId = pb.authStore.model?.id ?? ''

// ── 复制好友码 ────────────────────────────────────────────────────────────
const codeCopied = ref(false)
async function copyMyCode() {
  try {
    await navigator.clipboard.writeText(myId)
    codeCopied.value = true
    setTimeout(() => { codeCopied.value = false }, 2000)
  } catch {
    prompt('请手动复制好友码：', myId)
  }
}

// ── 好友列表加载 ──────────────────────────────────────────────────────────
const listLoading = ref(true)
const listError   = ref('')
const allFriendships = ref([])

async function loadFriendships() {
  listLoading.value = true
  listError.value = ''
  try {
    allFriendships.value = await pb.collection('friendships').getFullList({
      expand: 'from_user,to_user',
      requestKey: null,
    })
  } catch (e) {
    listError.value = e.message
  } finally {
    listLoading.value = false
  }
}

onMounted(loadFriendships)

// ── 计算属性：分类 ────────────────────────────────────────────────────────

/** 收到的待处理（to_user = me, status = pending） */
const incoming = computed(() =>
  allFriendships.value.filter(
    f => f.status === 'pending' && f.to_user === myId
  )
)

/** 发出的待处理（from_user = me, status = pending） */
const outgoing = computed(() =>
  allFriendships.value.filter(
    f => f.status === 'pending' && f.from_user === myId
  )
)

/** 已接受好友 */
const friends = computed(() =>
  allFriendships.value.filter(f => f.status === 'accepted')
)

// ── 展示工具 ──────────────────────────────────────────────────────────────

/** 取非自己一方的 userId */
function otherId(f) {
  return f.from_user === myId ? f.to_user : f.from_user
}

/**
 * 显示名称，优先 name（管理员设置的真实姓名），其次 email，最后 ID 前8位
 * side: 'from' | 'to' | 'other'
 */
function displayName(f, side) {
  let expandedUser
  if (side === 'from')  expandedUser = f.expand?.from_user
  else if (side === 'to') expandedUser = f.expand?.to_user
  else {
    expandedUser = f.from_user === myId
      ? f.expand?.to_user
      : f.expand?.from_user
  }
  if (expandedUser?.name)  return expandedUser.name
  if (expandedUser?.email) return expandedUser.email
  const id = otherId(f)
  return id ? id.slice(0, 8) + '…' : '—'
}

// ── 添加好友 ──────────────────────────────────────────────────────────────
const addInput = ref('')
const adding   = ref(false)
const addError = ref('')
const addOk    = ref('')

async function sendRequest() {
  addError.value = ''
  addOk.value = ''
  const code = addInput.value.trim()

  if (!/^[A-Za-z0-9]{15}$/.test(code)) {
    addError.value = '好友码格式不正确（应为 15 位字母数字）'
    return
  }
  if (code === myId) {
    addError.value = '不能添加自己'
    return
  }

  // 检查是否已是好友或已发送过请求
  const exists = allFriendships.value.some(f =>
    (f.from_user === myId && f.to_user === code) ||
    (f.from_user === code && f.to_user === myId)
  )
  if (exists) {
    addError.value = '已是好友或已发送过申请'
    return
  }

  adding.value = true
  try {
    const record = await pb.collection('friendships').create({
      from_user: myId,
      to_user:   code,
      status:    'pending',
    }, { requestKey: null })
    allFriendships.value.push(record)
    addOk.value = '申请已发送，等待对方接受。'
    addInput.value = ''
  } catch (e) {
    if (e.status === 400) {
      addError.value = '好友码无效，请确认后重试'
    } else {
      addError.value = e.message
    }
  } finally {
    adding.value = false
  }
}

// ── 接受请求 ──────────────────────────────────────────────────────────────
async function acceptRequest(f) {
  try {
    const updated = await pb.collection('friendships').update(
      f.id, { status: 'accepted' }, { requestKey: null }
    )
    // 本地同步更新
    const idx = allFriendships.value.findIndex(x => x.id === f.id)
    if (idx !== -1) {
      allFriendships.value[idx] = { ...allFriendships.value[idx], status: 'accepted' }
    }
  } catch (e) {
    listError.value = e.message
  }
}

// ── 删除/拒绝/取消/解除 ───────────────────────────────────────────────────
async function deleteRequest(f) {
  try {
    await pb.collection('friendships').delete(f.id, { requestKey: null })
    allFriendships.value = allFriendships.value.filter(x => x.id !== f.id)
  } catch (e) {
    listError.value = e.message
  }
}

const confirmRemoveId = ref(null)

async function confirmRemove(f) {
  confirmRemoveId.value = null
  await deleteRequest(f)
}
</script>

<style scoped>
.friends-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4) var(--sp-10);
}

.page-toolbar {
  margin-bottom: var(--sp-6);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Two-column layout */
.friends-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-8);
  align-items: start;
}

@media (max-width: 720px) {
  .friends-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

.friends-col {
  display: flex;
  flex-direction: column;
}

/* Section */
.friends-section {
  padding: var(--sp-5) 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.friends-section:last-child { border-bottom: none; }

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.badge {
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--surface);
  background: var(--text-2);
  border-radius: 2px;
  padding: 1px 5px;
  line-height: 1.4;
}

.section-desc {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.65;
  margin-top: calc(-1 * var(--sp-1));
}

/* My code row */
.code-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.my-code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 3px;
  letter-spacing: 0.04em;
  user-select: all;
}

/* Add friend row */
.add-row {
  display: flex;
  gap: var(--sp-2);
}
.add-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
.add-msg { margin-top: calc(-1 * var(--sp-1)); }

/* Subsection label */
.subsection-label {
  font-size: var(--text-xs);
  color: var(--text-3);
  padding-bottom: var(--sp-1);
  border-bottom: 1px solid var(--border);
  margin-top: var(--sp-1);
}

/* Friend row */
.friend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.friend-row:last-child { border-bottom: none; }

.friend-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.friend-name {
  font-size: var(--text-sm);
  color: var(--text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.friend-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-3);
}

.friend-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}
.confirm-label {
  font-size: var(--text-xs);
  color: var(--red);
  white-space: nowrap;
}

/* Small buttons */
.btn-sm {
  padding: 5px 10px;
  font-size: var(--text-xs);
}

/* States */
.state-msg {
  padding: 40px 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-3);
}
.state-error { color: var(--red); }

.panel-empty {
  font-size: var(--text-sm);
  color: var(--text-3);
  padding: var(--sp-3) 0;
}
</style>
