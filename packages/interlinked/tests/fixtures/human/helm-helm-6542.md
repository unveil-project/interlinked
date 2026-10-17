Currently, if using the --atomic flag or deleting a release that failed due to an already existing
resource, Helm will delete those resources that aren't managed by it. This PR fixes the issue
by checking for pre-existing resources during install and upgrade. This is done as a validation
step so the release will not even be started if resources currently exist. This PR is inspired by
@xchapter7x's work in #3477.

This also fixes a small bug in upgrade where deletes fail if the resource was already deleted

Fixes #6407