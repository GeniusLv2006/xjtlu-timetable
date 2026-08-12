<template>
  <div class="terms-page">
    <div class="page-toolbar">
      <router-link to="/" class="back-link">← 返回</router-link>
      <h1 class="page-title">用户协议与隐私政策通用模板</h1>
    </div>

    <div class="terms-body">
      <p class="terms-meta">公开参考模板 · 不是本实例的正式协议</p>
      <div class="terms-warning" role="alert">
        <strong>部署者必须自行撰写并审阅正式协议。</strong>
        本模板不构成法律意见，不能替代针对实际运营主体、功能、基础设施、数据处理活动和适用法律编写的用户协议与隐私政策。公开运营服务前，请在管理后台配置正式协议的 HTTP(S) 地址；留空仅会向用户展示本参考模板。
      </div>

      <p class="terms-intro">
        以下结构用于提示部署者在正式协议中可能需要说明的事项。方括号内容是待填写或待核实项目，不应原样保留在正式文件中。部署者应删除不适用内容、补充实际情况，并在必要时取得专业意见。
      </p>

      <h2>一、运营主体与联系方式</h2>
      <p>说明服务的正式名称、访问地址、运营者的个人或组织名称、所在地区，以及处理账号、隐私、安全事件和其他请求的有效联系方式。</p>
      <p class="template-prompt">[填写运营主体、服务地址、联系渠道和适用的监管或投诉渠道。]</p>

      <h2>二、服务范围与适用对象</h2>
      <p>说明服务提供的功能、预期用户、注册资格、最低年龄、服务限制，以及哪些外部信息或官方来源应被视为权威。明确服务与第三方机构、平台或品牌是否存在隶属、授权或合作关系。</p>
      <p class="template-prompt">[填写实际功能、适用对象、资格要求、重要限制和第三方关系。]</p>

      <h2>三、账号与使用规则</h2>
      <p>说明注册和邀请规则、用户维护凭证安全的责任、禁止行为、自动化访问限制，以及运营者在安全、滥用、容量或停止运营等情况下限制或终止访问的条件和处理方式。</p>
      <p class="template-prompt">[填写账号规则、可接受使用规则、暂停与终止流程，以及用户可用的复核渠道。]</p>

      <h2>四、处理的数据及来源</h2>
      <p>逐项列出实例实际处理的数据，包括用户主动提交的数据、使用服务产生的数据、设备与网络信息、日志、导入的数据、令牌或其他凭证。说明每类数据的来源、是否必需，以及不提供时的影响。</p>
      <table class="data-table">
        <thead>
          <tr><th>数据类别</th><th>来源</th><th>是否必需及影响</th></tr>
        </thead>
        <tbody>
          <tr><td>[数据类别]</td><td>[用户、设备、第三方服务等]</td><td>[必需性与不提供的影响]</td></tr>
          <tr><td>[数据类别]</td><td>[实际来源]</td><td>[必需性与不提供的影响]</td></tr>
        </tbody>
      </table>

      <h2>五、处理目的与依据</h2>
      <p>说明每类数据用于哪些功能、安全、运维、沟通或法律目的；如适用法律要求说明处理依据，应逐项记录所依赖的依据、必要性和权衡，而不是笼统声称完全合规。</p>
      <p class="template-prompt">[将数据类别与具体处理目的对应，并填写适用的处理依据和必要性说明。]</p>

      <h2>六、可见性、共享与第三方服务</h2>
      <p>说明哪些数据仅用户本人可见、哪些数据可能按用户选择向其他用户公开，以及托管、反向代理、分析、邮件、日历或其他服务提供者会接收哪些数据。列明相关提供者、用途、处理地点和适用的外部政策。</p>
      <p class="template-prompt">[填写实际可见性设置、接收方、处理者、第三方集成及跨地区处理安排。]</p>

      <h2>七、保存、导出与删除</h2>
      <p>为数据库记录、访问日志、运行日志、备份、安全记录和第三方副本分别说明保存期限或确定期限的方法。说明用户如何导出和删除数据、删除后的例外情况，以及备份或安全记录何时被清理。</p>
      <p class="template-prompt">[填写各类数据的实际期限、删除流程、导出范围、备份处理和不能立即删除的例外。]</p>

      <h2>八、安全与事件处理</h2>
      <p>概述与实例风险相称的账号保护、访问控制、传输和存储保护、备份及安全监测措施。不要承诺绝对安全；说明用户报告凭证泄露、安全问题或个人数据事件的渠道。</p>
      <p class="template-prompt">[填写实际安全措施、事件联系渠道和合理响应流程。]</p>

      <h2>九、用户请求与权利</h2>
      <p>根据实际适用法律和运营情况，说明用户可以提出的访问、更正、导出、删除、限制、反对或投诉请求，以及身份核验、响应方式、可能限制和联系渠道。不要列举未经评估、并不适用的权利。</p>
      <p class="template-prompt">[填写适用的请求类型、提交方式、处理期限、限制和投诉渠道。]</p>

      <h2>十、知识产权、免责声明与责任</h2>
      <p>说明应用源码许可证、用户内容和第三方材料的权利边界，服务可用性和信息准确性的实际限制，以及适用法律不允许排除或限制的责任。避免使用无法执行的绝对免责或剥夺法定权利的表述。</p>
      <p class="template-prompt">[填写源码地址、内容权利、服务限制、备份建议和适用的责任边界。]</p>

      <h2>十一、协议版本与变更</h2>
      <p>标注发布日期或生效日期，说明如何通知用户以及哪些实质变更会要求重新确认。协议页面的内容版本与应用后台的确认版本应由部署者独立维护；排版或错别字修改通常不必触发重新确认，影响处理目的、数据类别、接收方、保存期限、用户义务或权利的变更则应重新评估。</p>
      <p class="template-prompt">[填写发布日期、生效日期、变更通知方式和当前确认版本。]</p>
    </div>
  </div>
</template>

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
  margin-bottom: var(--sp-3);
}
.terms-warning {
  font-size: var(--text-sm);
  color: var(--amber);
  line-height: 1.75;
  padding: var(--sp-4);
  background: color-mix(in srgb, var(--amber) 8%, var(--surface-1));
  border: 1px solid color-mix(in srgb, var(--amber) 35%, var(--border));
  border-radius: 3px;
  margin-bottom: var(--sp-4);
}
.terms-warning strong { color: var(--text-1); }
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
  margin-top: var(--sp-7);
  margin-bottom: var(--sp-3);
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--border);
}
.terms-body p {
  font-size: var(--text-sm);
  color: var(--text-2);
  line-height: 1.8;
  margin-bottom: var(--sp-3);
}
.template-prompt {
  padding: var(--sp-3);
  background: var(--surface-2);
  border-left: 3px solid var(--border-strong);
  color: var(--text-3) !important;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
  margin: var(--sp-3) 0 var(--sp-5);
}
.data-table th {
  text-align: left;
  padding: var(--sp-2) var(--sp-3);
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-weight: 600;
}
.data-table td {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border);
  color: var(--text-2);
  vertical-align: top;
}

@media (max-width: 600px) {
  .terms-page { padding: var(--sp-4) var(--sp-3) var(--sp-8); }
  .data-table { display: block; overflow-x: auto; }
}
</style>
