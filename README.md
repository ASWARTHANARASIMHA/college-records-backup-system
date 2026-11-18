# 🏛️ Automated Backup and Recovery System for College Records

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](https://github.com/ASWARTHANARASIMHA/college-records-backup-system)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ecf8e.svg)](https://supabase.com/)
[![Microsoft Azure](https://img.shields.io/badge/MultiCloud-Azure%20Blob%20Storage-0078d4.svg)](https://azure.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> A robust, institutional cloud platform designed for college academic departments to manage, safeguard, and recover high-stakes student, faculty, and examination records against accidental deletion, tampering, and hardware failure.

---

## 🌐 Live System Demo

- **Live Public URL:** [https://shakespeare-substantially-cbs-denver.trycloudflare.com](https://shakespeare-substantially-cbs-denver.trycloudflare.com)
- **GitHub Repository:** [https://github.com/ASWARTHANARASIMHA/college-records-backup-system](https://github.com/ASWARTHANARASIMHA/college-records-backup-system)

---

## 🌟 Key Architectural Pillars

### 1. 🏛️ Hybrid Multi-Cloud Architecture (3-2-1 Rule)
- **Primary Cloud Storage:** Supabase PostgreSQL & Storage (`college-records-originals`).
- **Secondary Cloud Storage:** Isolated Supabase Backup Bucket (`college-records-backups`).
- **Offsite Geo-Redundant Vault:** **Microsoft Azure Blob Storage** Geo-Redundant Storage (GRS) with Hot, Cool, and Archive tiers.
- **Enterprise SSO:** Microsoft 365 / Azure Active Directory integration.

### 2. 🔐 SHA-256 Cryptographic File Integrity Verification
- Automatic client-side hash generation via **Web Crypto API**.
- Zero-knowledge comparison: Hashes are verified before and after transfers to guarantee zero bit-rot or unauthorized tampering.
- Duplicate detection: Prevents unnecessary redundant backups if the cryptographic hash has not changed.

### 3. 📊 Executive Visual Analytics (Recharts)
- **Storage Utilization:** Interactive PieChart categorized by Student Records, Examinations, Faculty Documents, Attendance, and Financials.
- **Backup Activity:** Chronological BarChart tracking backup operations and health trends.

### 4. 🚑 Disaster Recovery Center & Versioning
- Point-in-time version restore for deleted academic records.
- 1-click reconstitution of original documents from secondary storage buckets.
- Immutable recovery audit trail logging timestamps, operators, and target paths.

### 5. 🧪 Interactive Failure Simulation Lab
- **Accidental Deletion Drill:** Simulates document loss and demonstrates instantaneous recovery.
- **Unauthorized Tampering Drill:** Simulates malicious bit-rot and verifies SHA-256 integrity failure alerts.
- **Instant Offsite Recovery:** Tests emergency reconstitution from the Azure secondary vault.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite |
| **UI Styling** | Tailwind CSS, Lucide React Icons |
| **Data Visualization** | Recharts (Responsive Pie & Bar Charts) |
| **Cryptography** | Web Crypto API (SHA-256 Digesting) |
| **Cloud Database** | Supabase PostgreSQL (Row Level Security enabled) |
| **Primary Storage** | Supabase Storage (`college-records-originals`, `college-records-backups`) |
| **Secondary Vault** | Microsoft Azure Blob Storage (GRS Mirroring) |
| **Identity / Auth** | Azure Active Directory / Supabase Auth |

---

## 📂 Repository Structure

```
├── src/
│   ├── components/
│   │   ├── Charts/
│   │   │   ├── BackupActivityChart.tsx
│   │   │   └── StorageUtilizationChart.tsx
│   │   ├── Common/
│   │   ├── ActivityLogs.tsx
│   │   ├── AuthModal.tsx
│   │   ├── BackupManagement.tsx
│   │   ├── CloudConfigModal.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FailureSimulation.tsx
│   │   ├── FileManagement.tsx
│   │   ├── Header.tsx
│   │   ├── IntegrityModal.tsx
│   │   ├── RecoveryCenter.tsx
│   │   ├── Settings.tsx
│   │   └── UploadModal.tsx
│   ├── services/
│   │   ├── azureStorage.ts       # Microsoft Azure Blob Client
│   │   ├── backupEngine.ts       # Automated interval backup scheduler
│   │   ├── cloudDataService.ts   # Hybrid cloud repository
│   │   ├── crypto.ts             # Web Crypto API SHA-256 hashing
│   │   └── supabase.ts           # Supabase client & credentials
│   ├── types/                    # TypeScript interfaces
│   ├── App.tsx                   # Main application layout & state
│   └── main.tsx
├── supabase/
│   ├── functions/                # Edge Functions for server-side backups
│   └── schema.sql                # PostgreSQL table schema & RLS policies
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/ASWARTHANARASIMHA/college-records-backup-system.git
cd college-records-backup-system

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build
```

---

## 👨‍💻 Author
- **Aswartha Narasimha**  
- GitHub: [@ASWARTHANARASIMHA](https://github.com/ASWARTHANARASIMHA)
