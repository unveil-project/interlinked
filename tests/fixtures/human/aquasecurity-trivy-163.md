this changes handling of specify ignorefile

## why change
- I want to scan many container images on one working space
- my situation is want Trivy on 1 pod to scan some container images
  - but, the whitelist(.trivyignore) of each container image was less common vulnerabilities to ignore
  - In other words, each image has a different vulnerability that want Trivy to ignore.
- However, Trivy could not specify ignore file

##  changes
- Add Flag "--ignorefile value" in main.go to use as specific ignorefile

- modify pkg/vulnsrc/vulnerability/vulnerability.go, FillAndFilter()
  - pass specific ignorefile string to FillAndFilter() as argument

- modify pkg/vulnsrc/vulnerability/vulnerability.go, getIgnoreIDs()
  - pass specific ignorefile to getIgnoredIDs() as argument only when specified ignorefile
  - pass default(.trivyignore) to getIgnoreIDs() as argument If not specified

- If the specified ignorefile does not exist, the default .trivyignore is read

## Expected results

#### Development environment

- Mac OS Sierra
- Golang  : go version go1.13 darwin/amd64
- Trivy : trivy version 0.1.6
- scan target : alpine:3.10


### Default scan (not specify ignorefile)

<details>

```
$ go run cmd/trivy/main.go --debug alpine:3.10
2019-09-24T18:17:15.614+0900  DEBUG cache dir:  /Users/Snow-HardWolf/Library/Caches/trivy
2019-09-24T18:17:15.615+0900  DEBUG db path: /Users/Snow-HardWolf/Library/Caches/trivy/db/trivy.db
2019-09-24T18:17:15.635+0900  INFO  Updating vulnerability database...
2019-09-24T18:17:15.635+0900  DEBUG git pull
2019-09-24T18:17:17.695+0900  DEBUG total updated files: 1
2019-09-24T18:17:17.727+0900  DEBUG Vulnerability type:  [os library]
2019-09-24T18:17:17.761+0900  DEBUG OS family: alpine, OS version: 3.10.2
2019-09-24T18:17:17.762+0900  DEBUG the number of packages: 18
2019-09-24T18:17:18.024+0900  DEBUG the number of packages from commands: 0
2019-09-24T18:17:18.024+0900  DEBUG the number of packages: 18
2019-09-24T18:17:18.024+0900  INFO  Detecting Alpine vulnerabilities...
2019-09-24T18:17:18.024+0900  DEBUG alpine: os version: 3.10
2019-09-24T18:17:18.024+0900  DEBUG alpine: the number of packages: 18

alpine:3.10 (alpine 3.10.2)
===========================
Total: 3 (UNKNOWN: 0, LOW: 1, MEDIUM: 2, HIGH: 0, CRITICAL: 0)

+---------+------------------+----------+-------------------+---------------+--------------------------------+
| LIBRARY | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |             TITLE              |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
| openssl | CVE-2019-1549    | MEDIUM   | 1.1.1c-r0         | 1.1.1d-r1     | openssl: information           |
|         |                  |          |                   |               | disclosure in fork()           |
+         +------------------+          +                   +               +--------------------------------+
|         | CVE-2019-1563    |          |                   |               | openssl: information           |
|         |                  |          |                   |               | disclosure in PKCS7_dataDecode |
|         |                  |          |                   |               | and CMS_decrypt_set1_pkey      |
+         +------------------+----------+                   +               +--------------------------------+
|         | CVE-2019-1547    | LOW      |                   |               | openssl: side-channel weak     |
|         |                  |          |                   |               | encryption vulnerability       |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
```

</details>

### Scan with .trivyignore

- create .trivyignore

```
$ vim .trivyignore
```

```
CVE-2019-1549
```

- Scan

<details>

```
$ go run cmd/trivy/main.go --debug alpine:3.10
2019-09-24T18:16:00.068+0900  DEBUG cache dir:  /Users/Snow-HardWolf/Library/Caches/trivy
2019-09-24T18:16:00.069+0900  DEBUG db path: /Users/Snow-HardWolf/Library/Caches/trivy/db/trivy.db
2019-09-24T18:16:00.076+0900  INFO  Updating vulnerability database...
2019-09-24T18:16:00.076+0900  DEBUG git pull
2019-09-24T18:16:01.258+0900  DEBUG total updated files: 1
2019-09-24T18:16:01.285+0900  DEBUG Vulnerability type:  [os library]
2019-09-24T18:16:01.292+0900  DEBUG OS family: alpine, OS version: 3.10.2
2019-09-24T18:16:01.292+0900  DEBUG the number of packages: 18
2019-09-24T18:16:01.499+0900  DEBUG the number of packages from commands: 0
2019-09-24T18:16:01.499+0900  DEBUG the number of packages: 18
2019-09-24T18:16:01.499+0900  INFO  Detecting Alpine vulnerabilities...
2019-09-24T18:16:01.499+0900  DEBUG alpine: os version: 3.10
2019-09-24T18:16:01.499+0900  DEBUG alpine: the number of packages: 18

alpine:3.10 (alpine 3.10.2)
===========================
Total: 2 (UNKNOWN: 0, LOW: 1, MEDIUM: 1, HIGH: 0, CRITICAL: 0)

+---------+------------------+----------+-------------------+---------------+--------------------------------+
| LIBRARY | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |             TITLE              |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
| openssl | CVE-2019-1563    | MEDIUM   | 1.1.1c-r0         | 1.1.1d-r1     | openssl: information           |
|         |                  |          |                   |               | disclosure in PKCS7_dataDecode |
|         |                  |          |                   |               | and CMS_decrypt_set1_pkey      |
+         +------------------+----------+                   +               +--------------------------------+
|         | CVE-2019-1547    | LOW      |                   |               | openssl: side-channel weak     |
|         |                  |          |                   |               | encryption vulnerability       |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
```

</details>

### Scan with custom ignorefile

- create custom ignorefile

```
$ vim customignore
```

```
CVE-2019-1547
```

- scan

<details>

```
$ go run cmd/trivy/main.go --debug --ignorefile customignore alpine:3.10
2019-09-24T18:15:26.174+0900  DEBUG cache dir:  /Users/Snow-HardWolf/Library/Caches/trivy
2019-09-24T18:15:26.175+0900  DEBUG db path: /Users/Snow-HardWolf/Library/Caches/trivy/db/trivy.db
2019-09-24T18:15:26.184+0900  INFO  Updating vulnerability database...
2019-09-24T18:15:26.184+0900  DEBUG git pull
2019-09-24T18:15:27.339+0900  DEBUG total updated files: 1
2019-09-24T18:15:27.366+0900  DEBUG Vulnerability type:  [os library]
2019-09-24T18:15:27.375+0900  DEBUG OS family: alpine, OS version: 3.10.2
2019-09-24T18:15:27.375+0900  DEBUG the number of packages: 18
2019-09-24T18:15:27.704+0900  DEBUG the number of packages from commands: 0
2019-09-24T18:15:27.705+0900  DEBUG the number of packages: 18
2019-09-24T18:15:27.705+0900  INFO  Detecting Alpine vulnerabilities...
2019-09-24T18:15:27.705+0900  DEBUG alpine: os version: 3.10
2019-09-24T18:15:27.705+0900  DEBUG alpine: the number of packages: 18

alpine:3.10 (alpine 3.10.2)
===========================
Total: 2 (UNKNOWN: 0, LOW: 0, MEDIUM: 2, HIGH: 0, CRITICAL: 0)

+---------+------------------+----------+-------------------+---------------+--------------------------------+
| LIBRARY | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |             TITLE              |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
| openssl | CVE-2019-1549    | MEDIUM   | 1.1.1c-r0         | 1.1.1d-r1     | openssl: information           |
|         |                  |          |                   |               | disclosure in fork()           |
+         +------------------+          +                   +               +--------------------------------+
|         | CVE-2019-1563    |          |                   |               | openssl: information           |
|         |                  |          |                   |               | disclosure in PKCS7_dataDecode |
|         |                  |          |                   |               | and CMS_decrypt_set1_pkey      |
+---------+------------------+----------+-------------------+---------------+--------------------------------+

```

</details>


### Scan with custom ignorefile, but not exist

<details>

```

$ go run cmd/trivy/main.go --debug --ignorefile fackignore alpine:3.10
2019-09-24T18:19:32.613+0900  DEBUG cache dir:  /Users/Snow-HardWolf/Library/Caches/trivy
2019-09-24T18:19:32.614+0900  DEBUG db path: /Users/Snow-HardWolf/Library/Caches/trivy/db/trivy.db
2019-09-24T18:19:32.627+0900  INFO  Updating vulnerability database...
2019-09-24T18:19:32.627+0900  DEBUG git pull
2019-09-24T18:19:34.448+0900  DEBUG total updated files: 1
2019-09-24T18:19:34.474+0900  DEBUG Vulnerability type:  [os library]
2019-09-24T18:19:34.481+0900  DEBUG OS family: alpine, OS version: 3.10.2
2019-09-24T18:19:34.481+0900  DEBUG the number of packages: 18
2019-09-24T18:19:34.704+0900  DEBUG the number of packages from commands: 0
2019-09-24T18:19:34.704+0900  DEBUG the number of packages: 18
2019-09-24T18:19:34.704+0900  INFO  Detecting Alpine vulnerabilities...
2019-09-24T18:19:34.704+0900  DEBUG alpine: os version: 3.10
2019-09-24T18:19:34.704+0900  DEBUG alpine: the number of packages: 18
2019-09-24T18:19:34.705+0900  INFO  IgnoreFile : specified ignore file did not exist, using default

alpine:3.10 (alpine 3.10.2)
===========================
Total: 2 (UNKNOWN: 0, LOW: 1, MEDIUM: 1, HIGH: 0, CRITICAL: 0)

+---------+------------------+----------+-------------------+---------------+--------------------------------+
| LIBRARY | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |             TITLE              |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
| openssl | CVE-2019-1563    | MEDIUM   | 1.1.1c-r0         | 1.1.1d-r1     | openssl: information           |
|         |                  |          |                   |               | disclosure in PKCS7_dataDecode |
|         |                  |          |                   |               | and CMS_decrypt_set1_pkey      |
+         +------------------+----------+                   +               +--------------------------------+
|         | CVE-2019-1547    | LOW      |                   |               | openssl: side-channel weak     |
|         |                  |          |                   |               | encryption vulnerability       |
+---------+------------------+----------+-------------------+---------------+--------------------------------+

```

</details>

- using default( .trivyignore )

### Desired feedback

I want code reviews
Thank you for the wonderful scan tool.