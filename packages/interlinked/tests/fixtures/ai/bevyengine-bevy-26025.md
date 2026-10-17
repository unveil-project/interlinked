# Objective

Part of #23013.

While dragging the column splitter in the inspector details panel, the cursor sometimes flips to the normal cursor, or to not allowed when passing over a read only value.

# Solution

The cursor comes from whatever is under the pointer, and the splitter handle is narrow enough that a quick drag leaves it. The split pane already captures the pointer while dragging, so the column splitter now does the same, capturing on drag start and releasing on drag end or cancel. A test drives the real hover and cursor systems to check the cursor stays as the resize cursor through a drag.

# AI disclosure

I noticed the flicker while trying the inspector, and had AI track it down. It compared the column splitter against the split pane and found the missing pointer capture, then wrote a test that fails without the fix. I reviewed the change.