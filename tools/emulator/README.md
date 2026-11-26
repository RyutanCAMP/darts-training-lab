# Firestore emulator tests (manual)

CI only runs `tools/tests/test_phone.py` (fake backend). Run these by hand when `firestore.rules` or the PHONE LINK
code changes. They use the real Firebase JS SDK, the real rules and the Android app's REST client.

```bash
mkdir emu && cd emu && npm init -y && npm i firebase-tools@13 firebase@10.14.1
cp ../firestore.rules . && echo '{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8085,"host":"127.0.0.1"},"ui":{"enabled":false}}}' > firebase.json
npx firebase emulators:start --only firestore --project darts-training-lab
```

Rules spot-check (another terminal; expected 200 then 403s):

```bash
B='http://127.0.0.1:8085/v1/projects/darts-training-lab/databases/(default)/documents'
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$B/links?documentId=K7M2PQ9X" -H 'Content-Type: application/json' -d '{"fields":{"v":{"integerValue":"1"},"createdAt":{"integerValue":"1"}}}'
curl -s -o /dev/null -w "%{http_code}\n" "$B/links"
```

Android REST client: see darts-throw-watcher `jvm-test/README.md` (`ALL PASS`).

Browser end-to-end (PC page ⇄ emulator ⇄ Android REST client):

```bash
python3 tools/emulator/e2e_phone.py emu/node_modules/firebase ../darts-throw-watcher/jvm-test/build/install/throw-watcher-jvm-test/bin/throw-watcher-jvm-test
```
