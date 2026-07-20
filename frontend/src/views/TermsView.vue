<template>
  <div class="terms-page">
    <div class="page-toolbar">
      <router-link to="/" class="back-link">← 返回</router-link>
      <h1 class="page-title">《用户协议与隐私政策》</h1>
    </div>

    <div class="terms-body">
      <p class="terms-meta">通用模板 · 部署者应根据实际运营情况审阅并更新</p>
      <p class="terms-intro">
        请在使用 {{ instanceConfig.instance_name }}（以下简称“本服务”）前仔细阅读本协议。
        <strong>注册账号或继续使用本服务，即视为您已阅读、理解并同意受本协议全部条款约束。如您不同意，请立即停止使用并注销账号。</strong>
      </p>
      <p class="terms-notice">
        本页面是项目附带的通用信息模板，旨在帮助部署者透明说明当前处理实践，不构成法律意见，也不表示或保证任何部署实例完全符合 UK GDPR 或其他法律。项目和实例运营者应根据适用要求持续审视并改进相关实践。实际服务由
        <strong>{{ instanceConfig.operator_name || '本实例部署者' }}</strong>
        运营，部署者有责任确保本页面与其域名、基础设施、数据处理活动和适用法律一致。
      </p>

      <h2>一、服务性质与免责声明</h2>
      <p>本服务是独立部署的课表辅助工具，<strong>与西交利物浦大学（XJTLU）官方不存在任何隶属、授权或合作关系</strong>，与 e-Bridge、学校教务系统及任何官方平台亦无正式关联。</p>
      <p><strong>本服务以“现状”（AS IS）及“现有”（AS AVAILABLE）形式提供，实例运营者不就以下事项作任何明示或暗示的陈述、保证或承诺：</strong></p>
      <ul>
        <li>服务的持续可用性、无中断或无错误；</li>
        <li>课表数据的完整性、准确性或与 e-Bridge 官方数据的实时一致性；</li>
        <li>因 e-Bridge 系统升级或接口变动导致的功能失效可被及时修复；</li>
        <li>数据不因不可抗力（服务器故障、网络攻击、自然灾害等）而丢失。</li>
      </ul>
      <p><strong>课表数据以 e-Bridge 及学校官方系统公布的信息为唯一权威依据。</strong>本服务展示的内容仅供个人参考，不具备任何法律效力，不得用于考勤、考试安排、成绩证明或任何正式场合。因使用或信赖本服务所展示数据而产生的一切后果，由用户自行承担。</p>
      <p>在适用法律允许的最大范围内，实例运营者对因使用或无法使用本服务而导致的任何直接、间接、附带、特殊、惩罚性或后果性损失（包括但不限于数据丢失、业务中断、预期利益损失等）概不承担法律责任。</p>

      <h2>二、适用对象与账号管理</h2>
      <p>本服务主要面向西交利物浦大学在校学生。注册须使用有效邮箱，并由您自行妥善保管登录凭证。您对该账号下发生的一切操作负完全责任；账号不得转让、出租或以任何方式共享。</p>
      <p>如发生以下情形，实例运营者有权在不事先通知的情况下暂停或永久终止您的账号访问权限：</p>
      <ul>
        <li>违反本协议任何条款；</li>
        <li>账号存在异常访问行为或遭滥用；</li>
        <li>本服务停止运营。</li>
      </ul>

      <h2>三、数据收集与隐私保护</h2>
      <p>透明度是本服务重视的原则。本章节根据项目当前可验证的功能，概述主要数据类别、用途及通常保留安排。具体实例的代理、托管、分析、日志和备份实践可能不同，应以该实例当前发布的隐私说明及实际配置为准。</p>

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
            <td>经不可逆密码哈希后存储，实例运营者无法直接读取原始密码</td>
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
          <tr>
            <td>最近一次获准的数据导出申请时间</td>
            <td>执行每 24 小时至多申请一次的滚动频率限制</td>
            <td>服务器数据库；仅保留最近一次时间，账号注销时一并删除</td>
          </tr>
        </tbody>
      </table>
      <p><strong>重要说明：</strong>课表数据由您通过书签工具从 e-Bridge 页面提取并主动上传，本服务不会、也无法直接访问 e-Bridge 系统或您的学校账号。</p>

      <h3>3.2 网络与反向代理服务</h3>
      <p>部署者可能使用 Cloudflare、其他内容分发网络或反向代理提供 HTTPS、安全防护和访问控制。这些服务可能在其基础设施层面处理以下信息：</p>
      <ul>
        <li>IP 地址及代理提供的国家、城市或网络信息；</li>
        <li>页面访问路径、访问时间及来源页面；</li>
        <li>大致地理位置（国家/地区级别）。</li>
      </ul>
      <p>本项目不会假定任何实例启用了特定分析服务。部署者如启用额外分析、Cookie 或第三方数据处理服务，必须在自己的法律说明中单独披露。</p>

      <h3>3.3 数据处理设计原则</h3>
      <ul>
        <li><strong>不以出售为目的：</strong>项目功能不包含出售个人数据的机制；为提供服务而使用托管、代理等处理者，或按用户选择向好友、日历服务提供数据，不等同于出售；</li>
        <li><strong>不用于广告或模型训练：</strong>项目自身不将课表及个人数据用于广告定向或 AI 模型训练；部署者如改变用途，必须自行评估并明确披露；</li>
        <li><strong>不主动营销：</strong>项目自身不发送营销邮件或推送通知；</li>
        <li><strong>目的限制目标：</strong>项目设计上仅为已说明的服务、安全和必要法律事务处理数据，实际实例应持续核查其配置与操作；</li>
        <li><strong>数据最小化目标：</strong>项目以减少非必要数据为目标，但这不构成对任何实例完全合规的保证。</li>
      </ul>

      <h3>3.4 数据可见性控制</h3>
      <p>您可在首页随时控制课表的可见范围：</p>
      <ul>
        <li><strong>仅自己：</strong>仅登录本人可见；</li>
        <li><strong>好友可见：</strong>仅已建立好友关系的用户可访问。</li>
      </ul>

      <h3>3.5 数据删除</h3>
      <p>您可随时在“设置”页面注销账号。注销会删除实时应用数据库中的账号及主要关联记录（课表、好友关系、iCal 订阅令牌等），该自助操作不可撤销。</p>
      <p>访问日志和登录日志通常在 <strong>30 天内自动清除</strong>。反向代理日志、运行日志、第三方服务记录和灾难恢复备份可能依照实例运营者披露的期限继续保留；因此，注销不表示所有副本会在同一时刻从所有系统中消失。</p>
      <p>如遇技术问题无法自助删除，请通过本协议末尾的实例运营者联系方式提出请求。</p>

      <h3>3.6 数据导出</h3>
      <p>您可在“设置”页面申请下载结构化 ZIP 数据包。为防止滥用及限制资源消耗，每个账号自申请获准起每 24 小时至多申请一次；即使您取消下载或本地生成失败，本次申请仍会计入限制。</p>
      <p>自助导出覆盖应用数据库中面向账号的可导出数据，但不一定包含反向代理日志、运行日志、备份、第三方服务记录或站外通信。在适用 UK GDPR 的情况下，自助导出不必然构成完整的正式数据主体访问请求；如需提出正式请求，请联系实例运营者。</p>

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
      <p>本服务源代码以 <strong>GNU Affero General Public License v3（AGPLv3）</strong> 协议开源。网络服务运营者修改程序后，应按许可证要求向用户提供对应源码。当前实例声明的源码地址为：<a :href="instanceConfig.source_code_url" target="_blank" rel="noopener noreferrer">{{ instanceConfig.source_code_url }}</a>。您上传的课表数据仍归您本人所有；本服务仅在提供功能所必需的范围内处理这些数据。</p>

      <h2>六、协议变更</h2>
      <p>本协议可能随服务功能演进而更新。<strong>重大变更将提前通过网站公告告知；继续使用本服务将视为接受变更后的协议。</strong>建议您定期查阅本页面以了解最新条款。</p>

      <h2>七、联系方式</h2>
      <p v-if="instanceConfig.operator_contact_email">
        如有疑问、数据删除申请或其他事宜，请联系：
        <a :href="`mailto:${instanceConfig.operator_contact_email}`">{{ instanceConfig.operator_contact_email }}</a>
      </p>
      <p v-else>本实例尚未公布运营者联系邮箱，请联系向您提供本实例地址的部署者。</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { instanceConfig, loadInstanceConfig } from '../stores/instanceConfig'

onMounted(() => {
  loadInstanceConfig()
})
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
