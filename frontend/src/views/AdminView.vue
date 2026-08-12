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
                <td data-label="用户名">
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
                <td class="mono-cell" data-label="邮箱">{{ u.email }}</td>
                <td class="mono-cell dimmed" data-label="ID">{{ u.id }}</td>
                <td data-label="状态">
                  <span
                    class="status-badge"
                    :class="u.is_banned ? (u.restricted_login_allowed ? 'restricted' : 'banned') : 'active'"
                  >
                    {{ u.is_banned ? (u.restricted_login_allowed ? '受限登录' : '完全停用') : '正常' }}
                  </span>
                </td>
                <td class="dimmed" data-label="注册时间">{{ fmtDate(u.created) }}</td>
                <td data-label="操作">
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
                      @click="openBanDialog(u)"
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
                <td class="sem-name" data-label="学期">{{ s.name }}</td>
                <td class="mono-cell" data-label="开始">{{ s.start_date?.slice(0, 10) }}</td>
                <td class="mono-cell" data-label="周数">{{ s.weeks_total }}</td>
                <td data-label="状态">
                  <span v-if="s.is_current" class="status-badge active">当前</span>
                  <button v-else class="btn btn-secondary btn-xs" @click="setCurrentSemester(s)">
                    设为当前
                  </button>
                </td>
                <td data-label="操作">
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

          <!-- 实例信息 -->
          <div class="config-section">
            <div class="config-section-title">实例信息</div>
            <div class="field-group">
              <label class="field-label">实例名称</label>
              <input v-model="siteConfig.instance_name" class="field-input" maxlength="120" />
            </div>
            <div class="field-group">
              <label class="field-label">运营者名称</label>
              <input v-model="siteConfig.operator_name" class="field-input" maxlength="120" placeholder="个人或组织名称" />
            </div>
            <div class="field-group">
              <label class="field-label">运营者联系邮箱</label>
              <input v-model="siteConfig.operator_contact_email" type="email" class="field-input" maxlength="254" placeholder="用于隐私与数据请求" />
            </div>
            <div class="field-group">
              <label class="field-label">本实例源代码地址</label>
              <input v-model="siteConfig.source_code_url" type="url" class="field-input" maxlength="500" />
              <p class="field-hint">如部署了修改版本，应指向向本实例用户提供对应源码的位置。</p>
            </div>
            <div class="field-group">
              <label class="field-label">用户协议 / 隐私政策地址（可选）</label>
              <input v-model="siteConfig.legal_notice_url" type="url" class="field-input" maxlength="500" placeholder="https://example.com/legal" />
              <p class="field-hint">公开运营前应配置由部署者自行撰写并审阅的 HTTP(S) 地址；留空仅显示内置参考模板。</p>
            </div>
            <div class="config-grid">
              <div class="field-group">
                <label class="field-label">当前条款版本（可选）</label>
                <input v-model="siteConfig.legal_notice_version" class="field-input" maxlength="64" placeholder="例如 1.0" />
                <p class="field-hint">独立于协议地址和应用版本；更新后会触发用户重新确认。</p>
              </div>
              <div class="field-group">
                <label class="field-label">最低年龄（0 表示不限制）</label>
                <input v-model.number="siteConfig.minimum_age" type="number" min="0" max="120" class="field-input" />
                <p class="field-hint">只记录用户是否确认达到门槛，不收集出生日期。</p>
              </div>
            </div>
            <div class="config-actions">
              <button class="btn btn-primary btn-sm" :disabled="configSaving" @click="saveSiteConfig">
                {{ configSaving ? '保存中…' : '保存实例信息' }}
              </button>
              <span v-if="configSaved" class="config-saved-tip">已保存 ✓</span>
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
            <div class="field-group">
              <label class="field-label">封禁账号删除后的注册限制（天）</label>
              <input
                v-model.number="siteConfig.blocked_registration_retention_days"
                type="number"
                min="0"
                max="3650"
                class="field-input"
              />
              <p class="field-hint">默认 365 天；0 会关闭此机制并清除现有假名化邮箱指纹。缩短期限会同步缩短现有记录，增加期限只影响新记录。</p>
            </div>
            <div class="field-group">
              <label class="field-label">解除已删除账号的注册限制</label>
              <div class="config-inline-action">
                <input v-model="unblockEmail" type="email" class="field-input" placeholder="输入完整邮箱" />
                <button class="btn btn-secondary btn-sm" :disabled="unblockLoading" @click="removeRegistrationBlock">
                  {{ unblockLoading ? '处理中…' : '解除限制' }}
                </button>
              </div>
              <p v-if="unblockMessage" class="field-hint">{{ unblockMessage }}</p>
              <p class="field-hint">系统不会列出或显示已保存的邮箱指纹；需输入完整邮箱进行匹配。</p>
            </div>
            <div class="config-actions">
              <button class="btn btn-primary btn-sm" :disabled="configSaving" @click="saveSiteConfig">
                {{ configSaving ? '保存中…' : '保存注册设置' }}
              </button>
              <span v-if="configSaved" class="config-saved-tip">已保存 ✓</span>
            </div>
          </div>

          <!-- iCal 风控 -->
          <div class="config-section">
            <div class="config-section-title">iCal 风控</div>
            <div class="config-row">
              <div class="config-row-label">
                <span>启用 iCal 风控</span>
                <span class="config-row-hint">关闭后跳过自动限流和多 IP 异常检测，封禁和已吊销 token 仍会拦截</span>
              </div>
              <label class="toggle-switch">
                <input v-model="siteConfig.ical_risk_enabled" type="checkbox" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="config-row">
              <div class="config-row-label">
                <span>启用请求限流</span>
                <span class="config-row-hint">超过窗口内请求次数后返回 429</span>
              </div>
              <label class="toggle-switch">
                <input v-model="siteConfig.ical_rate_limit_enabled" type="checkbox" :disabled="!siteConfig.ical_risk_enabled" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="config-grid">
              <div class="field-group">
                <label class="field-label">限流窗口（分钟）</label>
                <input v-model.number="siteConfig.ical_rate_window_minutes" type="number" min="1" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">窗口内请求上限</label>
                <input v-model.number="siteConfig.ical_rate_max_requests" type="number" min="1" class="field-input" />
              </div>
            </div>
            <div class="config-row">
              <div class="config-row-label">
                <span>启用多 IP 检测</span>
                <span class="config-row-hint">按 24 小时内不同 IP 前缀数标记可疑或自动吊销</span>
              </div>
              <label class="toggle-switch">
                <input v-model="siteConfig.ical_ip_anomaly_enabled" type="checkbox" :disabled="!siteConfig.ical_risk_enabled" />
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="config-grid">
              <div class="field-group">
                <label class="field-label">可疑 IP 前缀数</label>
                <input v-model.number="siteConfig.ical_suspicious_ip_prefixes" type="number" min="1" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">吊销 IP 前缀数</label>
                <input v-model.number="siteConfig.ical_revoke_ip_prefixes" type="number" min="1" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">可疑宽限（小时）</label>
                <input v-model.number="siteConfig.ical_suspicious_grace_hours" type="number" min="1" class="field-input" />
              </div>
              <div class="field-group">
                <label class="field-label">空日历过渡（小时）</label>
                <input v-model.number="siteConfig.ical_empty_calendar_hours" type="number" min="1" class="field-input" />
              </div>
            </div>
            <div class="config-actions">
              <button class="btn btn-primary btn-sm" :disabled="configSaving" @click="saveSiteConfig">
                {{ configSaving ? '保存中…' : '保存 iCal 风控' }}
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
                <td class="mono-cell" data-label="邀请码">
                  <span class="invite-code-cell">
                    {{ inv.code }}
                    <button class="icon-btn" title="复制" @click="copyInviteCode(inv.code)">⎘</button>
                  </span>
                </td>
                <td class="dimmed" data-label="创建者">{{ inv.expand?.created_by?.name || inv.expand?.created_by?.email || '管理员' }}</td>
                <td class="dimmed" data-label="备注">{{ inv.note || '—' }}</td>
                <td class="mono-cell" data-label="使用">
                  {{ inv.uses }}
                  <span v-if="inv.max_uses > 0" class="text-faded"> / {{ inv.max_uses }}</span>
                  <span v-else class="text-faded"> / ∞</span>
                </td>
                <td class="mono-cell dimmed" data-label="到期">{{ inv.expires_at ? inv.expires_at.slice(0, 10) : '永不过期' }}</td>
                <td data-label="状态">
                  <span class="status-badge" :class="inv.is_active ? 'active' : 'banned'">
                    {{ inv.is_active ? '有效' : '停用' }}
                  </span>
                </td>
                <td data-label="操作">
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
            <!-- 可疑 / 已吊销 Token 汇总（仅 iCal 子 tab） -->
            <div v-if="logsSubTab === 'ical' && suspiciousTokens.length" class="suspicious-tokens-section">
              <h4 class="suspicious-tokens-title">⚠️ 可疑 / 已吊销 Token（{{ suspiciousTokens.length }}）</h4>
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>用户邮箱</th>
                    <th>首次标记时间</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in suspiciousTokens" :key="t.id">
                    <td>{{ t.expand?.user?.email || t.user }}</td>
                    <td class="mono-cell">{{ t.suspicious_at ? fmtLogTime(t.suspicious_at) : '—' }}</td>
                    <td>
                      <span v-if="t.is_revoked" class="badge badge-danger">已吊销</span>
                      <span v-else class="badge badge-warn">可疑</span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" @click="clearTokenRevocation(t.id)">清除标记</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 批量操作栏 -->
            <div v-if="selectedLogIds.size > 0" class="batch-bar">
              <span class="batch-count">已选 {{ selectedLogIds.size }} 条</span>
              <button class="btn btn-danger btn-sm" :disabled="logsDeleting" @click="deleteSelectedLogs">
                {{ logsDeleting ? '删除中…' : '删除所选' }}
              </button>
              <button class="btn btn-secondary btn-sm" @click="selectedLogIds = new Set()">取消选择</button>
            </div>

            <!-- 全量删除筛选结果 -->
            <div v-if="hasLogsFilter && logsTotalItems > 0" class="bulk-delete-bar">
              <span class="bulk-delete-hint">
                <template v-if="logsFilter.email && !logsFilter.ip">用户 <strong>{{ logsFilter.email }}</strong> 共 {{ logsTotalItems }} 条日志</template>
                <template v-else-if="logsFilter.ip && !logsFilter.email">IP <strong>{{ logsFilter.ip }}</strong> 共 {{ logsTotalItems }} 条日志</template>
                <template v-else>当前筛选共 {{ logsTotalItems }} 条日志</template>
              </span>
              <button class="btn btn-danger btn-sm" :disabled="logsDeleting" @click="deleteAllFilteredLogs">
                {{ logsDeleting ? '删除中…' : `全部删除 (${logsTotalItems})` }}
              </button>
            </div>

            <div class="logs-table-wrap">
            <table class="admin-table logs-table">
              <thead>
                <tr>
                  <th class="checkbox-cell">
                    <input
                      ref="selectAllCheckboxRef"
                      type="checkbox"
                      class="log-checkbox"
                      :checked="allCurrentSelected"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th>时间</th>
                  <th>用户邮箱</th>
                  <th>完整 IP</th>
                  <th>国家/地区</th>
                  <th>设备</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="currentPageLogs.length === 0">
                  <td colspan="6" class="empty-cell">暂无日志</td>
                </tr>
                <tr
                  v-for="log in currentPageLogs"
                  :key="log.id"
                  :class="{ 'row-selected': selectedLogIds.has(log.id) }"
                >
                  <td class="checkbox-cell">
                    <input
                      type="checkbox"
                      class="log-checkbox"
                      :checked="selectedLogIds.has(log.id)"
                      @change="toggleSelectLog(log.id)"
                    />
                  </td>
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
                  <td>{{ parseDevice(log.user_agent, logsSubTab) }}</td>
                </tr>
              </tbody>
            </table>
            </div><!-- /logs-table-wrap -->

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
                <td data-label="版本"><span class="version-badge">{{ cl.version }}</span></td>
                <td data-label="标题">{{ cl.title }}</td>
                <td class="mono-cell dimmed" data-label="发布">{{ fmtDate(cl.published_at) }}</td>
                <td data-label="操作">
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
      <div v-if="banModal" class="modal-overlay" @click.self="banModal = false">
        <div class="modal-card">
          <h3 class="modal-title">停用用户 — {{ banTarget?.email }}</h3>
          <p class="field-hint">选择该用户被停用后的登录方式。两种模式都会阻止课表、好友、订阅和账号修改操作。</p>
          <label class="ban-choice" :class="{ selected: !banRestrictedAllowed }">
            <input v-model="banRestrictedAllowed" type="radio" :value="false" />
            <span><strong>完全禁止登录</strong><small>用户无法建立或刷新登录会话。</small></span>
          </label>
          <label class="ban-choice" :class="{ selected: banRestrictedAllowed }">
            <input v-model="banRestrictedAllowed" type="radio" :value="true" />
            <span><strong>允许受限登录</strong><small>用户只能导出数据、永久注销账号或退出登录。</small></span>
          </label>
          <div class="modal-actions">
            <button class="btn btn-secondary" :disabled="banSaving" @click="banModal = false">取消</button>
            <button class="btn btn-danger" :disabled="banSaving" @click="applyBan">
              {{ banSaving ? '保存中…' : '确认停用' }}
            </button>
          </div>
        </div>
      </div>

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
import {
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useAdminChangelogs } from '../composables/useAdminChangelogs'
import { useAdminInvites } from '../composables/useAdminInvites'
import { useAdminLogs } from '../composables/useAdminLogs'
import { useAdminSemesters } from '../composables/useAdminSemesters'
import { useAdminSiteConfig } from '../composables/useAdminSiteConfig'
import { useAdminUsers } from '../composables/useAdminUsers'
import adminPb from '../lib/adminPb'

const RichTextEditor = defineAsyncComponent(
  () => import('../components/RichTextEditor.vue'),
)

const tabs = [
  { key: 'users', label: '用户管理' },
  { key: 'semesters', label: '学期管理' },
  { key: 'invites', label: '邀请码' },
  { key: 'siteConfig', label: '系统设置' },
  { key: 'logs', label: '日志' },
  { key: 'changelogs', label: '公告' },
]
const activeTab = ref('users')
let skipNextTabWatch = false

const {
  applyBan,
  adminSyncTimetable,
  banModal,
  banRestrictedAllowed,
  banSaving,
  banTarget,
  cancelEditName,
  changeEmailError,
  changeEmailLoading,
  changeEmailModal,
  changeEmailTarget,
  changeEmailValue,
  createUser,
  createUserError,
  createUserLoading,
  createUserModal,
  deleteUser,
  doChangeEmail,
  doResetPwd,
  editingName,
  filteredUsers,
  loadUsers,
  newUser,
  openChangeEmail,
  openBanDialog,
  openCreateUser,
  openResetPwd,
  openSyncTimetables,
  removeRegistrationBlock,
  resetPwdError,
  resetPwdLoading,
  resetPwdModal,
  resetPwdTarget,
  resetPwdValue,
  saveName,
  showNewPwd,
  showResetPwd,
  startEditName,
  syncModal,
  syncTargetUser,
  syncTimetables,
  syncTimetablesLoading,
  unblockEmail,
  unblockLoading,
  unblockMessage,
  userSearch,
  users,
  usersError,
  usersLoading,
} = useAdminUsers()

const {
  createSemester,
  createSemesterError,
  createSemesterLoading,
  createSemesterModal,
  deleteSemester,
  loadSemesters,
  newSemester,
  openCreateSemester,
  semesters,
  semestersError,
  semestersLoading,
  setCurrentSemester,
} = useAdminSemesters()

const {
  copyInviteCode,
  createInvite,
  createInviteError,
  createInviteLoading,
  createInviteModal,
  deleteInvite,
  invites,
  invitesError,
  invitesLoading,
  invitePerms,
  invitePermsError,
  invitePermsLoading,
  invitePermsModal,
  invitePermsTarget,
  loadInvites,
  newInvite,
  openCreateInvite,
  openInvitePerms,
  saveInvitePerms,
  toggleInvite,
} = useAdminInvites()

const {
  configError,
  configSaved,
  configSaving,
  currentSemesterName,
  loadSiteConfig,
  loadStats,
  noticeSaved,
  noticeSaving,
  saveNotice,
  saveSiteConfig,
  siteConfig,
  stats,
} = useAdminSiteConfig(semesters)

const {
  LOGS_PER_PAGE,
  allCurrentSelected,
  applyLogsFilter,
  clearLogsFilter,
  clearTokenRevocation,
  currentPageLogs,
  deleteAllFilteredLogs,
  deleteSelectedLogs,
  fmtLogCountry,
  fmtLogTime,
  hasLogsFilter,
  jumpToLogsPage,
  loadLogs,
  loadSuspiciousTokens,
  logsDeleting,
  logsError,
  logsFilter,
  logsJumpInput,
  logsLoading,
  logsPage,
  logsSubTab,
  logsTotalItems,
  logsTotalPages,
  parseDevice,
  quickFilterEmail,
  quickFilterIp,
  selectedLogIds,
  selectAllCheckboxRef,
  someCurrentSelected,
  suspiciousTokens,
  switchLogsTab,
  syncUrlState,
  toggleSelectAll,
  toggleSelectLog,
} = useAdminLogs(activeTab)

const {
  changelogForm,
  changelogModal,
  changelogSaving,
  changelogs,
  changelogsError,
  changelogsLoading,
  deleteChangelog,
  editingChangelog,
  loadChangelogs,
  openChangelogModal,
  saveChangelog,
} = useAdminChangelogs()

const loginEmail = ref('')
const loginPassword = ref('')
const loginLoading = ref(false)
const loginError = ref('')
const isAdminAuthed = ref(adminPb.authStore.isValid)
const openActionMenu = ref(null)

function loadAll() {
  loadUsers()
  loadSemesters()
  loadInvites()
}

async function adminLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    await adminPb.collection('_superusers').authWithPassword(loginEmail.value, loginPassword.value)
    isAdminAuthed.value = true
    loadAll()
    if (activeTab.value === 'logs') loadLogs(1)
    else if (activeTab.value === 'siteConfig') {
      loadSiteConfig()
      loadStats()
    } else if (activeTab.value === 'changelogs') {
      loadChangelogs()
    }
  } catch (error) {
    loginError.value = error.message || '认证失败'
  } finally {
    loginLoading.value = false
  }
}

function adminLogout() {
  adminPb.authStore.clear()
  isAdminAuthed.value = false
}

function closeAllMenus() {
  openActionMenu.value = null
}

watch(activeTab, (tab) => {
  if (skipNextTabWatch) {
    skipNextTabWatch = false
    return
  }
  syncUrlState()
  if (tab === 'users') loadUsers()
  if (tab === 'semesters') loadSemesters()
  if (tab === 'invites') loadInvites()
  if (tab === 'siteConfig') {
    loadSiteConfig()
    loadStats()
  }
  if (tab === 'logs') {
    loadLogs()
    if (logsSubTab.value === 'ical') loadSuspiciousTokens()
  }
  if (tab === 'changelogs') loadChangelogs()
})

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const urlTab = params.get('tab')
  if (params.get('sub')) logsSubTab.value = params.get('sub')
  if (params.get('email')) logsFilter.email = params.get('email')
  if (params.get('ip')) logsFilter.ip = params.get('ip')
  if (params.get('country')) logsFilter.country = params.get('country')
  if (params.get('from')) logsFilter.dateFrom = params.get('from')
  if (params.get('to')) logsFilter.dateTo = params.get('to')
  const initialPage = parseInt(params.get('page')) || 1

  if (urlTab && urlTab !== activeTab.value) {
    skipNextTabWatch = true
    activeTab.value = urlTab
  }

  if (isAdminAuthed.value) {
    loadAll()
    if (activeTab.value === 'logs') {
      loadLogs(initialPage)
      if (logsSubTab.value === 'ical') loadSuspiciousTokens()
    } else if (activeTab.value === 'siteConfig') {
      loadSiteConfig()
      loadStats()
    } else if (activeTab.value === 'changelogs') {
      loadChangelogs()
    }
  }
  document.addEventListener('click', closeAllMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAllMenus)
})

function fmtDate(value) {
  if (!value) return '—'
  return value.slice(0, 10)
}

function fmtDateTime(value) {
  if (!value) return '从未'
  return new Date(value).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
</script>

<style scoped src="../styles/admin-view.css"></style>
