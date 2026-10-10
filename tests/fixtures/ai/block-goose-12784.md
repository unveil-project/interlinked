## Summary

Adds Bestax to the extensions directory (`documentation/static/servers.json`) so it shows in the Extension Manager's discoverable list. Directory entry only, the same shape as the pngmeta and Glif additions (#10650, #10638); say the word if you want an issue filed for it.

`bestax-mcp` is the MCP server for Bestax, a React component library for the Bulma v1 CSS framework. It gives goose every component's props, working examples, the `--bulma-*` CSS variables behind each component, and the Bestax Agent Skills. The index ships inside the npm package, so it runs offline with no API key and no environment variables.

- npm: https://www.npmjs.com/package/bestax-mcp
- Source: https://github.com/allxsmith/bestax/tree/main/bestax-mcp
- Docs: https://bestax.io/docs/guides/llms#mcp-server
- Official MCP registry: `io.github.allxsmith/bestax-mcp`

### Testing

`servers.json` still parses as JSON; the new object carries the same keys as its neighbours and sits alphabetically between `beads` and `blender-mcp` with `"endorsed": false`. Ran `npx -y bestax-mcp@1` locally against a stdio client to confirm the command starts the server.

### Related Issues

None.
