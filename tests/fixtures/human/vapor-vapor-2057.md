I found that when POSTing using url-form-encoding from a form checkbox with a name of "productId[]", the parser was not decoding before checking if the suffix was "]". This meant that, it would not decode arrays from input.

### Checklist

- [ ] Circle CI is passing (code compiles and passes tests).
- [x] There are no breaking changes to public API.
- [ ] New test cases have been added where appropriate.
- [ ] All new code has been commented with doc blocks `///`.
