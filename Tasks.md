# TASK: Build SecureVault React Native App

## Agent Instructions
You are a senior React Native developer. Your job is to build the complete **SecureVault** app by completing every task below in order. Do not skip any task. Do not move to the next task until the current one is fully complete. After completing all tasks, the app must run with `npx expo start` without any errors.

---

## Project Overview
- App name: **SecureVault**
- A credential manager where users store title + data entries
- All data is AES-256-CBC encrypted before saving to AsyncStorage
- No login, no master password — app opens directly to home screen
- Fully offline, no API calls

---

## PHASE 1 — Project Setup

### Task 1.1 — Initialize project
- [ ] Create a new Expo managed project using `npx create-expo-app SecureVault`
- [ ] Navigate into the project directory

### Task 1.2 — Install all dependencies
Run the following install command:
```bash
npx expo install expo-file-system expo-sharing expo-document-picker expo-notifications expo-device expo-constants expo-haptics expo-linear-gradient @react-native-async-storage/async-storage @react-navigation/native @react-navigation/native-stack @react-native-community/datetimepicker react-native-screens react-native-safe-area-context react-native-gesture-handler
```
Then install via npm:
```bash
npm install crypto-js
```

### Task 1.3 — Create folder structure
Create the following folders inside the project:
```
src/
src/context/
src/utils/
src/components/
src/screens/
```

### Task 1.4 — Create babel.config.js
Content:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

### Task 1.5 — Update app.json
Set the following fields:
- `name`: "SecureVault"
- `slug`: "securevault"
- `userInterfaceStyle`: "dark"
- `android.package`: "com.securevault.app"
- `ios.bundleIdentifier`: "com.securevault.app"
- Add `expo-notifications` plugin with icon color `#00e5a0`

---

## PHASE 2 — Foundation Files

### Task 2.1 — Create src/theme.js
Export the following constants:
```js
COLORS = {
  bg: '#070a0e', surf: '#0d1319', surf2: '#121b26', surf3: '#18253a',
  border: '#1a2d40', border2: '#243855',
  accent: '#00e5a0', accentDim: 'rgba(0,229,160,0.09)', accent2: '#0ea5e9',
  text: '#c4d4e8', textBright: '#e8f4ff',
  muted: '#4a6a85', muted2: '#2a4260',
  err: '#ff4757', warn: '#ffb700',
}
RADIUS  = { sm: 8, md: 12, lg: 16, xl: 20, pill: 30 }
SPACING = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 }
FONT_MONO = Platform.select({ ios: 'Courier New', android: 'monospace' })
```

### Task 2.2 — Create src/utils/crypto.js
- Define hardcoded `SECRET_KEY = 'sv$3cur3V@ult!K3y#2024$AES256'`
- Implement `encrypt(plaintext)`:
  - Generate random 16-byte IV via `CryptoJS.lib.WordArray.random(16)`
  - Encrypt with `CryptoJS.AES.encrypt(plaintext, SECRET_KEY, { iv })`
  - Return `ivBase64::ciphertext` string
- Implement `decrypt(encString)`:
  - Split by `"::"`  to get ivBase64 and ciphertext
  - Parse IV via `CryptoJS.enc.Base64.parse(ivBase64)`
  - Decrypt with `CryptoJS.AES.decrypt(ciphertext, SECRET_KEY, { iv })`
  - Return `decryptedBytes.toString(CryptoJS.enc.Utf8)`
- Export both functions
- Verify the round-trip works: `decrypt(encrypt("hello")) === "hello"`

### Task 2.3 — Create src/utils/storage.js
Implement and export these async functions, all wrapped in try/catch:
- `loadCredentials()` → reads `sv_data` from AsyncStorage, returns parsed array or `[]`
- `saveCredentials(array)` → JSON.stringifies and saves to `sv_data`
- `clearCredentials()` → removes `sv_data` from AsyncStorage

### Task 2.4 — Create src/utils/notifications.js
Implement and export:
- `requestPermissions()` → requests alert + badge + sound via `expo-notifications`
- `scheduleReminder(credentialId, title, isoDatetime)`:
  - Cancel existing notification if `sv_notif_{credentialId}` exists in AsyncStorage
  - Schedule local notification at given datetime
  - Store returned notification ID in AsyncStorage at `sv_notif_{credentialId}`
- `cancelReminder(credentialId)`:
  - Read `sv_notif_{credentialId}`, cancel via expo-notifications, remove from AsyncStorage

### Task 2.5 — Create src/context/VaultContext.js
- Create `VaultContext` and `VaultProvider` component
- State: `credentials` (array), `loading` (boolean)
- Implement all methods and expose via context:
  - `loadCredentials()` — loads from storage into state
  - `addCredential({ title, data, tags, reminder })` — encrypts data, creates credential object with `id: Date.now().toString()`, `createdAt`, `updatedAt`, pushes to array, saves
  - `editCredential(id, { title, data, tags, reminder })` — re-encrypts data, updates matching credential, saves
  - `deleteCredential(id)` — filters out, saves
  - `importCredentials(array)` — merges by id, no duplicates, saves
  - `removeReminder(id)` — sets `reminder: null`, `rFired: false`, saves
  - `markReminderFired(id)` — sets `rFired: true`, saves
- Call `loadCredentials()` in `useEffect` on mount inside `VaultProvider`
- Export `useVault()` custom hook that returns context value

---

## PHASE 3 — Components

### Task 3.1 — Create src/components/TagChip.js
- Props: `{ label }`
- Small rounded pill
- Background `rgba(0,229,160,0.09)`, border `rgba(0,229,160,0.2)`
- Text color `#00c887`, size 11, weight 500
- Padding: 2 vertical, 8 horizontal

### Task 3.2 — Create src/components/StatBox.js
- Props: `{ number, label }`
- `flex: 1`, background `COLORS.surf2`, border `COLORS.border`, rounded `RADIUS.md`
- Center-aligned: large bold number in `COLORS.accent`, small muted label below

### Task 3.3 — Create src/components/SectionCard.js
- Props: `{ title, children, dangerBorder }`
- Background `COLORS.surf`, border color: `COLORS.border` normally, `rgba(255,71,87,0.3)` if `dangerBorder`
- Border radius `RADIUS.lg`, padding `SPACING.md`
- Bold 13px title in `COLORS.textBright` at top
- Render children below with `marginTop: SPACING.sm`

### Task 3.4 — Create src/components/Toast.js
- Props: `{ visible, message, type }`
- Absolute positioned at bottom center (bottom: 90, zIndex: 999)
- `Animated.Value` for translateY (start 20 → 0) and opacity (0 → 1)
- Auto-dismiss after 3500ms
- Rounded pill shape, dark background `COLORS.surf2`
- Border + text color: green for `ok`, red for `err`, amber for `warn`
- Export a `ToastContext` and `useToast()` hook with `show(message, type)` method
- `ToastProvider` wraps the app and renders the Toast component

### Task 3.5 — Create src/components/CredentialCard.js
- Props: `{ credential, onPress }`
- `Pressable` with `Animated` scale: animate to `0.96` on press, back to `1` on release
- Background `COLORS.surf`, border `COLORS.border`, radius `RADIUS.md`
- 2px top bar with `LinearGradient` (green → blue), shown always (subtle) or brighter on press
- Title: bold 14px `COLORS.textBright`
- Tags row: render `<TagChip>` for each tag (max 3, show "+N" if more)
- Reminder badge: amber pill if upcoming (`reminder && !rFired && date in future`), gray "✓" text if `rFired`
- Updated date: bottom right, 11px `COLORS.muted`
- Full card padding: `SPACING.md`

---

## PHASE 4 — Screens

### Task 4.1 — Create src/screens/HomeScreen.js
Implement the following in order:

**State:**
- `search` string, `showSearch` boolean

**Header:**
- Left: "🔐 SecureVault" text styled bold with gradient colors (use inline color `COLORS.accent` if LinearGradient masking is complex)
- Right: search icon `Pressable` (toggles `showSearch`) + settings icon `Pressable` (navigates to Settings)

**Search bar:**
- `Animated.Value` for height (0 → 44) that animates when `showSearch` changes
- `TextInput` inside with placeholder "Search credentials or tags…"
- Filters `credentials` from `useVault()` by title or tags (case-insensitive)

**Stats row:**
- Show "{n} credentials" label
- If upcoming reminders exist: amber badge "⏰ {n} upcoming"

**FlatList:**
- `data`: filtered credentials array
- `numColumns={2}`, `columnWrapperStyle` with gap
- `renderItem`: `<CredentialCard credential={item} onPress={() => navigate('Detail', { credential: item })} />`
- `ListEmptyComponent`: centered 🗄️ icon + "Vault is empty" + "Tap + to add"

**FAB:**
- Position absolute bottom-right
- Green circle, "+" text, size 56
- `expo-haptics.impactAsync('Light')` on press
- Navigates to `AddEdit` with `{ mode: 'add' }`

**Reminder polling:**
- `useEffect` with `setInterval(60000)` while screen is focused
- Check due reminders → `markReminderFired(id)` + `toast.show("⏰ " + title, 'warn')`

**Request notification permissions on mount**

### Task 4.2 — Create src/screens/AddEditScreen.js
Implement the following in order:

**Route params:** `{ mode: 'add' | 'edit', credential? }`

**State:** `title`, `data`, `tags`, `reminder` (Date or null), `loading`, `errors`, `showDatePicker`

**On mount in edit mode:**
- Call `decrypt(credential.encData)` and set as `data`
- Pre-fill `title`, `tags`, `reminder` from credential

**Form:**
1. Title `TextInput` — required
2. Data `TextInput` — multiline, monospace, required, label "Data (auto-encrypted when saved)"
3. Tags `TextInput` — optional
4. Reminder row:
   - Show current datetime if set, else "Not set"
   - "Set" button → `setShowDatePicker(true)`
   - "Clear" button → `setReminder(null)` (only shown if reminder is set)
   - `DateTimePicker` modal when `showDatePicker` is true

**Validation:**
- Show red error text below title if empty
- Show red error text below data if empty

**Save button:**
- Shows `ActivityIndicator` when `loading` is true
- On press:
  1. Validate fields
  2. `setLoading(true)`
  3. Call `addCredential()` or `editCredential()` from context
  4. If reminder is set: call `scheduleReminder(id, title, reminder.toISOString())`
  5. If reminder is cleared in edit mode: call `cancelReminder(id)`
  6. Haptic success
  7. Toast "✓ Saved"
  8. `navigation.goBack()`

**Wrap in `KeyboardAvoidingView` + `ScrollView`**

### Task 4.3 — Create src/screens/DetailScreen.js
Implement the following in order:

**Route params:** `{ credential }`

**State:** `revealed` boolean, `decryptedData` string, `deleteConfirm` boolean

**On screen blur (useFocusEffect cleanup):** set `revealed = false`, clear `decryptedData`

**Header section:**
- Large bold title
- `<TagChip>` for each tag
- Reminder badge: amber pill if upcoming, gray "✓ Reminded" if fired

**Data section:**
- If `!revealed`: render tappable dark box "🔒 Tap to reveal data"
- On tap: `decrypt(credential.encData)` → set `decryptedData` → `setRevealed(true)`
- If `revealed`: render dark monospace block with `decryptedData` in `COLORS.accent` text
- Below revealed data: "👁️ Hide" button + "📋 Copy" button

**Copy button:**
- `expo-clipboard` or `Clipboard` from `react-native` to copy `decryptedData`
- Haptic light + Toast "Copied!"

**Action buttons:**
- "✏️ Edit" → navigate to AddEdit with `{ mode: 'edit', credential }`
- "🗑️ Delete" → show inline confirm row if `deleteConfirm` is true
  - Confirm row: "Delete '{title}'?" + "Yes, Delete" (red) + "Cancel" buttons
  - On confirm: `deleteCredential(id)` + haptic error + `navigation.goBack()`

**Footer:**
- "Created {date} · Updated {date}" muted small text

### Task 4.4 — Create src/screens/SettingsScreen.js
Implement the following in order — all wrapped in `ScrollView`:

**Section 1 — Overview:**
- 3 `<StatBox>` in a row: total credentials, reminders count, tagged count

**Section 2 — Backup & Restore:**
- Export button:
  - Build `{ v: 1, exportedAt, data: credentials }` JSON
  - Write to `FileSystem.cacheDirectory + 'vault_backup_' + Date.now() + '.json'`
  - `Sharing.shareAsync(filePath)`
  - Toast "📦 Exported"
- Import button:
  - `DocumentPicker.getDocumentAsync({ type: 'application/json' })`
  - Read file with `FileSystem.readAsStringAsync`
  - Parse JSON → `importCredentials(parsed.data)`
  - Toast "✓ Imported {n} credentials" or error toast
- Export + Open Drive button:
  - Run export → `Linking.openURL('https://drive.google.com')`

**Section 3 — Reminders:**
- Map over `credentials.filter(c => c.reminder)`
- Each row: title | datetime or "✓ Fired" | "Remove" button → `removeReminder(id)` + `cancelReminder(id)`
- Empty state: "No reminders set."

**Section 4 — Danger Zone (dangerBorder):**
- State: `clearConfirm` boolean
- "🗑️ Clear All Credentials" red button
- If `clearConfirm`: show confirm row "Delete all? [Yes, Clear] [Cancel]"
- On confirm: `clearCredentials()` + `loadCredentials()` + Toast "Vault cleared" + haptic error + `setClearConfirm(false)`

---

## PHASE 5 — App Entry Point

### Task 5.1 — Create App.js
- Import `NavigationContainer` from `@react-navigation/native`
- Import `createNativeStackNavigator` from `@react-navigation/native-stack`
- Import all 4 screens
- Wrap in `<ToastProvider>` → `<VaultProvider>` → `<NavigationContainer>`
- Navigation theme: `{ colors: { background: '#070a0e', card: '#0d1319', text: '#c4d4e8', border: '#1a2d40', primary: '#00e5a0' } }`
- Stack screens: `Home`, `AddEdit`, `Detail`, `Settings`
- All screen options: `headerStyle: { backgroundColor: '#0d1319' }`, `headerTintColor: '#00e5a0'`, `headerTitleStyle: { color: '#c4d4e8' }`
- Home screen: `headerShown: false`
- Call `requestPermissions()` from notifications.js in a `useEffect` on mount

---

## PHASE 6 — Final Checks

### Task 6.1 — Verify crypto round-trip
- Open `src/utils/crypto.js`
- Mentally trace: `decrypt(encrypt("test data"))` must return `"test data"`
- Fix any issues with IV handling or key format

### Task 6.2 — Verify navigation flow
Check every navigation path works:
- [ ] HomeScreen → AddEditScreen (add mode) via FAB
- [ ] HomeScreen → DetailScreen via card tap
- [ ] HomeScreen → SettingsScreen via settings icon
- [ ] DetailScreen → AddEditScreen (edit mode) via Edit button
- [ ] DetailScreen → HomeScreen via Delete confirmation
- [ ] AddEditScreen → HomeScreen via back (after save or cancel)

### Task 6.3 — Verify context wiring
- [ ] `addCredential` encrypts and saves, HomeScreen re-renders with new card
- [ ] `editCredential` re-encrypts and updates
- [ ] `deleteCredential` removes from list
- [ ] `importCredentials` merges without duplicates
- [ ] `markReminderFired` updates badge on card

### Task 6.4 — Verify export/import cycle
- Export vault → produces valid JSON file
- Import same file → no new credentials added (all IDs already exist)
- Import a file with 1 new credential → exactly 1 credential added

### Task 6.5 — Run and test
```bash
npm install
npx expo start
```
- App opens directly to HomeScreen (no login)
- Add a credential → verify it appears as a card
- Tap card → tap reveal → verify decrypted data matches what was entered
- Export → check file is valid JSON with `encData` fields (not plaintext)

---

## Completion Checklist

- [ ] Phase 1 complete — project set up, dependencies installed, folders created
- [ ] Phase 2 complete — theme, crypto, storage, notifications, context all working
- [ ] Phase 3 complete — all 5 components built
- [ ] Phase 4 complete — all 4 screens built with full logic
- [ ] Phase 5 complete — App.js wired with navigation and providers
- [ ] Phase 6 complete — all verifications passed, app runs without errors

---

## Constraints

- Do not use any external APIs or make network requests (except `Linking.openURL` for Google Drive)
- Do not add any login screen or password prompt
- Do not store decrypted data anywhere — only in component state while screen is active
- All `AsyncStorage` and `FileSystem` calls must have try/catch
- Do not use class components — functional components with hooks only
- Do not use any deprecated React Native or Expo APIs
- Minimum iOS 13, minimum Android SDK 21
