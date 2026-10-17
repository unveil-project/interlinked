The other option to consider is centralizing the calculation of the type. Essentially think of a MRU version of `Dictionary<string, FileIdentifier` instance that exists at the `SourceAssembly` instance. It can then cache say the last X instances of `FileIdentifier`. 

The calculation of path to `FileIdentifier` is completely reproducible so storing at this level is just fine. 
