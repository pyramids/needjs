# awk program to remove sections of a text file
# beginning  with   /*dev-only-start*/
# and ending with   /*dev-only-stop*/
# and further omitting single lines containing /*dev-only*/

/\/\*dev-only-start\*\// {
  print "// dev-only: " $0;
  getline;
  while (index($0, "/*dev-only-stop*/") == 0) {
      print "// dev-only: " $0;
      getline;
  }  
  print "// dev-only: " $0;
  getline;
}

/\/\*dev-only\*\// { 
  print "// dev-only: " $0;
  getline;
}

{ print }
