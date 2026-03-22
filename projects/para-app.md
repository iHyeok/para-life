---
id: "para-app"
title: "PARA Life Management App"
status: "active"
priority: "high"
visibility: "public"
area: "dev-career"
goal: "PARA 기반 생활관리 웹앱 MVP 완성 및 Cloudflare 배포"
deadline: ""
createdAt: "2026-03-22"
updatedAt: "2026-03-22"
tags: ["para", "cloudflare", "web"]
---

## Overview

PARA methodology based life/task management system.
- Data: Markdown/JSON files in GitHub repo
- Frontend: Cloudflare Pages
- Integration: Claude Code via file-based CRUD, Telegram bot

## Tasks

- [x] Define repo structure and data schema
- [x] Build Cloudflare Pages frontend (dashboard)
- [x] Set up GitHub Actions for auto-deploy
- [ ] Implement PARA CRUD operations
- [ ] Add daily log feature
- [ ] Custom domain setup

## Progress Log

### 2026-03-22

- Initial repo structure and schema created
- Astro frontend built (dark theme, dashboard with stats/cards, detail pages)
- Cloudflare Pages deployment complete
- GitHub auto-deploy configured (push to main triggers rebuild)
- Telegram integration working (Claude Code manages data via chat)
