# SecureVault — React Native Build Prompt

> Copy this entire file and paste it to any AI assistant (Claude, GPT-4, Gemini, Cursor, etc.) to generate the full app.

---

## What to Build

A **React Native Expo app** called **SecureVault** — an encrypted credential manager. No backend, no server, no internet required. The app opens directly to the home screen. There is **no master password, no login screen, and no app lock**. The only security feature is that all credential data is **automatically encrypted at rest** using AES-256 — so even if someone accesses the device storage or the exported backup file, the data is unreadable without the hardcoded encryption key baked into the app.

---

## Tech Stack

| Purpose | Library |
|---|---|
| Framework | Expo ~51 (managed workflow) |
| Navigation | `@react-navigation/native` + `@react-navigation/native-stack` |
| Encryption | `crypto-js` (AES-256-CBC) |
| Local Storage | `@react-native-async-storage/async-storage` |
| Notifications | `expo-notifications` |
| File Export | `expo-file-system` + `expo-sharing` |
| File Import | `expo-document-picker` |
| Haptics | `expo-haptics` |
| Gradient | `expo-linear-gradient` |
| Date Picker | `@react-native-community/datetimepicker` |

### package.json dependencies

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-status-bar": "~1.12.1",
    "expo-file-system": "~17.0.1",
    "expo-sharing": "~12.0.1",
    "expo-document-picker": "~12.0.2",
    "expo-notifications": "~0.28.9",
    "expo-device": "~6.0.2",
    "expo-constants": "~16.0.2",
    "expo-haptics": "~13.0.1",
    "expo-linear-gradient": "~13.0.2",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@react-navigation/native": "^6.1.17",
    "@react-navigation/native-stack": "^6.9.26",
    "@react-native-community/datetimepicker": "^8.2.0",
    "react-native-screens": "~3.31.1",
    "react-native-safe-area-context": "4.10.5",
    "react-native-gesture-handler": "~2.16.1",
    "crypto-js": "^4.2.0",
    "react": "18.2.0",
    "react-native": "0.74.1"
  }
}
```

---

## File Structure

Generate every file listed below with full working code:

```
SecureVault/
├── App.js
├── app.json
├── package.json
├── babel.config.js
├── src/
│   ├── theme.js
│   ├── context/
│   │   └── VaultContext.js
│   ├── utils/
│   │   ├── crypto.js
│   │   ├── storage.js
│   │   └── notifications.js
│   ├── components/
│   │   ├── Toast.js
│   │   ├── CredentialCard.js
│   │   ├── TagChip.js
│   │   ├── StatBox.js
│   │   └── SectionCard.js
│   └── screens/
│       ├── HomeScreen.js
│       ├── AddEditScreen.js
│       ├── DetailScreen.js
│       └── SettingsScreen.js
```

---

## Encryption Implementation (crypto.js)

There is no master password. Use a **hardcoded secret key** constant defined in `crypto.js`:

```js
const SECRET_KEY = 'sv$3cur3V@ult!K3y#2024$AES256';
```

### Encrypt a string
- Generate a random **16-byte IV** using `CryptoJS.lib.WordArray.random(16)`
- Encrypt: `CryptoJS.AES.encrypt(plaintext, SECRET_KEY, { iv })`
- Store as: `ivBase64::ciphertext` (double colon separator)

### Decrypt a string
- Split stored value by `"::"` to get IV and ciphertext
- Parse IV: `CryptoJS.enc.Base64.parse(ivBase64)`
- Decrypt: `CryptoJS.AES.decrypt(ciphertext, SECRET_KEY, { iv })`
- Return: `decryptedBytes.toString(CryptoJS.enc.Utf8)`

### Usage
- Every time a credential is **saved or updated**, the `data` field is encrypted using `encrypt()`
- Every time a credential's data is **displayed**, it is decrypted on-demand using `decrypt()`
- The raw stored `encData` string is never shown in the UI — always decrypt before rendering

---

## Data Model

```js
// AsyncStorage key: "sv_data" → JSON.stringify(Array of CredentialObject)

// CredentialObject shape:
{
  id: string,               // Date.now().toString()
  title: string,            // plain text — e.g. "Gmail"
  encData: string,          // "ivBase64::ciphertext" — AES-256 encrypted
  tags: string,             // comma-separated plain text — e.g. "work,email"
  reminder: string | null,  // ISO 8601 datetime string or null
  rFired: boolean,          // true after reminder notification has been triggered
  createdAt: string,        // ISO datetime
  updatedAt: string         // ISO datetime
}
```

> Note: Only the `encData` field is encrypted. Title, tags, and reminder are stored as plain text.

---

## Context & State (VaultContext.js)

Use React Context + `useState`. Load credentials from AsyncStorage on app start. Expose:

```js
{
  credentials,                   // CredentialObject[]

  loadCredentials(),             // read from AsyncStorage on mount
  addCredential(formData),       // encrypt data → push → save
  editCredential(id, formData),  // re-encrypt data → update → save
  deleteCredential(id),          // filter out → save
  importCredentials(array),      // merge by id, no duplicates → save
  removeReminder(id),            // set reminder: null, rFired: false → save
  markReminderFired(id),         // set rFired: true → save
}
```

Call `loadCredentials()` inside a `useEffect` on mount in `VaultProvider`.

---

## Screens

### HomeScreen.js

**Header:**
- Left: "🔐 SecureVault" bold gradient logo text (green → blue using LinearGradient or MaskedView)
- Right: search icon button (toggles search bar) + settings icon (navigates to SettingsScreen)

**Search Bar** (shown when search icon is tapped):
- Animated slide-down TextInput
- Filters `credentials` by `title` or `tags` in real-time (case-insensitive)

**Stats row:**
- Credential count label: "{n} credentials"
- If any upcoming unfired reminders exist: amber badge "⏰ {n} upcoming"

**Credential Grid:**
- `FlatList` with `numColumns={2}`
- Each item renders `<CredentialCard>`
- Empty state: centered "🗄️" icon + "Vault is empty" text + "Tap + to add your first credential"

**FAB (Floating Action Button):**
- Bottom-right green circle with "+" icon
- `expo-haptics.impactAsync(Light)` on press
- Navigates to AddEditScreen with `{ mode: 'add' }`

**Reminder polling:**
- `useEffect` + `setInterval` every 60 seconds while screen is focused
- Check credentials where `reminder !== null && !rFired && new Date(reminder) <= new Date()`
- For each match: call `markReminderFired(id)` + show in-app `<Toast>` "⏰ Reminder: {title}"

---

### AddEditScreen.js

Receives `route.params`: `{ mode: 'add' | 'edit', credential?: CredentialObject }`

In **edit mode**: immediately call `decrypt(credential.encData)` to pre-fill the data field.

**Form Fields:**

1. **Title** — `TextInput`, required, placeholder "e.g. Gmail, GitHub, Bank Login"
2. **Data** — multiline `TextInput`, required, monospace font
   - Label: "Data (auto-encrypted when saved)"
   - Placeholder:
     ```
     username: john@email.com
     password: mypassword123
     notes: 2FA enabled on this account
     ```
3. **Tags** — `TextInput`, placeholder "social, work, finance"
4. **Reminder** — Row with:
   - "Set Reminder" label + current value shown if set
   - "Set" button → opens `DateTimePicker` (mode="datetime")
   - "Clear" button shown only if reminder is already set

**Save Button:**
- Label: "💾 Save"
- Shows loading spinner while encrypting
- On success: encrypt data field → call `addCredential()` or `editCredential()` → `expo-haptics.notificationAsync(Success)` → show Toast "✓ Saved" → `navigation.goBack()`
- Inline validation: red error text shown below field if title or data is empty

Use `KeyboardAvoidingView` wrapping the whole screen + `ScrollView` inside.

---

### DetailScreen.js

Receives `route.params`: `{ credential: CredentialObject }`

**Layout:**
- Large bold title
- Tag chips row (using `<TagChip>` components)
- Reminder badge: amber "⏰ {datetime}" if upcoming, gray "✓ Reminded" if already fired

**Data Section:**
- Default state: a tappable box showing "🔒 Tap to reveal data" with muted styling
- On tap: call `decrypt(credential.encData)` → show result in a dark monospace block with green `#00e5a0` text
- Revealed state action row: "👁️ Hide" button + "📋 Copy" button (copies to clipboard via `expo-clipboard` → Toast "Copied!")
- Automatically hide data when the screen loses focus (use `useFocusEffect` cleanup)

**Action Buttons:**
- "✏️ Edit" → navigate to AddEditScreen with `{ mode: 'edit', credential }`
- "🗑️ Delete" → inline confirmation row: "Delete '{title}'? [Yes, Delete] [Cancel]" — on confirm: `deleteCredential(id)` + `expo-haptics.notificationAsync(Error)` + `navigation.goBack()`

**Footer:**
- Small muted text: "Created {date} · Updated {date}"

---

### SettingsScreen.js

Scrollable screen with `SectionCard` groupings:

**1. Overview**
Three `StatBox` components in a horizontal row:
- Total Credentials
- Reminders Set
- Tagged Items

**2. Backup & Restore**
- **"📤 Export Vault"** button:
  - Build JSON: `{ v: 1, exportedAt: new Date().toISOString(), data: credentials }`
  - Write to `expo-file-system` cache directory as `vault_backup_{timestamp}.json`
  - Open native share sheet via `expo-sharing`
  - Small info note below button: "Credential data is AES-256 encrypted inside the exported file"
- **"📥 Import Backup"** button:
  - Open file picker via `expo-document-picker` (type: `application/json`)
  - Read file, parse JSON → call `importCredentials(parsed.data)`
  - Toast "✓ Imported {n} credentials" on success
  - Toast error "Invalid backup file" if parsing fails
- **"☁️ Export + Open Google Drive"** button:
  - Runs export first, then opens `https://drive.google.com` via `Linking.openURL`

**3. Reminders**
- List all credentials that have `reminder !== null`
- Each row: credential title on left | datetime string or "✓ Fired" label | "Remove" button on right
- Empty state text: "No reminders set."
- Info note: "App checks every 60 seconds for due reminders while open."

**4. Danger Zone** (red bordered `SectionCard` with `dangerBorder={true}`)
- **"🗑️ Clear All Credentials"** button (red styled)
- On press: show inline confirmation row "Delete all credentials? [Yes, Clear] [Cancel]"
- On confirm: clear `sv_data` from AsyncStorage → `loadCredentials()` → Toast "Vault cleared" + `expo-haptics.notificationAsync(Error)`

---

## Components

### CredentialCard.js
```
Props: { credential, onPress }

- Pressable with scale animation to 0.97 on press (use Animated or Pressable style callback)
- Background: COLORS.surf with border COLORS.border
- 2px top gradient accent bar (green → blue) — show only when pressed
- Title: bold, 14px, COLORS.textBright
- Tag chips row below title (max 3 visible, "+N more" label if overflow)
- Reminder badge: amber pill if upcoming, gray "✓" text if fired
- Updated date: bottom right, 11px, COLORS.muted
```

### Toast.js
```
Props: { visible, message, type: 'ok' | 'err' | 'warn' }

- Positioned absolute at bottom center, above FAB
- Animated: translateY slide up + opacity fade in on show
- Auto-dismiss after 3.5 seconds
- Rounded pill shape, dark background
- Border + text color per type:
  ok   → COLORS.accent (green)
  err  → COLORS.err (red)
  warn → COLORS.warn (amber)
- Expose via a useToast() hook (ToastContext with show(message, type) method)
```

### TagChip.js
```
Props: { label }
- Small rounded pill
- Background: rgba(0, 229, 160, 0.09)
- Border: rgba(0, 229, 160, 0.2), width 1
- Text: #00c887, 11px, fontWeight 500
- Padding: 2px horizontal 8px, vertical 3px
```

### StatBox.js
```
Props: { number, label }
- flex: 1, dark surface background, rounded corners, border
- Center-aligned content
- Number: 24px bold, COLORS.accent
- Label: 11px, COLORS.muted, marginTop 2
```

### SectionCard.js
```
Props: { title, children, dangerBorder }
- Background: COLORS.surf, border: COLORS.border (or rgba(255,71,87,0.3) if dangerBorder)
- Border radius: RADIUS.lg
- Padding: SPACING.md
- Bold section title 13px at top, COLORS.textBright
- Children below with marginTop SPACING.sm
```

---

## Theme (theme.js)

```js
import { Platform } from 'react-native';

export const COLORS = {
  bg:         '#070a0e',
  surf:       '#0d1319',
  surf2:      '#121b26',
  surf3:      '#18253a',
  border:     '#1a2d40',
  border2:    '#243855',
  accent:     '#00e5a0',
  accentDim:  'rgba(0,229,160,0.09)',
  accent2:    '#0ea5e9',
  text:       '#c4d4e8',
  textBright: '#e8f4ff',
  muted:      '#4a6a85',
  muted2:     '#2a4260',
  err:        '#ff4757',
  warn:       '#ffb700',
};

export const RADIUS  = { sm: 8, md: 12, lg: 16, xl: 20, pill: 30 };
export const SPACING = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };
export const FONT_MONO = Platform.select({ ios: 'Courier New', android: 'monospace' });
```

---

## Notifications (notifications.js)

```js
// requestPermissions():
// - Request alert + badge + sound permissions via expo-notifications
// - Call this once on app launch

// scheduleReminder(credentialId, credentialTitle, isoDatetime):
// - Look up any existing notification ID stored in AsyncStorage at key sv_notif_{credentialId}
// - If found, cancel it first via expo-notifications
// - Schedule a new local notification at the given datetime:
//     title: "🔐 SecureVault Reminder"
//     body: credentialTitle
// - Store the returned notification identifier in AsyncStorage at sv_notif_{credentialId}

// cancelReminder(credentialId):
// - Read sv_notif_{credentialId} from AsyncStorage
// - Cancel via expo-notifications
// - Remove key from AsyncStorage
```

---

## App.js

```js
// 1. Wrap the entire app in <VaultProvider>
// 2. Use <NavigationContainer> with a dark theme (background #070a0e, card #0d1319)
// 3. Native stack navigator with 4 screens: Home, AddEdit, Detail, Settings
// 4. All screen headers: dark background, white title, accent (#00e5a0) back button tint
// 5. Call requestPermissions() from notifications.js in a useEffect on mount
// 6. HomeScreen is the root — no back button shown
```

---

## UX Details

- All primary save/confirm actions: `expo-haptics.notificationAsync(Success)`
- Delete and clear actions: `expo-haptics.notificationAsync(Error)`
- FAB and card presses: `expo-haptics.impactAsync(Light)`
- All TextInputs: `autoCapitalize="none"`, `autoCorrect={false}`, `autoComplete="off"`
- All form screens: `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- Use `useSafeAreaInsets` from `react-native-safe-area-context` for correct bottom/top padding
- Long-press on `CredentialCard`: copy title to clipboard + haptic + Toast "Title copied"
- All screens must have a `backgroundColor: COLORS.bg` to avoid white flash on navigation

---

## Important Rules for the AI Building This

1. Generate **every single file** in the file structure — no placeholders, no "// TODO" comments
2. Every screen must have complete working logic — no mock data, no hardcoded credentials
3. `crypto.js` must have a correct working encrypt/decrypt round-trip using `crypto-js`
4. All AsyncStorage calls must be `await`-ed inside `try/catch` blocks with error handling
5. All navigation must be fully wired — every button must actually navigate to the correct screen
6. The app must run with `npx expo start` immediately after `npm install` — no extra setup
7. Handle loading states everywhere — show `ActivityIndicator` while encrypting or reading storage
8. Import/export must be lossless — export then re-import must perfectly restore all credentials
9. Do not use deprecated React Native APIs — use Expo SDK 51 compatible APIs only
10. Start with an empty vault — no hardcoded sample credentials in the initial state