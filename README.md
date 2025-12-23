# 🎯 HSD Arena Backend

**Modern gerçek zamanlı quiz platformu backend API'si**

NestJS, Prisma, PostgreSQL ve WebSocket teknolojileri ile geliştirilmiş, canlı quiz yarışmaları için tasarlanmış profesyonel bir backend sistemi.

---

## 📚 Hızlı Navigasyon

- [🚀 Hızlı Başlangıç](#-hızlı-başlangıç)
- [✨ Özellikler](#-özellikler)
- [🛠 Teknoloji Stack](#-teknoloji-stack)
- [📦 Kurulum](#-kurulum)
- [📁 Proje Yapısı](#-proje-yapısı)
- [📖 API Dokümantasyonu](#-api-dokümantasyonu)
- [🔧 Ortam Değişkenleri](#-ortam-değişkenleri)
- [🗄️ Veritabanı](#-veritabanı)
- [🧪 Test Etme](#-test-etme)
- [🔧 Troubleshooting](#-troubleshooting)

---

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler

- **Docker & Docker Compose** (Önerilen - en kolay kurulum)
- veya Node.js (v18+), PostgreSQL, Redis

### 🐳 Docker ile Tek Komutta Başlat (ÖNERİLEN)

```bash
# 1. Docker container'ları başlat (otomatik build + çalıştır)
docker compose up --build -d

# 2. Migration ve seed data
docker compose exec api sh
npm run prisma:generate
npm run db:deploy
npm run seed
exit
```

**🎉 Hepsi bu kadar!** Aşağıdaki servisler çalışıyor:

| Servis | URL/Port | Açıklama |
|--------|----------|----------|
| **Backend API** | `http://localhost:8082` | NestJS REST API + WebSocket |
| **Swagger UI** | `http://localhost:8082/docs` | Interaktif API dokümantasyonu |
| **PostgreSQL** | `localhost:5432` | Veritabanı |
| **Redis** | `localhost:6379` | Cache ve session |

> [!TIP]
> Docker'sız kurulum için [Manuel Kurulum](#-kurulum) bölümüne bakın.

---

## ✨ Özellikler

### 🎮 Quiz Yönetimi
- ✅ Çoklu seçenekli (MCQ) ve Doğru/Yanlış (T/F) soru tipleri
- ⏱️ **Soru başına ayarlanabilir süre limiti (5-240 saniye)**
- ✅ Admin paneli için tam CRUD operasyonları
- ✅ Quiz settings (soru karıştırma, doğru cevap gösterimi)

### 👥 Takım Sistemi
- ✅ Session code ile kolay katılım
- ✅ Takım bazlı token yönetimi
- ✅ Gerçek zamanlı takım skorları
- ✅ Disqualification desteği

### 🔐 Güvenlik
- ✅ JWT tabanlı kimlik doğrulama (Admin + Team)
- ✅ Role-based access control (RBAC)
- ✅ Argon2 şifre hashleme
- ✅ Rate limiting ve throttling
- ✅ CORS koruması

### 📊 Gerçek Zamanlı
- ✅ WebSocket ile anlık event'ler (`domain:action` formatı)
- ⏱️ **Otomatik timer yönetimi - süre bitince `time:up` event'i**
- ✅ Canlı scoreboard güncellemeleri
- ✅ Soru başlangıç/bitiş bildirimleri
- ✅ Takım cevap istatistikleri

---

## 🛠 Teknoloji Stack

### Backend Framework
- **NestJS** - Enterprise-grade Node.js framework
- **TypeScript** - Type-safe development
- **Prisma ORM** - Modern database toolkit

### Veritabanı & Cache
- **PostgreSQL** - Ana veritabanı (Neon DB destekli)
- **Redis** - Caching ve session yönetimi

### Güvenlik
- **JWT** - Token-based authentication
- **Argon2** - Şifre hashleme
- **Passport** - Authentication middleware

### Real-time
- **Socket.IO** - WebSocket iletişimi
- **NestJS WebSockets** - WebSocket gateway

### Dokümantasyon & Testing
- **Swagger/OpenAPI** - API dokümantasyonu
- **Jest** - Unit & Integration testleri

---

## 📦 Kurulum

### Yöntem 1: Neon DB ile Cloud Setup (Önerilen)

#### 1️⃣ Neon Database Kurulumu

1. [neon.tech](https://neon.tech) hesabı oluşturun (ücretsiz)
2. Yeni proje oluşturun
3. Connection string'i kopyalayın

#### 2️⃣ Environment Variables

`.env` dosyası oluşturun:

```env
# Database (Neon DB)
DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (GÜVENLİ random stringler kullanın!)
JWT_ADMIN_SECRET="super-secret-admin-key-256-chars-min"
JWT_TEAM_SECRET="super-secret-team-key-256-chars-min"
JWT_EXP_ADMIN="90m"
JWT_EXP_TEAM="90m"

# Server
PORT=8082
NODE_ENV=development

# CORS
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
```

> [!IMPORTANT]
> Docker Compose ile Neon kullanmak için `docker-compose.yml` dosyasında `DATABASE_URL` satırı yorumda olmalı (`.env`'den alacak).

#### 3️⃣ Kurulum Komutları

```bash
# Bağımlılıkları yükle
npm install

# Prisma client generate et
npm run prisma:generate

# Migration'ları uygula
npm run db:deploy

# İlk admin kullanıcısı ve demo quiz oluştur
npm run seed

# Uygulamayı başlat
npm run start:dev
```

---

### Yöntem 2: Docker ile Tam Yerel Setup

```bash
# Tüm servisleri başlat (PostgreSQL + Redis + API)
docker compose up --build -d

# Migration ve seed (container içinde)
docker compose exec api sh
npm run prisma:generate
npm run db:deploy
npm run seed
exit
```

**Servisler:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- API: `localhost:8082`

---

## 📁 Proje Yapısı

```
hsdarena-backend/
├── prisma/
│   ├── schema.prisma        # Veritabanı şeması
│   ├── migrations/          # Migration dosyaları
│   └── seed.ts              # Seed data scripti
│
├── src/
│   ├── auth/                # 🔐 Kimlik doğrulama
│   ├── users/               # 👤 Kullanıcı ayarları
│   ├── quiz/                # 📝 Quiz yönetimi (Admin)
│   ├── questions/           # ❓ Soru yönetimi (Admin)
│   ├── sessions/            # 🎮 Session ve cevap yönetimi
│   ├── team/                # 👥 Takım katılımı
│   ├── realtime/            # 🔌 WebSocket Gateway
│   ├── common/              # 🔧 Ortak bileşenler
│   ├── infra/               # 🏗️ Altyapı servisleri
│   └── config/              # ⚙️ Yapılandırma
│
├── .env                     # Environment variables
├── docker-compose.yml       # Docker servisleri
├── Dockerfile               # Production image
├── API-Docs.md              # 📖 Detaylı API dokümantasyonu
└── README.md                # Bu dosya
```

### 📂 Modül Sorumlulukları

| Modül | Sorumluluk | Endpoint Prefix |
|-------|------------|-----------------|
| **auth** | Login, Register, Token yönetimi | `/api/auth/*` |
| **users** | Kullanıcı ayarları | `/api/users/*` |
| **quiz** | Quiz CRUD (admin) | `/api/admin/quizzes/*` |
| **questions** | Soru CRUD (admin) | `/api/admin/questions/*` |
| **sessions** | Session yönetimi & cevap gönderme | `/api/admin/sessions/*`, `/api/sessions/*` |
| **team** | Takım katılımı | `/api/teams/*` |
| **realtime** | WebSocket event'leri | `/realtime` namespace |

---

## 📖 API Dokümantasyonu

### 🎯 Swagger UI (Interaktif)

```
http://localhost:8082/docs
```

### 📚 Detaylı Dokümantasyon

**Tüm endpoint'ler, request/response formatları, WebSocket event'leri ve daha fazlası için:**

👉 **[API-Docs.md](./API-Docs.md)** 👈

Bu dokümanda bulacağınız içerik:
- 🔐 Authentication & User Management
- 📝 Quiz & Question Management (Admin)
- 🎮 Session Management (Admin & Team)
- 👥 Team Management
- 🔌 WebSocket Events (tüm event'ler detaylı)
- ⏱️ **Timer Feature (`time:up` event)**
- 📊 Database Models (Prisma Schema)
- 🔧 Request/Response Type Definitions
- 🌐 WebSocket Integration Guide

---

## 🔧 Ortam Değişkenleri

### Gerekli Değişkenler

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `DATABASE_URL` | PostgreSQL bağlantı string'i | `postgresql://user:pass@host:5432/db` |
| `JWT_ADMIN_SECRET` | Admin JWT secret key | `super-secret-256-chars` |
| `JWT_TEAM_SECRET` | Team JWT secret key | `another-secret-256-chars` |

### Opsiyonel Değişkenler

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `PORT` | API port numarası | `8082` |
| `NODE_ENV` | Ortam (development/production) | `development` |
| `REDIS_URL` | Redis bağlantı string'i | `redis://localhost:6379` |
| `JWT_EXP_ADMIN` | Admin token süresi | `90m` |
| `JWT_EXP_TEAM` | Team token süresi | `90m` |
| `ALLOWED_ORIGINS` | CORS allowed origins (virgülle ayır) | `http://localhost:3000` |

### Production için Öneriler

```env
# GÜVENLİ secretlar kullanın!
JWT_ADMIN_SECRET="$(openssl rand -base64 64)"
JWT_TEAM_SECRET="$(openssl rand -base64 64)"

# SSL gerektir
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Production mode
NODE_ENV=production
```

---

## 🗄️ Veritabanı

### Prisma Komutları

```bash
# Prisma client generate et
npm run prisma:generate

# Migration oluştur (schema değişikliği sonrası)
npm run db:migrate

# Migration'ları production'a deploy et
npm run db:deploy

# Prisma Studio ile veritabanını görüntüle
npm run db:studio

# Seed data yükle
npm run seed
```

### Veritabanı Modelleri

- **User** - Admin kullanıcıları
- **Quiz** - Quiz tanımları
- **Question** - Sorular (MCQ/TF) + `timeLimitSec` (5-240 saniye)
- **QuizSession** - Quiz oturumları
- **Team** - Takımlar
- **Answer** - Takım cevapları

> [!NOTE]
> Detaylı model yapısı, ilişkiler ve field açıklamaları için [API-Docs.md - Database Models](./API-Docs.md#%EF%B8%8F-database-models-prisma-schema) bölümüne bakın.

---

## 🧪 Test Etme

### NPM Scripts

```bash
# Unit testler
npm run test

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch

# Linting
npm run lint

# Format
npm run format
```

### Swagger ile Manuel Test

1. Uygulamayı başlat: `npm run start:dev`
2. Swagger UI'a git: `http://localhost:8082/docs`
3. Sağ üstten "Authorize" tıkla
4. Admin token ile giriş yap
5. Endpoint'leri test et

---

## 🔧 Troubleshooting

### Port Zaten Kullanımda

**Hata:**
```
Error: listen EADDRINUSE: address already in use :::8082
```

**Çözüm:**

**Windows:**
```bash
# Port'u kullanan process'i bul
netstat -ano | findstr :8082

# Process'i kapat
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Port'u kullanan process'i bul ve kapat
lsof -ti:8082 | xargs kill -9
```

---

### Database Bağlantı Hatası

**Hata:**
```
Error: Can't reach database server
```

**Çözüm:**
1. PostgreSQL çalışıyor mu kontrol et: `docker compose ps`
2. `DATABASE_URL` doğru mu kontrol et
3. Neon kullanıyorsan, connection string'de `?sslmode=require` olduğundan emin ol

---

### Prisma Client Hatası

**Hata:**
```
Cannot find module '@prisma/client'
```

**Çözüm:**
```bash
npm run prisma:generate
```

---

### Docker Container Başlamıyor

**Çözüm:**
```bash
# Container loglarını kontrol et
docker compose logs api

# Container'ları temizle ve yeniden başlat
docker compose down -v
docker compose up --build
```

---

## 📞 Destek

Sorun mu yaşıyorsunuz? Önce şu kaynaklara bakın:
- 📖 [API-Docs.md](./API-Docs.md) - Detaylı API dokümantasyonu
- 🐛 [GitHub Issues](#) - Bilinen sorunlar ve çözümler
- 💬 [Discord Server](#) - Community desteği

---

**Version:** 2.1  
**Last Updated:** 2025-12-23

---

**🎯 HSD Arena Backend** - Built with ❤️ by HSD Team
