# 🔧 Fix tabCapture API Loading Issue

## **Root Cause**: Extension not loaded in correct context

The `tabCapture.capture is not a function` error occurs when the extension is **not loaded as a Chrome extension** but instead accessed via localhost or regular web page.

## **Step-by-Step Fix:**

### **1. Build the Extension**

```bash
npm run build
```

### **2. Load Extension in Chrome**

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `dist` folder from your project
5. Verify the extension appears in the list

### **3. Verify API Loading**

1. After loading the extension, click **"Inspect views: service worker"** on your extension card
2. Check the console for debug output
3. You should see: `✅ tabCapture API found`

### **4. Test the Extension**

1. Click the extension icon in Chrome toolbar
2. Try the "Start Capture" button
3. Check the background script console for any errors

## **Common Issues & Solutions:**

| Issue                        | Solution                                     |
| ---------------------------- | -------------------------------------------- |
| Testing on localhost:3000    | ❌ Won't work - must use chrome://extensions |
| Extension not reloaded       | ✅ Click refresh icon on extension card      |
| Manifest changes not applied | ✅ Remove and re-add extension               |
| Service worker inactive      | ✅ Click extension icon or refresh page      |

## **Expected Console Output (Background Script):**

```
🔍 DEBUG: Chrome Extension API Check
Extension Context: {
  hasChromeRuntime: true,
  hasChromeTabs: true,
  hasChromeTabCapture: true,
  manifestVersion: 3
}
✅ tabCapture API found
```

## **If Still Having Issues:**

1. Check `chrome://extensions` → your extension → "Errors" button
2. Ensure you're using Chrome 88+ (Manifest V3 requirement)
3. Verify the extension ID matches in your popup code
