<template>
  <div class="terms-page">
    <div class="page-toolbar">
      <router-link to="/" class="back-link">← 返回</router-link>
      <h1 class="page-title">用户协议与隐私政策</h1>
    </div>

    <div class="terms-body">
      <p class="terms-meta">生效日期：2026 年 3 月 29 日</p>
      <p class="terms-intro">
        请在使用 XJTLU 课表系统（以下简称"本服务"或"本网站"）前仔细阅读本协议。
        <strong>注册账号或继续使用本服务，即表示你已阅读、理解并同意受本协议全部条款的约束。如不同意，请立即停止使用并注销账号。</strong>
      </p>

      <h2>一、服务性质与免责声明</h2>
      <p>本服务是由个人开发者独立开发和运营的课表辅助工具，<strong>与西交利物浦大学（XJTLU）官方不存在任何隶属、授权或合作关系</strong>。本服务与 e-Bridge、学校教务系统及任何官方平台均无正式关联。</p>
      <p><strong>本服务以"现状"（AS IS）提供，不作任何明示或暗示的保证，包括但不限于：</strong></p>
      <ul>
        <li>不保证服务持续可用、无中断或无错误；</li>
        <li>不保证课表数据的完整性、准确性或与 e-Bridge 官方数据实时一致；</li>
        <li>不保证因 e-Bridge 系统升级或接口变动导致的导入功能失效可被及时修复；</li>
        <li>不保证数据不因不可抗力（服务器故障、网络攻击、自然灾害等）而丢失。</li>
      </ul>
      <p><strong>课表数据以 e-Bridge 及学校官方系统公布的信息为唯一准确依据。</strong> 本服务展示的内容仅供个人参考，不得用于任何正式考勤、考试安排、成绩证明或法律用途。因使用本服务展示的数据而产生的任何后果，由用户自行承担。</p>
      <p>在适用法律允许的最大范围内，开发者对因使用或无法使用本服务而导致的任何直接、间接、附带、特殊或后果性损失（包括数据丢失、业务中断等）不承担责任。</p>

      <h2>二、适用对象与账号</h2>
      <p>本服务主要面向西交利物浦大学在校学生。注册账号须使用有效邮箱，并自行保管密码。你对账号下的一切行为负责。账号不得转让、出租或共享。</p>
      <p>开发者有权在以下情况下暂停或终止你的账号，无需事先通知：</p>
      <ul>
        <li>违反本协议任何条款；</li>
        <li>账号存在异常行为或被滥用；</li>
        <li>服务停止运营。</li>
      </ul>

      <h2>三、数据收集与隐私</h2>
      <p>我们认为你有权利了解网站收集了哪些数据。以下是完整说明。</p>

      <h3>3.1 你主动提供的数据</h3>
      <table class="data-table">
        <thead>
          <tr><th>数据</th><th>用途</th><th>存储方式</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>注册邮箱</td>
            <td>账号标识与登录</td>
            <td>服务器数据库，明文存储</td>
          </tr>
          <tr>
            <td>密码</td>
            <td>身份验证</td>
            <td>经 bcrypt 哈希后存储，不可逆，开发者无法读取</td>
          </tr>
          <tr>
            <td>课表数据（课程代码、时间、地点、教师等）及课表内容哈希（用于同步去重的校验值）</td>
            <td>展示与好友对比功能</td>
            <td>服务器数据库</td>
          </tr>
          <tr>
            <td>好友关系记录</td>
            <td>好友功能</td>
            <td>服务器数据库</td>
          </tr>
          <tr>
            <td>iCal 订阅令牌</td>
            <td>日历订阅功能</td>
            <td>服务器数据库</td>
          </tr>
          <tr>
            <td>昵称（可选）</td>
            <td>好友列表中的显示名称</td>
            <td>服务器数据库</td>
          </tr>
          <tr>
            <td>访问日志（iCal 拉取记录及账号登录记录）</td>
            <td>安全审计，供用户核查是否有异常访问</td>
            <td>服务器数据库；含访问时间、脱敏 IP 段、完整 IP（仅管理员可查）、国家/地区、城市；自动保留 30 天后清除</td>
          </tr>
        </tbody>
      </table>
      <p><strong>重要：</strong>课表数据由你本人通过书签工具从 e-Bridge 页面提取并主动上传，本服务不会也无法直接访问 e-Bridge 系统。</p>

      <h3>3.2 Cloudflare 自动收集的数据</h3>
      <p>本网站通过 <strong>Cloudflare</strong> 提供网络安全防护（包括 DDoS 防御和 Web 应用防火墙），并启用了 <strong>Cloudflare Web Analytics</strong> 进行访问统计。</p>
      <p>Cloudflare 可能自动收集以下信息：</p>
      <ul>
        <li>IP 地址：Cloudflare 通过请求头将客户端真实 IP 传递给本服务器。我们在记录 iCal 订阅访问和账号登录时会存储 IP 地址（完整 IP 仅管理员可查；向用户展示的为脱敏后的 IP 段）及国家/地区信息，用于安全审计，30 天后自动清除。此外，本服务会将 IP 地址发送至 <strong>ip-api.com</strong>（第三方地理位置服务）以查询城市信息，查询结果同样仅用于安全审计、30 天后自动清除；ip-api.com 的隐私政策见 ip-api.com/docs/legal；</li>
        <li>浏览器类型、操作系统；</li>
        <li>页面访问路径、访问时间、来源页面；</li>
        <li>大致地理位置（国家/地区级别）。</li>
      </ul>
      <p><strong>关于 Cloudflare Web Analytics：</strong>本站同时启用了 Cloudflare Web Analytics 进行访问统计。该功能不使用 Cookie，不跨站追踪你的行为，符合 GDPR。本站通过该功能获取的仅为聚合统计数据（如每日访问量、常用页面），无法识别个人身份。Cloudflare 的完整隐私政策见 cloudflare.com/privacypolicy。</p>

      <h3>3.3 我们不会做的事</h3>
      <ul>
        <li>不将你的任何数据出售给第三方；</li>
        <li>不将课表数据用于训练 AI 模型或任何商业目的；</li>
        <li>不发送营销邮件；</li>
        <li>不在未获授权的情况下公开你的个人信息。</li>
      </ul>

      <h3>3.4 数据可见性控制</h3>
      <p>你可以在首页随时设置课表对谁可见：</p>
      <ul>
        <li><strong>仅自己</strong>：只有你本人登录后可见；</li>
        <li><strong>好友可见</strong>：仅已建立好友关系的用户可访问。</li>
      </ul>

      <h3>3.5 数据删除</h3>
      <p>你可以随时在"设置"页面主动注销账号，账号及关联数据（课表、好友关系、iCal 订阅令牌等）将被立即永久删除，不可恢复。出于安全审计目的，访问日志和登录日志将在 30 天内自动清除（日志中不含课表内容，仅有时间戳、IP 段、国家/地区及城市信息）。如遇技术问题无法自助删除，请发送邮件至本协议末尾的联系方式，我们将在 7 个工作日内处理。</p>

      <h2>四、用户行为规范</h2>
      <p>使用本服务，你不得：</p>
      <ul>
        <li>注册虚假账号、冒充他人身份；</li>
        <li>通过自动化脚本、爬虫或任何非正常方式批量访问本服务；</li>
        <li>上传任何违法、有害、侵权或与课表无关的内容；</li>
        <li>尝试破坏、入侵或干扰服务正常运行；</li>
        <li>利用本服务从事任何违反中国法律法规或学校规定的行为。</li>
      </ul>

      <h2>五、知识产权</h2>
      <p>本服务的源代码、界面设计及相关内容由开发者所有，未经授权不得复制或商业使用。你上传的课表数据归你本人所有，本服务仅在功能所需的范围内存储和处理。</p>

      <h2>六、协议变更</h2>
      <p>本协议可能随服务功能变化而更新。重大变更将通过网站公告提前告知。变更后继续使用本服务，视为接受更新后的协议。</p>

      <h2>七、联系方式</h2>
      <p>如有疑问、数据删除申请或其他事宜，请联系：<strong>tingkailyu@icloud.com</strong></p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.terms-page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4) var(--sp-10);
}

.page-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-6);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.back-link {
  font-size: var(--text-sm);
  color: var(--text-3);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.12s;
}
.back-link:hover { color: var(--accent); }
.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.terms-meta {
  font-size: var(--text-xs);
  color: var(--text-3);
  margin-bottom: var(--sp-4);
}
.terms-intro {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.75;
  padding: var(--sp-4);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  margin-bottom: var(--sp-6);
}

.terms-body h2 {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text);
  margin: var(--sp-6) 0 var(--sp-3);
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--border);
}
.terms-body h3 {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  margin: var(--sp-4) 0 var(--sp-2);
}
.terms-body p {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.75;
  margin: 0 0 var(--sp-3);
}
.terms-body ul {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.75;
  padding-left: 18px;
  margin: 0 0 var(--sp-3);
}
.terms-body li { margin-bottom: 4px; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  margin-bottom: var(--sp-4);
}
.data-table th {
  text-align: left;
  padding: 7px 10px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.data-table td {
  padding: 7px 10px;
  color: var(--text-2);
  border: 1px solid var(--border);
  vertical-align: top;
  line-height: 1.55;
}
</style>
