<template>
  <div class="admin-page">

    <!-- ── Login wall ───────────────────────────────────────────────────── -->
    <div v-if="!isAdminAuthed" class="admin-login-wrap">
      <div class="admin-login-card">
        <div class="admin-login-header">
          <div class="admin-badge">ADMIN</div>
          <div class="admin-login-title">管理后台</div>
        </div>
        <form class="admin-login-form" @submit.prevent="adminLogin">
          <div class="field-group">
            <label class="field-label">管理员邮箱</label>
            <input v-model="loginEmail" type="email" class="field-input" required :disabled="loginLoading" />
          </div>
          <div class="field-group">
            <label class="field-label">密码</label>
            <input v-model="loginPassword" type="password" class="field-input" required :disabled="loginLoading" />
          </div>
          <p v-if="loginError" class="msg-error">{{ loginError }}</p>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" :disabled="loginLoading">
            {{ loginLoading ? '验证中…' : '进入管理后台' }}
          </button>
        </form>
      </div>
    </div>

    <!-- ── Admin panel ──────────────────────────────────────────────────── -->
    <template v-else>
      <div class="admin-header">
        <div class="admin-header-inner">
          <div class="admin-header-left">
            <span class="admin-badge">ADMIN</span>
            <span class="admin-header-title">管理后台</span>
          </div>
          <div class="admin-header-right">
            <router-link to="/" class="btn btn-secondary btn-sm">返回主站</router-link>
            <button class="btn btn-danger btn-sm" @click="adminLogout">退出</button>
          </div>
        </div>
      </div>

      <div class="admin-body">

        <!-- Tabs -->
        <div class="admin-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="admin-tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >{{ tab.label }}</button>
        </div>

        <!-- ── Users tab ──────────────────────────────────────────────── -->
        <div v-if="activeTab === 'users'" class="tab-content">

          <div class="tab-toolbar">
            <input
              v-model="userSearch"
              class="field-input search-input"
              placeholder="搜索邮箱或姓名…"
            />
            <button class="btn btn-primary btn-sm" @click="openCreateUser">+ 新建用户</button>
          </div>

          <div v-if="usersLoading" class="state-msg">加载中…</div>
          <div v-else-if="usersError" class="state-msg state-error">{{ usersError }}</div>

          <table v-else class="admin-table">
            <thead>
              <tr>
                <th>用户名 / 昵称</th>
                <th>邮箱</th>
                <th>ID</th>
                <th>状态</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="empty-cell">没有匹配的用户</td>
              </tr>
              <tr
                v-for="u in filteredUsers"
                :key="u.id"
                :class="{ 'row-banned': u.is_banned }"
              >
                <td>
                  <span v-if="editingName[u.id] === undefined" class="name-cell">
                    <span class="name-primary">{{ u.name || '—' }}</span>
                    <span v-if="u.nickname" class="name-nickname">{{ u.nickname }}</span>
                    <button class="icon-btn" title="编辑用户名" @click="startEditName(u)">✏</button>
                  </span>
                  <span v-else class="name-edit">
                    <input
                      v-model="editingName[u.id]"
                      class="field-input name-input"
                      @keydown.enter="saveName(u)"
                      @keydown.escape="cancelEditName(u.id)"
                    />
                    <button class="btn btn-primary btn-xs" @click="saveName(u)">保存</button>
                    <button class="btn btn-secondary btn-xs" @click="cancelEditName(u.id)">取消</button>
                  </span>
                </td>
                <td class="mono-cell">{{ u.email }}</td>
                <td class="mono-cell dimmed">{{ u.id }}</td>
                <td>
                  <span class="status-badge" :class="u.is_banned ? 'banned' : 'active'">
                    {{ u.is_banned ? '已停用' : '正常' }}
                  </span>
                </td>
                <td class="dimmed">{{ fmtDate(u.created) }}</td>
                <td>
                  <div class="action-cell">
                    <router-link :to="`/compare/${u.id}`" class="btn btn-secondary btn-xs" target="_blank">
                      查看课表
                    </router-link>
                    <div class="action-more-wrap" @click.stop>
                      <button class="btn btn-secondary btn-xs" @click="openActionMenu = openActionMenu === u.id ? null : u.id">
                        更多 ▾
                      </button>
                      <div v-if="openActionMenu === u.id" class="action-dropdown">
                        <button @click="openSyncTimetables(u); openActionMenu = null">同步课表</button>
                        <button @click="openChangeEmail(u); openActionMenu = null">改邮箱</button>
                        <button @click="openResetPwd(u); openActionMenu = null">重置密码</button>
                        <button @click="openInvitePerms(u); openActionMenu = null">邀请权限</button>
                      </div>
                    </div>
                    <button
                      class="btn btn-xs"
                      :class="u.is_banned ? 'btn-primary' : 'btn-danger'"
                      @click="toggleBan(u)"
                    >{{ u.is_banned ? '恢复' : '停用' }}</button>
                    <button class="btn btn-danger btn-xs" @click="deleteUser(u)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Semesters tab ──────────────────────────────────────────── -->
        <div v-if="activeTab === 'semesters'" class="tab-content">

          <div class="tab-toolbar">
            <button class="btn btn-primary btn-sm" @click="openCreateSemester">+ 新建学期</button>
          </div>

          <div v-if="semestersLoading" class="state-msg">加载中…</div>
          <div v-else-if="semestersError" class="state-msg state-error">{{ semestersError }}</div>

          <table v-else class="admin-table">
            <thead>
              <tr>
                <th>学期名称</th>
                <th>开始日期</th>
                <th>总周数</th>
                <th>当前学期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="semesters.length === 0">
                <td colspan="5" class="empty-cell">还没有学期数据</td>
              </tr>
              <tr
                v-for="s in semesters"
                :key="s.id"
                :class="{ 'row-current': s.is_current }"
              >
                <td class="sem-name">{{ s.name }}</td>
                <td class="mono-cell">{{ s.start_date?.slice(0, 10) }}</td>
                <td class="mono-cell">{{ s.weeks_total }}</td>
                <td>
                  <span v-if="s.is_current" class="status-badge active">当前</span>
                  <button v-else class="btn btn-secondary btn-xs" @click="setCurrentSemester(s)">
                    设为当前
                  </button>
                </td>
                <td>
                  <div class="action-cell">
                    <button class="btn btn-danger btn-xs" @click="deleteSemester(s)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Site Config tab ────────────────────────────────────── -->
        <div v-if="activeTab === 'siteConfig'" class="tab-content">

          <div v-if="configError" class="msg-error" style="padding:8px 12px;border-radius:3px">{{ configError }}</div>

          <!-- 系统概览 -->
          <div class="config-section">
            <div class="config-section-title">系统概览</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ stats.users ?? '—' }}</div>
                <div class="stat-label">注册用户</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ stats.timetables ?? '—' }}</div>
                <div class="stat-label">课表数量</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ currentSemesterName }}</div>
                <div class="stat-label">当前学期</div>
              </div>
            </div>
          </div>

          <!-- 注册设置 -->
          <div class="config-section">
            <div class="config-section-title">注册设置</div>
            <div class="config-row">
              <div class="config-row-label">
                <span>开放注册</span>
                <span class="config-row-hint">关闭后所有用户无法注册新账号（包括邀请码注册）</span>
              </div>
              <label class="toggle-switch">
                <input v-model="siteConfig.registration_open" type="checkbox" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="config-row">
              <div class="config-row-label">
                <span>需要邀请码</span>
                <span class="config-row-hint">关闭后任何人可直接注册，无需邀请码</span>
              </div>
              <label class="toggle-switch">
                <input v-model="siteConfig.require_invite" type="checkbox" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="field-group">
              <label class="field-label">允许的邮箱后缀（逗号分隔，留空不限制）</label>
              <input v-model="siteConfig.allowed_email_suffixes" class="field-input" placeholder="xjtlu.edu.cn,liverpool.ac.uk" />
              <p class="field-hint">例：xjtlu.edu.cn,liverpool.ac.uk · 仅填写域名，不含 @</p>
            </div>
            <div class="config-actions">
              <button class="btn btn-primary btn-sm" :disabled="configSaving" @click="saveSiteConfig">
                {{ configSaving ? '保存中…' : '保存注册设置' }}
              </button>
              <span v-if="configSaved" class="config-saved-tip">已保存 ✓</span>
            </div>
          </div>

          <!-- 站点公告 -->
          <div class="config-section">
            <div class="config-section-title">站点公告</div>
            <div class="field-group">
              <label class="field-label">公告内容（留空则不显示横幅）</label>
              <textarea v-model="siteConfig.site_notice" class="field-input" rows="3" placeholder="系统维护通知、新功能公告等…" style="resize:vertical" />
            </div>
            <div class="config-actions">
              <button class="btn btn-primary btn-sm" :disabled="noticeSaving" @click="saveNotice">
                {{ noticeSaving ? '保存中…' : '保存公告' }}
              </button>
              <span v-if="noticeSaved" class="config-saved-tip">已保存 ✓</span>
            </div>
          </div>

        </div>

        <!-- ── Invites tab ─────────────────────────────────────────── -->
        <div v-if="activeTab === 'invites'" class="tab-content">

          <div class="tab-toolbar">
            <button class="btn btn-primary btn-sm" @click="openCreateInvite">+ 新建邀请码</button>
          </div>

          <div v-if="invitesLoading" class="state-msg">加载中…</div>
          <div v-else-if="invitesError" class="state-msg state-error">{{ invitesError }}</div>

          <table v-else class="admin-table">
            <thead>
              <tr>
                <th>邀请码</th>
                <th>创建者</th>
                <th>备注</th>
                <th>使用次数</th>
                <th>到期时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="invites.length === 0">
                <td colspan="7" class="empty-cell">暂无邀请码</td>
              </tr>
              <tr v-for="inv in invites" :key="inv.id" :class="{ 'row-banned': !inv.is_active }">
                <td class="mono-cell">
                  <span class="invite-code-cell">
                    {{ inv.code }}
                    <button class="icon-btn" title="复制" @click="copyInviteCode(inv.code)">⎘</button>
                  </span>
                </td>
                <td class="dimmed">{{ inv.expand?.created_by?.name || inv.expand?.created_by?.email || '管理员' }}</td>
                <td class="dimmed">{{ inv.note || '—' }}</td>
                <td class="mono-cell">
                  {{ inv.uses }}
                  <span v-if="inv.max_uses > 0" class="text-faded"> / {{ inv.max_uses }}</span>
                  <span v-else class="text-faded"> / ∞</span>
                </td>
                <td class="mono-cell dimmed">{{ inv.expires_at ? inv.expires_at.slice(0, 10) : '永不过期' }}</td>
                <td>
                  <span class="status-badge" :class="inv.is_active ? 'active' : 'banned'">
                    {{ inv.is_active ? '有效' : '停用' }}
                  </span>
                </td>
                <td>
                  <div class="action-cell">
                    <button
                      class="btn btn-xs"
                      :class="inv.is_active ? 'btn-danger' : 'btn-primary'"
                      @click="toggleInvite(inv)"
                    >{{ inv.is_active ? '停用' : '启用' }}</button>
                    <button class="btn btn-danger btn-xs" @click="deleteInvite(inv)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Logs tab ────────────────────────────────────────────── -->
        <div v-if="activeTab === 'logs'" class="tab-content">

          <div class="tab-toolbar">
            <button
              class="btn btn-sm"
              :class="logsSubTab === 'login' ? 'btn-primary' : 'btn-secondary'"
              @click="switchLogsTab('login')"
            >登录日志</button>
            <button
              class="btn btn-sm"
              :class="logsSubTab === 'ical' ? 'btn-primary' : 'btn-secondary'"
              @click="switchLogsTab('ical')"
            >iCal 访问日志</button>
          </div>

          <!-- Filter bar -->
          <div class="logs-filter-bar">
            <input v-model="logsFilter.email"   class="field-input filter-input" placeholder="邮箱搜索" @keyup.enter="applyLogsFilter" />
            <input v-model="logsFilter.ip"      class="field-input filter-input" placeholder="IP 前缀" @keyup.enter="applyLogsFilter" />
            <input v-model="logsFilter.country" class="field-input filter-input filter-input--xs" placeholder="国家(CN)" maxlength="2" @keyup.enter="applyLogsFilter" />
            <input v-model="logsFilter.dateFrom" type="date" class="field-input filter-input filter-input--date" title="开始日期（上海时区）" />
            <span class="filter-to">至</span>
            <input v-model="logsFilter.dateTo"  type="date" class="field-input filter-input filter-input--date" title="结束日期（上海时区）" />
            <button class="btn btn-primary btn-sm" @click="applyLogsFilter">筛选</button>
            <button v-if="hasLogsFilter" class="btn btn-secondary btn-sm" @click="clearLogsFilter">× 清除</button>
            <span v-if="!logsLoading && logsTotalItems > 0" class="tab-toolbar-hint">共 {{ logsTotalItems }} 条</span>
          </div>

          <div v-if="logsLoading" class="state-msg">加载中…</div>
          <div v-else-if="logsError" class="state-msg state-error">{{ logsError }}</div>

          <template v-else>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>用户邮箱</th>
                  <th>完整 IP</th>
                  <th>地区</th>
                  <th>城市</th>
                  <th>设备</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="currentPageLogs.length === 0">
                  <td colspan="6" class="empty-cell">暂无日志</td>
                </tr>
                <tr v-for="log in currentPageLogs" :key="log.id">
                  <td class="mono-cell">{{ fmtLogTime(log.created) }}</td>
                  <td>
                    <a v-if="log.email" href="#" class="log-filter-link" @click.prevent="quickFilterEmail(log.email)">{{ log.email }}</a>
                    <span v-else>—</span>
                  </td>
                  <td class="mono-cell">
                    <a v-if="log.ip_prefix" href="#" class="log-filter-link" @click.prevent="quickFilterIp(log.ip_prefix)">{{ log.ip_full || '—' }}</a>
                    <span v-else>—</span>
                  </td>
                  <td>{{ fmtLogCountry(log.country) }}</td>
                  <td>{{ log.city || '—' }}</td>
                  <td :title="log.user_agent || ''">{{ parseDevice(log.user_agent, logsSubTab) }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination -->
            <div v-if="logsTotalItems > 0" class="logs-pagination">
              <button class="btn btn-secondary btn-xs" :disabled="logsPage === 1" @click="loadLogs(1)" title="首页">«</button>
              <button class="btn btn-secondary btn-xs" :disabled="logsPage === 1" @click="loadLogs(logsPage - 1)">‹ 上一页</button>
              <span class="logs-page-info">
                {{ (logsPage - 1) * LOGS_PER_PAGE + 1 }}–{{ Math.min(logsPage * LOGS_PER_PAGE, logsTotalItems) }} / {{ logsTotalItems }} 条
              </span>
              <button class="btn btn-secondary btn-xs" :disabled="logsPage === logsTotalPages" @click="loadLogs(logsPage + 1)">下一页 ›</button>
              <button class="btn btn-secondary btn-xs" :disabled="logsPage === logsTotalPages" @click="loadLogs(logsTotalPages)" title="末页">»</button>
              <span v-if="logsTotalPages > 1" class="logs-jump">
                <input v-model.number="logsJumpInput" class="page-jump-input" type="number" placeholder="页" :min="1" :max="logsTotalPages" @keyup.enter="jumpToLogsPage" />
                <button class="btn btn-secondary btn-xs" @click="jumpToLogsPage">Go</button>
              </span>
            </div>
          </template>

        </div>

        <!-- ── Changelogs tab ──────────────────────────────────────── -->
        <div v-if="activeTab === 'changelogs'" class="tab-content">

          <div class="tab-toolbar">
            <button class="btn btn-primary btn-sm" @click="openChangelogModal(null)">+ 新建公告</button>
          </div>

          <div v-if="changelogsLoading" class="state-msg">加载中…</div>
          <div v-else-if="changelogsError" class="state-msg state-error">{{ changelogsError }}</div>

          <table v-else class="admin-table">
            <thead>
              <tr>
                <th>版本号</th>
                <th>标题</th>
                <th>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="changelogs.length === 0">
                <td colspan="4" class="empty-cell">暂无公告</td>
              </tr>
              <tr v-for="cl in changelogs" :key="cl.id">
                <td><span class="version-badge">{{ cl.version }}</span></td>
                <td>{{ cl.title }}</td>
                <td class="mono-cell dimmed">{{ fmtDate(cl.published_at) }}</td>
                <td>
                  <div class="action-cell">
                    <button class="btn btn-secondary btn-xs" @click="openChangelogModal(cl)">编辑</button>
                    <button class="btn btn-danger btn-xs" @click="deleteChangelog(cl)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>

      </div><!-- /admin-body -->

      <!-- ── Create User Modal ──────────────────────────────────────────── -->
      <div v-if="createUserModal" class="modal-overlay" @click.self="createUserModal = false">
        <div class="modal-card">
          <h3 class="modal-title">新建用户</h3>
          <div class="field-group">
            <label class="field-label">真实姓名</label>
            <input v-model="newUser.name" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">邮箱</label>
            <input v-model="newUser.email" type="email" class="field-input" required />
          </div>
          <div class="field-group">
            <label class="field-label">初始密码</label>
            <div class="password-row">
              <input v-model="newUser.password" class="field-input" :type="showNewPwd ? 'text' : 'password'" />
              <button type="button" class="btn btn-secondary btn-xs" @click="showNewPwd = !showNewPwd">
                {{ showNewPwd ? '隐藏' : '显示' }}
              </button>
            </div>
            <p class="field-hint">建议告知用户登录后修改密码</p>
          </div>
          <p v-if="createUserError" class="msg-error">{{ createUserError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="createUserModal = false">取消</button>
            <button class="btn btn-primary" :disabled="createUserLoading" @click="createUser">
              {{ createUserLoading ? '创建中…' : '创建' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Change Email Modal ────────────────────────────────────────── -->
      <div v-if="changeEmailModal" class="modal-overlay" @click.self="changeEmailModal = false">
        <div class="modal-card">
          <h3 class="modal-title">更改邮箱 — {{ changeEmailTarget?.email }}</h3>
          <div class="field-group">
            <label class="field-label">新邮箱地址</label>
            <input v-model="changeEmailValue" type="email" class="field-input" />
          </div>
          <p v-if="changeEmailError" class="msg-error">{{ changeEmailError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="changeEmailModal = false">取消</button>
            <button class="btn btn-primary" :disabled="changeEmailLoading" @click="doChangeEmail">
              {{ changeEmailLoading ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Reset Password Modal ──────────────────────────────────────── -->
      <div v-if="resetPwdModal" class="modal-overlay" @click.self="resetPwdModal = false">
        <div class="modal-card">
          <h3 class="modal-title">重置密码 — {{ resetPwdTarget?.email }}</h3>
          <div class="field-group">
            <label class="field-label">新密码</label>
            <div class="password-row">
              <input v-model="resetPwdValue" class="field-input" :type="showResetPwd ? 'text' : 'password'" />
              <button type="button" class="btn btn-secondary btn-xs" @click="showResetPwd = !showResetPwd">
                {{ showResetPwd ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <p class="field-hint" style="color:var(--amber)">密码重置后用户现有会话将立即失效，下次操作时将被强制重新登录并要求修改密码。</p>
          <p v-if="resetPwdError" class="msg-error">{{ resetPwdError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="resetPwdModal = false">取消</button>
            <button class="btn btn-primary" :disabled="resetPwdLoading" @click="doResetPwd">
              {{ resetPwdLoading ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Create Semester Modal ──────────────────────────────────────── -->
      <div v-if="createSemesterModal" class="modal-overlay" @click.self="createSemesterModal = false">
        <div class="modal-card">
          <h3 class="modal-title">新建学期</h3>
          <div class="field-group">
            <label class="field-label">学期名称</label>
            <input v-model="newSemester.name" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">第一周周一日期</label>
            <input v-model="newSemester.start_date" type="date" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">总周数</label>
            <input v-model.number="newSemester.weeks_total" type="number" min="1" max="30" class="field-input" />
          </div>
          <div class="field-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="newSemester.is_current" type="checkbox" />
              设为当前学期
            </label>
          </div>
          <p v-if="createSemesterError" class="msg-error">{{ createSemesterError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="createSemesterModal = false">取消</button>
            <button class="btn btn-primary" :disabled="createSemesterLoading" @click="createSemester">
              {{ createSemesterLoading ? '创建中…' : '创建' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Create Invite Modal ───────────────────────────────────────── -->
      <div v-if="createInviteModal" class="modal-overlay" @click.self="createInviteModal = false">
        <div class="modal-card">
          <h3 class="modal-title">新建邀请码</h3>
          <div class="field-group">
            <label class="field-label">邀请码（留空自动生成）</label>
            <input v-model="newInvite.code" class="field-input" placeholder="如：XJTLU2026" style="font-family:var(--font-mono);text-transform:uppercase" />
          </div>
          <div class="field-group">
            <label class="field-label">最大使用次数（0 = 不限）</label>
            <input v-model.number="newInvite.max_uses" type="number" min="0" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">到期日期（留空不限）</label>
            <input v-model="newInvite.expires_at" type="date" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">备注</label>
            <input v-model="newInvite.note" class="field-input" placeholder="可选说明" />
          </div>
          <p v-if="createInviteError" class="msg-error">{{ createInviteError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="createInviteModal = false">取消</button>
            <button class="btn btn-primary" :disabled="createInviteLoading" @click="createInvite">
              {{ createInviteLoading ? '创建中…' : '创建' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Invite Permissions Modal ──────────────────────────────────── -->
      <div v-if="invitePermsModal" class="modal-overlay" @click.self="invitePermsModal = false">
        <div class="modal-card">
          <h3 class="modal-title">邀请权限 — {{ invitePermsTarget?.name || invitePermsTarget?.email }}</h3>
          <div class="field-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="invitePerms.can_invite" type="checkbox" />
              允许该用户创建邀请码
            </label>
          </div>
          <template v-if="invitePerms.can_invite">
            <div class="field-group">
              <label class="field-label">可创建邀请码上限（0 = 不限）</label>
              <input v-model.number="invitePerms.invite_quota" type="number" min="0" class="field-input" />
            </div>
            <div class="field-group">
              <label class="field-label">默认有效天数（0 = 不限）</label>
              <input v-model.number="invitePerms.invite_validity_days" type="number" min="0" class="field-input" />
            </div>
            <div class="field-group">
              <label class="field-label">默认每码最大使用次数（0 = 不限）</label>
              <input v-model.number="invitePerms.invite_max_uses" type="number" min="0" class="field-input" />
            </div>
          </template>
          <p v-if="invitePermsError" class="msg-error">{{ invitePermsError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="invitePermsModal = false">取消</button>
            <button class="btn btn-primary" :disabled="invitePermsLoading" @click="saveInvitePerms">
              {{ invitePermsLoading ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Changelog Modal ────────────────────────────────────────── -->
      <div v-if="changelogModal" class="modal-overlay" @click.self="changelogModal = false">
        <div class="modal-card modal-card-lg">
          <h3 class="modal-title">{{ editingChangelog ? '编辑公告' : '新建公告' }}</h3>
          <div class="field-group">
            <label class="field-label">版本号</label>
            <input v-model="changelogForm.version" class="field-input" placeholder="例：v1.3.0" />
          </div>
          <div class="field-group">
            <label class="field-label">标题</label>
            <input v-model="changelogForm.title" class="field-input" placeholder="简短描述本次更新" />
          </div>
          <div class="field-group">
            <label class="field-label">发布时间</label>
            <input v-model="changelogForm.published_at" type="date" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">内容</label>
            <RichTextEditor v-model="changelogForm.content" />
          </div>
          <p v-if="changelogsError" class="msg-error">{{ changelogsError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="changelogModal = false">取消</button>
            <button class="btn btn-primary" :disabled="changelogSaving" @click="saveChangelog">
              {{ changelogSaving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Sync timetables modal ──────────────────────────────────────── -->
      <div v-if="syncModal" class="modal-overlay" @click.self="syncModal = false">
        <div class="modal-card modal-card-sync">
          <h3 class="modal-title">同步课表</h3>
          <div class="sync-modal-user">{{ syncTargetUser?.email }}</div>
          <div v-if="syncTimetablesLoading" class="state-msg">加载课表列表…</div>
          <div v-else-if="syncTimetables.length === 0" class="state-msg">该用户没有课表</div>
          <table v-else class="admin-table sync-modal-table">
            <thead>
              <tr>
                <th>课表名称</th>
                <th>课程数</th>
                <th>最后同步</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tt in syncTimetables" :key="tt.id">
                <td>{{ tt.label || '（未命名）' }}</td>
                <td class="mono-cell">{{ tt.courseCount ?? '—' }}</td>
                <td class="mono-cell dimmed">{{ fmtDateTime(tt.last_synced) }}</td>
                <td class="sync-action-cell">
                  <span v-if="!tt.hash" class="dimmed" style="font-size:var(--text-xs)">无 HASH</span>
                  <template v-else>
                    <button
                      class="btn btn-primary btn-xs"
                      :disabled="tt._syncing"
                      @click="adminSyncTimetable(tt)"
                    >{{ tt._syncing ? '同步中…' : '同步' }}</button>
                    <div v-if="tt._syncMsg" class="sync-result" :class="tt._syncError ? 'sync-error' : 'sync-ok'">
                      {{ tt._syncMsg }}
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="syncModal = false">关闭</button>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, onUnmounted } from 'vue'
import adminPb from '../lib/adminPb'
import RichTextEditor from '../components/RichTextEditor.vue'
import { syncTimetable } from '../utils/timetableSync'

// ── Admin auth ────────────────────────────────────────────────────────────
const loginEmail    = ref('')
const loginPassword = ref('')
const loginLoading  = ref(false)
const loginError    = ref('')
const isAdminAuthed = ref(adminPb.authStore.isValid)

async function adminLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    await adminPb.collection('_superusers').authWithPassword(loginEmail.value, loginPassword.value)
    isAdminAuthed.value = true
    loadAll()
  } catch (e) {
    loginError.value = e.message || '认证失败'
  } finally {
    loginLoading.value = false
  }
}

// ── Action dropdown (more menu) ───────────────────────────────────────────
const openActionMenu = ref(null)
function closeAllMenus() { openActionMenu.value = null }
onMounted(() => {
  if (isAdminAuthed.value) loadAll()
  document.addEventListener('click', closeAllMenus)
})
onUnmounted(() => {
  document.removeEventListener('click', closeAllMenus)
})

function adminLogout() {
  adminPb.authStore.clear()
  isAdminAuthed.value = false
}

// ── Tabs ──────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'users',      label: '用户管理' },
  { key: 'semesters',  label: '学期管理' },
  { key: 'invites',    label: '邀请码' },
  { key: 'siteConfig', label: '系统设置' },
  { key: 'logs',       label: '日志' },
  { key: 'changelogs', label: '公告' },
]
const activeTab = ref('users')

watch(activeTab, (tab) => {
  if (tab === 'users')      loadUsers()
  if (tab === 'semesters')  loadSemesters()
  if (tab === 'invites')    loadInvites()
  if (tab === 'siteConfig') { loadSiteConfig(); loadStats() }
  if (tab === 'logs')       loadLogs()
  if (tab === 'changelogs') loadChangelogs()
})

function loadAll() {
  loadUsers()
  loadSemesters()
  loadInvites()
}

// ── Users ─────────────────────────────────────────────────────────────────
const users        = ref([])
const usersLoading = ref(false)
const usersError   = ref('')
const userSearch   = ref('')

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    u.email?.toLowerCase().includes(q) ||
    u.name?.toLowerCase().includes(q) ||
    u.nickname?.toLowerCase().includes(q)
  )
})

async function loadUsers() {
  usersLoading.value = true
  usersError.value = ''
  try {
    users.value = await adminPb.collection('users').getFullList({
      sort: '-created',
      requestKey: null,
    })
  } catch (e) {
    usersError.value = e.message
  } finally {
    usersLoading.value = false
  }
}

// Inline name editing
const editingName = reactive({})

function startEditName(u) {
  editingName[u.id] = u.name || ''
}
function cancelEditName(id) {
  delete editingName[id]
}
async function saveName(u) {
  const newName = editingName[u.id]?.trim() ?? ''
  try {
    await adminPb.collection('users').update(u.id, { name: newName }, { requestKey: null })
    u.name = newName
    delete editingName[u.id]
  } catch (e) {
    usersError.value = e.message
  }
}

async function toggleBan(u) {
  const action = u.is_banned ? '恢复' : '停用'
  if (!confirm(`确定要${action}用户 ${u.email} 吗？`)) return
  try {
    await adminPb.collection('users').update(u.id, { is_banned: !u.is_banned }, { requestKey: null })
    u.is_banned = !u.is_banned
  } catch (e) {
    usersError.value = e.message
  }
}

async function deleteUser(u) {
  if (!confirm(`永久删除用户 ${u.email}？此操作不可撤回，该用户所有课表和好友数据也将一并删除。`)) return
  try {
    await adminPb.collection('users').delete(u.id, { requestKey: null })
    users.value = users.value.filter(x => x.id !== u.id)
  } catch (e) {
    usersError.value = e.message
  }
}

// ── Sync timetables modal ─────────────────────────────────────────────────
const syncModal              = ref(false)
const syncTargetUser         = ref(null)
const syncTimetables         = ref([])
const syncTimetablesLoading  = ref(false)

async function openSyncTimetables(u) {
  syncTargetUser.value = u
  syncTimetables.value = []
  syncModal.value = true
  syncTimetablesLoading.value = true
  try {
    const tts = await adminPb.collection('timetables').getFullList({
      filter: `user = "${u.id}"`,
      sort: '-created',
      requestKey: null,
    })
    // 获取每个课表的课程数
    for (const tt of tts) {
      try {
        const res = await adminPb.collection('courses').getList(1, 1, {
          filter: `timetable = "${tt.id}"`,
          requestKey: null,
        })
        tt.courseCount = res.totalItems
      } catch { tt.courseCount = '?' }
      tt._syncing  = false
      tt._syncMsg  = ''
      tt._syncError = false
    }
    syncTimetables.value = tts
  } catch (e) {
    usersError.value = e.message
    syncModal.value = false
  } finally {
    syncTimetablesLoading.value = false
  }
}

async function adminSyncTimetable(tt) {
  tt._syncing  = true
  tt._syncMsg  = ''
  tt._syncError = false
  try {
    const { total, added, updated, removed } = await syncTimetable(adminPb, tt.id, tt.hash)
    const parts = []
    if (added   > 0) parts.push(`新增 ${added} 门`)
    if (updated > 0) parts.push(`更新 ${updated} 门`)
    if (removed > 0) parts.push(`删除 ${removed} 门`)
    tt._syncMsg = parts.length ? `${parts.join('，')}（共 ${total} 门）` : `无变更（共 ${total} 门）`
    // 刷新课程数和同步时间
    tt.courseCount = total - removed + added
    tt.last_synced = new Date().toISOString()
  } catch (e) {
    tt._syncError = true
    tt._syncMsg   = e.message || '同步失败'
  } finally {
    tt._syncing = false
  }
}

// Change email modal
const changeEmailModal   = ref(false)
const changeEmailLoading = ref(false)
const changeEmailError   = ref('')
const changeEmailValue   = ref('')
const changeEmailTarget  = ref(null)

function openChangeEmail(u) {
  changeEmailTarget.value = u
  changeEmailValue.value = u.email
  changeEmailError.value = ''
  changeEmailModal.value = true
}

async function doChangeEmail() {
  changeEmailError.value = ''
  const newEmail = changeEmailValue.value.trim()
  if (!newEmail || !newEmail.includes('@')) {
    changeEmailError.value = '请输入有效的邮箱地址'
    return
  }
  changeEmailLoading.value = true
  try {
    await adminPb.collection('users').update(
      changeEmailTarget.value.id,
      { email: newEmail, emailVisibility: true },
      { requestKey: null }
    )
    changeEmailTarget.value.email = newEmail
    changeEmailModal.value = false
  } catch (e) {
    changeEmailError.value = e.message
  } finally {
    changeEmailLoading.value = false
  }
}

// Reset password modal
const resetPwdModal   = ref(false)
const resetPwdLoading = ref(false)
const resetPwdError   = ref('')
const resetPwdValue   = ref('')
const showResetPwd    = ref(false)
const resetPwdTarget  = ref(null)

function openResetPwd(u) {
  resetPwdTarget.value = u
  resetPwdValue.value = ''
  resetPwdError.value = ''
  showResetPwd.value = false
  resetPwdModal.value = true
}

async function doResetPwd() {
  resetPwdError.value = ''
  if (resetPwdValue.value.length < 8) {
    resetPwdError.value = '密码至少 8 位'
    return
  }
  resetPwdLoading.value = true
  try {
    await adminPb.collection('users').update(
      resetPwdTarget.value.id,
      { password: resetPwdValue.value, passwordConfirm: resetPwdValue.value, must_change_pwd: true },
      { requestKey: null }
    )
    resetPwdModal.value = false
  } catch (e) {
    resetPwdError.value = e.message
  } finally {
    resetPwdLoading.value = false
  }
}

// Create user modal
const createUserModal   = ref(false)
const createUserLoading = ref(false)
const createUserError   = ref('')
const showNewPwd        = ref(false)
const newUser = reactive({ name: '', email: '', password: '' })

function openCreateUser() {
  Object.assign(newUser, { name: '', email: '', password: '' })
  createUserError.value = ''
  showNewPwd.value = false
  createUserModal.value = true
}

async function createUser() {
  createUserError.value = ''
  if (!newUser.email || !newUser.password) {
    createUserError.value = '邮箱和密码不能为空'
    return
  }
  createUserLoading.value = true
  try {
    const record = await adminPb.collection('users').create({
      email:           newUser.email,
      name:            newUser.name,
      password:        newUser.password,
      passwordConfirm: newUser.password,
      emailVisibility: true,
      must_change_pwd: true,
    }, { requestKey: null })
    users.value.unshift(record)
    createUserModal.value = false
  } catch (e) {
    createUserError.value = e.message
  } finally {
    createUserLoading.value = false
  }
}

// ── Semesters ─────────────────────────────────────────────────────────────
const semesters        = ref([])
const semestersLoading = ref(false)
const semestersError   = ref('')

async function loadSemesters() {
  semestersLoading.value = true
  semestersError.value = ''
  try {
    semesters.value = await adminPb.collection('semesters').getFullList({
      sort: '-start_date',
      requestKey: null,
    })
  } catch (e) {
    semestersError.value = e.message
  } finally {
    semestersLoading.value = false
  }
}

async function setCurrentSemester(target) {
  semestersError.value = ''
  try {
    // Unset all others, then set target
    for (const s of semesters.value) {
      if (s.is_current && s.id !== target.id) {
        await adminPb.collection('semesters').update(s.id, { is_current: false }, { requestKey: null })
        s.is_current = false
      }
    }
    await adminPb.collection('semesters').update(target.id, { is_current: true }, { requestKey: null })
    target.is_current = true
  } catch (e) {
    semestersError.value = e.message
  }
}

async function deleteSemester(s) {
  if (!confirm(`删除学期「${s.name}」？`)) return
  try {
    await adminPb.collection('semesters').delete(s.id, { requestKey: null })
    semesters.value = semesters.value.filter(x => x.id !== s.id)
  } catch (e) {
    semestersError.value = e.message
  }
}

// Create semester modal
const createSemesterModal   = ref(false)
const createSemesterLoading = ref(false)
const createSemesterError   = ref('')
const newSemester = reactive({ name: '', start_date: '', weeks_total: 16, is_current: false })

function openCreateSemester() {
  Object.assign(newSemester, { name: '', start_date: '', weeks_total: 16, is_current: false })
  createSemesterError.value = ''
  createSemesterModal.value = true
}

async function createSemester() {
  createSemesterError.value = ''
  if (!newSemester.name || !newSemester.start_date) {
    createSemesterError.value = '学期名称和开始日期不能为空'
    return
  }
  createSemesterLoading.value = true
  try {
    if (newSemester.is_current) {
      for (const s of semesters.value) {
        if (s.is_current) {
          await adminPb.collection('semesters').update(s.id, { is_current: false }, { requestKey: null })
          s.is_current = false
        }
      }
    }
    const record = await adminPb.collection('semesters').create({ ...newSemester }, { requestKey: null })
    semesters.value.unshift(record)
    createSemesterModal.value = false
  } catch (e) {
    createSemesterError.value = e.message
  } finally {
    createSemesterLoading.value = false
  }
}

// ── Invite Codes ──────────────────────────────────────────────────────────
const invites        = ref([])
const invitesLoading = ref(false)
const invitesError   = ref('')

async function loadInvites() {
  invitesLoading.value = true
  invitesError.value = ''
  try {
    invites.value = await adminPb.collection('invite_codes').getFullList({
      sort: '-created',
      expand: 'created_by',
      requestKey: null,
    })
  } catch (e) {
    invitesError.value = e.message
  } finally {
    invitesLoading.value = false
  }
}

async function toggleInvite(inv) {
  try {
    await adminPb.collection('invite_codes').update(inv.id, { is_active: !inv.is_active }, { requestKey: null })
    inv.is_active = !inv.is_active
  } catch (e) {
    invitesError.value = e.message
  }
}

async function deleteInvite(inv) {
  if (!confirm(`删除邀请码「${inv.code}」？`)) return
  try {
    await adminPb.collection('invite_codes').delete(inv.id, { requestKey: null })
    invites.value = invites.value.filter(x => x.id !== inv.id)
  } catch (e) {
    invitesError.value = e.message
  }
}

async function copyInviteCode(code) {
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    prompt('复制邀请码：', code)
  }
}

// Create invite modal
const createInviteModal   = ref(false)
const createInviteLoading = ref(false)
const createInviteError   = ref('')
const newInvite = reactive({ code: '', max_uses: 1, expires_at: '', note: '' })

function openCreateInvite() {
  Object.assign(newInvite, { code: '', max_uses: 1, expires_at: '', note: '' })
  createInviteError.value = ''
  createInviteModal.value = true
}

async function createInvite() {
  createInviteError.value = ''
  createInviteLoading.value = true
  try {
    const payload = {
      max_uses:  newInvite.max_uses,
      note:      newInvite.note || '',
      uses:      0,
      is_active: true,
    }
    if (newInvite.code.trim()) payload.code = newInvite.code.trim().toUpperCase()
    if (newInvite.expires_at) payload.expires_at = newInvite.expires_at + ' 00:00:00.000Z'
    const record = await adminPb.collection('invite_codes').create(payload, { requestKey: null })
    invites.value.unshift(record)
    createInviteModal.value = false
  } catch (e) {
    createInviteError.value = e.message
  } finally {
    createInviteLoading.value = false
  }
}

// Invite permissions modal
const invitePermsModal   = ref(false)
const invitePermsLoading = ref(false)
const invitePermsError   = ref('')
const invitePermsTarget  = ref(null)
const invitePerms = reactive({
  can_invite:          false,
  invite_quota:        0,
  invite_validity_days: 7,
  invite_max_uses:     1,
})

function openInvitePerms(u) {
  invitePermsTarget.value = u
  invitePermsError.value  = ''
  Object.assign(invitePerms, {
    can_invite:           u.can_invite           ?? false,
    invite_quota:         u.invite_quota          ?? 0,
    invite_validity_days: u.invite_validity_days  ?? 7,
    invite_max_uses:      u.invite_max_uses        ?? 1,
  })
  invitePermsModal.value = true
}

async function saveInvitePerms() {
  invitePermsError.value   = ''
  invitePermsLoading.value = true
  try {
    const updated = await adminPb.collection('users').update(
      invitePermsTarget.value.id,
      {
        can_invite:           invitePerms.can_invite,
        invite_quota:         invitePerms.invite_quota,
        invite_validity_days: invitePerms.invite_validity_days,
        invite_max_uses:      invitePerms.invite_max_uses,
      },
      { requestKey: null }
    )
    Object.assign(invitePermsTarget.value, updated)
    invitePermsModal.value = false
  } catch (e) {
    invitePermsError.value = e.message
  } finally {
    invitePermsLoading.value = false
  }
}

// ── Site Config ────────────────────────────────────────────────────────────
const siteConfig   = reactive({ registration_open: true, require_invite: true, allowed_email_suffixes: '', site_notice: '' })
const siteConfigId = ref('')
const configSaving = ref(false)
const noticeSaving = ref(false)
const configSaved  = ref(false)
const noticeSaved  = ref(false)
const configError  = ref('')
const stats        = reactive({ users: null, timetables: null })

const currentSemesterName = computed(() => {
  const cur = semesters.value.find(s => s.is_current)
  return cur ? cur.name : '未设置'
})

async function loadSiteConfig() {
  configError.value = ''
  try {
    const list = await adminPb.collection('site_config').getList(1, 1, { requestKey: null })
    if (list.items.length) {
      const cfg = list.items[0]
      siteConfigId.value = cfg.id
      Object.assign(siteConfig, {
        registration_open:      cfg.registration_open,
        require_invite:         cfg.require_invite,
        allowed_email_suffixes: cfg.allowed_email_suffixes || '',
        site_notice:            cfg.site_notice || '',
      })
    }
  } catch (e) {
    configError.value = e.message
  }
}

async function loadStats() {
  try {
    const [u, t] = await Promise.all([
      adminPb.collection('users').getList(1, 1, { requestKey: null }),
      adminPb.collection('timetables').getList(1, 1, { requestKey: null }),
    ])
    stats.users = u.totalItems
    stats.timetables = t.totalItems
  } catch { /* ignore */ }
}

async function saveSiteConfig() {
  configError.value = ''
  configSaving.value = true
  configSaved.value = false
  try {
    await adminPb.collection('site_config').update(siteConfigId.value, {
      registration_open:      siteConfig.registration_open,
      require_invite:         siteConfig.require_invite,
      allowed_email_suffixes: siteConfig.allowed_email_suffixes,
    }, { requestKey: null })
    configSaved.value = true
    setTimeout(() => { configSaved.value = false }, 2500)
  } catch (e) {
    configError.value = e.message
  } finally {
    configSaving.value = false
  }
}

async function saveNotice() {
  configError.value = ''
  noticeSaving.value = true
  noticeSaved.value = false
  try {
    await adminPb.collection('site_config').update(siteConfigId.value, {
      site_notice: siteConfig.site_notice,
    }, { requestKey: null })
    noticeSaved.value = true
    setTimeout(() => { noticeSaved.value = false }, 2500)
  } catch (e) {
    configError.value = e.message
  } finally {
    noticeSaving.value = false
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
function fmtDateTime(iso) {
  if (!iso) return '从未'
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}

// ── Logs ───────────────────────────────────────────────────────────────────
const LOGS_PER_PAGE   = 50
const logsSubTab      = ref('login')
const currentPageLogs = ref([])
const logsPage        = ref(1)
const logsTotalItems  = ref(0)
const logsTotalPages  = ref(1)
const logsLoading     = ref(false)
const logsError       = ref('')
const logsFilter      = reactive({ email: '', ip: '', country: '', dateFrom: '', dateTo: '' })
const logsJumpInput   = ref(null)

const hasLogsFilter = computed(() =>
  !!(logsFilter.email || logsFilter.ip || logsFilter.country || logsFilter.dateFrom || logsFilter.dateTo)
)

function buildLogsFilter() {
  const parts = []
  const esc = v => v.replace(/"/g, '')
  if (logsFilter.email)    parts.push(`email ~ "${esc(logsFilter.email)}"`)
  if (logsFilter.ip)       parts.push(`ip_prefix ~ "${esc(logsFilter.ip)}"`)
  if (logsFilter.country)  parts.push(`country = "${esc(logsFilter.country).toUpperCase()}"`)
  if (logsFilter.dateFrom) {
    const d = new Date(logsFilter.dateFrom + 'T00:00:00+08:00')
    parts.push(`created >= "${d.toISOString().slice(0, 19).replace('T', ' ')}"`)
  }
  if (logsFilter.dateTo) {
    const d = new Date(logsFilter.dateTo + 'T23:59:59+08:00')
    parts.push(`created <= "${d.toISOString().slice(0, 19).replace('T', ' ')}"`)
  }
  return parts.join(' && ')
}

function applyLogsFilter() { loadLogs(1) }

function clearLogsFilter() {
  logsFilter.email = ''
  logsFilter.ip = ''
  logsFilter.country = ''
  logsFilter.dateFrom = ''
  logsFilter.dateTo = ''
  loadLogs(1)
}

function jumpToLogsPage() {
  const p = logsJumpInput.value
  if (p && p >= 1 && p <= logsTotalPages.value) {
    loadLogs(p)
    logsJumpInput.value = null
  }
}

function quickFilterEmail(email) {
  logsFilter.email = email
  logsFilter.ip = ''
  loadLogs(1)
}

function quickFilterIp(ipPrefix) {
  logsFilter.ip = ipPrefix
  logsFilter.email = ''
  loadLogs(1)
}

const logCountryNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })
function fmtLogCountry(code) {
  if (!code) return '—'
  try { return logCountryNames.of(code) || code } catch { return code }
}
function parseDevice(ua, ctx) {
  if (!ua) return '—'
  if (ctx === 'ical') {
    if (/iPhone|iPad/.test(ua))                            return 'Apple Calendar · iOS'
    if (/Mac OS X/.test(ua))                               return 'Apple Calendar · macOS'
    if (/GoogleCalendarSyncAdapter/.test(ua))              return 'Google Calendar'
    if (/Microsoft Outlook/i.test(ua))                     return 'Outlook'
    if (/Thunderbird/i.test(ua))                           return 'Thunderbird'
    if (/DAVdroid|DAVx5/i.test(ua))                        return 'DAVx5 · Android'
    if (/Fantastical/i.test(ua))                           return 'Fantastical'
    if (/BusyCal/i.test(ua))                               return 'BusyCal'
    return ua.length > 40 ? ua.slice(0, 40) + '…' : ua
  }
  // login context
  let os = ''
  if (/iPhone|iPad/.test(ua))        os = 'iOS'
  else if (/Android/.test(ua))       { const m = ua.match(/Android ([\d.]+)/); os = 'Android' + (m ? ' ' + m[1] : '') }
  else if (/Windows/.test(ua))       os = 'Windows'
  else if (/Mac OS X/.test(ua))      os = 'macOS'
  else if (/Linux/.test(ua))         os = 'Linux'

  let browser = ''
  if (/Edg\//.test(ua))              browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua))   browser = 'Opera'
  else if (/Chrome\//.test(ua))      browser = 'Chrome'
  else if (/Firefox\//.test(ua))     browser = 'Firefox'
  else if (/Safari\//.test(ua))      browser = 'Safari'

  if (browser && os) return browser + ' · ' + os
  if (browser)       return browser
  if (os)            return os
  return ua.length > 30 ? ua.slice(0, 30) + '…' : ua
}

function fmtLogTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

async function loadLogs(page = 1) {
  logsLoading.value = true
  logsError.value = ''
  try {
    const collection = logsSubTab.value === 'login' ? 'login_logs' : 'ical_access_logs'
    const filter = buildLogsFilter()
    const res = await adminPb.collection(collection).getList(page, LOGS_PER_PAGE, {
      sort: '-created',
      ...(filter ? { filter } : {}),
      requestKey: null,
    })
    currentPageLogs.value = res.items
    logsTotalItems.value  = res.totalItems
    logsTotalPages.value  = res.totalPages
    logsPage.value        = page
  } catch (e) {
    logsError.value = e.message
  } finally {
    logsLoading.value = false
  }
}

function switchLogsTab(tab) {
  logsSubTab.value = tab
  logsFilter.email = ''
  logsFilter.ip = ''
  logsFilter.country = ''
  logsFilter.dateFrom = ''
  logsFilter.dateTo = ''
  loadLogs(1)
}

// ── Changelogs ─────────────────────────────────────────────────────────────
const changelogs       = ref([])
const changelogsLoading = ref(false)
const changelogsError   = ref('')
const changelogModal    = ref(false)
const changelogSaving   = ref(false)
const editingChangelog  = ref(null)
const changelogForm     = reactive({ version: '', title: '', published_at: '', content: '' })

async function loadChangelogs() {
  changelogsLoading.value = true
  changelogsError.value = ''
  try {
    changelogs.value = await adminPb.collection('changelogs').getFullList({
      sort: '-published_at', requestKey: null,
    })
  } catch (e) {
    changelogsError.value = e.message
  } finally {
    changelogsLoading.value = false
  }
}

function openChangelogModal(cl) {
  changelogsError.value = ''
  editingChangelog.value = cl
  if (cl) {
    changelogForm.version    = cl.version
    changelogForm.title      = cl.title
    changelogForm.published_at = cl.published_at?.slice(0, 10) ?? ''
    changelogForm.content    = cl.content || ''
  } else {
    changelogForm.version    = ''
    changelogForm.title      = ''
    changelogForm.published_at = new Date().toISOString().slice(0, 10)
    changelogForm.content    = ''
  }
  changelogModal.value = true
}

async function saveChangelog() {
  changelogsError.value = ''
  changelogSaving.value = true
  try {
    const data = {
      version:      changelogForm.version.trim(),
      title:        changelogForm.title.trim(),
      published_at: changelogForm.published_at,
      content:      changelogForm.content,
    }
    if (editingChangelog.value) {
      const updated = await adminPb.collection('changelogs').update(
        editingChangelog.value.id, data, { requestKey: null }
      )
      const idx = changelogs.value.findIndex(c => c.id === editingChangelog.value.id)
      if (idx !== -1) changelogs.value[idx] = updated
    } else {
      const created = await adminPb.collection('changelogs').create(data, { requestKey: null })
      changelogs.value.unshift(created)
    }
    changelogModal.value = false
  } catch (e) {
    changelogsError.value = e.message
  } finally {
    changelogSaving.value = false
  }
}

async function deleteChangelog(cl) {
  if (!confirm(`删除公告「${cl.version} ${cl.title}」？`)) return
  try {
    await adminPb.collection('changelogs').delete(cl.id, { requestKey: null })
    changelogs.value = changelogs.value.filter(c => c.id !== cl.id)
  } catch (e) {
    changelogsError.value = e.message
  }
}
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.admin-page {
  min-height: 100vh;
  background: var(--bg);
}

/* ── Login wall ──────────────────────────────────────────────────────────── */
.admin-login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
}
.admin-login-card {
  width: 100%;
  max-width: 360px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.admin-login-header {
  background: #18181A;
  padding: var(--sp-8) var(--sp-6) var(--sp-6);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
}
.admin-login-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}
.admin-login-form {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* ── Admin badge ─────────────────────────────────────────────────────────── */
.admin-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #fff;
  background: #B83025;
  border-radius: 2px;
  padding: 2px 7px;
  line-height: 1.5;
}

/* ── Admin header ────────────────────────────────────────────────────────── */
.admin-header {
  background: #18181A;
  border-bottom: 1px solid #2C2C2E;
  position: sticky;
  top: 0;
  z-index: 100;
}
.admin-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 var(--sp-4);
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}
.admin-header-left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.admin-header-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: #FFFFFF;
}
.admin-header-right {
  display: flex;
  gap: var(--sp-2);
}

/* ── Body ────────────────────────────────────────────────────────────────── */
.admin-body {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4) var(--sp-10);
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.admin-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--sp-5);
}
.admin-tab {
  background: none;
  border: none;
  padding: var(--sp-2) var(--sp-4);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.12s, border-color 0.12s;
}
.admin-tab:hover  { color: var(--text); }
.admin-tab.active { color: var(--text); border-bottom-color: var(--text); }

/* ── Tab content ─────────────────────────────────────────────────────────── */
.tab-content { display: flex; flex-direction: column; gap: var(--sp-4); }

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.search-input {
  width: 240px;
  font-size: var(--text-sm);
}

/* ── Table ───────────────────────────────────────────────────────────────── */
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.admin-table th {
  text-align: left;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.admin-table td {
  padding: 10px var(--sp-3);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.admin-table tbody tr:last-child td { border-bottom: none; }
.admin-table tbody tr:hover td { background: var(--surface-2); }

.row-banned td { opacity: 0.55; }
.row-current td { background: var(--accent-tint); }

.mono-cell {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}
.dimmed { color: var(--text-3); }
.empty-cell { text-align: center; color: var(--text-3); padding: var(--sp-8) 0; }

.sem-name { font-weight: 500; }

.action-cell {
  display: flex;
  gap: var(--sp-1);
  flex-wrap: nowrap;
}

/* ── Status badge ────────────────────────────────────────────────────────── */
.status-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 2px;
  text-transform: uppercase;
}
.status-badge.active { background: var(--green-bg); color: var(--green); }
.status-badge.banned { background: var(--red-bg);   color: var(--red);   }

/* ── Name inline edit ────────────────────────────────────────────────────── */
.name-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  flex-wrap: wrap;
}
.name-primary {
  font-size: var(--text-sm);
}
.name-nickname {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-style: italic;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-3);
  padding: 2px 3px;
  opacity: 0;
  transition: opacity 0.1s;
}
tr:hover .icon-btn { opacity: 1; }
.name-edit {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
}
.name-input {
  width: 120px;
  padding: 3px 7px;
  font-size: var(--text-sm);
}

/* ── Button sizes ────────────────────────────────────────────────────────── */
.btn-sm  { padding: 5px 10px; font-size: var(--text-xs); }
.btn-xs  { padding: 3px 8px;  font-size: var(--text-xs); }

/* ── Modal ───────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  z-index: 200;
}
.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: var(--sp-6);
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.modal-card-lg {
  max-width: 700px;
}
.version-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  background: var(--accent);
  color: #fff;
  padding: 2px 8px;
  border-radius: 3px;
  flex-shrink: 0;
}
.modal-title {
  font-size: var(--text-md);
  font-weight: 700;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

/* Field helpers */
.field-group { display: flex; flex-direction: column; gap: 5px; }
.field-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field-hint { font-size: var(--text-xs); color: var(--text-3); }
.password-row { display: flex; gap: var(--sp-2); align-items: center; }
.password-row .field-input { flex: 1; }

.checkbox-group { flex-direction: row; align-items: center; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-sm);
  color: var(--text);
  cursor: pointer;
}

/* State */
.state-msg { padding: var(--sp-8) 0; text-align: center; font-size: var(--text-sm); color: var(--text-3); }
.state-error { color: var(--red); }

/* ── Config sections ─────────────────────────────────────────────────────── */
.config-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.config-section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text);
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--border);
}
.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}
.config-row-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text);
}
.config-row-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  font-weight: 400;
}
.config-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.config-saved-tip {
  font-size: var(--text-xs);
  color: var(--green);
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
}
.stat-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: var(--sp-4);
  text-align: center;
}
.stat-value {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-top: var(--sp-1);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-flex;
  cursor: pointer;
  flex-shrink: 0;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.toggle-track {
  display: block;
  width: 38px;
  height: 20px;
  background: var(--border);
  border-radius: 10px;
  transition: background 0.2s;
  position: relative;
}
.toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-track { background: var(--accent); }
.toggle-switch input:checked + .toggle-track::after { transform: translateX(18px); }

/* Invite codes */
.invite-code-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--text-sm);
  letter-spacing: 0.06em;
}
.text-faded { color: var(--text-3); }

/* Logs filter & pagination */
.tab-toolbar-hint {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-left: auto;
}
.logs-filter-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.filter-input {
  height: 32px;
  font-size: var(--text-sm);
  padding: 0 var(--sp-3);
  width: 160px;
}
.filter-input--xs   { width: 72px; }
.filter-input--date { width: 140px; }
.filter-to {
  font-size: var(--text-sm);
  color: var(--text-3);
}
.log-filter-link {
  color: inherit;
  text-decoration: none;
}
.log-filter-link:hover { text-decoration: underline; color: var(--accent); }

.logs-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-4) 0 var(--sp-2);
  flex-wrap: wrap;
}
.logs-page-info {
  font-size: var(--text-sm);
  color: var(--text-2);
  font-family: var(--font-mono);
  min-width: 160px;
  text-align: center;
}
.logs-jump {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-left: var(--sp-2);
}
.page-jump-input {
  width: 56px;
  height: 28px;
  font-size: var(--text-sm);
  padding: 0 var(--sp-2);
  text-align: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-1);
}
.page-jump-input::-webkit-inner-spin-button,
.page-jump-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.page-jump-input[type=number] { -moz-appearance: textfield; }
/* ── Action more dropdown ────────────────────────────────────────────────── */
.action-more-wrap {
  position: relative;
}
.action-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 110px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.action-dropdown button {
  background: none;
  border: none;
  text-align: left;
  padding: 7px 14px;
  font-size: var(--text-xs);
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
}
.action-dropdown button:hover {
  background: var(--surface-2, var(--border));
}

/* ── Sync modal ──────────────────────────────────────────────────────────── */
.modal-card-sync {
  max-width: 600px;
}
.sync-modal-user {
  font-size: var(--text-sm);
  color: var(--text-2);
  font-family: var(--font-mono);
  margin-top: -8px;
}
.sync-modal-table {
  margin-bottom: 0;
}
.sync-action-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.sync-result {
  font-size: var(--text-xs);
}
.sync-ok    { color: var(--green); }
.sync-error { color: var(--red);   }
</style>
