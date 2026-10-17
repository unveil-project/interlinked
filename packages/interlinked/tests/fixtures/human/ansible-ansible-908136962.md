This works as intended.

The `apply` keywords applies tags to each task, so the following effectively adds `task1` tag to each task within `roles/testrole/tasks/main.yaml`:

```yaml
  - name: include the role with tags applied
    include_role:
      name: testrole
      apply:
        tags:
          - task1
    tags:
      - always
```

`roles/testrole/tasks/main.yaml` becomes:
```yaml
- name: task1
  debug:
    msg: "In task1"
  tags:
    - task1

- name: task2
  debug:
    msg: "In task2"
  tags:
    - task1
    - task2
```

If you want to filter tasks by tags you need to use `--tags` or `--skip-tags` command line options as documented in https://docs.ansible.com/ansible/latest/user_guide/playbooks_tags.html#selecting-or-skipping-tags-when-you-run-a-playbook.

If you have further questions please stop by IRC or the mailing list:
* IRC: #ansible on irc.libera.chat
* mailing list: https://groups.google.com/forum/#!forum/ansible-project
