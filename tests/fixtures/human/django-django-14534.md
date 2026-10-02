Fixed a bug in `django.forms.boundfield.BoundWidget.id_for_label`.
It returned a wrong `id`, when used by a `ChoiceField` with `widget=CheckboxSelectMultiple` and rendered by a form initialized  with `auto_id='...%s...'`.
