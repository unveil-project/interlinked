This just simplifies schema definition so you don't need to pass an empty config object when all the config fields are optional

before:

```js
fields: {
  name: text({})
}
```

after:

```js
fields: {
  name: text()
}
```