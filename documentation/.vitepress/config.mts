import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'ko-KR',
  title: '올바름HRM 프로젝트 문서',
  description: '올바름HRM 개발 산출물',

  srcDir: '../docs',

  cleanUrls: true,

  themeConfig: {
    search: {
      provider: 'local',
    },

    sidebar: [
      {
        text: '프로젝트 문서',
        items: [
          { text: '프로젝트 개요', link: '/' },
          { text: '요구사항 정의서', link: '/requirements' },
          { text: '시스템 설계서', link: '/architecture' },
        ],
      },
    ],
  },
})