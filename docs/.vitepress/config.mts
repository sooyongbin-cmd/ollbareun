import { defineConfig } from 'vitepress'

export default defineConfig({
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
