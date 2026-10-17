## What is the purpose of the change
work for this [issue](https://github.com/apache/rocketmq/issues/1477), the loginfo is ambiguity when visiting namesrv, so we modify the loginfo to make it clear.

## Brief changelog
use the variable channel to replace addr in the log statement.