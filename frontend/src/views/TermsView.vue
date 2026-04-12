<!--
  NOTE FOR DEPLOYERS: This file contains terms specific to the original deployment
  (timetable.xjtlu.uk). If you're running your own instance, replace this file
  with your own terms of service and privacy policy, including your contact email.
-->
<template>
  <div class="terms-page">
    <div class="page-toolbar">
      <router-link to="/" class="back-link">← 返回</router-link>
      <h1 class="page-title">用户协议与隐私政策</h1>
    </div>

    <div class="terms-body">
      <p class="terms-meta">生效日期：2026 年 4 月 12 日</p>
      <p class="terms-intro">
        请在使用 XJTLU 课表系统（以下简称"本服务"）前仔细阅读本协议。
        <strong>注册账号或继续使用本服务，即视为您已阅读、理解并同意受本协议全部条款约束。如您不同意，请立即停止使用并注销账号。</strong>
      </p>

      <h2>一、服务性质与免责声明</h2>
      <p>本服务是由个人开发者独立开发、运营的课表辅助工具，<strong>与西交利物浦大学（XJTLU）官方不存在任何隶属、授权或合作关系</strong>，与 e-Bridge、学校教务系统及任何官方平台亦无正式关联。</p>
      <p><strong>本服务以"现状"（AS IS）及"现有"（AS AVAILABLE）形式提供，开发者不就以下事项作任何明示或暗示的陈述、保证或承诺：</strong></p>
      <ul>
        <li>服务的持续可用性、无中断或无错误；</li>
        <li>课表数据的完整性、准确性或与 e-Bridge 官方数据的实时一致性；</li>
        <li>因 e-Bridge 系统升级或接口变动导致的功能失效可被及时修复；</li>
        <li>数据不因不可抗力（服务器故障、网络攻击、自然灾害等）而丢失。</li>
      </ul>
      <p><strong>课表数据以 e-Bridge 及学校官方系统公布的信息为唯一权威依据。</strong>本服务展示的内容仅供个人参考，不具备任何法律效力，不得用于考勤、考试安排、成绩证明或任何正式场合。因使用或信赖本服务所展示数据而产生的一切后果，由用户自行承担。</p>
      <p>在适用法律允许的最大范围内，开发者对因使用或无法使用本服务而导致的任何直接、间接、附带、特殊、惩罚性或后果性损失（包括但不限于数据丢失、业务中断、预期利益损失等）概不承担法律责任，无论该等损失基于何种法律理论，亦无论开发者是否已被告知该等损失发生的可能性。</p>

      <h2>二、适用对象与账号管理</h2>
      <p>本服务主要面向西交利物浦大学在校学生。注册须使用有效邮箱，并由您自行妥善保管登录凭证。您对该账号下发生的一切操作负完全责任；账号不得转让、出租或以任何方式共享。</p>
      <p>如发生以下情形，开发者有权在不事先通知的情况下暂停或永久终止您的账号访问权限：</p>
      <ul>
        <li>违反本协议任何条款；</li>
        <li>账号存在异常访问行为或遭滥用；</li>
        <li>本服务停止运营。</li>
      </ul>

      <h2>三、数据收集与隐私保护</h2>
      <p>透明度是本服务重视的核心原则。本章节详述本服务收集的所有数据类型、用途及保留期限，不存在任何隐性数据采集行为。</p>

      <h3>3.1 您主动提供或因使用本服务产生的数据</h3>
      <table class="data-table">
        <thead>
          <tr><th>数据</th><th>用途</th><th>存储方式</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>注册邮箱</td>
            <td>账号标识与登录</td>
            <td>服务器数据库</td>
          </tr>
          <tr>
            <td>密码</td>
            <td>身份验证</td>
            <td>经 bcrypt 不可逆哈希后存储，开发者无法读取原始密码</td>
          </tr>
          <tr>
            <td>课表数据（课程代码、时间、地点、教师等）及数据校验值（去重用途）</td>
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
            <td>好友列表显示名称</td>
            <td>服务器数据库</td>
          </tr>
          <tr>
            <td>访问日志（登录记录及 iCal 拉取记录）</td>
            <td>安全审计，供您在"设置"页面核查是否存在异常访问</td>
            <td>服务器数据库；每条记录含访问时间、来源国家/地区、大致城市、网络运营商/机构；用户可在"设置"页面查看本人的访问摘要；自动于 30 天后清除</td>
          </tr>
        </tbody>
      </table>
      <p><strong>重要说明：</strong>课表数据由您通过书签工具从 e-Bridge 页面提取并主动上传，本服务不会、也无法直接访问 e-Bridge 系统或您的学校账号。</p>

      <h3>3.2 Cloudflare 自动收集的数据</h3>
      <p>本站通过 <strong>Cloudflare</strong> 提供网络安全防护（含 DDoS 防御及 Web 应用防火墙），并启用了 <strong>Cloudflare Web Analytics</strong> 进行匿名访问统计。Cloudflare 作为独立第三方服务商，可能在其基础设施层面自动收集以下信息：</p>
      <ul>
        <li>IP 地址：Cloudflare 通过请求头将客户端真实 IP 传递给本服务器。本服务在记录登录及 iCal 访问时会存储该 IP 及国家/地区信息（用户侧展示为脱敏摘要），30 天后自动清除。为补充大致城市及网络运营商信息，本服务采用 <strong>ip.sb</strong>（备用 <strong>ip-api.com</strong>）进行地理位置解析，所获结果仅用于安全审计，并随访问日志于 30 天后自动清除；各服务隐私政策见其官网；</li>
        <li>页面访问路径、访问时间及来源页面；</li>
        <li>大致地理位置（国家/地区级别）。</li>
      </ul>
      <p><strong>关于 Cloudflare Web Analytics：</strong>该功能不使用 Cookie，不跨站追踪用户行为，符合 GDPR。本站通过该功能获取的仅为聚合统计数据（如每日访问量、常用功能分布），无法关联至任何具体个人。Cloudflare 完整隐私政策见 cloudflare.com/privacypolicy。</p>

      <h3>3.3 开发者对您数据的承诺</h3>
      <ul>
        <li><strong>不出售：</strong>您的任何数据不会被出售、交换或以任何方式有偿或无偿转让给第三方；</li>
        <li><strong>不商业化：</strong>课表及个人数据不会用于广告定向、AI 模型训练或任何商业目的；</li>
        <li><strong>不主动联系：</strong>不发送营销邮件或推送通知；</li>
        <li><strong>不超范围使用：</strong>数据仅用于本协议明确说明的功能目的，不作任何其他用途；</li>
        <li><strong>最小化收集：</strong>仅收集功能正常运转所必需的数据。</li>
      </ul>

      <h3>3.4 数据可见性控制</h3>
      <p>您可在首页随时控制课表的可见范围：</p>
      <ul>
        <li><strong>仅自己：</strong>仅登录本人可见；</li>
        <li><strong>好友可见：</strong>仅已建立好友关系的用户可访问。</li>
      </ul>

      <h3>3.5 数据删除</h3>
      <p>您可随时在"设置"页面注销账号，账号及关联数据（课表、好友关系、iCal 订阅令牌等）将被<strong>立即、永久删除，不可恢复</strong>。</p>
      <p>出于安全审计目的，访问日志和登录日志将于 <strong>30 天内自动清除</strong>。该类日志不含课表内容，仅含访问时间、来源地区及访问摘要信息。</p>
      <p>如遇技术问题无法自助删除，请通过本协议末尾联系方式告知，开发者将在 <strong>7 个工作日</strong>内完成处理。</p>

      <h2>四、用户行为规范</h2>
      <p>使用本服务，您不得从事以下行为：</p>
      <ul>
        <li>注册虚假账号或冒充他人身份；</li>
        <li>以自动化脚本、爬虫或任何非正常方式批量访问本服务；</li>
        <li>上传违法、有害、侵权或与课表无关的内容；</li>
        <li>尝试破坏、入侵或干扰服务正常运行；</li>
        <li>利用本服务从事任何违反中国法律法规或学校规定的行为。</li>
      </ul>

      <h2>五、知识产权</h2>
      <p>本服务源代码以 <strong>GNU Affero General Public License v3（AGPLv3）</strong> 协议开源。与常见的 GPL v3 不同，AGPLv3 规定：即便仅以网络服务形式运行（而非对外分发软件包），任何对源码的修改也须同样以 AGPLv3 开源并向服务用户提供获取渠道。本项目源码仓库公开于 GitHub，任何人均可在遵循该协议的前提下自由使用与修改。界面设计、视觉元素及其他非代码内容的著作权归开发者所有，未经授权不得用于商业用途。您上传的课表数据著作权归您本人所有；本服务仅在提供功能所必需的范围内存储和处理上述数据，不主张超出此范围的任何权利。</p>

      <h2>六、协议变更</h2>
      <p>本协议可能随服务功能演进而更新。<strong>重大变更将提前通过网站公告告知；继续使用本服务将视为接受变更后的协议。</strong>建议您定期查阅本页面以了解最新条款。</p>

      <h2>七、联系方式</h2>
      <p>如有疑问、数据删除申请或其他事宜，请发送邮件至：<strong>tingkailyu@icloud.com</strong></p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.terms-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4) var(--sp-10);
}

.page-toolbar {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: var(--sp-6);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--border);
}
.back-link {
  display: inline-flex;
  align-items: center;
  font-size: var(--text-sm);
  color: var(--text-3);
  text-decoration: none;
  white-space: nowrap;
  padding: 3px var(--sp-3) 3px 0;
  margin-right: var(--sp-3);
  border-right: 1px solid var(--border);
  transition: color 0.12s;
}
.back-link:hover { color: var(--accent); }
.page-title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.01em;
  padding-left: var(--sp-3);
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
