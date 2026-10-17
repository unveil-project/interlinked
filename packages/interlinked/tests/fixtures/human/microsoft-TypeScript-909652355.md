That `b` is narrowed to `LargeBox` despite your explicit type annotation `SmallBox | LargeBox` is intentional as well. Assigning a value to a variable narrows the variable to the assigned type. Otherwise code like this would not work:

    const value: number | undefined = 123;
    value.toString(); // If this were still typed `number | undefined` then we couldn't call the function.
    // But TypeScript can see that a number is always assigned and the value can't be `undefined`.
