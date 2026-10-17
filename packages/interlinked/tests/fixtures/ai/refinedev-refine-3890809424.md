Thanks for the review @BatuhanW! I've addressed both of your comments:

1. **replace prop**: Good catch! Removing `replace={false}` was not intentional. I've restored it in the latest commit. The prop is now passed to the Button component and will be forwarded to the LinkComponent via the `component` prop.

2. **Prop order**: I've reorganized the props to maintain the original order as much as possible. The new structure-specific props (component, to, replace) are added after `disabled` to minimize the diff, while keeping all other props in their original order (startIcon, title, sx, data-testid, className, ...restProps).
