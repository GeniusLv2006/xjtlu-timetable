import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(new URL('./index.html', import.meta.url), 'utf8')

describe('application content security policy', () => {
  it('allows the automatically injected Cloudflare Web Analytics beacon', () => {
    expect(indexHtml).toContain(
      "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    )
    expect(indexHtml).toContain("connect-src 'self' https://timetableplus.xjtlu.edu.cn")
  })
})
