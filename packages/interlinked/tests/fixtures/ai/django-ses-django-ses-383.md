Two README examples fail before they can exercise the documented functionality on `main` (`8355851ad8c054799540d9f76d7c6902b3b9d602`):

- **Receiving emails → custom parsing:** the block has `from django_ses.inbound import` with no imported name, so compiling it raises `SyntaxError`. The class immediately below inherits `SnsHandler`.
- **SES Sending Stats → urls.py:** the example still uses `url(...)`. That legacy helper is unavailable in supported modern Django versions (including Django 5.2). `django_ses.urls` already uses `django.urls.path` internally; the README can use `path` and explicitly import `include` and `path`.

I reproduced the custom-parser syntax error and URL example failure locally with Python 3.13.13 / Django 5.2.18. Completing the import lets the parser example process a tiny synthetic message using `mailparser.parse_from_bytes`; replacing the legacy URL example lets Django resolve `/admin/django-ses/`. No AWS or SMTP access is involved.

I can send a small README-only correction for these two executable examples. This is separate from the documentation reorganization proposed in #337.
