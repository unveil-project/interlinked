### Reporting a bug?

I set up constants
```
'__VUE_I18N_FULL_INSTALL__': true,
'__VUE_I18N_LEGACY_API__': true,
'__VUE_I18N_PROD_DEVTOOLS__': false
```
but yet get warning
```
vue-i18n.esm-bundler.js:46 You are running the esm-bundler build of vue-i18n. It is recommended to configure your bundler to explicitly replace feature flag globals with boolean literals to get proper tree-shaking in the final bundle.
```

its becouse needWarn always set true in not producton mode:
```javascript
if ((process.env.NODE_ENV !== 'production') && typeof true === 'boolean') {
    needWarn = true;
}
```

### Expected behavior

If constants was set up, dont display warning message.

### Reproduction

Any example.

### System Info

```shell
vue-i18n@next
```


### Screenshot

_No response_

### Additional context

_No response_

### Validations

- [X] Read the [Contributing Guidelines](https://github.com/intlify/vue-i18n-next/blob/master/.github/CONTRIBUTING.md)
- [X] Read the [Documentation](https://vue-i18n.intlify.dev/)
- [X] Check that there isn't already an issue that reports the same bug to avoid creating a duplicate.
- [X] Check that this is a concrete bug. For Q&A open a [GitHub Discussion](https://github.com/intlify/vue-i18n-next/discussions)
