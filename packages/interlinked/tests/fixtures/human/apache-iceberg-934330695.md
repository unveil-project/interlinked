> Thanks for working on it, Gidon! Did my first round review. Here are some questions:
> 
> 1. Can we add tests for data read and write from a table with encryption enabled. We could use the Java APIs if Spark with encryption isn’t ready. Please refer to https://iceberg.apache.org/api/#tables.
> 2. Can we add tests for HadoopTableOperations::encryption()?
> 3. Can we add tests for KmsClient?
> 4. Are we leaving out the encryption() implementation intentionally for MetastoreTableOperations? The encryption() implementation of the PR is only for HadoopTableOpertation.
> 5. Are manifest files and manifest-list files encrypted?
> 6. An Iceberg table can contain data files with multiple formats, parquet, orc, avro, etc. How do we handle that case?

Thanks Yufei!
Affirmative answer to questions 1-3.
4: nope, no reason not to add it to other classes that implement TableOperations. HadoopTableOperations implements it directly, and is used in Spark, so I started with it; will add to others. I guess you mean BaseMetastoreTableOperations?
5. not yet, WIP
6. We start with formats that have a built-in encryption support - initially Parquet, then ORC. Avro doesn't have this capability, and is not a column format, so will be supported by generic encryption streams like the one in #2060
