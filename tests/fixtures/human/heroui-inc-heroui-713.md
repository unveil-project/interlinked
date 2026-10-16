### Describe the bug

When using auto width `<Button>`s inside of a `<Navbar>`, it looks like for whatever reason the width calculations mess up, resulting in the buttons visually flowing on top of each other, as well as outside of the edge of the Navbar.

The issue can be seen on the NextUI docs, and reproduced in a local environment.

This bug only seems to affect Firefox.

### Your Example Website or App

https://nextui.org/docs/components/navbar#bordered

### Steps to Reproduce the Bug or Issue

1. Open the provided link to the NextUI docs using Firefox 
2. Copy the code to your local environment (or just look at it on the docs page)
3. See button widths breaking inside the Navbar component

### Expected behavior

As a user, I expect the button to stay inside of the Navbar component even when the width is automatically calculated. Instead, I'm seeing it overflow the Navbar component.

### Screenshots or Videos

![c16dc9fd8306a3c35565ee84242c96f3](https://user-images.githubusercontent.com/12832880/187264105-aca394b5-d49d-4f51-acfc-18f279300f9d.png)


### Operating System Version

- OS: Windows 10, MacOS 12.5.1

### Browser

Firefox
