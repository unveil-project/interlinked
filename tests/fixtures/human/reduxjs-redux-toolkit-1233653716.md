The basic concepts of using RTKQ in class components is covered in the "Using RTK Without Hooks" docs page:

https://redux-toolkit.js.org/rtk-query/usage/usage-without-react-hooks#performing-mutations

Having said that, what you're running into is the discrepancy between what a "thunk action creator" _really_ returns, and how it gets used and seen by the component itself.

Long story short: a thunk like this:

```ts
function fetchSomeData(id: string) : () => Promise<MyData> {
  return async (dispatch: AppDispatch, getState: () => AppState) => {
    const res = goActuallyFetchSomeData(id);
    dispatch(dataLoaded(res))
    return res;
  }
}
```

is fully typed as: `(id: string) => () => Promise<MyData>`.

But, when you wrap it up in `dispatch`, it cuts out the middle step from the component's point of view, and it's just: `(id: string) => Promise<MyData>`.

The React-Redux types account for that. Your hand-declaration of the function as a prop doesn't.

The best answer here is to use the `ConnectedProps<T>` type covered in the React-Redux docs, and _infer_ "the type of all props passed from Redux", instead of declaring them explicitly:

https://react-redux.js.org/using-react-redux/usage-with-typescript#inferring-the-connected-props-automatically

Along with that, you should really be using [the "object shorthand" form of `mapDispatch`](https://react-redux.js.org/using-react-redux/connect-mapdispatch#defining-mapdispatchtoprops-as-an-object), not the function form.

The result should look like, say:

```ts
const mapState = (state: AppState) => ({
  todos: selectTodos(state)
})

const mapDispatch = {
  fetchAuthSession,
  authSession: api.endpoints.authSession.initiate
}

const connector = connect(mapState, mapDispatch);
type PropsFromRedux = ConnectedProps<typeof connector>;

// passed from the parent
type OtherComponentProps = {
  a: string;
  b: number;
}

type FinalComponentProps = PropsFromRedux & OtherComponentProps;

class MyComponent extends React.Component<FinalComponentProps {
  // code here
}
```

But note that most of that is really about "how do I best use `connect` with TS", not even the RTKQ part :)
