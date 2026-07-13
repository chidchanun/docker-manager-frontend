# Docker Manager Frontend

Angular 22 standalone application ใช้ Signals, Tailwind CSS และ local Kanit font

## Development

```powershell
cd D:\DockerManager\frontend
npm install
npm start
```

เปิด `http://localhost:4200`; `/api/**` จะ proxy ไป `http://127.0.0.1:10000`

## Commands

```powershell
npm start
npm run build
npm test
```

## Routes

| Route | Description |
|---|---|
| `/login` | Login |
| `/dashboard` | Host/container dashboard and graphs |
| `/containers/:id` | Detail and policy editor |
| `/containers/:id/logs` | SSE Live Logs |
| `/audit` | Persistent audit history |

## UI capabilities

- Responsive cards/table, search, state filter, sorting and pagination
- Global toast notifications and confirmation dialogs
- Separate Disk Read/Write and Network RX/TX graph lines
- Container actions and detail navigation
- Policy presets/validation and before → after confirmation
- Live log stream with reconnect, tail, timestamps, copy/download
- Audit log viewer

## Styling

- Tailwind configured by `.postcssrc.json`
- Global styles in `src/styles.scss`
- Kanit weights loaded locally from `public/fonts/kanit`
- Component SCSS remains minimal; UI uses Tailwind utilities

## Production

```powershell
npm ci
npm run build
```

Angular output is copied into `nginx:1.29-alpine`; Nginx serves static files and performs SPA fallback only. It does not proxy `/api`. Cloudflare Tunnel routes API traffic directly to backend and other paths to frontend

## Important implementation notes

- API calls use relative `/api` URLs to preserve same-origin cookies
- `withCredentials` is applied by the HTTP interceptor
- Routes are lazy loaded and protected by auth/guest guards
- EventSource uses same-origin session cookies for SSE logs
- Docker command secrets are masked in the UI; backend also redacts them before JSON response
