The Quarkus Develocity instance is moving from `ge.quarkus.io` to `develocity.quarkus.io`. This updates every reference to the hostname in the repo: Maven and Gradle build config, the build scan publishing workflow, the GitHub bot config, README badge and CONTRIBUTING.

The workflows now read the access key from the `DEVELOCITY_ACCESS_KEY` secret instead of `GRADLE_ENTERPRISE_ACCESS_KEY` (18 references in 4 workflows). The new secret already exists in the repo. 

Before merging:
- **CI access key:** if the `DEVELOCITY_ACCESS_KEY` value includes a hostname (`<host>=<key>`), the hostname must be `develocity.quarkus.io`. A bare key needs no change.
- **Quarkus GitHub bot:** if its Develocity credentials are tied to the hostname, they need the same update.

After merging, contributors with a local access key need to run `./mvnw develocity:provision-access-key` again, because keys are stored per hostname in `~/.m2/.develocity/keys.properties`.

The hardcoded "Similar builds" link is updated separately in quarkusio/quarkus-project-develocity-extension. That change reaches this repo when the extension version in `.mvn/extensions.xml` is bumped.
