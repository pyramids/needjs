# awk program to remove sections of a text file
# beginning  with   /*dev-only-start*/
# and ending with   /*dev-only-stop*/
# and further omitting single lines containing /*dev-only*/

# initialize
BEGIN { off = 0; }

# turn output off
/\/\*dev-only-start\\*\// { off = 1; }

# turn output on
/\/\*dev-only-stop\*\// { off = 0; }

# output everything not containing /*dev-only*/ 
# or a pattern such as             /*dev-only-xxx*/
!/\/\*dev-only[-]?[a-z]*\*\// { if (!off) print; }
