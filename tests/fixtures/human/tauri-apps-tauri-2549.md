### **Describe the bug**
On Windows clicking on an edge of a custom titlebar (`data-tauri-drag-region` region), when the resize cursor appears, triggers a resize animation and double clicking triggers a weird change of the window's position and size. After that the app gets unresponsive.

### **To Reproduce**
1. On Windows launch a Tauri app with `"decorations": false` and a custom titlebar made with `data-tauri-drag-region` attribute.
2. Click once on the titlebar's outer edge - expect resize animation.
3. Double click in the same manner - expect weird window's position and size change.
4. After step 3 you can try blurring the window and focusing it again - expect to see a weird split of the window into two separate parts.
5. Minimizing and then maximizing through a task bar seems to restore the app's responsiveness.

### **Screenshots**
Steps 2 and 3 demonstration:

![first](https://user-images.githubusercontent.com/46848997/131245867-13ccc6e0-26ac-447b-8ba4-c6e1af2ffd76.gif)

### **Platform and Versions:**
```
Operating System - Windows, version 10.0.19043 X64
Webview2 - 92.0.902.84

Node.js environment
  Node.js - 14.15.0
  @tauri-apps/cli - 1.0.0-beta.10
  @tauri-apps/api - 1.0.0-beta.8

Global packages
  npm - 6.14.8
  yarn - 1.22.11

Rust environment
  rustc - 1.54.0
  cargo - 1.54.0

App directory structure
/.git
/.vscode
/dist
/node_modules
/src
/src-tauri

App
  tauri.rs - 1.0.0-beta.7
  build-type - bundle
  CSP - default-src blob: data: filesystem: ws: wss: http: https: tauri: 'unsafe-eval' 'unsafe-inline' 'self' img-src: 'self'
  distDir - ../dist
  devPath - http://localhost:3000
```

### **Additional context**
I couldn't reproduce the issue on Wry `custom_titlebar` example. A couple of people in Discord managed to reproduce the issue on Tauri.
