import { defineConfig } from 'vitepress'
import { flexGapBootstrap } from '../../src/lib/flex-gap-bootstrap'

export default defineConfig({
  base: '/docs/documents/',
  head: [['script', {}, flexGapBootstrap]],
  srcDir: './documents',
  lang: 'ko-KR',
  title: '올바름 HRM 프로젝트 문서',
  description: '올바름 HRM 개발 산출물',
  cleanUrls: true,

  themeConfig: {
    search: {
      provider: 'local',
    },
    outline: [2, 3],
  },
})
