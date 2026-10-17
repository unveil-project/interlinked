`DOM::XMLHttpRequest` now checks if the requested URL has the same
`Origin` as the requesting `Document`. If the requested URL is in
violation of SOP the request is rejected and an "error" `DOM::Event`
is dispatched.

Resolves #1615

---

This is a rudimentary implementation. It is restrictive. CORS requests are not supported.

I added a `dbg()` debugging statement as, given that `Browser` has not enforced SOP until now, I presume rejecting requests due to SOP violations will be unexpected and confusing for developers.

Perhaps most importantly, this change prevents random websites stealing files (https://github.com/SerenityOS/serenity/issues/1615#issuecomment-610782263 #3632).

![image](https://user-images.githubusercontent.com/434827/97771314-a6f0bc00-1b8f-11eb-913d-f331af637afa.png)

```html
<html>
  <head>
    <title>hello friends</title>
  </head>
  <body>
    Logs 1: <pre id="logs1"></pre>
    <hr/>
    Logs 2: <pre id="logs2"></pre>
    <hr/>
    Logs 3: <pre id="logs3"></pre>
    <script>
    try {
      var xhr = new XMLHttpRequest();
      xhr.addEventListener("load", function() { document.getElementById("logs1").innerText = this.responseText; });
      xhr.open("GET", "http://172.16.191.165/allowed.txt");
      xhr.send();
    } catch(e) {
      alert('error:' + e.message);
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.addEventListener("load", function() { document.getElementById("logs2").innerText = this.responseText; });
      xhr.addEventListener("error", function(error) { document.getElementById("logs3").innerText = JSON.stringify(error); });
      xhr.open("GET", "file:///etc/passwd");
      xhr.send();
    } catch(e) {
      alert('error:' + e.message);
    }
    </script>
  </body>
</html>
```
