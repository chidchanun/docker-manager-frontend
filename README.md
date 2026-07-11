# Docker Manager Frontend

เว็บ Dashboard สำหรับดูและจัดการ Docker containers พัฒนาด้วย Angular 22, Signals และ Tailwind CSS รองรับ desktop และ mobile

## ความสามารถ

- Login ด้วย session cookie และ route guards
- แสดงข้อมูล Docker host และสถานะ containers
- ค้นหา กรอง Start, Stop และ Restart container
- กราฟ CPU, memory, disk I/O และ network I/O ทุก 5 วินาที
- เลือกดู resource usage แบบรวมและราย container
- Container cards บนมือถือ และ table บนจอขนาดกลางขึ้นไป

## ความต้องการ

- Node.js เวอร์ชันที่ Angular 22 รองรับ
- npm 11+
- Backend ที่ `http://127.0.0.1:10000`

## ติดตั้งและรัน

```powershell
cd D:\DockerManager\frontend
npm install
npm start
```

เปิด `http://localhost:4200` โดย development server จะ proxy `/api` ไป backend ตาม `src/proxy.conf.json`

## คำสั่ง

```powershell
npm start
npm run build
npm test
```

## โครงสร้างสำคัญ

```text
src/app/core/       guards, interceptors, models และ services
src/app/pages/      login และ dashboard
public/fonts/kanit  local Kanit font
```

Tailwind ตั้งค่าผ่าน `.postcssrc.json` และ `src/styles.scss` ฟอนต์ Kanit โหลดจาก local โดยไม่เรียก Google Fonts

## Production

`npm run build` จะสร้าง static files ใน `dist/frontend` ให้ web server fallback route เช่น `/login` และ `/dashboard` ไป `index.html` และ proxy `/api` ไป backend โดยคง cookie credentials ไว้

ใน Docker Compose ของ repository นี้ Nginx เสิร์ฟ static files เท่านั้น ส่วน Cloudflare Tunnel route `/api/*` ไป `http://backend:10000` และ route อื่นไป `http://frontend:80`
