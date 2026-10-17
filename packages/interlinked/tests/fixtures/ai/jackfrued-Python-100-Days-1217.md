### Describe the bug

Several markdown files in `Python-100-Days` reference images that do not load when browsing the repository on GitHub:

1. **Absolute local macOS path committed into markdown:**
   - File: `Day46-60/47.深入模型.md` (line 292):
     ```markdown
     ![](/Users/Hao/Desktop/Python-100-Days/Day41-55/res/django-admin-login.png)
     ```
   - On GitHub this renders as a broken link because it points to the author's local desktop path. `Day41-55/res/django-admin-login.png` does not exist in the repository (HTTP 404).

2. **Missing in-repo assets:**
   - `Day01-20/11.常用数据结构之字符串.md` (line 5):
     `<img src="res/day11/eniac.jpg" style="zoom:50%;">`
     Target `Day01-20/res/day11/eniac.jpg` returns **HTTP 404** (not in repo tree).
   - `Day36-45/45.Hive实战.md`:
     References `res/QQ20220708-235815@2x.png` and `res/QQ20220707-195545@2x.png` — neither file exists in `Day36-45/res/` (both **HTTP 404**).

3. **`localhost` URLs referenced in public markdown:**
   - `Day36-45/39.SQL详解之DQL.md`: `http://localhost/mypic/20211121135117.png`
   - `Day36-45/42.视图、函数和过程.md`: `http://localhost/mypic/20211121225327.png`
   - These point to `localhost` and cannot load for any reader.

### Steps to reproduce

1. Open https://github.com/jackfrued/Python-100-Days/blob/master/Day46-60/47.深入模型.md#L292
2. Open https://github.com/jackfrued/Python-100-Days/blob/master/Day01-20/11.常用数据结构之字符串.md#L5
3. `curl -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/jackfrued/Python-100-Days/master/Day01-20/res/day11/eniac.jpg` → 404
4. `curl -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/jackfrued/Python-100-Days/master/Day41-55/res/django-admin-login.png` → 404

### Suggested fix

- Fix the local desktop path in `Day46-60/47.深入模型.md` and commit the missing screenshot.
- Restore or replace the missing images in `Day01-20/res/day11/` and `Day36-45/res/`.
- Replace the `http://localhost/mypic/...` image URLs with the public CDN/repository URLs.

### Additional context

Found during a systematic documentation-rot audit of open source repositories (<https://codebyaurora.com/docrot/>).
