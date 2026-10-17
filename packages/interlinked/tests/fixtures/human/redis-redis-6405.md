What is the motivation here? 

Config rewrite is currently broken since it prints out the hashed password instead of the real password, so this fixes that. The original point is that now you can actually pass in the hashed password, so you don't need to store it in plaintext on disk, and of lesser importance in transit. Also actually added some tests. 