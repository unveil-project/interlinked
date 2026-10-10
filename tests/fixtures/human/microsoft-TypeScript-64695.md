fixes https://github.com/microsoft/TypeScript/issues/64690

I was kinda always wondering if a logic like this could be used to cut down on inference work when dealing with discriminated unions and the referenced PR pushed me to try it out.

I'd still like to do more work on this and recheck things. That's why I'm opening this as a draft, I'd be curious what extended user tests etc would show for this