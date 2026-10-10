This pull request fixes minor inconsistency in Categorical.remove_categories error message

- [x] closes #28669 
- [ ] tests added / passed
-  passes `black pandas`
-  passes `git diff upstream/master -u -- "*.py" | flake8 --diff`
-  whatsnew entry

Changed the error message to show invalid removals as a set. Added tests for removal of null from the categories. Parameterized pytest. 