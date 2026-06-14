# Kế hoạch Migration: json-server + PIN → Firebase Auth + Firestore

## Tổng quan

| | Hiện tại | Sau migration |
|---|---|---|
| Backend | json-server (1 JSON blob) | Firebase Firestore |
| Auth | PIN so sánh client-side | Firebase Auth (JWT) |
| Bảo mật | Không có | Firestore Security Rules |
| Chi phí | Tự host | Free tier (50K reads/ngày) |

---

## Phase 1 — Setup Firebase (~30 phút)

- [ ] Tạo project tại https://console.firebase.google.com
- [ ] Bật **Authentication → Sign-in method → Email/Password**
- [ ] Tạo **Firestore Database** (chọn production mode)
- [ ] Copy Firebase config (Project settings → Your apps → Web app)
- [ ] Cài SDK: `npm install firebase`
- [ ] Tạo file `src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

- [ ] Thêm vào `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Phase 2 — Thiết kế lại Data Structure (~1 giờ)

### Hiện tại (1 blob JSON duy nhất)
```
AppData {
  users: { [username]: User }
  scores: { [username]: Score }
  userProgress: { [username]: UserProgress }
  knowledgeSets: { [setId]: KnowledgeSet }
}
```

### Firestore (tách thành collections)
```
/users/{uid}
  - username: string
  - grade: number
  - role: 'student' | 'teacher'
  - apples: number
  - currentOutfit: string
  - purchasedOutfits: { [key]: boolean }
  - settings: { music: boolean, sound: boolean }
  - createdAt: timestamp

/scores/{uid}
  - maxApples: number
  - speedGame: { maxLevel: number, bestTimeMs: number }
  - fashionCompletedAt: timestamp | null

/userProgress/{uid}
  - completedSetIds: { [setId]: boolean }

/knowledgeSets/{setId}
  - grade: number
  - topic: string
  - createdBy: string (uid của teacher)
  - questions: { [key]: Question }
```

> **Lưu ý:** Mỗi document dùng Firebase UID (không phải username) làm document ID.
> Username lưu trong `/users/{uid}.username` để có thể query.

---

## Phase 3 — Security Rules (~1 giờ)

Vào Firestore → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User chỉ đọc/ghi data của chính mình
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /scores/{uid} {
      allow read: if request.auth != null; // leaderboard cần đọc của người khác
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /userProgress/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Mọi người đọc được bài học, chỉ teacher mới tạo/sửa
    match /knowledgeSets/{setId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

---

## Phase 4 — Viết lại `api.ts` (~1 giờ)

Xóa toàn bộ nội dung cũ, thay bằng Firestore SDK:

```typescript
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Score, UserProgress } from '../types';

export const api = {
  async getUser(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  async getScore(uid: string): Promise<Score | null> {
    const snap = await getDoc(doc(db, 'scores', uid));
    return snap.exists() ? (snap.data() as Score) : null;
  },

  async getUserProgress(uid: string): Promise<UserProgress | null> {
    const snap = await getDoc(doc(db, 'userProgress', uid));
    return snap.exists() ? (snap.data() as UserProgress) : null;
  },

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', uid), data);
  },

  async updateScore(uid: string, data: Partial<Score>): Promise<void> {
    await updateDoc(doc(db, 'scores', uid), data);
  },

  async updateUserProgress(uid: string, data: Partial<UserProgress>): Promise<void> {
    await updateDoc(doc(db, 'userProgress', uid), data);
  },

  async createUserDocs(uid: string, user: User, score: Score, progress: UserProgress): Promise<void> {
    await Promise.all([
      setDoc(doc(db, 'users', uid), user),
      setDoc(doc(db, 'scores', uid), score),
      setDoc(doc(db, 'userProgress', uid), progress),
    ]);
  },
};
```

---

## Phase 5 — Viết lại `store.tsx` (~2-3 giờ)

### Mapping các hàm

| Hàm cũ | Logic mới |
|---|---|
| `checkUser(name)` | Query Firestore: `where('username', '==', name)` |
| `loginUser(name, pin)` | `signInWithEmailAndPassword(auth, fakeEmail(name), padPin(pin))` |
| `registerUser(name, pin, grade)` | `createUserWithEmailAndPassword` + `api.createUserDocs` |
| `logout()` | `signOut(auth)` |
| `updateSettings(s)` | `api.updateUser(uid, { settings: s })` |
| `updatePin(old, new)` | `updatePassword(currentUser, padPin(new))` |
| `addApples(n)` | `api.updateUser` + `api.updateScore` |
| `updateOutfit(o)` | `api.updateUser(uid, { currentOutfit: o })` |
| `purchaseOutfit(o, price)` | `api.updateUser` (apples + purchasedOutfits) |
| `updateSpeedScore(l, t)` | `api.updateScore(uid, { speedGame })` |
| `completeKnowledgeSet(id, n)` | `api.updateUser` + `api.updateUserProgress` |

### Xử lý username + PIN → Firebase Auth

Firebase Auth yêu cầu email và password tối thiểu 6 ký tự:

```typescript
// PIN 4 số → pad thành 6 ký tự
const padPin = (pin: string) => pin.padEnd(6, '0');

// Username → fake email
const fakeEmail = (name: string) =>
  `${name.toLowerCase().replace(/\s+/g, '_')}@caotiachop.local`;
```

### Cập nhật `AppContextType`

```typescript
// Thêm vào interface
uid: string | null;  // Firebase UID

// Bỏ: currentUser (string username) → thay bằng uid
// Username vẫn lưu trong user.username (Firestore)
```

---

## Phase 6 — Migrate data cũ (~1 giờ)

Tạo file `scripts/migrate-to-firebase.js` để import `sample-data.json` vào Firestore.

Chạy 1 lần duy nhất:
```bash
node scripts/migrate-to-firebase.js
```

Script sẽ:
1. Đọc `sample-data.json`
2. Với mỗi user: tạo Firebase Auth account + 3 Firestore documents
3. Import toàn bộ `knowledgeSets`

---

## Phase 7 — Dọn dẹp (~30 phút)

- [ ] Xóa các env vars cũ khỏi `.env`:
  - `VITE_JSON_SERVER_STORE`
  - `VITE_JSON_SERVER_KEY`
  - `VITE_API_ENDPOINT`
- [ ] Xóa file `src/lib/api.ts` cũ (sau khi đã thay thế)
- [ ] Kiểm tra `package.json` — xóa json-server nếu có
- [ ] Test toàn bộ flow: đăng ký → đăng nhập → chơi game → leaderboard

---

## Tổng thời gian ước tính

| Phase | Nội dung | Thời gian |
|---|---|---|
| 1 | Setup Firebase | 30 phút |
| 2 | Data structure | 1 giờ |
| 3 | Security Rules | 1 giờ |
| 4 | Viết lại api.ts | 1 giờ |
| 5 | Viết lại store.tsx | 2-3 giờ |
| 6 | Migrate data | 1 giờ |
| 7 | Dọn dẹp + test | 30 phút |
| **Tổng** | | **~7 giờ** |

---

## Lưu ý quan trọng

1. **Không xóa json-server** cho đến khi test Firebase xong hoàn toàn
2. **Backup `sample-data.json`** trước khi migrate
3. **Test trên branch riêng** — không làm trực tiếp trên `main`
4. Firebase free tier giới hạn **50,000 reads/ngày** — đủ dùng cho app học sinh quy mô nhỏ
