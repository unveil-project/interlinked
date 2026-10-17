```ts
export type ComponentProps<T> = T extends Component<infer P>
  ? P
  : T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : {};
```
It could be used in cases:
```ts
// type ParagraphProps  = JSX.HTMLAttributes<HTMLParagraphElement>
type ParagraphProps = ComponentProps<'p'>; 
/*
type PortalProps  = {
    mount?: Node | undefined;
    useShadow?: boolean | undefined;
    children: JSX.Element;
}
*/
type PortalProps = ComponentProps<typeof Portal>;
```
from react implementation: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts#L831