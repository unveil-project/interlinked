Currently the K8S CI job name is not rendered properly (e.g. in the check list of PR pages).

![Screenshot_2020-10-31_at_9_30_18_PM](https://user-images.githubusercontent.com/11539188/97789487-2d71c180-1bc1-11eb-821c-a95d51b14196.png)


This PR fixes this minor issue. As you can see in the Check List below, the K8s CI job name is rendered properly now ("`CI Build / K8s 3.6 v1.18.6 image`")

<!--
Thank you for contributing! Please make sure that your code changes
are covered with tests. And in case of new features or big changes
remember to adjust the documentation.

Feel free to ping committers for the review!

In case of existing issue, reference it using one of the following:

closes: #ISSUE
related: #ISSUE

How to write a good git commit message:
http://chris.beams.io/posts/git-commit/
-->

---
**^ Add meaningful description above**

Read the **[Pull Request Guidelines](https://github.com/apache/airflow/blob/master/CONTRIBUTING.rst#pull-request-guidelines)** for more information.
In case of fundamental code change, Airflow Improvement Proposal ([AIP](https://cwiki.apache.org/confluence/display/AIRFLOW/Airflow+Improvements+Proposals)) is needed.
In case of a new dependency, check compliance with the [ASF 3rd Party License Policy](https://www.apache.org/legal/resolved.html#category-x).
In case of backwards incompatible changes please leave a note in [UPDATING.md](https://github.com/apache/airflow/blob/master/UPDATING.md).
