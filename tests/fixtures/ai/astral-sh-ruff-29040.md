`unused-ignore-comment` reports unused `ty: ignore` directives, so its documentation should not describe the setting that disables unused `type: ignore` diagnostics.

Remove that incorrect option from the rule documentation and fix the wording for `unused-type-ignore-comment`. Regenerate the rule reference and schema.
