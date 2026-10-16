Hey @joeyorlando — Outline knowledge connector caught my eye. I've worked with their API before (they have a clean REST API + webhook system for document changes). 

One thing I noticed looking at the existing connectors: they all seem to follow a sync-then-index pattern but the delta sync logic varies a lot between implementations. Is there a plan to extract a shared connector interface that new ones can implement against? Would make things like Outline, Dropbox, etc. way simpler to add consistently.

Also — any bounties opening up for platform/JS work? I saw the MCP auth header issue (#3794) and the task queue pg-boss exploration (#3796). Both look like interesting problems I'd be up for tackling.
