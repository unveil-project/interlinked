Fixes #1688

1.    we will seek previous_metadata_location  when it occurs File Not Found  seek  from metadata_location of hive table properties 
2    if  we  used  previous_metadata_location  on freshing operation  ,we will  set  it  to metadata_location in case of  both metadataLocation no found   when next fresh 