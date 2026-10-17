Issue details, the issue stream, and the inbox now render ANSI colors with #126237's shared `AnsiText` component in exception values, messages, titles, breadcrumbs, and related exception labels, instead of showing raw escape codes. Plain-text outputs such as the raw stack trace, "Copy as", breadcrumb copies, page titles, and external issue bodies strip the escape codes instead.

<table>
<thead><tr><th>Area</th><th>Theme</th><th>Before</th><th>After</th></tr></thead>
<tbody>
<tr>
<td rowspan="2">Exception</td>
<td>Light</td>
<td><img alt="Before, exception, light" src="https://github.com/user-attachments/assets/a8e7de70-53ee-4a85-999c-909432e3c9d2" /></td>
<td><img alt="After, exception, light" src="https://github.com/user-attachments/assets/eb59ccc3-957f-4d36-9691-2500e460b7e8" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, exception, dark" src="https://github.com/user-attachments/assets/d9563f82-6e18-4bd6-8b42-dc49e72272f7" /></td>
<td><img alt="After, exception, dark" src="https://github.com/user-attachments/assets/74e1ef43-6312-420a-b885-c001228f21f8" /></td>
</tr>
<tr>
<td rowspan="2">Message</td>
<td>Light</td>
<td><img alt="Before, message, light" src="https://github.com/user-attachments/assets/ac473c1d-4bd7-4d26-ae81-916f51633e29" /></td>
<td><img alt="After, message, light" src="https://github.com/user-attachments/assets/694f811d-3143-45e0-a5c0-b948d0350a7a" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, message, dark" src="https://github.com/user-attachments/assets/29f7a7f3-3088-410b-95b1-95fe0948fb7b" /></td>
<td><img alt="After, message, dark" src="https://github.com/user-attachments/assets/8bc72c28-7aa9-4734-a2a7-5ae6b65f73c3" /></td>
</tr>
<tr>
<td rowspan="2">Header message</td>
<td>Light</td>
<td><img alt="Before, header message, light" src="https://github.com/user-attachments/assets/f686b154-c80c-467d-9d94-cdd6f278eb84" /></td>
<td><img alt="After, header message, light" src="https://github.com/user-attachments/assets/df50d852-a14d-42e5-8411-c908fb5929d4" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, header message, dark" src="https://github.com/user-attachments/assets/190a5abb-1885-4253-bc91-40500a3b2806" /></td>
<td><img alt="After, header message, dark" src="https://github.com/user-attachments/assets/bebe477a-ea1d-4f4a-ae20-5ee6c8996e52" /></td>
</tr>
<tr>
<td rowspan="2">Header title</td>
<td>Light</td>
<td><img alt="Before, header title, light" src="https://github.com/user-attachments/assets/2ba77ba9-7b54-4947-b60a-7ceabd9ea996" /></td>
<td><img alt="After, header title, light" src="https://github.com/user-attachments/assets/525d32ea-03b6-420c-9964-b6a7750e39ee" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, header title, dark" src="https://github.com/user-attachments/assets/1c4c4d8b-391d-45cf-9426-831235dc7512" /></td>
<td><img alt="After, header title, dark" src="https://github.com/user-attachments/assets/8dd4ad9c-75ae-42f2-8b2f-a14aa71f0158" /></td>
</tr>
<tr>
<td rowspan="2">Issue stream</td>
<td>Light</td>
<td><img alt="Before, issue stream, light" src="https://github.com/user-attachments/assets/2ccdfcff-b005-4a42-a223-6ae043b5834f" /></td>
<td><img alt="After, issue stream, light" src="https://github.com/user-attachments/assets/ed4d3805-d647-4473-b9a0-a51ca9ab3de3" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, issue stream, dark" src="https://github.com/user-attachments/assets/a736b3f9-0def-4c36-9f59-96f855ec0d64" /></td>
<td><img alt="After, issue stream, dark" src="https://github.com/user-attachments/assets/c788c89a-fb54-45a0-ae6e-ed1f1fd10297" /></td>
</tr>
<tr>
<td rowspan="2">Breadcrumbs</td>
<td>Light</td>
<td><img alt="Before, breadcrumbs, light" src="https://github.com/user-attachments/assets/69779eb3-d1de-4219-8849-826def0af6f9" /></td>
<td><img alt="After, breadcrumbs, light" src="https://github.com/user-attachments/assets/38a2945c-dbc7-4bef-b0fc-041b8bff2c8d" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, breadcrumbs, dark" src="https://github.com/user-attachments/assets/6f54efd6-11f4-418d-a72c-cbb6594a52cd" /></td>
<td><img alt="After, breadcrumbs, dark" src="https://github.com/user-attachments/assets/17d8ab25-9108-4456-a72e-efbaebda6c0c" /></td>
</tr>
<tr>
<td rowspan="2">Related exceptions</td>
<td>Light</td>
<td><img alt="Before, related exceptions, light" src="https://github.com/user-attachments/assets/674eb899-75fc-40cb-832c-923c34980c6b" /></td>
<td><img alt="After, related exceptions, light" src="https://github.com/user-attachments/assets/9c2eaf8c-0151-4ee5-b2d3-264bd02f873c" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, related exceptions, dark" src="https://github.com/user-attachments/assets/9213fbd1-ba11-4522-8cec-3460eef906f9" /></td>
<td><img alt="After, related exceptions, dark" src="https://github.com/user-attachments/assets/6e2af045-4a56-447c-b65a-4bc7ee6c9ce8" /></td>
</tr>
<tr>
<td rowspan="2">Raw stack trace</td>
<td>Light</td>
<td><img alt="Before, raw stack trace, light" src="https://github.com/user-attachments/assets/4c0a1049-cbf7-429a-97f7-39651914ea45" /></td>
<td><img alt="After, raw stack trace, light" src="https://github.com/user-attachments/assets/a6a8d792-daa6-4fa2-874d-f25ea7b60539" /></td>
</tr>
<tr>
<td>Dark</td>
<td><img alt="Before, raw stack trace, dark" src="https://github.com/user-attachments/assets/5b2b7080-3822-45ad-9f73-afed7ae5a0dd" /></td>
<td><img alt="After, raw stack trace, dark" src="https://github.com/user-attachments/assets/a81c7598-af4d-46cd-b825-4e7d4dc33b0d" /></td>
</tr>
</tbody>
</table>

Closes LOGS-1016.

