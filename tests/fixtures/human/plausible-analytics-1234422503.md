> What's the rationale for creating a new workflow instead of adding another trigger for the current one?
> 
> https://github.com/plausible/analytics/blob/master/.github/workflows/docker.yml

I initially thought of updating the current one, but the workflow file ended up a bit complicated. IMO they should be separate files because:

- Staging workflow pushes to [another Docker Hub repository](https://hub.docker.com/r/plausible/analytics-staging/tags), to avoid pushing staging images to the main repository, which serves production and self-hosted images. As this for internal testing, this could be a private repository as well.
- Staging workflow reacts to pull requests, and not pushes. That is because we want to start the workflow when the labeled pull request code is changed, and also when labels change.
    - Staging workflow image tags are labeled using PR reference (e.g. `plausible/analytics-staging:pr-1234`), as GH Actions push events and PR events have different available data. I didn't spend much time debugging this, but `docker/metadata-action@v4` failed with the existing workflow tag generation, so I used `type=ref,event=pr` works for this case.
